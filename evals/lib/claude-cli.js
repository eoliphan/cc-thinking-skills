'use strict';

/**
 * Model-call backend that drives the Claude Code CLI (`claude -p`).
 *
 * `evals/lib/droid.js` is hash-pinned by frozen study manifests, so this
 * backend lives beside it and reuses its exported helpers. Results keep the
 * same shape as `executeDroid` so runners can switch backends through
 * `evals/lib/model-backend.js`.
 *
 * Isolation: the solver runs from a neutral cwd with every built-in tool,
 * MCP server, slash command, skill, and settings source disabled, and with a
 * replacement system prompt. This removes the user's CLAUDE.md, plugins, and
 * skill catalog from the solver context. Auth uses the interactive OAuth
 * login, so `--bare` (API key only) is not used.
 *
 * The prompt goes to stdin, never argv: a prompt that starts with `-` would
 * parse as a flag, and long prompts can exceed ARG_MAX.
 *
 * This backend changes solver context relative to droid-era runs. Its results
 * must not be pooled with droid artifacts or used under a droid-era prereg.
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const droid = require('./droid');

const BACKEND = 'claude-cli';
const DEFAULT_EXECUTABLE = 'claude';
const DEFAULT_TIMEOUT_MS = 600000;
const EFFORT_LEVELS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']);

const ISOLATION_SYSTEM_PROMPT = 'You are answering a self-contained task. Reason using only the content of the user message. Do not call tools.';

// Claude Code needs XDG/HOME/USER for OAuth keychain access; the rest of the
// allowlist is shared with the droid backend.
const ENV_ALLOWLIST = Object.freeze([...droid.ISOLATION_ENV_ALLOWLIST]);

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
  if (effort) throw new TypeError(`unsupported claude effort: ${effort}`);
  return 'high';
}

function isolationEnabled(opts = {}) {
  if (typeof opts.isolate === 'boolean') return opts.isolate;
  return process.env.EVAL_NO_ISOLATE !== '1';
}

function buildArgs(model, effort, opts = {}) {
  const args = [
    '-p',
    '--model', model,
    '--effort', effort,
    '--output-format', 'json',
    '--no-session-persistence',
  ];
  if (isolationEnabled(opts)) {
    const tools = opts.restrictTools && opts.restrictTools.length ? opts.restrictTools.join(',') : '';
    args.push(
      '--tools', tools,
      '--disable-slash-commands',
      '--strict-mcp-config',
      '--setting-sources', '',
      '--system-prompt', opts.systemPrompt || ISOLATION_SYSTEM_PROMPT,
    );
  }
  return args;
}

function isolationMetadata(opts = {}, args = null) {
  const enabled = isolationEnabled(opts);
  return {
    backend: BACKEND,
    cli_version: opts.cliVersion !== undefined ? opts.cliVersion : cliVersion(opts.executable || DEFAULT_EXECUTABLE),
    enabled,
    effective_cwd: opts.cwd || os.tmpdir(),
    restricted_tools: enabled && opts.restrictTools ? opts.restrictTools.slice() : [],
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
  for (const key of Object.keys(baseEnv)) {
    if (/^(ANTHROPIC|CLAUDE_CONFIG_DIR)/i.test(key)) out[key] = baseEnv[key];
  }
  return { ...out, ...(opts.env || {}) };
}

function parseStdout(stdout) {
  const lines = String(stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && typeof obj === 'object' && obj.type === 'result') return obj;
    } catch (_) { /* keep scanning */ }
  }
  try { return JSON.parse(stdout); } catch (_) { return null; }
}

/**
 * Structured tool-use signals in Claude Code result JSON. Never inspects the
 * answer text: an answer may mention tools without calling them.
 */
function detectToolLeakage(parsed, isolation) {
  if (!isolation || !isolation.enabled || !parsed) return false;
  if (isolation.allow_tool_use) return false;
  if (typeof parsed.num_turns === 'number' && parsed.num_turns > 1) return true;
  if (Array.isArray(parsed.permission_denials) && parsed.permission_denials.length) return true;
  return false;
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
  const durationMs = rawResult && rawResult.durationMs != null
    ? rawResult.durationMs
    : (parsed && parsed.duration_ms != null ? parsed.duration_ms : null);
  const base = {
    usage: parsed && parsed.usage ? parsed.usage : null,
    durationMs,
    raw,
    isolation,
    cli_cost_usd: parsed && typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : null,
    model_usage: parsed && parsed.modelUsage ? parsed.modelUsage : null,
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
      return fail('transport', `exit ${rawResult.status}`, { status: rawResult.status, signal: rawResult.signal || null }, attempt, base);
    }
    return fail('parse', 'could not parse claude json', { stdout_bytes: Buffer.byteLength(stdout) }, attempt, base);
  }

  const text = typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result);
  const json = droid.extractJson(text);
  if (detectToolLeakage(parsed, isolation)) {
    return { ...fail('tool_leakage', 'tool invocation observed under isolation', {
      num_turns: parsed.num_turns,
      permission_denials: parsed.permission_denials || [],
    }, attempt, base), text, json };
  }
  if (parsed.is_error || (rawResult && rawResult.status != null && rawResult.status !== 0)) {
    return { ...fail('transport', parsed.result || 'is_error', {
      is_error: Boolean(parsed.is_error),
      terminal_reason: parsed.terminal_reason || null,
      api_error_status: parsed.api_error_status != null ? parsed.api_error_status : null,
    }, attempt, base), text };
  }
  return { ok: true, text, json, ...base, failure: null, error: null };
}

function defaultAsyncRunner({ command, args, cwd, env, timeoutMs, input, maxBuffer }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const max = maxBuffer || 64 * 1024 * 1024;
    const finish = (extra) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, durationMs: Date.now() - started, error: null, timedOut: false, ...extra });
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
      finish({ timedOut: true, status: null, signal: 'SIGKILL' });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > max) {
        try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
        finish({ status: null, error: new Error('maxBuffer exceeded'), signal: 'SIGKILL' });
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => finish({ error: err, status: null }));
    child.on('close', (code, signal) => finish({ status: code, signal }));
    child.stdin.on('error', () => { /* child exited early; close handler reports it */ });
    child.stdin.end(input);
  });
}

async function runOnce(opts, attempt) {
  const effort = effortFor(opts.model, opts.effort);
  const args = buildArgs(opts.model, effort, opts);
  const isolation = isolationMetadata(opts, args);
  const ctx = {
    command: opts.executable || DEFAULT_EXECUTABLE,
    args,
    cwd: isolation.effective_cwd,
    env: filterEnv(process.env, opts),
    timeoutMs: opts.timeoutMs || DEFAULT_TIMEOUT_MS,
    maxBuffer: opts.maxBuffer,
    input: opts.prompt,
    model: opts.model,
    effort,
    attempt,
    isolation,
  };
  try {
    return classify(await (opts.runner || defaultAsyncRunner)(ctx), opts, attempt, isolation);
  } catch (err) {
    return fail('transport', String(err && err.message || err), { thrown: true }, attempt, { raw: '', isolation });
  }
}

function sumUsage(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (typeof value === 'number') out[key] = (typeof a[key] === 'number' ? a[key] : 0) + value;
  }
  return out;
}

/**
 * Same contract as `executeDroid`: returns structured failures, never throws
 * for per-item solver errors, and accumulates usage across retries.
 */
async function executeClaude(opts = {}) {
  if (!opts.model || !opts.prompt) {
    const isolation = isolationMetadata(opts);
    return finalize(fail('transport', 'model and prompt required', null, 1, { raw: '', isolation }), 1, null, 0, [], null);
  }
  const maxAttempts = Math.max(1, Number(opts.attempts || opts.maxAttempts || 1));
  let usage = null;
  let cliCost = null;
  let duration = 0;
  const records = [];
  let result;
  let attempt = 1;
  for (; attempt <= maxAttempts; attempt++) {
    result = await runOnce(opts, attempt);
    usage = sumUsage(usage, result.usage);
    if (typeof result.cli_cost_usd === 'number') cliCost = (cliCost || 0) + result.cli_cost_usd;
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
  return finalize(result, Math.min(attempt, maxAttempts), usage, duration, records, cliCost);
}

function finalize(result, attempts, usage, durationMs, records, cliCost) {
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
    cli_cost_usd: cliCost,
    cli_cost_note: 'total_cost_usd reported by Claude Code; notional under subscription OAuth',
    model_usage: result.model_usage || null,
  };
}

/** Same contract as `droidJsonAsync`: one retry when no JSON is extractable. */
async function claudeJsonAsync(opts = {}) {
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    await droid._acquireSlot();
    let r;
    try {
      r = await executeClaude({ ...opts, attempts: 1 });
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
  ISOLATION_SYSTEM_PROMPT,
  executeClaude,
  claudeJsonAsync,
  maxEffortFor: (model) => effortFor(model),
  // Test surface
  buildArgs,
  classify,
  detectToolLeakage,
  filterEnv,
  isolationMetadata,
  parseStdout,
};
