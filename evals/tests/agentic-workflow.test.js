'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  AGENTIC_ARMS,
  extractRouteFromText,
  evalBranchRules,
  scoreRoute,
  scoreCaseResult,
  summarizeArms,
} = require('../lib/agentic');
const { runDynamicArm, runWorkflowArm } = require('../run-agentic');

test('evalBranchRules: schedules then branch when answer equals rule value', () => {
  const rules = [{ after: 'a', if: { decision_key: 'flag', equals: true }, then: ['b'], else: ['c'] }];
  assert.deepStrictEqual(evalBranchRules(rules, 'a', { flag: true }, new Set(['a']), new Set()), ['b']);
});

test('evalBranchRules: schedules else branch when answer differs from rule value', () => {
  const rules = [{ after: 'a', if: { decision_key: 'flag', equals: true }, then: ['b'], else: ['c'] }];
  assert.deepStrictEqual(evalBranchRules(rules, 'a', { flag: false }, new Set(['a']), new Set()), ['c']);
});

test('evalBranchRules: does not enqueue completed or already queued duplicates', () => {
  const rules = [{ after: 'a', if: { decision_key: 'flag', equals: true }, then: ['b', 'c', 'd'], else: [] }];
  assert.deepStrictEqual(evalBranchRules(rules, 'a', { flag: true }, new Set(['a', 'b']), new Set(['c'])), ['d']);
});

test('scoreRoute: identical routes are exact with Jaccard 1', () => {
  const scored = scoreRoute(['thinking-a', 'thinking-b'], ['thinking-a', 'thinking-b']);
  assert.strictEqual(scored.route_exact, true);
  assert.strictEqual(scored.route_jaccard, 1);
});

test('scoreRoute: partial overlap has expected Jaccard and is not exact', () => {
  const scored = scoreRoute(['thinking-a', 'thinking-c'], ['thinking-a', 'thinking-b']);
  assert.strictEqual(scored.route_exact, false);
  assert.strictEqual(scored.route_jaccard, 1 / 3);
});

function fixtureCase() {
  return {
    id: 'fixture',
    nodes: [
      { node_id: 'a', skill: 'thinking-a', label: true },
      { node_id: 'b', skill: 'thinking-b', label: false },
    ],
    gold_node_ids: ['a', 'b'],
  };
}

test('scoreCaseResult: wrong declared skill route fails even when node answers are correct', () => {
  const scored = scoreCaseResult(fixtureCase(), {
    parse_ok: true,
    selected_route: ['thinking-a'],
    selected_node_ids: ['a', 'b'],
    node_answers: [{ node_id: 'a', answer: true }, { node_id: 'b', answer: false }],
  });
  assert.strictEqual(scored.node_acc, 1);
  assert.strictEqual(scored.route_exact, false);
  assert.strictEqual(scored.node_route_exact, true);
  assert.strictEqual(scored.case_success, false);
});

test('scoreCaseResult: right skill route but wrong node route is not case_success', () => {
  const scored = scoreCaseResult(fixtureCase(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b'],
    selected_node_ids: ['a'],
    node_answers: [{ node_id: 'a', answer: true }, { node_id: 'b', answer: false }],
  });
  assert.strictEqual(scored.route_exact, true);
  assert.strictEqual(scored.node_route_exact, false);
  assert.strictEqual(scored.under_routing_count, 1);
  assert.strictEqual(scored.case_success, false);
});

test('scoreCaseResult: right route with one wrong node answer is not case_success', () => {
  const scored = scoreCaseResult(fixtureCase(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b'],
    selected_node_ids: ['a', 'b'],
    node_answers: [{ node_id: 'a', answer: true }, { node_id: 'b', answer: true }],
  });
  assert.strictEqual(scored.route_exact, true);
  assert.strictEqual(scored.node_route_exact, true);
  assert.strictEqual(scored.node_acc, 0.5);
  assert.strictEqual(scored.case_success, false);
});

test('scoreCaseResult: right route with all gold node labels correct is case_success', () => {
  const scored = scoreCaseResult(fixtureCase(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b'],
    selected_node_ids: ['a', 'b'],
    node_answers: [{ node_id: 'a', answer: true }, { node_id: 'b', answer: false }],
  });
  assert.strictEqual(scored.route_exact, true);
  assert.strictEqual(scored.node_route_exact, true);
  assert.strictEqual(scored.node_acc, 1);
  assert.strictEqual(scored.over_routing_count, 0);
  assert.strictEqual(scored.under_routing_count, 0);
  assert.strictEqual(scored.case_success, true);
});

test('scoreCaseResult: over-routing with extra node is not case_success', () => {
  const c = fixtureCase();
  c.nodes.push({ node_id: 'c', skill: 'thinking-c', label: true });
  const scored = scoreCaseResult(c, {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b', 'thinking-c'],
    selected_node_ids: ['a', 'b', 'c'],
    node_answers: [{ node_id: 'a', answer: true }, { node_id: 'b', answer: false }, { node_id: 'c', answer: true }],
  });
  assert.strictEqual(scored.node_acc, 1);
  assert.strictEqual(scored.over_routing_count, 1);
  assert.deepStrictEqual(scored.over_routing_node_ids, ['c']);
  assert.strictEqual(scored.case_success, false);
});

test('scoreCaseResult: under-routing with missing gold node is not case_success', () => {
  const scored = scoreCaseResult(fixtureCase(), {
    parse_ok: true,
    selected_route: ['thinking-a'],
    selected_node_ids: ['a'],
    node_answers: [{ node_id: 'a', answer: true }],
  });
  assert.strictEqual(scored.under_routing_count, 1);
  assert.deepStrictEqual(scored.under_routing_node_ids, ['b']);
  assert.strictEqual(scored.case_success, false);
});

function branchingFixture() {
  return {
    id: 'branch-fixture',
    nodes: [
      { node_id: 'gate', skill: 'thinking-a', label: true },
      { node_id: 'left', skill: 'thinking-b', label: true },
      { node_id: 'right', skill: 'thinking-c', label: false },
    ],
    gold_node_ids: ['gate', 'left'],
    workflow_branch_rules: [
      { after: 'gate', if: { decision_key: 'gate', equals: true }, then: ['left'], else: ['right'] },
    ],
  };
}

test('scoreCaseResult: correct route but wrong branch decision is not case_success', () => {
  const scored = scoreCaseResult(branchingFixture(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-c'],
    selected_node_ids: ['gate', 'right'],
    node_answers: [{ node_id: 'gate', answer: false }, { node_id: 'right', answer: false }],
  });
  assert.strictEqual(scored.over_routing_count, 1);
  assert.strictEqual(scored.under_routing_count, 1);
  assert.strictEqual(scored.branch_decision_acc, 0);
  assert.strictEqual(scored.case_success, false);
});

test('scoreCaseResult: correct route and correct branch decision is case_success', () => {
  const scored = scoreCaseResult(branchingFixture(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b'],
    selected_node_ids: ['gate', 'left'],
    node_answers: [{ node_id: 'gate', answer: true }, { node_id: 'left', answer: true }],
  });
  assert.strictEqual(scored.branch_decision_acc, 1);
  assert.strictEqual(scored.case_success, true);
});

function isolatedBranchFixture() {
  return {
    id: 'isolated-branch',
    nodes: [
      { node_id: 'gate', skill: 'thinking-a', label: true },
      { node_id: 'left', skill: 'thinking-b', label: true },
      { node_id: 'right', skill: 'thinking-c', label: false },
    ],
    gold_node_ids: ['left', 'right'],
    workflow_branch_rules: [
      { after: 'gate', if: { decision_key: 'gate', equals: true }, then: ['left'], else: ['right'] },
    ],
  };
}

test('scoreCaseResult: exact node route and all gold answers correct but wrong branch is not case_success', () => {
  const scored = scoreCaseResult(isolatedBranchFixture(), {
    parse_ok: true,
    selected_route: ['thinking-b', 'thinking-c'],
    selected_node_ids: ['left', 'right'],
    node_answers: [
      { node_id: 'gate', answer: false },
      { node_id: 'left', answer: true },
      { node_id: 'right', answer: false },
    ],
  });
  assert.strictEqual(scored.node_route_exact, true);
  assert.strictEqual(scored.over_routing_count, 0);
  assert.strictEqual(scored.under_routing_count, 0);
  assert.strictEqual(scored.node_acc, 1);
  assert.strictEqual(scored.branch_decision_acc, 0);
  assert.strictEqual(scored.case_success, false);
});

function emptyBranchFixture() {
  return {
    id: 'empty-branch-fixture',
    nodes: [
      { node_id: 'gate', skill: 'thinking-a', label: false },
      { node_id: 'extra', skill: 'thinking-b', label: true },
    ],
    gold_node_ids: ['gate', 'extra'],
    workflow_branch_rules: [
      { after: 'gate', if: { decision_key: 'gate', equals: true }, then: [], else: ['extra'] },
    ],
  };
}

test('scoreCaseResult: empty then with gold else branch, correct else-route is case_success', () => {
  const scored = scoreCaseResult(emptyBranchFixture(), {
    parse_ok: true,
    selected_route: ['thinking-a', 'thinking-b'],
    selected_node_ids: ['gate', 'extra'],
    node_answers: [
      { node_id: 'gate', answer: false },
      { node_id: 'extra', answer: true },
    ],
  });
  assert.strictEqual(scored.node_route_exact, true);
  assert.strictEqual(scored.over_routing_count, 0);
  assert.strictEqual(scored.under_routing_count, 0);
  assert.strictEqual(scored.node_acc, 1);
  assert.strictEqual(scored.branch_decision_acc, 1);
  assert.strictEqual(scored.case_success, true);
});

test('scoreCaseResult: empty then with gold else branch, wrong then-route is not case_success', () => {
  const scored = scoreCaseResult(emptyBranchFixture(), {
    parse_ok: true,
    selected_route: ['thinking-a'],
    selected_node_ids: ['gate'],
    node_answers: [
      { node_id: 'gate', answer: true },
    ],
  });
  assert.strictEqual(scored.branch_decision_acc, 0);
  assert.strictEqual(scored.under_routing_count, 1);
  assert.strictEqual(scored.case_success, false);
});

test('extractRouteFromText: recognizes slugs, preserves mention order, and rejects substrings', () => {
  const known = ['thinking-scientific-method', 'thinking-pre-mortem'];
  assert.deepStrictEqual(extractRouteFromText('Use thinking-scientific-method first.', known), ['thinking-scientific-method']);
  assert.deepStrictEqual(extractRouteFromText('Then use scientific-method.', known), ['thinking-scientific-method']);
  assert.deepStrictEqual(extractRouteFromText('Start with pre-mortem, then scientific-method.', known), ['thinking-pre-mortem', 'thinking-scientific-method']);
  assert.deepStrictEqual(extractRouteFromText('This is unscientific-methodology, not a route.', known), []);
});

test('summarizeArms: two-case fixture produces expected aggregate and stratum metrics', () => {
  const cases = [
    {
      id: 'one', stability: 'stable', branching: 'linear', novelty: 'familiar',
      by_arm: { arm_a: { case_success: true, route_exact: true, route_jaccard: 1, node_acc: 1, parse_ok: true } },
    },
    {
      id: 'two', stability: 'stable', branching: 'linear', novelty: 'familiar',
      by_arm: { arm_a: { case_success: false, route_exact: false, route_jaccard: 0.5, node_acc: 0, parse_ok: false } },
    },
  ];
  const out = summarizeArms(cases, ['arm_a']);
  assert.strictEqual(out.arm_a.n, 2);
  assert.strictEqual(out.arm_a.case_success_rate, 0.5);
  assert.strictEqual(out.arm_a.route_exact_rate, 0.5);
  assert.strictEqual(out.arm_a.route_jaccard_avg, 0.75);
  assert.strictEqual(out.arm_a.node_acc, 0.5);
  assert.strictEqual(out.arm_a.parse_ok_rate, 0.5);
  assert.deepStrictEqual(Object.keys(out.arm_a.by_stratum), ['stable|linear|familiar']);
  assert.strictEqual(out.arm_a.by_stratum['stable|linear|familiar'].n, 2);
});

test('agentic arm catalog uses honest self-check names', () => {
  assert.deepStrictEqual(AGENTIC_ARMS, [
    'dynamic_loose',
    'dynamic_typed',
    'dynamic_typed_self_checked',
    'workflow_loose',
    'workflow_typed',
    'workflow_none_typed',
    'workflow_typed_self_checked',
  ]);
  assert.ok(!AGENTIC_ARMS.some(arm => arm.includes('verified') || arm.includes('validated')));
});

function oneNodeCase() {
  return {
    id: 'independent-arm-case',
    case_brief: 'Decide the node.',
    nodes: [{
      node_id: 'node-1',
      skill: 'thinking-a',
      decision_key: 'flag',
      decision_instruction: 'Answer Yes or No.',
      prompt: 'Is the flag set?',
      label: true,
    }],
    initial_node_ids: ['node-1'],
    workflow_branch_rules: [],
    gold_node_ids: ['node-1'],
  };
}

test('dynamic typed and self-check arms make independent candidate calls', async () => {
  const prompts = [];
  const response = JSON.stringify({
    selected_route: ['thinking-a'],
    node_answers: [{ node_id: 'node-1', answer: true, rationale: 'set' }],
    final: 'done',
  });
  const fakeCall = async (_caseId, options) => {
    prompts.push(options.prompt);
    return { ok: true, text: response, attempts: 1 };
  };
  const workflowCase = oneNodeCase();

  await runDynamicArm(workflowCase, 'dynamic_typed', 'thinking-a: test', ['thinking-a'], fakeCall);
  await runDynamicArm(workflowCase, 'dynamic_typed_self_checked', 'thinking-a: test', ['thinking-a'], fakeCall);

  assert.strictEqual(prompts.length, 3);
  assert.strictEqual(prompts[0], prompts[1]);
  assert.notStrictEqual(prompts[1], prompts[2]);
});

test('workflow typed and self-check arms make independent node calls', async () => {
  const prompts = [];
  const fakeCall = async (_caseId, options) => {
    prompts.push(options.prompt);
    return { ok: true, text: JSON.stringify({ node_id: 'node-1', answer: true, rationale: 'set' }), attempts: 1 };
  };
  const workflowCase = oneNodeCase();
  const skillCache = new Map([['thinking-a', 'test skill']]);

  await runWorkflowArm(workflowCase, 'workflow_typed', skillCache, fakeCall);
  await runWorkflowArm(workflowCase, 'workflow_typed_self_checked', skillCache, fakeCall);

  assert.strictEqual(prompts.length, 3);
  assert.strictEqual(prompts[0], prompts[1]);
  assert.notStrictEqual(prompts[1], prompts[2]);
});

test('workflow no-skill arm changes only the guide block', async () => {
  const prompts = [];
  const fakeCall = async (_caseId, options) => {
    prompts.push(options.prompt);
    return { ok: true, text: JSON.stringify({ node_id: 'node-1', answer: true, rationale: 'direct' }), attempts: 1 };
  };
  const workflowCase = oneNodeCase();

  await runWorkflowArm(workflowCase, 'workflow_typed', new Map([['thinking-a', 'test skill']]), fakeCall);
  const result = await runWorkflowArm(workflowCase, 'workflow_none_typed', new Map(), fakeCall);

  assert.strictEqual(result.parse_ok, true);
  assert.strictEqual(prompts.length, 2);
  assert.strictEqual(prompts[1], prompts[0].replace('test skill', ''));
  assert.doesNotMatch(prompts[1], /without any thinking-skill guide/i);
});

test('workflow self-check reviews its own invalid candidate', async () => {
  const responses = [
    { ok: true, text: 'not json', attempts: 1 },
    { ok: true, text: JSON.stringify({ node_id: 'node-1', answer: true, rationale: 'repaired' }), attempts: 1 },
  ];
  const fakeCall = async () => responses.shift();
  const result = await runWorkflowArm(
    oneNodeCase(),
    'workflow_typed_self_checked',
    new Map([['thinking-a', 'test skill']]),
    fakeCall
  );

  assert.strictEqual(responses.length, 0);
  assert.strictEqual(result.parse_ok, true);
  assert.deepStrictEqual(result.node_answers, [{ node_id: 'node-1', answer: true, rationale: 'repaired' }]);
});
