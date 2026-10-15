'use strict';

/**
 * Selects the model-call backend for unpinned runners.
 *
 * EVAL_BACKEND=droid (default) keeps the historical `droid exec` path.
 * EVAL_BACKEND=claude-cli uses `claude -p` through `./claude-cli`.
 *
 * Frozen study runners import `./droid` directly and are unaffected.
 */

const droid = require('./droid');
const claude = require('./claude-cli');

const BACKENDS = Object.freeze(['droid', 'claude-cli']);

function backendName(env = process.env) {
  const name = env.EVAL_BACKEND || 'droid';
  if (!BACKENDS.includes(name)) {
    throw new Error(`EVAL_BACKEND must be one of ${BACKENDS.join(', ')}; got ${name}`);
  }
  return name;
}

function select(env = process.env) {
  if (backendName(env) === 'claude-cli') {
    return {
      backend: 'claude-cli',
      executeModel: claude.executeClaude,
      modelJsonAsync: claude.claudeJsonAsync,
      maxEffortFor: claude.maxEffortFor,
    };
  }
  return {
    backend: 'droid',
    executeModel: droid.executeDroid,
    modelJsonAsync: droid.droidJsonAsync,
    maxEffortFor: droid.maxEffortFor,
  };
}

module.exports = {
  BACKENDS,
  backendName,
  select,
  ...select(),
  usageSummary: droid.usageSummary,
  aggregateUsage: droid.aggregateUsage,
};
