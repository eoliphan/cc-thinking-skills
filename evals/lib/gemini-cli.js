'use strict';

/**
 * Model-call backend that drives the Gemini CLI (`gemini -p`) for Gemini
 * models. Results keep the `executeDroid` shape, like `./claude-cli`.
 *
 * Auth: Gemini CLI no longer serves personal Google OAuth ("Code Assist for
 * individuals"), so this backend uses API-key auth. GEMINI_API_KEY is taken
 * from GEMINI_API_KEY or, failing that, GOOGLE_API_KEY. Calls bill that key.
 *
 * Isolation: each process gets a private HOME whose only Gemini file is a
 * settings.json that selects API-key auth. The user's GEMINI.md, MCP servers,
 * hooks, extensions, commands, and policies therefore do not load.
 * GEMINI_SYSTEM_MD replaces the system prompt. Gemini still offers built-in
 * read-only tools, so any recorded tool call is a tool_leakage failure.
 *
 * Gemini CLI has no reasoning-effort flag; passing an effort is an error.
 * Results from this backend must not be pooled with droid-era artifacts.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const droid = require('./droid');
const { defaultAsyncRunner, sumUsage } = require('./claude-cli');

const BACKEND = 'gemini-cli';
const DEFAULT_EXECUTABLE = 'gemini';
const DEFAULT_TIMEOUT_MS = 600000;

const ISOLATION_SYSTEM_PROMPT = 'You are answering a self-contained task. Reason using only the content of the user message. Do not call tools.';
const ISOLATED_SETTINGS = Object.freeze({
  security: { auth: { selectedType: 'gemini-api-key' } },
  general: { disableAutoUpdate: true },
  privacy: { usageStatisticsEnabled: false },
});

const ENV_ALLOWLIST = Object.freeze(droid.ISOLATION_ENV_ALLOWLIST.filter(k => !/_API_KEY$|^FACTORY_|^ANTHROPIC_|^OPENAI_|^HOME$/.test(k)));

let cachedVersion;
function cliVersion(executable = DEFAULT_EXECUTABLE) {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const res = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 30000 });
    cachedVersion = res.status === 0 ? String(res.stdout).trim() : null;
  } catch (_) {
    cachedVersion = null;
  }
  return cachedVersion;
}

function checkEffort(effort) {
  if (effort) throw new TypeError(`gemini-cli has no reasoning-effort setting; got ${effort}`);
}

function isolationEnabled(opts = {}) {
  if (typeof opts.isolate === 'boolean') return opts.isolate;
  return process.env.EVAL_NO_ISOLATE !== '1';
}

let isolatedHome = null;
/** Private HOME for this process: API-key settings plus the system prompt file. */
function ensureIsolatedHome() {
  if (isolatedHome && fs.existsSync(isolatedHome.dir)) return isolatedHome;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-gemini-home-'));
  fs.mkdirSync(path.join(dir, '.gemini'));
  fs.writeFileSync(path.join(dir, '.gemini', 'settings.json'), JSON.stringify(ISOLATED_SETTINGS));
  const systemMd = path.join(dir, 'eval-system.md');
  fs.writeFileSync(systemMd, `${ISOLATION_SYSTEM_PROMPT}\n`);
  isolatedHome = { dir, systemMd };
  process.once('exit', () => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  });
  return isolatedHome;
}

function buildArgs(model, opts = {}) {
  const args = ['-p', '', '-m', model, '-o', 'json'];
  if (isolationEnabled(opts)) args.push('--extensions', 'none', '--skip-trust');
  return args;
}

function isolationMetadata(opts = {}, args = null) {
  const enabled = isolationEnabled(opts);
  return {
    backend: BACKEND,
    cli_version: opts.cliVersion !== undefined ? opts.cliVersion : cliVersion(opts.executable || DEFAULT_EXECUTABLE),
    enabled,
    effective_cwd: opts.cwd || os.tmpdir(),
    private_home: enabled,
    auth: 'gemini-api-key',
    env_allowlist: enabled ? ENV_ALLOWLIST.slice() : null,
    system_prompt_replaced: enabled,
    allow_tool_use: enabled && opts.allowToolUse === true,
    args: args ? args.slice() : null,
  };
}

function filterEnv(baseEnv, opts = {}) {
  const apiKey = baseEnv.GEMINI_API_KEY || baseEnv.GOOGLE_API_KEY;
  if (!isolationEnabled(opts)) return { ...baseEnv, ...(apiKey ? { GEMINI_API_KEY: apiKey } : {}), ...(opts.env || {}) };
  const out = {};
  for (const key of ENV_ALLOWLIST) {
    if (baseEnv[key] !== undefined) out[key] = baseEnv[key];
  }
  if (apiKey) out.GEMINI_API_KEY = apiKey;
  if (opts.home) out.HOME = opts.home;
  if (opts.systemMd) out.GEMINI_SYSTEM_MD = opts.systemMd;
  return { ...out, ...(opts.env || {}) };
}

function parseStdout(stdout) {
  const s = String(stdout || '');
  const start = s.indexOf('{');
  if (start < 0) return null;
  try {
    const obj = JSON.parse(s.slice(start));
    return obj && typeof obj === 'object' ? obj : null;
  } catch (_) {
    return null;
  }
}

/** Sum per-model token stats onto the Anthropic-style keys `usageSummary` reads. */
function normalizeUsage(stats) {
  const models = stats && stats.models;
  if (!models || typeof models !== 'object') return null;
  const out = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 };
  for (const entry of Object.values(models)) {
    const t = (entry && entry.tokens) || {};
    const cached = t.cached || 0;
    out.input_tokens += Math.max(0, (t.prompt != null ? t.prompt : t.input || 0) - cached);
    out.cache_read_input_tokens += cached;
    out.output_tokens += (t.candidates || 0) + (t.thoughts || 0);
    out.reasoning_output_tokens += t.thoughts || 0;
  }
  return out;
}

function fail(type, message, details, attempt, base) {
  const failure = new droid.DroidFailure({ type, message, details, attempt });
  return { ok: false, text: '', json: null, usage: null, durationMs: null, ...base, failure, error: failure.message };
}

function classify(rawResult, opts, attempt, isolation) {
  const stdout = rawResult && rawResult.stdout != null ? String(rawResult.stdout) : '';
  const stderr = rawResult && rawResult.stderr != null ? String(rawResult.stderr) : '';
  const raw = stdout + (stderr ? `\n[stderr] ${stderr}` : '');
  const parsed = parseStdout(stdout);
  const observedModels = parsed && parsed.stats && parsed.stats.models ? Object.keys(parsed.stats.models) : [];
  const base = {
    usage: parsed ? normalizeUsage(parsed.stats) : null,
    durationMs: rawResult && rawResult.durationMs != null ? rawResult.durationMs : null,
    raw,
    isolation,
    observed_models: observedModels,
    model_verified: observedModels.includes(opts.model),
  };

  if (rawResult && rawResult.timedOut) {
    return fail('timeout', 'timeout', { signal: rawResult.signal || 'SIGKILL' }, attempt, base);
  }
  if (rawResult && rawResult.error && rawResult.status == null) {
    const msg = String(rawResult.error.message || rawResult.error);
    return fail(/ETIMEDOUT|timeout/i.test(msg) ? 'timeout' : 'transport', msg, { code: rawResult.error.code || null }, attempt, base);
  }
  if (!parsed) {
    if (rawResult && rawResult.status != null && rawResult.status !== 0) {
      const line = stderr.split('\n').map(l => l.trim()).filter(l => l && !/^(Warning|Ripgrep)/.test(l))[0] || '';
      return fail('transport', `exit ${rawResult.status}: ${line}`.trim(), { status: rawResult.status, signal: rawResult.signal || null }, attempt, base);
    }
    return fail('parse', 'could not parse gemini json', { stdout_bytes: Buffer.byteLength(stdout) }, attempt, base);
  }
  if (parsed.error) {
    const e = parsed.error;
    return fail('transport', (e && e.message) || String(e), { error_type: e && e.type || null, code: e && e.code != null ? e.code : null }, attempt, base);
  }
  const text = typeof parsed.response === 'string' ? parsed.response : '';
  const json = text ? droid.extractJson(text) : null;
  if (observedModels.length && !observedModels.includes(opts.model)) {
    return { ...fail('transport', `model mismatch: requested ${opts.model}, served ${observedModels.join(', ')}`, {
      model_mismatch: true,
      requested: opts.model,
      observed: observedModels,
    }, attempt, base), text };
  }
  const tools = parsed.stats && parsed.stats.tools;
  if (tools && tools.totalCalls > 0 && isolation && isolation.enabled && !isolation.allow_tool_use) {
    return { ...fail('tool_leakage', 'tool invocation observed under isolation', {
      total_calls: tools.totalCalls,
      by_name: Object.keys(tools.byName || {}),
    }, attempt, base), text, json };
  }
  if (rawResult && rawResult.status != null && rawResult.status !== 0) {
    return { ...fail('transport', `exit ${rawResult.status}`, { status: rawResult.status }, attempt, base), text };
  }
  if (!text) return fail('parse', 'empty gemini response', null, attempt, base);
  return { ok: true, text, json, ...base, failure: null, error: null };
}

async function runOnce(opts, attempt) {
  checkEffort(opts.effort);
  const home = isolationEnabled(opts) && !opts.runner ? ensureIsolatedHome() : null;
  const runOpts = { ...opts, home: opts.home || (home && home.dir), systemMd: opts.systemMd || (home && home.systemMd) };
  const args = buildArgs(opts.model, runOpts);
  const isolation = isolationMetadata(opts, args);
  const ctx = {
    command: opts.executable || DEFAULT_EXECUTABLE,
    args,
    cwd: isolation.effective_cwd,
    env: filterEnv(process.env, runOpts),
    timeoutMs: opts.timeoutMs || DEFAULT_TIMEOUT_MS,
    maxBuffer: opts.maxBuffer,
    input: opts.prompt,
    model: opts.model,
    effort: null,
    attempt,
    isolation,
  };
  try {
    return classify(await (opts.runner || defaultAsyncRunner)(ctx), opts, attempt, isolation);
  } catch (err) {
    return fail('transport', String(err && err.message || err), { thrown: true }, attempt, { raw: '', isolation });
  }
}

/** Same contract as `executeDroid` and `executeClaude`. */
async function executeGemini(opts = {}) {
  if (!opts.model || !opts.prompt) {
    return finalize(fail('transport', 'model and prompt required', null, 1, { raw: '', isolation: isolationMetadata(opts) }), 1, null, 0, []);
  }
  if (droid.modelFamilyForCost(opts.model) !== 'gemini') {
    return finalize(fail('transport', `gemini-cli backend serves Gemini models only; got ${opts.model}`, {
      unsupported_model: opts.model,
    }, 1, { raw: '', isolation: isolationMetadata(opts) }), 1, null, 0, []);
  }
  const maxAttempts = Math.max(1, Number(opts.attempts || opts.maxAttempts || 1));
  let usage = null;
  let duration = 0;
  const records = [];
  let result;
  let attempt = 1;
  for (; attempt <= maxAttempts; attempt++) {
    result = await runOnce(opts, attempt);
    usage = sumUsage(usage, result.usage);
    if (typeof result.durationMs === 'number') duration += result.durationMs;
    records.push({
      attempt,
      ok: result.ok,
      usage: result.usage || null,
      durationMs: result.durationMs != null ? result.durationMs : null,
      failure: result.failure ? result.failure.toJSON() : null,
    });
    const retryable = result.failure
      && (result.failure.type === 'transport' || result.failure.type === 'timeout')
      && !(result.failure.details && result.failure.details.model_mismatch);
    if (result.ok || !retryable || attempt === maxAttempts) break;
  }
  return finalize(result, Math.min(attempt, maxAttempts), usage, duration, records);
}

function finalize(result, attempts, usage, durationMs, records) {
  return {
    ok: Boolean(result.ok),
    text: result.text || '',
    json: result.json != null ? result.json : null,
    usage,
    durationMs,
    attempts,
    attempt_records: records,
    failure: result.failure || null,
    isolation: result.isolation,
    error: result.error || null,
    raw: result.raw || '',
    cost_model_version: droid.COST_MODEL_VERSION,
    cli_cost_usd: null,
    cli_cost_note: 'Gemini CLI reports no cost; calls bill the API key',
    observed_models: result.observed_models || [],
    model_verified: Boolean(result.model_verified),
  };
}

/** Same contract as `droidJsonAsync`: one retry when no JSON is extractable. */
async function geminiJsonAsync(opts = {}) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await droid._acquireSlot();
    let r;
    try {
      r = await executeGemini({ ...opts, attempts: 1 });
    } finally {
      droid._releaseSlot();
    }
    last = r;
    if (!r.ok) continue;
    const json = r.json != null ? r.json : droid.extractJson(r.text);
    if (json !== null) {
      return { ...r, ok: true, json, raw: r.text, error: null, failure: null, attempts: attempt + 1 };
    }
  }
  const failure = last.failure || new droid.DroidFailure({ type: 'parse', message: last.error || 'no json', attempt: 2 });
  return { ...last, ok: false, json: null, raw: last.text || last.raw, error: last.error || 'no json', failure, attempts: 2 };
}

module.exports = {
  BACKEND,
  ISOLATION_SYSTEM_PROMPT,
  executeGemini,
  geminiJsonAsync,
  maxEffortFor: () => null,
  // Test surface
  buildArgs,
  classify,
  filterEnv,
  isolationMetadata,
  normalizeUsage,
  parseStdout,
};
