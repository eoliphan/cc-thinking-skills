'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildConditionPrompt,
  buildNonePrompt,
  buildEqualBudgetPlaceboPrompt,
  buildContextPadding,
  contextPaddingTokens,
  neutralFiller,
  normalizeCondition,
  defaultTokenCounter,
  wordCount,
} = require('../lib/conditions');
const {
  SCORERS,
  scoreBoolean,
  scoreMultipleChoice,
  scoreAbstention,
  scoreNumericOrderOfMagnitude,
  scoreProbabilityBrier,
  parseFileLocalization,
  scoreFileLocalization,
  scoreWithAdapter,
  runObjectiveItems,
} = require('../lib/objective');
const { validateResultEnvelope } = require('../lib/result');
const { balancedAcc } = require('../run-routing-data');

// --- conditions: primary none control + inert padding ---

test('none is primary control and empty is a legacy alias', () => {
  const problem = 'Should we ship?';
  const none = buildConditionPrompt('none', problem, 'SKILL BODY', 'demo');
  const empty = buildConditionPrompt('empty', problem, 'SKILL BODY', 'demo');
  const helper = buildNonePrompt(problem);
  assert.equal(normalizeCondition('empty'), 'none');
  assert.equal(normalizeCondition('no_skill'), 'none');
  assert.equal(none, empty);
  assert.equal(none, helper);
  assert.match(none, /Should we ship\?/);
  assert.doesNotMatch(none, /THINKING SKILL|context-padding|PAD_/);
});

test('equal-budget placebo uses deterministic indexed context-padding tokens', () => {
  const skill = 'alpha beta gamma delta epsilon';
  const budget = defaultTokenCounter(skill);
  const prompt = buildConditionPrompt('placebo', 'Q?', skill, 'demo');
  const alias = buildEqualBudgetPlaceboPrompt('Q?', skill);
  assert.match(prompt, /<context-padding>/);
  assert.match(prompt, /PAD_0001/);
  assert.match(prompt, new RegExp(`PAD_${String(budget).padStart(4, '0')}`));
  assert.doesNotMatch(prompt, /read the request carefully|Software systems are made/);
  assert.equal(normalizeCondition('equal_budget_placebo'), 'equal_budget_placebo');
  assert.match(alias, /<context-padding>/);

  const body = neutralFiller(budget);
  assert.equal(defaultTokenCounter(body), budget);
  assert.equal(contextPaddingTokens(3), 'PAD_0001 PAD_0002 PAD_0003');
  assert.equal(wordCount(skill), budget);
});

test('injectable token counter sizes padding budget', () => {
  const counter = (text) => String(text).length; // char counter
  const pad = buildContextPadding(10, { tokenCounter: counter });
  assert.match(pad, /<context-padding>/);
  const inner = pad.replace(/<\/?context-padding>\n?/g, '').trim();
  assert.ok(counter(inner) <= 10);
  // buildConditionPrompt respects injected counter via options
  const prompt = buildConditionPrompt('placebo', 'P', 'abcdefghij', 's', { tokenCounter: counter, tokenBudget: 5 });
  assert.match(prompt, /context-padding/);
});

// --- scorers ---

test('boolean scorer parses ANSWER and rejects missing parse', () => {
  assert.equal(scoreBoolean('Reasoning.\nANSWER: Yes', true).correct, true);
  assert.equal(scoreBoolean('ANSWER: no', false).correct, true);
  assert.equal(scoreBoolean('ANSWER: Yes', false).correct, false);
  const miss = scoreBoolean('I think maybe.', true);
  assert.equal(miss.scored, false);
  assert.equal(miss.failure.type, 'parse');
});

test('multiple choice requires letter and scores exact gold', () => {
  assert.equal(scoreMultipleChoice('ANSWER: B', 'B').correct, true);
  assert.equal(scoreMultipleChoice('ANSWER: C', 'B').correct, false);
  const miss = scoreMultipleChoice('The answer is buried.', 'A');
  assert.equal(miss.scored, false);
  assert.equal(miss.failure.type, 'parse');
});

test('abstention distinguishes answerable vs unanswerable', () => {
  assert.equal(scoreAbstention('ANSWER: 42', { answerable: true }).correct, true);
  assert.equal(scoreAbstention('ANSWER: UNANSWERABLE', { answerable: false }).correct, true);
  assert.equal(scoreAbstention('ANSWER: UNANSWERABLE', { answerable: true }).correct, false);
  assert.equal(scoreAbstention('ANSWER: Paris', false).correct, false);
});

test('numeric order-of-magnitude and probability brier clamp', () => {
  const num = scoreNumericOrderOfMagnitude('ANSWER: 1e3', 1000);
  assert.equal(num.correct, true);
  assert.equal(scoreNumericOrderOfMagnitude('ANSWER: 1e6', 1000, { tolerance: 1 }).correct, false);
  const miss = scoreNumericOrderOfMagnitude('no number here', 10);
  assert.equal(miss.scored, false);

  const p = scoreProbabilityBrier('ANSWER: 150%', 1);
  assert.equal(p.parsed, 1);
  assert.equal(p.value.probability, 1);
  assert.equal(p.correct, true);
  const neg = scoreProbabilityBrier('ANSWER: -5%', 0);
  assert.equal(neg.parsed, 0);
  assert.ok(neg.value.brier === 0);
});

test('file localization requires single terminal ANSWER path in inventory', () => {
  const inventory = ['src/a.js', 'src/b.js', 'lib/util.js'];
  const ok = parseFileLocalization('notes\nANSWER: src/a.js\n', { repositoryFiles: inventory });
  assert.equal(ok.ok, true);
  assert.equal(ok.parsed, 'src/a.js');
  assert.equal(scoreFileLocalization('ANSWER: ./src/a.js', ['src/a.js'], { repositoryFiles: inventory }).correct, true);

  const multi = parseFileLocalization('ANSWER: src/a.js\nANSWER: src/b.js', { repositoryFiles: inventory });
  assert.equal(multi.ok, false);
  assert.match(multi.failure.message, /multiple ANSWER/);

  const outside = parseFileLocalization('ANSWER: secret/path.py', { repositoryFiles: inventory });
  assert.equal(outside.ok, false);
  assert.match(outside.failure.message, /inventory/);

  const dir = parseFileLocalization('ANSWER: src/\n', { repositoryFiles: inventory });
  assert.equal(dir.ok, false);

  const basenameOnly = scoreFileLocalization('The bug is in a.js somewhere', ['src/a.js'], { repositoryFiles: inventory });
  assert.equal(basenameOnly.scored, false);
  assert.equal(basenameOnly.failure.type, 'parse');

  // backslash normalization
  assert.equal(
    scoreFileLocalization('ANSWER: src\\a.js', inventory, { repositoryFiles: inventory }).correct,
    true,
  );
});

test('file localization rejects trailing prose and duplicate identical ANSWER lines', () => {
  const inventory = ['src/a.js', 'src/b.js'];

  const trailing = parseFileLocalization('ANSWER: src/a.js\ntrailing prose', { repositoryFiles: inventory });
  assert.equal(trailing.ok, false);
  assert.match(trailing.failure.message, /not terminal|trailing/i);

  const trailingSameLine = parseFileLocalization('notes\nANSWER: src/a.js and more text', { repositoryFiles: inventory });
  assert.equal(trailingSameLine.ok, false);
  assert.match(trailingSameLine.failure.message, /single terminal path|trailing|not terminal/i);
  const trailingScore = scoreFileLocalization('notes\nANSWER: src/a.js and more text', ['src/a.js'], { repositoryFiles: inventory });
  assert.equal(trailingScore.scored, false);
  const dupIdentical = parseFileLocalization('ANSWER: src/a.js\nANSWER: src/a.js', { repositoryFiles: inventory });
  assert.equal(dupIdentical.ok, false);
  assert.match(dupIdentical.failure.message, /multiple ANSWER/);

  const dupNormalized = parseFileLocalization('ANSWER: ./src/a.js\nANSWER: src/a.js', { repositoryFiles: inventory });
  assert.equal(dupNormalized.ok, false);
  assert.match(dupNormalized.failure.message, /multiple ANSWER/);

  // whitespace after the sole ANSWER line is still terminal
  const wsOk = parseFileLocalization('reasoning\nANSWER: src/a.js\n  \n', { repositoryFiles: inventory });
  assert.equal(wsOk.ok, true);
  assert.equal(wsOk.parsed, 'src/a.js');
});

test('file localization rejects absolute drive UNC and parent paths', () => {
  const inventory = ['src/a.js'];
  for (const bad of [
    'ANSWER: /src/a.js',
    'ANSWER: /abs/path.js',
    'ANSWER: C:\\x',
    'ANSWER: C:/windows/system32/x',
    'ANSWER: \\\\server\\share\\file.js',
    'ANSWER: //server/share/file.js',
    'ANSWER: ../src/a.js',
    'ANSWER: foo/../../etc/passwd',
  ]) {
    const r = parseFileLocalization(bad, { repositoryFiles: inventory });
    assert.equal(r.ok, false, `expected reject for ${bad}`);
    assert.match(
      r.failure.message,
      /absolute|drive|UNC|parent/i,
      `unexpected message for ${bad}: ${r.failure && r.failure.message}`,
    );
  }
  // Leading slash must never be stripped into an inventory match.
  const stripped = parseFileLocalization('ANSWER: /src/a.js', { repositoryFiles: inventory });
  assert.equal(stripped.ok, false);
  assert.notEqual(stripped.parsed, 'src/a.js');
});

test('scoreWithAdapter dispatches all registered scorers', () => {
  assert.deepEqual(Object.keys(SCORERS).sort(), [
    'abstention',
    'boolean',
    'file_localization',
    'multiple_choice',
    'numeric_order_of_magnitude',
    'probability_brier',
  ]);
  assert.equal(scoreWithAdapter('boolean', 'ANSWER: Yes', true).correct, true);
  assert.equal(scoreWithAdapter('unknown', 'x', true).failure.type, 'scoring');
});

// --- runObjectiveItems denominators ---

test('runObjectiveItems retains every attempted arm/item/trial including failures', async () => {
  const envelope = await runObjectiveItems({
    studyId: 'obj-test',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'heldout', sha256: 'd'.repeat(64) },
    arms: [
      { id: 'none' },
      { id: 'skill', skillContent: 'do the skill' },
    ],
    solver: { model: 'fixture-model', effort: 'low' },
    scorer: 'boolean',
    trials: 2,
    items: [
      {
        id: 'i1',
        prompt: 'Is 2 even?',
        label: true,
        fixture_responses: {
          none: 'ANSWER: Yes',
          skill: 'ANSWER: Yes',
        },
      },
      {
        id: 'i2',
        prompt: 'Is sky green?',
        label: false,
        fixture_responses: {
          none: 'not sure', // parse failure
          skill: { ok: false, failure: { type: 'transport', message: 'timeout' } },
        },
      },
    ],
  });

  // 2 items × 2 trials × 2 arms = 8 attempted rows, none dropped
  assert.equal(envelope.items.length, 8);
  assert.equal(envelope.health.attempted, 8);
  assert.ok(envelope.health.failures >= 1);
  assert.equal(envelope.health.decision_eligible, false);
  assert.ok(envelope.items.every((row) => Object.prototype.hasOwnProperty.call(row, 'parsed_success')));
  assert.ok(envelope.items.some((row) => row.failure && row.failure.type === 'parse'));
  assert.ok(envelope.items.some((row) => row.failure && row.failure.type === 'transport'));
  assert.ok(envelope.items.some((row) => row.scored && row.correct === true));
  const v = validateResultEnvelope(envelope);
  assert.equal(v.ok, true, v.errors && v.errors.join('; '));
  assert.equal(envelope.usage.calls, 0);
});

test('none control prompt used for none arm; skill arm injects body', async () => {
  const seen = [];
  const envelope = await runObjectiveItems({
    studyId: 'prompt-shape',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'heldout', sha256: 'd'.repeat(64) },
    arms: [
      { id: 'none' },
      { id: 'equal_budget_placebo', skillContent: 'one two three four five' },
      { id: 'skill', skillContent: 'UNIQUE_SKILL_BODY_XYZ' },
    ],
    solver: { model: 'fixture-model' },
    scorer: 'boolean',
    items: [{ id: 'only', prompt: 'Decide now', label: true }],
    solve: async ({ armId, prompt }) => {
      seen.push({ armId, prompt });
      return { ok: true, text: 'ANSWER: Yes', usage: { calls: 1, input_tokens: 3, output_tokens: 1 } };
    },
  });
  assert.equal(envelope.health.attempted, 3);
  assert.equal(envelope.health.scored, 3);
  const noneP = seen.find((s) => s.armId === 'none').prompt;
  const placeP = seen.find((s) => s.armId === 'equal_budget_placebo').prompt;
  const skillP = seen.find((s) => s.armId === 'skill').prompt;
  assert.doesNotMatch(noneP, /UNIQUE_SKILL|context-padding/);
  assert.match(placeP, /context-padding|PAD_/);
  assert.match(skillP, /UNIQUE_SKILL_BODY_XYZ/);
});

// --- routing balanced accuracy nulls ---

test('balanced accuracy treats null predictions as incorrect on both classes', () => {
  const rows = [
    { label: true, skill_yes: true },
    { label: true, skill_yes: null }, // miss on positive
    { label: false, skill_yes: false },
    { label: false, skill_yes: null }, // must NOT count as TN
  ];
  // TPR = 1/2, TNR = 1/2 → 0.5 (if null counted as TN, TNR would be 1.0 and bal=0.75)
  assert.equal(balancedAcc(rows, 'skill_yes'), 0.5);

  const allNullNeg = [
    { label: false, skill_yes: null },
    { label: false, skill_yes: null },
    { label: true, skill_yes: true },
  ];
  // TPR=1, TNR=0 → 0.5
  assert.equal(balancedAcc(allNullNeg, 'skill_yes'), 0.5);
});

test('observation checkpoint invalidates when item prompt changes', async () => {
  const base = {
    studyId: 'obs-ckpt',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'heldout', sha256: 'd'.repeat(64) },
    arms: [{ id: 'none' }],
    solver: { model: 'fixture-model' },
    scorer: 'boolean',
    items: [{
      id: 'i1',
      prompt: 'original prompt text',
      label: true,
      fixture_responses: { none: 'ANSWER: Yes' },
    }],
  };
  const a = await runObjectiveItems(base);
  const b = await runObjectiveItems({
    ...base,
    items: [{
      id: 'i1',
      prompt: 'CHANGED prompt text',
      label: true,
      fixture_responses: { none: 'ANSWER: Yes' },
    }],
  });
  assert.ok(a.items[0].observation_checkpoint_key);
  assert.ok(b.items[0].observation_checkpoint_key);
  assert.notEqual(
    a.items[0].observation_checkpoint_key,
    b.items[0].observation_checkpoint_key,
  );
  // identity key (study/item/trial/arm) stays the same
  assert.equal(a.items[0].key, b.items[0].key);
});

test('arm prompt_sha256 aggregates all item prompts', async () => {
  const mk = async (prompts, armExtra = {}) => runObjectiveItems({
    studyId: 'arm-hash',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'heldout', sha256: 'd'.repeat(64) },
    arms: [{ id: 'none', ...armExtra }],
    solver: { model: 'fixture-model' },
    scorer: 'boolean',
    items: prompts.map((prompt, i) => ({
      id: `i${i}`,
      prompt,
      label: true,
      fixture_responses: { none: 'ANSWER: Yes' },
    })),
  });
  const one = await mk(['only one']);
  const two = await mk(['only one', 'second item prompt']);
  const twoChanged = await mk(['only one', 'SECOND item prompt CHANGED']);
  assert.notEqual(one.arms[0].prompt_sha256, two.arms[0].prompt_sha256);
  assert.notEqual(two.arms[0].prompt_sha256, twoChanged.arms[0].prompt_sha256);

  // Declared arm.prompt_sha256 must not mask second-item prompt changes.
  const fixed = 'f'.repeat(64);
  const withFixed = await mk(['only one', 'second item prompt'], { prompt_sha256: fixed });
  const withFixedChanged = await mk(['only one', 'SECOND item prompt CHANGED'], { prompt_sha256: fixed });
  assert.notEqual(withFixed.arms[0].prompt_sha256, withFixedChanged.arms[0].prompt_sha256);
  assert.notEqual(withFixed.arms[0].prompt_sha256, fixed);
});

test('per_arm accuracy is ITT correct/attempted and failures do not shrink denominator', async () => {
  const envelope = await runObjectiveItems({
    studyId: 'itt-acc',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'heldout', sha256: 'd'.repeat(64) },
    arms: [{ id: 'none' }],
    solver: { model: 'fixture-model' },
    scorer: 'boolean',
    items: [
      { id: 'ok', prompt: 'Q1', label: true, fixture_responses: { none: 'ANSWER: Yes' } },
      { id: 'parse-fail', prompt: 'Q2', label: true, fixture_responses: { none: 'nope' } },
      {
        id: 'transport-fail',
        prompt: 'Q3',
        label: true,
        fixture_responses: { none: { ok: false, failure: { type: 'transport', message: 'down' } } },
      },
    ],
  });
  const arm = envelope.statistics.per_arm.none;
  assert.equal(arm.attempted, 3);
  assert.equal(arm.scored, 1);
  assert.equal(arm.correct, 1);
  // ITT accuracy = 1/3, not 1/1
  assert.equal(arm.accuracy, 1 / 3);
  assert.equal(arm.conditional_accuracy, 1);
  assert.equal(envelope.health.attempted, 3);
  assert.equal(envelope.items.length, 3);
});

test('live solve usage counts attempts latency cache and estimated cost', async () => {
  const envelope = await runObjectiveItems({
    studyId: 'usage',
    studyVersion: '1',
    preregistrationSha256: 'p'.repeat(64),
    dataset: { source: 'fixture', version: '1', split: 'smoke', sha256: 'd'.repeat(64) },
    arms: [{ id: 'none' }],
    solver: { model: 'fixture-model' },
    scorer: 'boolean',
    items: [{ id: 'one', prompt: 'Q', label: true }],
    solve: async () => ({
      ok: true,
      text: 'ANSWER: Yes',
      attempts: 1,
      durationMs: 25,
      usage: {
        input_tokens: 7,
        output_tokens: 3,
        cache_read_tokens: 2,
        est_cost_usd: 0.004,
      },
    }),
  });
  assert.deepEqual(envelope.usage, {
    input_tokens: 7,
    output_tokens: 3,
    cached_tokens: 2,
    calls: 1,
    latency_ms: 25,
    estimated_cost_usd: 0.004,
  });
});
