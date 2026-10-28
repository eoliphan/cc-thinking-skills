'use strict';

/**
 * Selects the model-call backend for unpinned runners.
 *
 * EVAL_BACKEND=droid (default) keeps the historical `droid exec` path.
 * EVAL_BACKEND=claude-cli uses `claude -p` through `./claude-cli`; Claude only.
 * EVAL_BACKEND=local-cli routes each call by model family to a local CLI:
 *   claude -> `./claude-cli`, gpt -> `./codex-cli`, gemini -> `./gemini-cli`.
 *   Other families fail before any process starts.
 *
 * Frozen study runners import `./droid` directly and are unaffected.
 */

const droid = require('./droid');
const claude = require('./claude-cli');
const codex = require('./codex-cli');
const gemini = require('./gemini-cli');

const BACKENDS = Object.freeze(['droid', 'claude-cli', 'local-cli']);

const LOCAL_CLI_ROUTES = Object.freeze({
  claude: { backend: claude.BACKEND, execute: claude.executeClaude, json: claude.claudeJsonAsync, effort: claude.maxEffortFor },
  gpt: { backend: codex.BACKEND, execute: codex.executeCodex, json: codex.codexJsonAsync, effort: codex.maxEffortFor },
  gemini: { backend: gemini.BACKEND, execute: gemini.executeGemini, json: gemini.geminiJsonAsync, effort: gemini.maxEffortFor },
});

function backendName(env = process.env) {
  const name = env.EVAL_BACKEND || 'droid';
  if (!BACKENDS.includes(name)) {
    throw new Error(`EVAL_BACKEND must be one of ${BACKENDS.join(', ')}; got ${name}`);
  }
  return name;
}

function localRoute(model) {
  return LOCAL_CLI_ROUTES[droid.modelFamilyForCost(model)] || null;
}

function unsupported(model) {
  const failure = new droid.DroidFailure({
    type: 'transport',
    message: `local-cli backend has no CLI for model ${model}`,
    details: { unsupported_model: model, family: droid.modelFamilyForCost(model) },
    attempt: 1,
  });
  return { ok: false, text: '', json: null, usage: null, durationMs: null, attempts: 1, attempt_records: [], failure, error: failure.message, raw: '' };
}

const localCli = {
  backend: 'local-cli',
  executeModel: async (opts = {}) => {
    const route = localRoute(opts.model);
    return route ? route.execute(opts) : unsupported(opts.model);
  },
  modelJsonAsync: async (opts = {}) => {
    const route = localRoute(opts.model);
    return route ? route.json(opts) : unsupported(opts.model);
  },
  maxEffortFor: (model) => {
    const route = localRoute(model);
    return route ? route.effort(model) : 'high';
  },
};

function select(env = process.env) {
  const name = backendName(env);
  if (name === 'local-cli') return { ...localCli };
  if (name === 'claude-cli') {
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
  LOCAL_CLI_ROUTES,
  backendName,
  select,
  ...select(),
  usageSummary: droid.usageSummary,
  aggregateUsage: droid.aggregateUsage,
};
