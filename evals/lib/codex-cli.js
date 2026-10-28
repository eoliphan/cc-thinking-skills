'use strict';

/**
 * Model-call backend that drives the Codex CLI (`codex exec`) for GPT models.
 *
 * Results keep the `executeDroid` shape, like `./claude-cli`. The pairwise
 * judge panel uses this backend for its GPT family through
 * `evals/lib/model-backend.js` (`EVAL_BACKEND=local-cli`).
 *
 * Isolation: each process gets a private CODEX_HOME that holds only a symlink
 * to the real `auth.json`. The user's config.toml, global AGENTS.md, hooks,
 * MCP servers, and rules therefore do not load. Codex's built-in coding-agent
 * instructions are replaced through `model_instructions_file`. Codex still
 * offers some built-in tools, so any non-message item in the JSON event
 * stream is a tool_leakage failure.
 *
 * Auth uses the ChatGPT login in `auth.json`. API-key variables are not passed
 * through, so a stray OPENAI_API_KEY cannot switch the call to API billing.
 * If Codex refreshes the token and replaces the symlink with a file, the new
 * file is copied back to the real `auth.json` and the symlink is restored.
 *
 * Codex does not report which model served a call. `observed_models` stays
 * empty and `model_verified` is false; the requested model is recorded.
 *
 * Results from this backend must not be pooled with droid-era artifacts.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const droid = require('./droid');
const { defaultAsyncRunner, sumUsage } = require('./claude-cli');

const BACKEND = 'codex-cli';
const DEFAULT_EXECUTABLE = 'codex';
const DEFAULT_TIMEOUT_MS = 600000;
// `ultra` delegates to sub-agents, so it is not offered.
const EFFORT_LEVELS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']);
const MESSAGE_ITEM_TYPES = Object.freeze(['agent_message', 'reasoning']);

const ISOLATION_INSTRUCTIONS = 'You are answering a self-contained task. Reason using only the content of the user message. Do not call tools.';

const ENV_ALLOWLIST = Object.freeze(droid.ISOLATION_ENV_ALLOWLIST.filter(k => !/_API_KEY$|^FACTORY_|^ANTHROPIC_/.test(k)));

let cachedVersion;
function cliVersion(executable = DEFAULT_EXECUTABLE) {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const res = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 15000 });
    cachedVersion = res.status === 0 ? String(res.stdout).trim() : null;
  } catch (_) {
    cachedVersion = null;
  }
  return cachedVersion;
}

function effortFor(model, effort) {
  if (effort && EFFORT_LEVELS.includes(effort)) return effort;
  if (effort) throw new TypeError(`unsupported codex effort: ${effort}`);
  return 'high';
}

function isolationEnabled(opts = {}) {
  if (typeof opts.isolate === 'boolean') return opts.isolate;
  return process.env.EVAL_NO_ISOLATE !== '1';
}

function realCodexHome(env = process.env) {
  return env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

let isolatedHome = null;
/** Private CODEX_HOME for this process: auth symlink plus instructions file. */
function ensureIsolatedHome(env = process.env) {
  if (isolatedHome && fs.existsSync(isolatedHome.dir)) return isolatedHome;
  const source = path.join(realCodexHome(env), 'auth.json');
  if (!fs.existsSync(source)) throw new Error(`codex auth not found at ${source}; run \`codex login\``);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-codex-home-'));
  fs.symlinkSync(source, path.join(dir, 'auth.json'));
  const instructions = path.join(dir, 'eval-instructions.md');
  fs.writeFileSync(instructions, `${ISOLATION_INSTRUCTIONS}\n`);
  isolatedHome = { dir, source, instructions };
  process.once('exit', () => {
    try { restoreAuthLink(isolatedHome); } catch (_) { /* best effort */ }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  });
  return isolatedHome;
}

/** Copy a refreshed token back to the real auth.json and restore the symlink. */
function restoreAuthLink(home) {
  if (!home) return false;
  const link = path.join(home.dir, 'auth.json');
  let stat;
  try { stat = fs.lstatSync(link); } catch (_) { return false; }
  if (stat.isSymbolicLink()) return false;
  fs.copyFileSync(link, home.source);
  fs.rmSync(link, { force: true });
  fs.symlinkSync(home.source, link);
  return true;
}

function buildArgs(model, effort, opts = {}) {
  const args = [
    'exec', '--json', '--ephemeral', '--skip-git-repo-check',
    '--sandbox', 'read-only',
    '-m', model,
    '-c', `model_reasoning_effort="${effort}"`,
  ];
  if (isolationEnabled(opts)) {
    args.push(
      '--ignore-rules',
      '-c', 'project_doc_max_bytes=0',
      '-c', `model_instructions_file="${opts.instructionsFile}"`,
    );
  }
  args.push('-');
  return args;
}

function isolationMetadata(opts = {}, args = null) {
  const enabled = isolationEnabled(opts);
  return {
    backend: BACKEND,
    cli_version: opts.cliVersion !== undefined ? opts.cliVersion : cliVersion(opts.executable || DEFAULT_EXECUTABLE),
    enabled,
    effective_cwd: opts.cwd || os.tmpdir(),
    private_codex_home: enabled,
    env_allowlist: enabled ? ENV_ALLOWLIST.slice() : null,
    system_prompt_replaced: enabled,
    allow_tool_use: enabled && opts.allowToolUse === true,
    args: args ? args.slice() : null,
  };
}

function filterEnv(baseEnv, opts = {}) {
  if (!isolationEnabled(opts)) return { ...baseEnv, ...(opts.env || {}) };
  const out = {};
  for (const key of ENV_ALLOWLIST) {
    if (baseEnv[key] !== undefined) out[key] = baseEnv[key];
  }
  if (opts.codexHome) out.CODEX_HOME = opts.codexHome;
  return { ...out, ...(opts.env || {}) };
}

/** Parse `codex exec --json` JSONL into the fields the classifier needs. */
function parseEvents(stdout) {
  const events = [];
  for (const line of String(stdout || '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === 'object' && typeof obj.type === 'string') events.push(obj);
    } catch (_) { /* skip non-JSON lines */ }
  }
  if (!events.length) return null;
  let text = null;
  let usage = null;
  let completed = false;
  const errors = [];
  const toolItems = [];
  for (const ev of events) {
    if (ev.type === 'turn.completed') {
      completed = true;
      usage = ev.usage || usage;
    } else if (ev.type === 'turn.failed') {
      errors.push((ev.error && ev.error.message) || 'turn.failed');
    } else if (ev.type === 'error') {
      errors.push(ev.message || 'error');
    } else if (/^item\./.test(ev.type) && ev.item) {
      if (ev.item.type === 'agent_message' && ev.type === 'item.completed') text = ev.item.text;
      else if (!MESSAGE_ITEM_TYPES.includes(ev.item.type)) toolItems.push(ev.item.type);
    }
  }
  return { events: events.length, text, usage, completed, errors, toolItems: [...new Set(toolItems)] };
}

/** Map Codex usage onto the Anthropic-style keys `usageSummary` reads. */
function normalizeUsage(u) {
  if (!u) return null;
  const input = u.input_tokens || 0;
  const cached = u.cached_input_tokens || 0;
  return {
    input_tokens: Math.max(0, input - cached),
    cache_read_input_tokens: cached,
    cache_creation_input_tokens: u.cache_write_input_tokens || 0,
    output_tokens: u.output_tokens || 0,
    reasoning_output_tokens: u.reasoning_output_tokens || 0,
  };
}

function fail(type, message, details, attempt, base) {
  const failure = new droid.DroidFailure({ type, message, details, attempt });
  return { ok: false, text: '', json: null, usage: null, durationMs: null, ...base, failure, error: failure.message };
}

function classify(rawResult, opts, attempt, isolation) {
  const stdout = rawResult && rawResult.stdout != null ? String(rawResult.stdout) : '';
  const stderr = rawResult && rawResult.stderr != null ? String(rawResult.stderr) : '';
  const raw = stdout + (stderr ? `\n[stderr] ${stderr}` : '');
  const parsed = parseEvents(stdout);
  const base = {
    usage: parsed ? normalizeUsage(parsed.usage) : null,
    durationMs: rawResult && rawResult.durationMs != null ? rawResult.durationMs : null,
    raw,
    isolation,
    observed_models: [],
    model_verified: false,
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
      return fail('transport', `exit ${rawResult.status}: ${stderr.trim().split('\n').pop() || ''}`.trim(), {
        status: rawResult.status, signal: rawResult.signal || null,
      }, attempt, base);
    }
    return fail('parse', 'could not parse codex json events', { stdout_bytes: Buffer.byteLength(stdout) }, attempt, base);
  }
  const text = parsed.text || '';
  const json = text ? droid.extractJson(text) : null;
  if (parsed.toolItems.length && !(isolation && (!isolation.enabled || isolation.allow_tool_use))) {
    return { ...fail('tool_leakage', 'tool invocation observed under isolation', {
      item_types: parsed.toolItems,
    }, attempt, base), text, json };
  }
  if (parsed.errors.length || !parsed.completed || (rawResult && rawResult.status != null && rawResult.status !== 0)) {
    return { ...fail('transport', parsed.errors[0] || `turn not completed (exit ${rawResult && rawResult.status})`, {
      errors: parsed.errors,
      completed: parsed.completed,
    }, attempt, base), text };
  }
  if (!text) return fail('parse', 'no agent_message in codex events', { events: parsed.events }, attempt, base);
  return { ok: true, text, json, ...base, failure: null, error: null };
}

async function runOnce(opts, attempt) {
  const effort = effortFor(opts.model, opts.effort);
  const isolate = isolationEnabled(opts);
  let home = null;
  if (isolate && !opts.runner) home = ensureIsolatedHome();
  const runOpts = {
    ...opts,
    codexHome: opts.codexHome || (home && home.dir),
    instructionsFile: opts.instructionsFile || (home ? home.instructions : 'eval-instructions.md'),
  };
  const args = buildArgs(opts.model, effort, runOpts);
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
    effort,
    attempt,
    isolation,
  };
  try {
    const result = classify(await (opts.runner || defaultAsyncRunner)(ctx), opts, attempt, isolation);
    if (home && restoreAuthLink(home)) result.auth_refreshed = true;
    return result;
  } catch (err) {
    return fail('transport', String(err && err.message || err), { thrown: true }, attempt, { raw: '', isolation });
  }
}

/** Same contract as `executeDroid` and `executeClaude`. */
async function executeCodex(opts = {}) {
  if (!opts.model || !opts.prompt) {
    return finalize(fail('transport', 'model and prompt required', null, 1, { raw: '', isolation: isolationMetadata(opts) }), 1, null, 0, []);
  }
  if (droid.modelFamilyForCost(opts.model) !== 'gpt') {
    return finalize(fail('transport', `codex-cli backend serves GPT models only; got ${opts.model}`, {
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
    const retryable = result.failure && (result.failure.type === 'transport' || result.failure.type === 'timeout');
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
    cli_cost_note: 'Codex reports no cost; ChatGPT login usage is subscription quota',
    observed_models: [],
    model_verified: false,
  };
}

/** Same contract as `droidJsonAsync`: one retry when no JSON is extractable. */
async function codexJsonAsync(opts = {}) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await droid._acquireSlot();
    let r;
    try {
      r = await executeCodex({ ...opts, attempts: 1 });
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
  EFFORT_LEVELS,
  ISOLATION_INSTRUCTIONS,
  executeCodex,
  codexJsonAsync,
  maxEffortFor: (model) => effortFor(model),
  // Test surface
  buildArgs,
  classify,
  filterEnv,
  isolationMetadata,
  normalizeUsage,
  parseEvents,
  restoreAuthLink,
};
