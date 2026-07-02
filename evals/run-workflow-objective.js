#!/usr/bin/env node
'use strict';

/** Objective proof-arm eval for workflow-vs-full-skill binary decision labels. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { droidExecWithRetry, maxEffortFor, usageSummary, aggregateUsage } = require('./lib/droid');
const { runDir, writeJson, mapPool, runHealthWarnings } = require('./lib/io');
const { wilson, mcnemar } = require('./lib/stats');
const { buildFactorialPrompt, OBJECTIVE_AUTHORED_COVERAGE, objectiveForms } = require('./lib/workflow-prompts');
const { preregistrationMeta, runMetadata, claimStatus } = require('./lib/prereg');

const SOLVER = process.env.SOLVER_MODEL || 'claude-sonnet-4-6';
const SOLVER_EFFORT = process.env.SOLVER_EFFORT || 'medium';
const CONC = parseInt(process.env.CONC || '8', 10);
const LIMIT_PER_SKILL = process.env.LIMIT_PER_SKILL ? parseInt(process.env.LIMIT_PER_SKILL, 10) : null;
// SPLIT restricts items to one preregistered split (dev | heldout | replication).
// Unset = all rows (backward-compatible pilot behavior).
const SPLIT = process.env.SPLIT || null;
const OUTFILE = process.env.OUTFILE || path.join(runDir(), 'workflow-objective.json');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const REPO_ROOT = path.join(__dirname, '..');

const DATASETS = {
  'thinking-socratic': { file: 'evals/datasets/authored/socratic-clarify.jsonl', decision_key: 'ask_clarifying' },
  'thinking-cynefin': { file: 'evals/datasets/authored/cynefin-classify.jsonl', decision_key: 'unordered_problem' },
  'thinking-reversibility': { file: 'evals/datasets/authored/reversibility-doors.jsonl', decision_key: 'one_way_door' },
  'thinking-margin-of-safety': { file: 'evals/datasets/authored/margin-of-safety-provision.jsonl', decision_key: 'adequate_margin' },
  'thinking-map-territory': { file: 'evals/datasets/authored/map-territory-verify.jsonl', decision_key: 'map_contradicts_territory' },
  'thinking-pre-mortem': { file: 'evals/datasets/authored/pre-mortem-risk.jsonl', decision_key: 'pre_mortem_warranted' },
  'thinking-inversion': { file: 'evals/datasets/authored/inversion-failure-paths.jsonl', decision_key: 'inversion_warranted' },
  'thinking-red-team': { file: 'evals/datasets/authored/red-team-vulnerability.jsonl', decision_key: 'vulnerability_present' },
  'thinking-scientific-method': { file: 'evals/datasets/authored/scientific-method-hypothesis.jsonl', decision_key: 'hypothesis_needed' },
  'thinking-kepner-tregoe': { file: 'evals/datasets/authored/kepner-tregoe-selective-defect.jsonl', decision_key: 'selective_defect' },
  'thinking-five-whys-plus': { file: 'evals/datasets/authored/five-whys-root-cause.jsonl', decision_key: 'root_cause_needed' },
  'thinking-occams-razor': { file: 'evals/datasets/authored/occams-razor-competing-causes.jsonl', decision_key: 'simplest_explanation_fits' },
};

const CHALLENGING_DATASETS = {
  'thinking-red-team': { file: 'evals/datasets/authored/challenging-red-team.jsonl', decision_key: 'vulnerability_present' },
  'thinking-scientific-method': { file: 'evals/datasets/authored/challenging-scientific-method.jsonl', decision_key: 'hypothesis_needed' },
  'thinking-kepner-tregoe': { file: 'evals/datasets/authored/challenging-kepner-tregoe.jsonl', decision_key: 'selective_defect' },
  'thinking-second-order': { file: 'evals/datasets/authored/challenging-second-order.jsonl', decision_key: 'second_order_consequence' },
  'thinking-margin-of-safety': { file: 'evals/datasets/authored/challenging-margin-of-safety.jsonl', decision_key: 'adequate_margin' },
  'thinking-pre-mortem': { file: 'evals/datasets/authored/challenging-pre-mortem.jsonl', decision_key: 'pre_mortem_warranted' },
  'thinking-inversion': { file: 'evals/datasets/authored/challenging-inversion.jsonl', decision_key: 'inversion_warranted' },
  'thinking-cynefin': { file: 'evals/datasets/authored/challenging-cynefin.jsonl', decision_key: 'unordered_problem' },
};
const CHALLENGING_MODE = process.env.CHALLENGING_MODE === '1' || process.argv.includes('--challenging');
const ACTIVE_DATASETS = CHALLENGING_MODE ? { ...DATASETS, ...CHALLENGING_DATASETS } : DATASETS;

const ARMS = (process.env.ARMS || objectiveForms().join(',')).split(',').map(s => s.trim()).filter(Boolean);

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).map(JSON.parse);
}
function selectedSkills(argv) {
  const skills = argv.filter(a => !a.startsWith('-'));
  if (skills.length) return skills;
  if (process.env.SKILLS) return process.env.SKILLS.split(',').map(s => s.trim()).filter(Boolean);
  if (CHALLENGING_MODE) return Object.keys(CHALLENGING_DATASETS);
  return OBJECTIVE_AUTHORED_COVERAGE;
}
function skillContent(skillName) {
  return fs.readFileSync(path.join(SKILLS_DIR, skillName, 'SKILL.md'), 'utf8');
}
function normalizeLabel(item) {
  if (typeof item.label === 'boolean') return item.label;
  if (typeof item.answer === 'boolean') return item.answer;
  if (typeof item.answer === 'string') return item.answer.toLowerCase() === 'yes' || item.answer.toLowerCase() === 'true';
  throw new Error(`${item.id}: missing boolean-compatible label/answer`);
}
function loadItems(skillName) {
  const spec = ACTIVE_DATASETS[skillName];
  if (!spec) throw new Error(`no objective dataset mapping for ${skillName}`);
  const full = path.join(REPO_ROOT, spec.file);
  if (!fs.existsSync(full)) throw new Error(`missing objective dataset ${spec.file}`);
  let items = readJsonl(full).map(item => ({ ...item, label: normalizeLabel(item), source_file: spec.file, source_id: item.source_id || item.id, cluster_id: item.cluster_id || item.source_id || item.id, decision_key: spec.decision_key }));
  if (SPLIT) {
    items = items.filter(item => item.split === SPLIT);
    if (!items.length) throw new Error(`${spec.file}: no rows with split=${SPLIT}`);
  }
  if (LIMIT_PER_SKILL != null) items = items.slice(0, LIMIT_PER_SKILL);
  return items;
}
function extractYesNo(text) {
  const s = String(text || '');
  const jsonMatch = s.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.answer === 'boolean') return parsed.answer;
    } catch (_) {
      // Fall through to strict textual extraction.
    }
  }
  const m = s.match(/ANSWER:\s*(yes|no)/i) ||
    s.match(/"answer"\s*:\s*(true|false)\s*(?:[,}])/i) ||
    s.match(/\b(YES|NO)\b[.!]*\s*$/im) ||
    s.match(/\b(yes|no)\b[.!]*\s*$/im);
  if (!m) return null;
  const v = m[1].toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v === 'yes';
}
function isCorrect(item, answer) {
  return typeof answer === 'boolean' && answer === item.label;
}
function itemPrompt(item, typed = false) {
  const instr = item.decision_instruction || 'Answer Yes or No.';
  const output = typed
    ? 'Return exactly one JSON object with a boolean answer field: { "answer": true | false, "rationale": "<one concise sentence>" }.'
    : 'End your response with exactly: ANSWER: <Yes or No>';
  return `${instr}\n\n${item.prompt}\n\n${output}`;
}
function buildPrompt(arm, item, skillName, skillMd) {
  return buildFactorialPrompt(arm, itemPrompt(item, arm === 'workflow_validated' || arm === 'full_skill_typed_verified'), skillMd, skillName);
}

async function runItem(skillName, skillMd, item) {
  const prompts = Object.fromEntries(ARMS.map(arm => [arm, buildPrompt(arm, item, skillName, skillMd)]));
  const runs = await Promise.all(ARMS.map(arm => droidExecWithRetry({ model: SOLVER, effort: SOLVER_EFFORT, prompt: prompts[arm] }).then(r => [arm, r])));
  const byArm = {};
  for (const [arm, r] of runs) {
    const answer = r.ok ? extractYesNo(r.text) : null;
    const parseOk = answer != null;
    const correct = isCorrect(item, answer);
    byArm[arm] = { ok: r.ok, parse_ok: parseOk, answer, correct, case_success: r.ok && parseOk && correct, attempts: r.attempts || 1, error: r.ok ? null : r.error, usage: r.usage ? usageSummary(r.usage, SOLVER) : null };
  }
  const itemUsage = Object.values(byArm).map(a => a.usage).filter(Boolean);
  return { id: item.id, source_id: item.source_id, cluster_id: item.cluster_id, label: item.label, target: item.label === true, domain: item.domain || item.type || '', by_arm: byArm, usage: aggregateUsage(itemUsage) };
}
function summarizeArm(items, arm) {
  const n = items.length;
  const correct = items.filter(i => i.by_arm[arm] && i.by_arm[arm].correct).length;
  const caseSuccess = items.filter(i => i.by_arm[arm] && i.by_arm[arm].case_success).length;
  const positives = items.filter(i => i.label === true);
  const negatives = items.filter(i => i.label === false);
  const tp = positives.filter(i => i.by_arm[arm].answer === true).length;
  const fn = positives.length - tp;
  const tn = negatives.filter(i => i.by_arm[arm].answer === false).length;
  const fp = negatives.length - tn;
  return {
    n,
    correct,
    case_success: caseSuccess,
    acc: n ? +(correct / n).toFixed(3) : 0,
    case_success_rate: n ? +(caseSuccess / n).toFixed(3) : 0,
    acc_ci: wilson(correct, n || 1).map(x => +x.toFixed(3)),
    case_success_ci: wilson(caseSuccess, n || 1).map(x => +x.toFixed(3)),
    tp, fp, tn, fn,
    fpr: negatives.length ? +(fp / negatives.length).toFixed(3) : 0,
    fnr: positives.length ? +(fn / positives.length).toFixed(3) : 0,
    parse_ok: items.filter(i => i.by_arm[arm] && i.by_arm[arm].parse_ok).length,
    parse_ok_rate: n ? +(items.filter(i => i.by_arm[arm] && i.by_arm[arm].parse_ok).length / n).toFixed(3) : 0,
    parse_fail: items.filter(i => i.by_arm[arm].answer == null).length,
    solver_failures: items.filter(i => i.by_arm[arm].ok === false).length,
  };
}
function pairedContrast(items, left, right) {
  if (!items.every(i => i.by_arm[left] && i.by_arm[right])) return null;
  const leftOnly = items.filter(i => i.by_arm[left].case_success && !i.by_arm[right].case_success).length;
  const rightOnly = items.filter(i => !i.by_arm[left].case_success && i.by_arm[right].case_success).length;
  const leftAcc = items.length ? items.filter(i => i.by_arm[left].case_success).length / items.length : 0;
  const rightAcc = items.length ? items.filter(i => i.by_arm[right].case_success).length / items.length : 0;
  return {
    delta_pp: +((leftAcc - rightAcc) * 100).toFixed(1),
    mcnemar_p: +mcnemar(leftOnly, rightOnly).toFixed(3),
    discordant: leftOnly + rightOnly,
    left_wins: leftOnly,
    right_wins: rightOnly,
  };
}
function summarizeSkill(skillName, items, sourceHash, skillHash, workflowHash) {
  const byArm = Object.fromEntries(ARMS.map(arm => [arm, summarizeArm(items, arm)]));
  return {
    skill: skillName,
    n: items.length,
    source_file: ACTIVE_DATASETS[skillName].file,
    source_sha256: sourceHash,
    skill_sha256: skillHash,
    workflow_sha256: workflowHash,
    by_arm: byArm,
    contrasts: {
      primary_workflow_validated_vs_full_skill_typed_verified: pairedContrast(items, 'workflow_validated', 'full_skill_typed_verified'),
      workflow_vs_full_skill: pairedContrast(items, 'concise_workflow', 'full_skill_prose'),
      workflow_vs_placebo: pairedContrast(items, 'concise_workflow', 'placebo'),
      full_skill_vs_placebo: pairedContrast(items, 'full_skill_prose', 'placebo'),
    },
    items,
  };
}
async function runSkill(skillName) {
  const spec = ACTIVE_DATASETS[skillName];
  const sourceText = fs.readFileSync(path.join(REPO_ROOT, spec.file), 'utf8');
  const skillMd = skillContent(skillName);
  const { workflowPromptFor } = require('./lib/workflow-prompts');
  const items = loadItems(skillName);
  const results = await mapPool(items, Math.min(CONC, items.length), item => runItem(skillName, skillMd, item));
  return summarizeSkill(skillName, results, sha256(sourceText), sha256(skillMd), sha256(workflowPromptFor(skillName)));
}
function runHealth(skills) {
  let solverCalls = 0;
  let solverAttempts = 0;
  let solverFailures = 0;
  let retriedCalls = 0;
  const allUsage = [];
  for (const skill of skills) {
    for (const item of skill.items || []) {
      if (item.usage) allUsage.push(item.usage);
      for (const arm of Object.values(item.by_arm || {})) {
        const attempts = arm.attempts || 1;
        solverCalls++;
        solverAttempts += attempts;
        if (arm.ok === false) solverFailures++;
        if (attempts > 1) retriedCalls++;
      }
    }
  }
  return {
    solver_calls: solverCalls,
    solver_attempts: solverAttempts,
    solver_failures: solverFailures,
    retried_calls: retriedCalls,
    failure_rate: solverCalls ? +(solverFailures / solverCalls).toFixed(4) : 0,
    decision_eligible: solverFailures === 0,
    token_usage: aggregateUsage(allUsage),
  };
}

function aggregate(skills) {
  const items = skills.flatMap(s => s.items);
  return {
    n: items.length,
    clusters: new Set(items.map(i => i.cluster_id || i.id)).size,
    by_arm: Object.fromEntries(ARMS.map(arm => [arm, summarizeArm(items, arm)])),
    contrasts: {
      primary_workflow_validated_vs_full_skill_typed_verified: pairedContrast(items, 'workflow_validated', 'full_skill_typed_verified'),
      workflow_vs_full_skill: pairedContrast(items, 'concise_workflow', 'full_skill_prose'),
      workflow_vs_placebo: pairedContrast(items, 'concise_workflow', 'placebo'),
      full_skill_vs_placebo: pairedContrast(items, 'full_skill_prose', 'placebo'),
    },
  };
}
async function main() {
  const skills = selectedSkills(process.argv.slice(2));
  for (const s of skills) if (!ACTIVE_DATASETS[s]) throw new Error(`unknown objective skill ${s}`);
  console.log(`Workflow objective proof-arm eval: ${skills.length} skills, arms=${ARMS.join(',')}, solver=${SOLVER}(${SOLVER_EFFORT}; max=${maxEffortFor(SOLVER)}), conc=${CONC}, limit=${LIMIT_PER_SKILL == null ? 'all' : LIMIT_PER_SKILL}`);
  let done = 0;
  const results = await mapPool(skills, Math.min(CONC, skills.length), async skill => {
    const r = await runSkill(skill);
    done++;
    const c = r.contrasts.primary_workflow_validated_vs_full_skill_typed_verified;
    const delta = c ? `${c.delta_pp}pp p=${c.mcnemar_p}` : 'not run';
    console.log(`  [${done}/${skills.length}] ${skill}: workflow_validated ${r.by_arm.workflow_validated ? r.by_arm.workflow_validated.acc : 'na'} vs full_skill_typed_verified ${r.by_arm.full_skill_typed_verified ? r.by_arm.full_skill_typed_verified.acc : 'na'}; Δprimary=${delta}`);
    return r;
  });
  const health = runHealth(results);
  const selectedSkillNames = skills;
  const replicationCounts = selectedSkillNames.map(s => {
    const ds = ACTIVE_DATASETS[s];
    if (!ds) return 0;
    try {
      const rows = fs.readFileSync(path.join(REPO_ROOT, ds.file), 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
      return rows.filter(r => r.split === 'replication').length;
    } catch (_) { return 0; }
  });
  const hasReplication = replicationCounts.every(c => c >= 18);
  const replicationTotal = replicationCounts.reduce((a, c) => a + c, 0);
  const out = {
    mode: 'workflow-objective-proof-arms',
    solver: SOLVER,
    solver_effort: SOLVER_EFFORT,
    arms: ARMS,
    n_skills: results.length,
    n_items: results.reduce((a, r) => a + r.n, 0),
    limit_per_skill: LIMIT_PER_SKILL,
    split: SPLIT,
    preregistration: preregistrationMeta(),
    run: runMetadata(),
    skills: results,
    aggregate: aggregate(results),
    run_health: health,
    warnings: runHealthWarnings(health),
    claim_status: claimStatus(health, { hasReplication, replicationTotal }),
    caveats: ['Objective binary labels test decision preservation, not full reasoning quality.', 'Primary contrast is workflow_validated vs full_skill_typed_verified.', hasReplication ? `Replication rows present (${replicationTotal} total across selected skills).` : 'Replication remains required before any confirmatory claim.'],
  };
  writeJson(OUTFILE, out);
  console.log(`-> ${OUTFILE}`);
}
if (require.main === module) main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
module.exports = { DATASETS, ARMS, extractYesNo, normalizeLabel, loadItems, summarizeArm, pairedContrast, buildPrompt };
