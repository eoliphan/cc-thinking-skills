'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EVIDENCE_PATH = path.join(REPO_ROOT, 'analysis', 'evidence.json');
const REGISTRY_PATH = path.join(REPO_ROOT, 'evals', 'studies', 'registry.json');
const WORKFLOW_AGGREGATE_PATH = path.join(REPO_ROOT, 'evals', 'studies', 'workflow-v1', 'aggregate.json');
const AGGREGATE_PATH = path.join(REPO_ROOT, 'evals', 'studies', 'portfolio-v1', 'aggregate.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'evals', 'generate-evidence-registry.js');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('canonical evidence generation is byte-idempotent', () => {
  const before = fs.readFileSync(EVIDENCE_PATH);
  execFileSync(process.execPath, [GENERATOR_PATH], { cwd: REPO_ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(EVIDENCE_PATH);
  assert.deepEqual(after, before);
});

test('canonical evidence separates 28 active and 11 deleted skills', () => {
  const registry = readJson(REGISTRY_PATH);
  const evidence = readJson(EVIDENCE_PATH);
  const activeExpected = Object.keys(registry.skills).map(id => `thinking-${id}`).sort();
  const deletedExpected = Object.keys(registry.deleted_skills).map(id => `thinking-${id}`).sort();

  assert.deepEqual(Object.keys(evidence.skills).sort(), activeExpected);
  assert.deepEqual(Object.keys(evidence.deleted_skills).sort(), deletedExpected);
  assert.equal(evidence.summary.active_skill_count, 28);
  assert.equal(evidence.summary.deleted_skill_count, 11);
});

test('portfolio outcome records zero calls and no automatic elevations', () => {
  const aggregate = readJson(AGGREGATE_PATH);
  const evidence = readJson(EVIDENCE_PATH);
  const portfolio = evidence.studies.find(study => study.study_id === 'portfolio-v1');

  assert.ok(portfolio);
  assert.equal(aggregate.run_status, 'no_run');
  assert.equal(aggregate.usage.calls, 0);
  assert.equal(aggregate.health.decision_eligible, false);
  assert.equal(portfolio.model_calls, 0);
  assert.equal(portfolio.decision_eligible, false);
  assert.equal(evidence.summary.elevate_count, 0);
  assert.equal(evidence.summary.auto_retain_count, 0);

  for (const row of Object.values(evidence.skills)) {
    assert.equal(row.elevate, false);
    assert.equal(row.auto_retain, false);
    assert.equal(row.product_disposition, 'manual_only_quarantine');
    assert.ok(row.study_ids.includes('portfolio-v1'));
    assert.equal(row.portfolio_gate.decision_eligible, false);
  }
});

test('preregistered input registry remains distinct from post-gate output registry', () => {
  const evidence = readJson(EVIDENCE_PATH);
  const portfolio = evidence.studies.find(study => study.study_id === 'portfolio-v1');

  assert.equal(portfolio.input_registry_ref.registry_version, 'phase2-cutover-v1');
  assert.equal(portfolio.input_registry_ref.git_commit, 'c2e4a73a6aded6c53d419f1f3d2a011fea91946f');
  assert.equal(portfolio.current_registry_ref.registry_version, 'phase4-portfolio-v1');
  assert.notEqual(portfolio.input_registry_ref.sha256, portfolio.current_registry_ref.sha256);
  const frozenRegistry = execFileSync(
    'git',
    ['show', `${portfolio.input_registry_ref.git_commit}:${portfolio.input_registry_ref.path}`],
    { cwd: REPO_ROOT }
  );
  assert.equal(sha256(frozenRegistry), portfolio.input_registry_ref.sha256);
  const postGateRegistry = execFileSync(
    'git',
    ['show', `${portfolio.current_registry_ref.git_commit}:${portfolio.current_registry_ref.path}`],
    { cwd: REPO_ROOT }
  );
  assert.equal(sha256(postGateRegistry), portfolio.current_registry_ref.sha256);
});

test('workflow power failure is preserved as a zero-call deletion disposition', () => {
  const aggregate = readJson(WORKFLOW_AGGREGATE_PATH);
  const evidence = readJson(EVIDENCE_PATH);
  const workflow = evidence.studies.find(study => study.study_id === 'workflow-v1');

  assert.ok(workflow);
  assert.equal(aggregate.run_status, 'no_run');
  assert.equal(aggregate.usage.calls, 0);
  assert.equal(aggregate.health.decision_eligible, false);
  assert.equal(workflow.model_calls, 0);
  assert.equal(workflow.decision_eligible, false);
  assert.equal(workflow.product_disposition, 'delete_workflow_machinery');
  assert.equal(evidence.workflow_form.product_disposition, 'delete_workflow_machinery');
  assert.deepEqual(workflow.comparators, ['dynamic_typed', 'workflow_none_typed']);

  const frozenRegistry = execFileSync(
    'git',
    ['show', `${workflow.input_registry_ref.git_commit}:${workflow.input_registry_ref.path}`],
    { cwd: REPO_ROOT }
  );
  assert.equal(sha256(frozenRegistry), workflow.input_registry_ref.sha256);
  assert.equal(sha256(fs.readFileSync(REGISTRY_PATH)), workflow.current_registry_ref.sha256);
});
