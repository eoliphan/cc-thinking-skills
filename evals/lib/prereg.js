'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_PREREG = path.join(__dirname, '..', 'preregistrations', 'workflow-vs-skill-proof.md');

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function preregistrationMeta(file = process.env.PREREGISTRATION || DEFAULT_PREREG) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return { path: resolved, exists: false, sha256: null };
  return { path: resolved, exists: true, sha256: sha256(fs.readFileSync(resolved, 'utf8')) };
}

function runMetadata(extraEnvKeys = []) {
  const envKeys = [
    'EVAL_RUN',
    'SOLVER_MODEL',
    'SOLVER_EFFORT',
    'JUDGE_MODEL',
    'JUDGES',
    'CONC',
    'LIMIT',
    'LIMIT_PER_SKILL',
    'ARMS',
    'PAIRS',
    'WORKFLOW_DATASET',
    'PREREGISTRATION',
    ...extraEnvKeys,
  ];
  const env = {};
  for (const key of envKeys) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) env[key] = process.env[key];
  }
  return {
    command: ['node', ...process.argv.slice(1)].join(' '),
    cwd: process.cwd(),
    env,
  };
}


/**
 * Compute a claim_status from run_health and artifact properties.
 * Returns one of: confirmed, invalidated, inconclusive, pilot_only, diagnostic_only, stale, noisy
 */
function claimStatus(runHealth, opts = {}) {
  if (!runHealth) return 'inconclusive';
  const failures = runHealth.solver_failures || 0;
  const rate = runHealth.failure_rate || 0;
  if (failures > 0 && rate > 0.05) return 'noisy';
  if (failures > 0) return 'diagnostic_only';
  if (opts.isPilot) return 'pilot_only';
  if (opts.hasReplication === false) return 'inconclusive';
  if (opts.replicationPassed) return 'confirmed';
  if (opts.replicationFailed) return 'invalidated';
  // hasReplication means data exists, not that replication eval passed
  if (opts.hasReplication) return 'inconclusive';
  return 'inconclusive';
}
module.exports = { preregistrationMeta, runMetadata, claimStatus };
