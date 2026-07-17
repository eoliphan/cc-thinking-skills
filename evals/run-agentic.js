#!/usr/bin/env node
'use strict';

/**
 * Pilot eval for multi-step agentic workflow control flow.
 *
 * Separates route/control-flow accuracy from binary node execution accuracy for
 * dynamic skill choice vs deterministic workflow scheduling. The dataset stores
 * references to authored binary-decision items; labels are used only for scoring.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { droidExecWithRetry, extractJson, maxEffortFor, usageSummary, aggregateUsage } = require('./lib/droid');
const { loadAllSkills, readSkill } = require('./lib/skills');
const { runDir, writeJson, mapPool, runHealthWarnings } = require('./lib/io');
const { preregistrationMeta, runMetadata, claimStatus } = require('./lib/prereg');
const {
  AGENTIC_ARMS,
  extractRouteFromText,
  evalBranchRules,
  scoreCaseResult,
  summarizeArms,
  computeContrasts,
} = require('./lib/agentic');

const SOLVER = process.env.SOLVER_MODEL || 'claude-sonnet-4-6';
const SOLVER_EFFORT = process.env.SOLVER_EFFORT || 'medium';
const CONC = parseInt(process.env.CONC || '3', 10);
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const DEFAULT_ARMS = AGENTIC_ARMS.join(',');
const ARMS = (process.env.ARMS || DEFAULT_ARMS).split(',').map(s => s.trim()).filter(Boolean);
const OUTFILE = process.env.OUTFILE || path.join(runDir(), 'agentic-workflow.json');
const DATASET = process.env.WORKFLOW_DATASET ? path.resolve(process.env.WORKFLOW_DATASET) : path.join(__dirname, 'datasets', 'workflow-cases.jsonl');
const REPO_ROOT = path.join(__dirname, '..');

const ALL_ARMS = new Set(AGENTIC_ARMS);


function readJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      try { return JSON.parse(line); }
      catch (e) { throw new Error(`${file}:${i + 1}: invalid JSON: ${e.message}`); }
    });
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function loadSourceIndex(sourceFile, cache) {
  if (!cache.has(sourceFile)) {
    const full = path.join(REPO_ROOT, sourceFile);
    if (!fs.existsSync(full)) throw new Error(`missing source file: ${sourceFile}`);
    const byId = new Map();
    for (const item of readJsonl(full)) byId.set(item.id, item);
    cache.set(sourceFile, byId);
  }
  return cache.get(sourceFile);
}

function validateRuleShape(rule, caseId, nodeIds, decisionKeys) {
  if (!rule || typeof rule !== 'object') throw new Error(`${caseId}: invalid branch rule`);
  if (!nodeIds.has(rule.after)) throw new Error(`${caseId}: branch rule references unknown after node ${rule.after}`);
  if (!rule.if || typeof rule.if.decision_key !== 'string') throw new Error(`${caseId}: branch rule missing if.decision_key`);
  if (!decisionKeys.has(rule.if.decision_key)) throw new Error(`${caseId}: branch rule references unknown decision key ${rule.if.decision_key}`);
  if (typeof rule.if.equals !== 'boolean') throw new Error(`${caseId}: branch rule if.equals must be boolean`);
  for (const nid of [...(rule.then || []), ...(rule.else || [])]) {
    if (!nodeIds.has(nid)) throw new Error(`${caseId}: branch rule references unknown node ${nid}`);
  }
}

function validateAndHydrateCase(row, sourceCache, seenIds) {
  if (!row || typeof row !== 'object') throw new Error('workflow row must be an object');
  if (!row.id) throw new Error('workflow row missing id');
  if (seenIds.has(row.id)) throw new Error(`duplicate workflow row id: ${row.id}`);
  seenIds.add(row.id);
  if (!Array.isArray(row.nodes) || row.nodes.length === 0) throw new Error(`${row.id}: missing nodes`);
  if (!Array.isArray(row.initial_node_ids)) throw new Error(`${row.id}: missing initial_node_ids`);
  if (!Array.isArray(row.workflow_branch_rules)) throw new Error(`${row.id}: missing workflow_branch_rules`);
  if (!Array.isArray(row.gold_node_ids) || row.gold_node_ids.length === 0) throw new Error(`${row.id}: missing gold_node_ids`);

  const nodeIds = new Set();
  const decisionKeys = new Set();
  const nodes = row.nodes.map(node => {
    if (!node.node_id || !node.skill || !node.decision_key || !node.source_file || !node.source_id) {
      throw new Error(`${row.id}: node missing required fields`);
    }
    if (nodeIds.has(node.node_id)) throw new Error(`${row.id}: duplicate node id ${node.node_id}`);
    nodeIds.add(node.node_id);
    decisionKeys.add(node.decision_key);
    try { readSkill(node.skill); }
    catch (_) { throw new Error(`${row.id}: missing skill directory for ${node.skill}`); }
    const source = loadSourceIndex(node.source_file, sourceCache).get(node.source_id);
    if (!source) throw new Error(`${row.id}: missing source id ${node.source_id} in ${node.source_file}`);
    if (typeof source.label !== 'boolean') throw new Error(`${row.id}: source ${node.source_id} missing boolean label`);
    if (!source.prompt || !source.decision_instruction) throw new Error(`${row.id}: source ${node.source_id} missing prompt or decision_instruction`);
    const sourceHash = sha256(JSON.stringify({ source_file: node.source_file, source_id: node.source_id, prompt: source.prompt, decision_instruction: source.decision_instruction, label: source.label }));
    return { ...node, prompt: source.prompt, decision_instruction: source.decision_instruction, label: source.label, source_sha256: sourceHash };
  });

  for (const nid of row.initial_node_ids) {
    if (!nodeIds.has(nid)) throw new Error(`${row.id}: initial_node_ids references unknown node ${nid}`);
  }
  for (const nid of row.gold_node_ids) {
    if (!nodeIds.has(nid)) throw new Error(`${row.id}: gold_node_ids references unknown node ${nid}`);
  }
  for (const rule of row.workflow_branch_rules) validateRuleShape(rule, row.id, nodeIds, decisionKeys);
  return { ...row, nodes };
}

function loadCases(options = {}) {
  const applyLimit = options.applyLimit !== false;
  const sourceCache = new Map();
  const seenIds = new Set();
  let cases = readJsonl(DATASET).map(row => validateAndHydrateCase(row, sourceCache, seenIds));
  if (applyLimit && LIMIT != null) cases = cases.slice(0, LIMIT);
  return cases;
}

function extractYesNo(text) {
  if (!text) return null;
  const m = text.match(/ANSWER:\s*(yes|no)/i) ||
    text.match(/\b(YES|NO)\b[.!]*\s*$/im) ||
    text.match(/\b(yes|no)\b[.!]*\s*$/im);
  return m ? m[1].toLowerCase() : null;
}


function nodeListForPrompt(workflowCase) {
  return workflowCase.nodes.map(n => [
    `NODE ${n.node_id}`,
    `skill: ${n.skill}`,
    `decision_key: ${n.decision_key}`,
    `decision_instruction: ${n.decision_instruction}`,
    `prompt: ${n.prompt}`,
  ].join('\n')).join('\n\n');
}

function buildCatalog(skills) {
  return skills.map(s => `${s.name}: ${s.description}`).join('\n');
}

function dynamicLoosePrompt(workflowCase, catalog) {
  return `You are choosing which thinking-skill analyses are warranted for a composite workflow case.\n\n=== CASE BRIEF ===\n${workflowCase.case_brief}\n\n=== CANDIDATE NODES ===\n${nodeListForPrompt(workflowCase)}\n\n=== SKILL CATALOG ===\n${catalog}\n\nChoose only the warranted skill sequence. Then answer the selected binary node prompts.\nUse skill slugs when naming the route. For each selected node, include a line like: <node_id>: ANSWER: <Yes or No>.\nDo not answer nodes you did not select.`;
}

function dynamicTypedPrompt(workflowCase, catalog) {
  return `You are choosing which thinking-skill analyses are warranted for a composite workflow case.\n\n=== CASE BRIEF ===\n${workflowCase.case_brief}\n\n=== CANDIDATE NODES ===\n${nodeListForPrompt(workflowCase)}\n\n=== SKILL CATALOG ===\n${catalog}\n\nReturn ONLY JSON with exactly this shape:\n{ "selected_route": ["thinking-..."], "node_answers": [{ "node_id": "...", "answer": true, "rationale": "..." }], "final": "..." }\n\nselected_route must be the ordered skill slug sequence you chose. node_answers must include one answer per selected candidate node, using the source decision_instruction for that node.`;
}

function dynamicVerifyPrompt(workflowCase, catalog, candidate) {
  return `Repair and verify the following dynamic workflow JSON. You must choose the warranted skill route and binary node answers using only the case brief and candidate node prompts. Do not invent node IDs.\n\n=== CASE BRIEF ===\n${workflowCase.case_brief}\n\n=== CANDIDATE NODES ===\n${nodeListForPrompt(workflowCase)}\n\n=== SKILL CATALOG ===\n${catalog}\n\n=== CANDIDATE OUTPUT ===\n${candidate}\n\nReturn ONLY repaired JSON with exactly this shape:\n{ "selected_route": ["thinking-..."], "node_answers": [{ "node_id": "...", "answer": true, "rationale": "..." }], "final": "..." }`;
}

function workflowLoosePrompt(node, skillMd) {
  return `Use the following thinking-skill guide to answer exactly one binary decision node.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n=== DECISION INSTRUCTION ===\n${node.decision_instruction}\n\n=== NODE PROMPT ===\n${node.prompt}\n\nEnd your response with exactly: ANSWER: <Yes or No>`;
}

function workflowTypedPrompt(node, skillMd) {
  return `Use the following thinking-skill guide to answer exactly one binary decision node.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n=== DECISION INSTRUCTION ===\n${node.decision_instruction}\n\n=== NODE ID ===\n${node.node_id}\n\n=== NODE PROMPT ===\n${node.prompt}\n\nReturn ONLY JSON with exactly this shape:\n{ "node_id": "${node.node_id}", "answer": true, "rationale": "..." }`;
}


function workflowSelfCheckPrompt(node, skillMd, candidateOutput) {
  return `Independently check the candidate node answer against the thinking-skill guide, decision instruction, and node prompt. Correct either the answer or rationale when needed. Do not merely repair syntax.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n=== DECISION INSTRUCTION ===\n${node.decision_instruction}\n\n=== NODE ID ===\n${node.node_id}\n\n=== NODE PROMPT ===\n${node.prompt}\n\n=== CANDIDATE OUTPUT ===\n${candidateOutput}\n\nReturn ONLY JSON with exactly this shape:\n{ "node_id": "${node.node_id}", "answer": true, "rationale": "..." }`;
}

function validateDynamicJson(json, nodeIds) {
  if (!json || typeof json !== 'object') return { ok: false, error: 'not an object' };
  if (!Array.isArray(json.selected_route) || !json.selected_route.every(s => typeof s === 'string')) return { ok: false, error: 'selected_route must be string[]' };
  if (!Array.isArray(json.node_answers)) return { ok: false, error: 'node_answers must be an array' };
  for (const ans of json.node_answers) {
    if (!ans || typeof ans.node_id !== 'string' || !nodeIds.has(ans.node_id) || typeof ans.answer !== 'boolean' || typeof ans.rationale !== 'string') {
      return { ok: false, error: 'node_answers entries must have known node_id, boolean answer, rationale string' };
    }
  }
  if (typeof json.final !== 'string') return { ok: false, error: 'final must be a string' };
  return { ok: true, error: null };
}

function validateNodeJson(json, expectedNodeId) {
  if (!json || typeof json !== 'object') return { ok: false, error: 'not an object' };
  if (json.node_id !== expectedNodeId) return { ok: false, error: 'missing or wrong node_id' };
  if (typeof json.answer !== 'boolean') return { ok: false, error: 'answer must be boolean' };
  if (typeof json.rationale !== 'string') return { ok: false, error: 'rationale must be string' };
  return { ok: true, error: null };
}

function extractNodeAnswersFromText(text, nodes) {
  const answers = [];
  const full = String(text || '');
  for (const node of nodes) {
    const re = new RegExp(`${escapeRe(node.node_id)}[\\s\\S]{0,160}?ANSWER:\\s*(yes|no)`, 'i');
    const m = full.match(re);
    if (m) answers.push({ node_id: node.node_id, answer: m[1].toLowerCase() === 'yes', rationale: 'extracted from free-form text' });
  }
  if (answers.length === 0 && nodes.length === 1) {
    const yn = extractYesNo(full);
    if (yn) answers.push({ node_id: nodes[0].node_id, answer: yn === 'yes', rationale: 'extracted from free-form text' });
  }
  return answers;
}

function compactRaw(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > 600 ? `${s.slice(0, 600)}...` : s;
}
const _solverStatsByCase = new Map();
function solverStatsFor(caseId) {
  if (!_solverStatsByCase.has(caseId)) _solverStatsByCase.set(caseId, { calls: 0, attempts: 0, failures: 0, retried: 0, usage: [] });
  return _solverStatsByCase.get(caseId);
}
async function trackedSolverCall(caseId, opts) {
  const stats = solverStatsFor(caseId);
  const r = await droidExecWithRetry(opts);
  const attempts = r.attempts || 1;
  stats.calls++;
  stats.attempts += attempts;
  if (attempts > 1) stats.retried++;
  if (!r.ok) stats.failures++;
  if (r.usage) stats.usage.push(usageSummary(r.usage, SOLVER));
  return r;
}
function aggregateSolverStats(caseIds) {
  let calls = 0, attempts = 0, failures = 0, retried = 0;
  const allUsage = [];
  for (const id of caseIds) {
    const s = _solverStatsByCase.get(id);
    if (!s) continue;
    calls += s.calls; attempts += s.attempts; failures += s.failures; retried += s.retried;
    if (s.usage) allUsage.push(...s.usage);
  }
  return { solver_calls: calls, solver_attempts: attempts, solver_failures: failures, retried_calls: retried, failure_rate: calls ? +(failures / calls).toFixed(4) : 0, decision_eligible: failures === 0, token_usage: aggregateUsage(allUsage) };
}

async function runDynamicTypedCore(workflowCase, catalog, callSolver = trackedSolverCall) {
  const nodeIds = new Set(workflowCase.nodes.map(n => n.node_id));
  const r = await callSolver(workflowCase.id, { model: SOLVER, effort: SOLVER_EFFORT, prompt: dynamicTypedPrompt(workflowCase, catalog) });
  if (!r.ok) return { parse_ok: false, selected_route: [], node_answers: [], final: '', error: r.error, raw: compactRaw(r.raw) };
  const json = extractJson(r.text);
  const valid = validateDynamicJson(json, nodeIds);
  if (!valid.ok) return { parse_ok: false, selected_route: [], node_answers: [], final: '', error: valid.error, raw: compactRaw(r.text) };
  return { parse_ok: true, selected_route: json.selected_route, node_answers: json.node_answers, final: json.final, raw: compactRaw(r.text) };
}

async function runDynamicArm(workflowCase, arm, catalog, knownSkillNames, callSolver = trackedSolverCall) {
  if (arm === 'dynamic_loose') {
    const r = await callSolver(workflowCase.id, { model: SOLVER, effort: SOLVER_EFFORT, prompt: dynamicLoosePrompt(workflowCase, catalog) });
    if (!r.ok) return { parse_ok: true, selected_route: [], node_answers: [], final: '', error: r.error, raw: compactRaw(r.raw) };
    return {
      parse_ok: true,
      selected_route: extractRouteFromText(r.text, knownSkillNames),
      node_answers: extractNodeAnswersFromText(r.text, workflowCase.nodes),
      final: r.text,
      raw: compactRaw(r.text),
    };
  }

  if (arm === 'dynamic_typed') {
    return runDynamicTypedCore(workflowCase, catalog, callSolver);
  }

  if (arm === 'dynamic_typed_self_checked') {
    const first = await runDynamicTypedCore(workflowCase, catalog, callSolver);
    const nodeIds = new Set(workflowCase.nodes.map(n => n.node_id));
    const candidate = first.parse_ok
      ? JSON.stringify({ selected_route: first.selected_route, node_answers: first.node_answers, final: first.final }, null, 2)
      : (first.raw || first.error || '');
    const r = await callSolver(workflowCase.id, { model: SOLVER, effort: SOLVER_EFFORT, prompt: dynamicVerifyPrompt(workflowCase, catalog, candidate) });
    if (!r.ok) return { parse_ok: false, selected_route: [], node_answers: [], final: '', error: r.error, first, raw: compactRaw(r.raw) };
    const json = extractJson(r.text);
    const valid = validateDynamicJson(json, nodeIds);
    if (!valid.ok) return { parse_ok: false, selected_route: [], node_answers: [], final: '', error: valid.error, first, raw: compactRaw(r.text) };
    return { parse_ok: true, selected_route: json.selected_route, node_answers: json.node_answers, final: json.final, first_parse_ok: first.parse_ok, raw: compactRaw(r.text) };
  }

  throw new Error(`unknown dynamic arm ${arm}`);
}

async function runWorkflowTypedBaseNode(node, skillCache, caseId, callSolver = trackedSolverCall) {
  const skillMd = skillCache.get(node.skill) || readSkill(node.skill).content;
  skillCache.set(node.skill, skillMd);
  const r = await callSolver(caseId, { model: SOLVER, effort: SOLVER_EFFORT, prompt: workflowTypedPrompt(node, skillMd) });
  if (!r.ok) {
    return { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: r.error }, raw: compactRaw(r.raw), invalid_output: r.raw };
  }
  const json = extractJson(r.text);
  const valid = validateNodeJson(json, node.node_id);
  return valid.ok
    ? { parse_ok: true, node_answer: { node_id: json.node_id, answer: json.answer, rationale: json.rationale }, raw: compactRaw(r.text), invalid_output: null }
    : { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: valid.error }, raw: compactRaw(r.text), invalid_output: r.text };
}

async function runWorkflowNode(node, arm, skillCache, caseId, callSolver = trackedSolverCall) {
  if (arm === 'workflow_none_typed') {
    const response = await callSolver(caseId, { model: SOLVER, effort: SOLVER_EFFORT, prompt: workflowTypedPrompt(node, '') });
    if (!response.ok) {
      return { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: response.error }, raw: compactRaw(response.raw) };
    }
    const json = extractJson(response.text);
    const valid = validateNodeJson(json, node.node_id);
    return valid.ok
      ? { parse_ok: true, node_answer: { node_id: json.node_id, answer: json.answer, rationale: json.rationale }, raw: compactRaw(response.text) }
      : { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: valid.error }, raw: compactRaw(response.text) };
  }

  const skillMd = skillCache.get(node.skill) || readSkill(node.skill).content;
  skillCache.set(node.skill, skillMd);

  if (arm === 'workflow_loose') {
    const response = await callSolver(caseId, { model: SOLVER, effort: SOLVER_EFFORT, prompt: workflowLoosePrompt(node, skillMd) });
    if (!response.ok) return { parse_ok: true, node_answer: { node_id: node.node_id, answer: null, rationale: response.error }, raw: compactRaw(response.raw) };
    const yesNo = extractYesNo(response.text);
    return { parse_ok: true, node_answer: { node_id: node.node_id, answer: yesNo == null ? null : yesNo === 'yes', rationale: 'extracted from free-form text' }, raw: compactRaw(response.text) };
  }
  if (arm !== 'workflow_typed' && arm !== 'workflow_typed_self_checked') {
    throw new Error(`unknown workflow arm ${arm}`);
  }

  const base = await runWorkflowTypedBaseNode(node, skillCache, caseId, callSolver);
  if (arm === 'workflow_typed') return { ...base, self_checked: false };

  const candidate = base.parse_ok
    ? JSON.stringify(base.node_answer)
    : (base.invalid_output || base.raw || base.node_answer.rationale || '');
  const review = await callSolver(caseId, { model: SOLVER, effort: SOLVER_EFFORT, prompt: workflowSelfCheckPrompt(node, skillMd, candidate) });
  if (!review.ok) return { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: review.error }, raw: base.raw, self_checked: false, first_parse_ok: base.parse_ok };
  const reviewJson = extractJson(review.text);
  const reviewValid = validateNodeJson(reviewJson, node.node_id);
  if (!reviewValid.ok) return { parse_ok: false, node_answer: { node_id: node.node_id, answer: null, rationale: reviewValid.error }, raw: compactRaw(review.text), self_checked: false, first_parse_ok: base.parse_ok };
  return { parse_ok: true, node_answer: { node_id: reviewJson.node_id, answer: reviewJson.answer, rationale: reviewJson.rationale }, raw: compactRaw(review.text), self_checked: true, first_parse_ok: base.parse_ok };
}

async function runWorkflowArm(workflowCase, arm, skillCache, callSolver = trackedSolverCall) {
  const nodesById = new Map(workflowCase.nodes.map(n => [n.node_id, n]));
  const queue = [...workflowCase.initial_node_ids];
  const queued = new Set(queue);
  const completed = new Set();
  const answersByDecisionKey = {};
  const nodeAnswers = [];
  const scheduledNodeIds = [];
  let parseOk = true;

  while (queue.length) {
    const nodeId = queue.shift();
    queued.delete(nodeId);
    const node = nodesById.get(nodeId);
    if (!node) throw new Error(`${workflowCase.id}: scheduler reached unknown node ${nodeId}`);
    if (completed.has(nodeId)) continue;
    const nodeResult = await runWorkflowNode(node, arm, skillCache, workflowCase.id, callSolver);
    scheduledNodeIds.push(nodeId);
    nodeAnswers.push(nodeResult.node_answer);
    completed.add(nodeId);
    if (nodeResult.parse_ok === false) parseOk = false;
    if (typeof nodeResult.node_answer.answer === 'boolean') answersByDecisionKey[node.decision_key] = nodeResult.node_answer.answer;
    else answersByDecisionKey[node.decision_key] = null;

    const additions = evalBranchRules(workflowCase.workflow_branch_rules, nodeId, answersByDecisionKey, completed, queued);
    for (const add of additions) {
      queue.push(add);
      queued.add(add);
    }
  }

  return {
    parse_ok: parseOk,
    selected_route: scheduledNodeIds.map(id => nodesById.get(id).skill),
    scheduled_node_ids: scheduledNodeIds,
    node_answers: nodeAnswers,
    final: '',
  };
}

async function runArmCase(workflowCase, arm, shared, callSolver = trackedSolverCall) {
  if (arm.startsWith('dynamic_')) return runDynamicArm(workflowCase, arm, shared.catalog, shared.knownSkillNames, callSolver);
  if (arm.startsWith('workflow_')) return runWorkflowArm(workflowCase, arm, shared.skillCache, callSolver);
  throw new Error(`unknown arm ${arm}`);
}


async function main() {
  for (const arm of ARMS) {
    if (!ALL_ARMS.has(arm)) throw new Error(`unknown arm: ${arm}`);
  }

  const validateOnly = process.argv.includes('--validate-only');
  const cases = loadCases({ applyLimit: !validateOnly });
  if (validateOnly) {
    console.log(`validated ${cases.length} workflow cases`);
    return;
  }

  const skills = loadAllSkills();
  const catalog = buildCatalog(skills);
  const knownSkillNames = skills.map(s => s.name);
  const shared = { catalog, knownSkillNames, skillCache: new Map() };

  console.log(`Agentic workflow pilot: ${cases.length} cases, arms=${ARMS.join(',')}, solver=${SOLVER}(${SOLVER_EFFORT}; max=${maxEffortFor(SOLVER)}), conc=${CONC}`);

  let done = 0;
  const scoredCases = await mapPool(cases, CONC, async (workflowCase) => {
    const caseOut = {
      id: workflowCase.id,
      stability: workflowCase.stability,
      branching: workflowCase.branching,
      novelty: workflowCase.novelty,
      case_brief: workflowCase.case_brief,
      gold_node_ids: workflowCase.gold_node_ids,
      source_provenance: workflowCase.nodes.map(n => ({ node_id: n.node_id, source_file: n.source_file, source_id: n.source_id, source_sha256: n.source_sha256 })),
      by_arm: {},
    };
    _solverStatsByCase.delete(workflowCase.id);
    for (const arm of ARMS) {
      const armRaw = await runArmCase(workflowCase, arm, shared);
      const scored = scoreCaseResult(workflowCase, armRaw);
      caseOut.by_arm[arm] = { ...scored, scheduled_node_ids: armRaw.scheduled_node_ids, node_answers: armRaw.node_answers, error: armRaw.error };
    }
    done++;
    console.log(`  [${done}/${cases.length}] ${workflowCase.id}`);
    return caseOut;
  });

  const byArm = summarizeArms(scoredCases, ARMS);
  const runHealth = aggregateSolverStats(scoredCases.map(c => c.id));
  const out = {
    mode: 'agentic-workflow',
    solver: SOLVER,
    solver_effort: SOLVER_EFFORT,
    arms: ARMS,
    n: cases.length,
    dataset: DATASET,
    dataset_sha256: sha256(fs.readFileSync(DATASET, 'utf8')),
    preregistration: preregistrationMeta(),
    run: runMetadata(),
    run_health: runHealth,
    warnings: runHealthWarnings(runHealth),
    claim_status: claimStatus(runHealth, { isPilot: true }),
    scoring_notes: ['dynamic_loose free-form route extraction is intentionally strict because unobservable control flow is part of the tested failure mode', 'case_success requires node-level route exactness, no over/under-routing, correct branch decisions, all gold answers correct, and parse_ok'],
    by_arm: byArm,
    contrasts: computeContrasts(scoredCases, ARMS),
    cases: scoredCases,
  };

  writeJson(OUTFILE, out);
  console.log(`-> ${OUTFILE}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err && err.stack || err);
    process.exit(1);
  });
}

module.exports = {
  extractYesNo,
  loadCases,
  runDynamicArm,
  runWorkflowArm,
  runArmCase,
};
