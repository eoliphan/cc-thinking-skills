'use strict';

const {
  sha256,
  itemKey,
  checkpointKey,
  observationCheckpointKey,
  failureRecord,
  createResultEnvelope,
  defaultUsage,
} = require('./result');
const { buildConditionPrompt, normalizeCondition, defaultTokenCounter } = require('./conditions');

function okScore({ parsed, value, correct }) {
  return {
    parsed,
    scored: true,
    value: value !== undefined ? value : parsed,
    correct: Boolean(correct),
    failure: null,
  };
}

function failScore({ type = 'parse', message, parsed = null, value = null, details = null }) {
  return {
    parsed,
    scored: false,
    value,
    correct: false,
    failure: failureRecord({ type, message, details }),
  };
}

function lastAnswerMatch(text, pattern) {
  if (text == null) return null;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let m;
  let last = null;
  while ((m = re.exec(String(text))) !== null) last = m;
  return last;
}

/** Boolean / yes-no gold. Accepts boolean gold or yes/no/true/false strings. */
function scoreBoolean(text, gold, options = {}) {
  const m = lastAnswerMatch(text, /ANSWER:\s*(yes|no|true|false)\b/i)
    || String(text || '').match(/\b(yes|no|true|false)\b\s*\.?\s*$/i);
  if (!m) return failScore({ type: 'parse', message: 'no boolean ANSWER found' });
  const token = m[1].toLowerCase();
  const parsed = token === 'yes' || token === 'true';
  let expected;
  if (typeof gold === 'boolean') expected = gold;
  else if (gold == null) return failScore({ type: 'scoring', message: 'missing boolean gold', parsed, value: parsed });
  else {
    const g = String(gold).trim().toLowerCase();
    if (g === 'yes' || g === 'true' || g === '1') expected = true;
    else if (g === 'no' || g === 'false' || g === '0') expected = false;
    else return failScore({ type: 'scoring', message: `unrecognized boolean gold: ${gold}`, parsed, value: parsed });
  }
  return okScore({ parsed, value: parsed, correct: parsed === expected });
}

/** Multiple choice letter A-E (or custom letters). */
function scoreMultipleChoice(text, gold, options = {}) {
  const letters = options.letters || 'ABCDE';
  const classRe = new RegExp(`ANSWER:\\s*([${letters}])\\b`, 'i');
  const m = lastAnswerMatch(text, classRe)
    || String(text || '').match(new RegExp(`\\b([${letters}])\\b\\s*\\.?\\s*$`, 'i'));
  if (!m) return failScore({ type: 'parse', message: 'no multiple-choice ANSWER found' });
  const parsed = m[1].toUpperCase();
  if (gold == null || gold === '') {
    return failScore({ type: 'scoring', message: 'missing multiple-choice gold', parsed, value: parsed });
  }
  const expected = String(gold).trim().toUpperCase();
  if (!new RegExp(`^[${letters}]$`, 'i').test(expected)) {
    return failScore({ type: 'scoring', message: `gold letter out of range: ${gold}`, parsed, value: parsed });
  }
  return okScore({ parsed, value: parsed, correct: parsed === expected });
}

/**
 * Abstention scorer. Gold is { answerable: bool } or boolean answerable.
 * Correct when abstain on unanswerable and answer on answerable.
 */
function scoreAbstention(text, gold, options = {}) {
  if (text == null || String(text).trim() === '') {
    return failScore({ type: 'parse', message: 'empty response for abstention scoring' });
  }
  const answerable = typeof gold === 'boolean' ? gold
    : (gold && typeof gold === 'object' ? Boolean(gold.answerable) : null);
  if (answerable == null) {
    return failScore({ type: 'scoring', message: 'missing answerable gold' });
  }

  const m = String(text).match(/ANSWER:\s*([\s\S]+)$/i);
  const tail = (m ? m[1] : text).trim();
  let abstained = false;
  if (/^unanswerable\b/i.test(tail)) abstained = true;
  else if (/\bunanswerable\b/i.test(tail) && tail.length < 60) abstained = true;
  else if (/\b(cannot|can'?t|impossible to|no one can|not knowable|unknowable|no way to know)\b/i.test(tail) && tail.length < 80) {
    abstained = true;
  }

  const correct = answerable ? !abstained : abstained;
  return okScore({
    parsed: abstained ? 'UNANSWERABLE' : 'ANSWERED',
    value: { abstained, answerable },
    correct,
  });
}

function parseScientificNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/,/g, '').replace(/\s/g, '').replace(/[×x]10\^?/, 'e');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Numeric order-of-magnitude: |log10(|est|/|gold|)| <= tolerance (default 1). */
function scoreNumericOrderOfMagnitude(text, gold, options = {}) {
  const tolerance = options.tolerance != null ? Number(options.tolerance) : 1;
  const m = lastAnswerMatch(text, /ANSWER:\s*\$?\s*(-?[\d,]*\.?\d+(?:\s*[eE]\s*[-+]?\d+)?(?:\s*[×x]\s*10\^?-?\d+)?)/);
  let est = m ? parseScientificNumber(m[1]) : null;
  if (est == null) {
    const all = String(text || '').match(/-?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?/g);
    est = all ? parseScientificNumber(all[all.length - 1]) : null;
  }
  if (est == null || !Number.isFinite(est) || est === 0) {
    return failScore({ type: 'parse', message: 'no finite non-zero numeric ANSWER found', parsed: est });
  }
  const expected = typeof gold === 'number' ? gold
    : (gold && typeof gold === 'object' && gold.answer_num != null ? Number(gold.answer_num)
      : Number(gold));
  if (!Number.isFinite(expected) || expected === 0) {
    return failScore({ type: 'scoring', message: 'invalid numeric gold', parsed: est, value: est });
  }
  const delta = Math.abs(Math.log10(Math.abs(est) / Math.abs(expected)));
  return okScore({ parsed: est, value: { estimate: est, gold: expected, log10_delta: delta }, correct: delta <= tolerance });
}

/**
 * Probability Brier score. Gold is 0/1 outcome (or {answer_bin}).
 * value holds probability + brier; correct uses threshold 0.5 vs outcome.
 */
function scoreProbabilityBrier(text, gold, options = {}) {
  const m = lastAnswerMatch(text, /ANSWER:\s*(-?\d+(?:\.\d+)?)\s*%?/i);
  if (!m) return failScore({ type: 'parse', message: 'no probability ANSWER found' });
  let p = parseFloat(m[1]);
  if (/%/.test(m[0]) || Math.abs(p) > 1) p = p / 100;
  // Clamp to [0,1]
  p = Math.max(0, Math.min(1, p));
  if (!Number.isFinite(p)) return failScore({ type: 'parse', message: 'non-finite probability', parsed: p });

  let outcome;
  if (typeof gold === 'number') outcome = gold;
  else if (typeof gold === 'boolean') outcome = gold ? 1 : 0;
  else if (gold && typeof gold === 'object' && gold.answer_bin != null) outcome = Number(gold.answer_bin);
  else outcome = Number(gold);
  if (!(outcome === 0 || outcome === 1)) {
    return failScore({ type: 'scoring', message: 'probability gold must be 0 or 1', parsed: p, value: p });
  }
  const brier = Math.pow(p - outcome, 2);
  const correct = (p > 0.5 ? 1 : 0) === outcome;
  return okScore({
    parsed: p,
    value: { probability: p, outcome, brier },
    correct,
  });
}

function normalizeRepoPath(p) {
  if (p == null) return null;
  let s = String(p).trim().replace(/\\/g, '/');
  s = s.replace(/^[`'"]+|[`'"]+$/g, '');
  return s;
}

/** Reject absolute, drive, UNC, and parent-escape paths before inventory matching. */
function forbiddenRepoPathReason(raw) {
  if (raw == null) return 'empty path';
  const original = String(raw).trim();
  if (!original) return 'empty path';
  // Drive / UNC checks on the original (before slash normalization alone would hide them).
  if (/^[a-zA-Z]:/.test(original)) return 'drive path not allowed';
  if (original.startsWith('\\\\') || original.startsWith('//')) return 'UNC path not allowed';
  const s = original.replace(/\\/g, '/');
  if (s.startsWith('/')) return 'absolute path not allowed';
  // Normalize only relative form for segment checks; never strip a leading slash to salvage.
  const rel = s.replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  const segments = rel.split('/').filter((part) => part && part !== '.');
  if (segments.some((part) => part === '..')) return 'parent segment not allowed';
  return null;
}

function toRepoRelativePath(raw) {
  const reason = forbiddenRepoPathReason(raw);
  if (reason) return { ok: false, path: null, reason };
  let s = String(raw).trim().replace(/\\/g, '/');
  s = s.replace(/^[`'"]+|[`'"]+$/g, '');
  s = s.replace(/^\.\//, '').replace(/\/{2,}/g, '/');
  if (!s || s.endsWith('/')) return { ok: false, path: s || null, reason: 'empty or directory path' };
  return { ok: true, path: s, reason: null };
}

/**
 * Strict file localization parse:
 * - exactly one terminal ANSWER: <repo-relative-path> line
 * - only whitespace may follow that line
 * - normalize separators and ./ only for relative paths
 * - reject absolute/drive/UNC/.. paths before inventory matching
 * - reject directories, multi-token paths, paths outside inventory
 */
function parseFileLocalization(text, options = {}) {
  const inventory = options.repositoryFiles || options.fileInventory || options.inventory || null;
  const raw = String(text == null ? '' : text);

  // Collect every ANSWER line. Exactly one is required — duplicates fail even if identical.
  const answerLineRe = /^\s*ANSWER:\s*(.+?)\s*$/gim;
  const answers = [];
  let m;
  while ((m = answerLineRe.exec(raw)) !== null) {
    answers.push(m[1].trim());
  }
  if (answers.length === 0) {
    return {
      ok: false,
      parsed: null,
      failure: failureRecord({ type: 'parse', message: 'no terminal ANSWER: path line found' }),
    };
  }
  if (answers.length !== 1) {
    return {
      ok: false,
      parsed: null,
      failure: failureRecord({
        type: 'parse',
        message: 'multiple ANSWER lines (exactly one terminal ANSWER required)',
        details: { answers },
      }),
    };
  }

  // Terminal: after stripping trailing whitespace, the sole ANSWER line must end the text.
  // Any non-whitespace after the ANSWER line is a parse failure.
  const stripped = raw.replace(/\s+$/u, '');
  const terminalRe = /(?:^|\n)\s*ANSWER:\s*(\S+)\s*$/i;
  const terminal = stripped.match(terminalRe);
  if (!terminal) {
    // Distinguish trailing prose after a path vs multi-token path on the ANSWER line.
    const looseTerminal = stripped.match(/(?:^|\n)\s*ANSWER:\s*(.+)$/i);
    if (!looseTerminal) {
      return {
        ok: false,
        parsed: null,
        failure: failureRecord({
          type: 'parse',
          message: 'ANSWER line is not terminal (non-whitespace content follows)',
        }),
      };
    }
    const loose = looseTerminal[1].trim();
    if (/\s/.test(loose)) {
      return {
        ok: false,
        parsed: null,
        failure: failureRecord({
          type: 'parse',
          message: 'ANSWER path must be a single terminal path token without trailing text',
          details: { raw: loose },
        }),
      };
    }
    return {
      ok: false,
      parsed: null,
      failure: failureRecord({
        type: 'parse',
        message: 'ANSWER line is not terminal (non-whitespace content follows)',
      }),
    };
  }

  const rawPath = terminal[1].trim();
  const converted = toRepoRelativePath(rawPath);
  if (!converted.ok) {
    return {
      ok: false,
      parsed: null,
      failure: failureRecord({
        type: 'parse',
        message: converted.reason || 'invalid ANSWER path',
        details: { raw: rawPath },
      }),
    };
  }
  const parsed = converted.path;

  if (inventory && Array.isArray(inventory)) {
    const inv = new Set();
    for (const entry of inventory) {
      const c = toRepoRelativePath(entry);
      if (c.ok) inv.add(c.path);
    }
    if (!inv.has(parsed)) {
      return {
        ok: false,
        parsed,
        failure: failureRecord({
          type: 'parse',
          message: 'ANSWER path outside repository file inventory',
          details: { path: parsed },
        }),
      };
    }
  } else if (!parsed.includes('/') && options.requireNestedPath) {
    return {
      ok: false,
      parsed,
      failure: failureRecord({ type: 'parse', message: 'basename-only ANSWER rejected without inventory match' }),
    };
  }

  return { ok: true, parsed, failure: null };
}

function scoreFileLocalization(text, gold, options = {}) {
  const parsedResult = parseFileLocalization(text, options);
  if (!parsedResult.ok) {
    return {
      parsed: parsedResult.parsed,
      scored: false,
      value: parsedResult.parsed,
      correct: false,
      failure: parsedResult.failure,
    };
  }
  const parsed = parsedResult.parsed;
  let goldPaths = [];
  if (Array.isArray(gold)) goldPaths = gold;
  else if (gold && typeof gold === 'object') {
    goldPaths = gold.gold_files || gold.files || gold.paths || [];
    if (!goldPaths.length && gold.path) goldPaths = [gold.path];
  } else if (gold != null) goldPaths = [gold];

  goldPaths = goldPaths.map((g) => {
    const c = toRepoRelativePath(g);
    return c.ok ? c.path : null;
  }).filter(Boolean);
  if (!goldPaths.length) {
    return failScore({ type: 'scoring', message: 'missing gold file path(s)', parsed, value: parsed });
  }
  const correct = goldPaths.includes(parsed);
  return okScore({ parsed, value: parsed, correct });
}

const SCORERS = {
  boolean: scoreBoolean,
  multiple_choice: scoreMultipleChoice,
  abstention: scoreAbstention,
  numeric_order_of_magnitude: scoreNumericOrderOfMagnitude,
  probability_brier: scoreProbabilityBrier,
  file_localization: scoreFileLocalization,
};

function scoreWithAdapter(name, text, gold, options = {}) {
  const key = String(name || '').toLowerCase().replace(/-/g, '_');
  const fn = SCORERS[key];
  if (!fn) {
    return failScore({ type: 'scoring', message: `unknown scorer: ${name}` });
  }
  try {
    return fn(text, gold, options);
  } catch (err) {
    return failScore({
      type: 'scoring',
      message: err && err.message ? err.message : String(err),
      details: { scorer: key },
    });
  }
}

function goldForItem(item, scorerName) {
  if (!item) return null;
  const key = String(scorerName || item.scorer || item.mode || '').toLowerCase().replace(/-/g, '_');
  if (item.gold !== undefined) return item.gold;
  if (key === 'boolean' || key === 'binary_decision') {
    if (typeof item.label === 'boolean') return item.label;
    if (item.answer != null) return item.answer;
  }
  if (key === 'multiple_choice') return item.answer_idx != null ? item.answer_idx : item.answer;
  if (key === 'abstention') return { answerable: item.answerable };
  if (key === 'numeric_order_of_magnitude') return item.answer_num != null ? item.answer_num : item.answer;
  if (key === 'probability_brier') return item.answer_bin != null ? item.answer_bin : item.answer;
  if (key === 'file_localization') return item.gold_files || item.gold || item.files;
  return item.answer != null ? item.answer : item.label;
}

function sumUsage(a, b) {
  const x = defaultUsage(a);
  const y = defaultUsage(b);
  return {
    input_tokens: x.input_tokens + y.input_tokens,
    output_tokens: x.output_tokens + y.output_tokens,
    cached_tokens: x.cached_tokens + y.cached_tokens,
    calls: x.calls + y.calls,
    latency_ms: x.latency_ms + y.latency_ms,
    estimated_cost_usd: x.estimated_cost_usd + y.estimated_cost_usd,
  };
}

function normalizeSolveUsage(result, countDefaultCall = false) {
  const value = result || {};
  const raw = value.usage || {};
  return defaultUsage({
    input_tokens: raw.input_tokens || 0,
    output_tokens: raw.output_tokens || 0,
    cached_tokens: raw.cached_tokens || raw.cache_read_tokens || raw.cache_read_input_tokens || 0,
    calls: raw.calls != null
      ? raw.calls
      : (value.attempts != null ? value.attempts : (countDefaultCall ? 1 : 0)),
    latency_ms: raw.latency_ms != null
      ? raw.latency_ms
      : (countDefaultCall && value.durationMs != null ? value.durationMs : 0),
    estimated_cost_usd: raw.estimated_cost_usd != null
      ? raw.estimated_cost_usd
      : (raw.est_cost_usd || 0),
  });
}

/**
 * Run every arm × item × trial. Never drops attempted rows.
 *
 * @param {object} spec
 * @param {string} spec.studyId
 * @param {string} spec.studyVersion
 * @param {string} spec.preregistrationSha256
 * @param {object} spec.dataset
 * @param {Array}  spec.arms - [{id, prompt_sha256?, skill_sha256?, skillContent?, condition?}]
 * @param {object|string} spec.solver
 * @param {Array}  spec.items
 * @param {number} [spec.trials=1]
 * @param {string|function} spec.scorer - adapter name or custom (text,item,arm)=>score
 * @param {object} [spec.scorerOptions]
 * @param {function} [spec.solve] - async ({item, arm, trial, prompt}) => {ok,text,usage,failure,...}
 * @param {function} [spec.buildPrompt] - optional override ({item, arm}) => string
 * @param {string} [spec.createdAt]
 */
async function runObjectiveItems(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('runObjectiveItems: spec required');
  const itemsIn = Array.isArray(spec.items) ? spec.items : [];
  const armsIn = Array.isArray(spec.arms) ? spec.arms : [];
  if (!armsIn.length) throw new TypeError('runObjectiveItems: arms required');
  const trials = Number.isInteger(spec.trials) && spec.trials > 0 ? spec.trials : 1;
  const scorerName = typeof spec.scorer === 'string' ? spec.scorer : (spec.scorerName || null);
  const scorerFn = typeof spec.scorer === 'function' ? spec.scorer : null;
  const scorerOptions = spec.scorerOptions || {};
  const solve = typeof spec.solve === 'function' ? spec.solve : null;
  const buildPrompt = typeof spec.buildPrompt === 'function' ? spec.buildPrompt : null;
  const solverModel = typeof spec.solver === 'string'
    ? spec.solver
    : (spec.solver && spec.solver.model) || 'unknown';
  const judgeModels = (spec.judges || []).map((j) => (typeof j === 'string' ? j : j.model)).filter(Boolean);

  const armMeta = armsIn.map((arm) => {
    const id = arm.id || arm.arm_id || normalizeCondition(arm.condition) || 'arm';
    const skillContent = arm.skillContent != null ? arm.skillContent : (arm.skill_content || null);
    return {
      id: String(id),
      condition: normalizeCondition(arm.condition || arm.id),
      skillContent,
      skillName: arm.skillName || arm.skill_name || null,
      // Collect every item prompt hash for this arm; aggregate after the loop.
      promptHashes: [],
      fixed_prompt_sha256: arm.prompt_sha256 || null,
      skill_sha256: arm.skill_sha256 != null ? arm.skill_sha256 : (skillContent != null ? sha256(skillContent) : null),
      tokenBudget: arm.tokenBudget,
      raw: arm,
    };
  });

  const outItems = [];
  const failures = [];
  let usage = defaultUsage(spec.usage);
  let attempted = 0;
  let completed = 0;
  let scored = 0;

  function pushRow(row) {
    outItems.push(row);
  }

  function observationKeyFor({ itemId, trial, armId, promptHash, skillHash }) {
    // Bind row-specific prompt/skill/solver/judges into the compatibility key, then
    // observationCheckpointKey binds item/trial/arm.
    const compatibilityKey = checkpointKey({
      studyId: spec.studyId,
      studyVersion: spec.studyVersion,
      datasetSha256: (spec.dataset && spec.dataset.sha256) || 'missing-dataset-sha256',
      promptSha256: promptHash || 'missing-prompt-sha256',
      skillSha256: skillHash || null,
      solver: solverModel,
      judges: judgeModels,
    });
    return observationCheckpointKey({
      compatibilityKey,
      itemId,
      trial,
      armId,
    });
  }

  for (const item of itemsIn) {
    const itemId = String(item.id || item.item_id || item.instance_id || '');
    if (!itemId) throw new TypeError('runObjectiveItems: every item needs id');
    for (let trial = 1; trial <= trials; trial++) {
      for (const arm of armMeta) {
        attempted += 1;
        const identityKey = itemKey({
          studyId: spec.studyId,
          itemId,
          trial,
          armId: arm.id,
        });

        let prompt;
        try {
          prompt = buildPrompt
            ? buildPrompt({ item, arm: arm.raw, armId: arm.id, trial })
            : buildConditionPrompt(
              arm.condition,
              item.prompt || item.problem || item.text || '',
              arm.skillContent,
              arm.skillName || arm.id,
              {
                tokenBudget: arm.tokenBudget,
                tokenCounter: scorerOptions.tokenCounter || defaultTokenCounter,
                tail: item.answer_instruction
                  ? `\n\n${item.answer_instruction}`
                  : (item.decision_instruction
                    ? `\n\n${item.decision_instruction}\nEnd your response with exactly: ANSWER: <Yes or No>`
                    : undefined),
              },
            );
        } catch (err) {
          const failure = failureRecord({
            type: 'scoring',
            message: err && err.message ? err.message : String(err),
            itemId,
            armId: arm.id,
            trial,
          });
          failures.push(failure);
          const obsKey = observationKeyFor({
            itemId,
            trial,
            armId: arm.id,
            promptHash: null,
            skillHash: arm.skill_sha256,
          });
          pushRow({
            item_id: itemId,
            trial,
            arm_id: arm.id,
            key: identityKey,
            observation_checkpoint_key: obsKey,
            completed: false,
            parsed_success: false,
            scored: false,
            correct: false,
            parsed: null,
            value: null,
            prompt_sha256: null,
            response_sha256: null,
            usage: defaultUsage(),
            failure,
          });
          continue;
        }

        const promptHash = sha256(prompt);
        arm.promptHashes.push(promptHash);
        const obsKey = observationKeyFor({
          itemId,
          trial,
          armId: arm.id,
          promptHash,
          skillHash: arm.skill_sha256,
        });

        let solveResult;
        if (solve) {
          try {
            solveResult = await solve({
              item,
              arm: arm.raw,
              armId: arm.id,
              trial,
              prompt,
              key: identityKey,
              observationCheckpointKey: obsKey,
            });
          } catch (err) {
            solveResult = {
              ok: false,
              text: null,
              failure: failureRecord({
                type: 'transport',
                message: err && err.message ? err.message : String(err),
                itemId,
                armId: arm.id,
                trial,
              }),
            };
          }
        } else if (item.fixture_responses && item.fixture_responses[arm.id] != null) {
          const fr = item.fixture_responses[arm.id];
          solveResult = typeof fr === 'string'
            ? { ok: true, text: fr, usage: { calls: 0 } }
            : {
              ok: fr.ok !== false,
              text: fr.text != null ? fr.text : null,
              usage: fr.usage,
              failure: fr.failure || null,
            };
        } else if (spec.fixtureMode) {
          solveResult = {
            ok: false,
            text: null,
            failure: failureRecord({
              type: 'transport',
              message: 'fixture mode: missing fixture_responses for arm',
              itemId,
              armId: arm.id,
              trial,
            }),
          };
        } else {
          throw new TypeError('runObjectiveItems: solve callback or fixture_responses required');
        }

        const rowUsage = normalizeSolveUsage(solveResult, Boolean(solve));
        usage = sumUsage(usage, rowUsage);

        if (!solveResult || solveResult.ok === false) {
          const failure = solveResult && solveResult.failure
            ? {
              ...solveResult.failure,
              item_id: solveResult.failure.item_id != null ? solveResult.failure.item_id : itemId,
              arm_id: solveResult.failure.arm_id != null ? solveResult.failure.arm_id : arm.id,
              trial: solveResult.failure.trial != null ? solveResult.failure.trial : trial,
            }
            : failureRecord({
              type: (solveResult && solveResult.failureType) || 'transport',
              message: (solveResult && (solveResult.error || solveResult.message)) || 'solve failed',
              itemId,
              armId: arm.id,
              trial,
              attempt: solveResult && solveResult.attempts,
            });
          failures.push(failure);
          pushRow({
            item_id: itemId,
            trial,
            arm_id: arm.id,
            key: identityKey,
            observation_checkpoint_key: obsKey,
            completed: false,
            parsed_success: false,
            scored: false,
            correct: false,
            parsed: null,
            value: null,
            prompt_sha256: promptHash,
            response_sha256: solveResult && solveResult.text != null ? sha256(solveResult.text) : null,
            usage: rowUsage,
            failure,
            attempts: solveResult && solveResult.attempts != null ? solveResult.attempts : null,
            duration_ms: solveResult && solveResult.durationMs != null ? solveResult.durationMs : null,
          });
          continue;
        }

        completed += 1;
        const text = solveResult.text;
        const responseHash = text != null ? sha256(text) : null;

        let score;
        if (scorerFn) {
          try {
            score = scorerFn(text, item, arm.raw, scorerOptions);
          } catch (err) {
            score = failScore({
              type: 'scoring',
              message: err && err.message ? err.message : String(err),
            });
          }
        } else {
          const name = scorerName || item.scorer || item.mode || 'boolean';
          const gold = goldForItem(item, name);
          const opts = {
            ...scorerOptions,
            repositoryFiles: item.repository_files || item.file_inventory || scorerOptions.repositoryFiles,
          };
          score = scoreWithAdapter(name, text, gold, opts);
        }

        if (!score || typeof score !== 'object') {
          score = failScore({ type: 'scoring', message: 'scorer returned no result' });
        }

        const parsedSuccess = score.failure
          ? (score.failure.type !== 'parse' && score.parsed !== null && score.parsed !== undefined)
          : (score.parsed !== null && score.parsed !== undefined);

        if (score.failure) {
          const failure = {
            ...score.failure,
            item_id: itemId,
            arm_id: arm.id,
            trial,
          };
          failures.push(failure);
          pushRow({
            item_id: itemId,
            trial,
            arm_id: arm.id,
            key: identityKey,
            observation_checkpoint_key: obsKey,
            completed: true,
            parsed_success: parsedSuccess,
            scored: false,
            correct: false,
            parsed: score.parsed,
            value: score.value,
            prompt_sha256: promptHash,
            response_sha256: responseHash,
            usage: rowUsage,
            failure,
            attempts: solveResult.attempts != null ? solveResult.attempts : null,
            duration_ms: solveResult.durationMs != null ? solveResult.durationMs : null,
          });
          continue;
        }

        scored += 1;
        pushRow({
          item_id: itemId,
          trial,
          arm_id: arm.id,
          key: identityKey,
          observation_checkpoint_key: obsKey,
          completed: true,
          parsed_success: true,
          scored: true,
          correct: Boolean(score.correct),
          parsed: score.parsed,
          value: score.value,
          prompt_sha256: promptHash,
          response_sha256: responseHash,
          usage: rowUsage,
          failure: null,
          attempts: solveResult.attempts != null ? solveResult.attempts : null,
          duration_ms: solveResult.durationMs != null ? solveResult.durationMs : null,
        });
      }
    }
  }

  const envelopeArms = armMeta.map((arm) => {
    // Always derive from every generated item prompt. A declared arm.prompt_sha256
    // is bound as an extra input, never a substitute that can mask item changes.
    const parts = [...arm.promptHashes];
    if (arm.fixed_prompt_sha256) parts.push(arm.fixed_prompt_sha256);
    const prompt_sha256 = parts.length ? sha256(parts) : sha256(arm.id);
    return {
      id: arm.id,
      prompt_sha256,
      skill_sha256: arm.skill_sha256,
    };
  });

  const statistics = {
    ...(spec.statistics || {}),
    per_arm: {},
  };
  for (const arm of armMeta) {
    const rows = outItems.filter((r) => r.arm_id === arm.id);
    const scoredRows = rows.filter((r) => r.scored);
    // ITT: failures count as incorrect; denominator is attempted, never shrinks.
    const correct = rows.filter((r) => r.correct === true).length;
    const conditionalCorrect = scoredRows.filter((r) => r.correct === true).length;
    statistics.per_arm[arm.id] = {
      attempted: rows.length,
      completed: rows.filter((r) => r.completed).length,
      parsed: rows.filter((r) => r.parsed_success).length,
      scored: scoredRows.length,
      correct,
      accuracy: rows.length ? correct / rows.length : null,
      conditional_accuracy: scoredRows.length ? conditionalCorrect / scoredRows.length : null,
    };
  }

  const parsedCount = outItems.filter((r) => r.parsed_success).length;

  return createResultEnvelope({
    study_id: spec.studyId,
    study_version: spec.studyVersion,
    preregistration_sha256: spec.preregistrationSha256,
    dataset: spec.dataset,
    arms: envelopeArms,
    solver: spec.solver,
    judges: spec.judges || [],
    items: outItems,
    failures,
    usage,
    statistics,
    health: {
      attempted,
      completed,
      parsed: parsedCount,
      scored,
      failures: failures.length,
    },
    created_at: spec.createdAt,
  });
}

module.exports = {
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
  goldForItem,
  normalizeRepoPath,
  normalizeSolveUsage,
};
