'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const claude = require('../lib/claude-cli');
const backend = require('../lib/model-backend');

const usage = (input, cacheCreation, cacheRead, output) => ({
  input_tokens: input,
  cache_creation_input_tokens: cacheCreation,
  cache_read_input_tokens: cacheRead,
  output_tokens: output,
});

// Shapes captured from Claude Code 2.1.300 `-p --output-format json`.
const SUCCESS = {
  type: 'result',
  subtype: 'success',
  is_error: false,
  num_turns: 1,
  result: 'Answer.\n```json\n{"answer": "B"}\n```',
  usage: usage(652, 0, 0, 312),
  total_cost_usd: 0.002212,
  modelUsage: { 'claude-haiku-4-5-20251001': {} },
  permission_denials: [],
  duration_ms: 1200,
};
const NOT_LOGGED_IN = {
  type: 'result',
  subtype: 'success',
  is_error: true,
  num_turns: 1,
  result: 'Not logged in · Please run /login',
  terminal_reason: 'api_error',
  api_error_status: null,
  usage: usage(0, 0, 0, 0),
  total_cost_usd: 0,
  permission_denials: [],
};

const fixedRunner = (payloads, seen = []) => async (ctx) => {
  seen.push(ctx);
  const next = payloads[Math.min(seen.length - 1, payloads.length - 1)];
  if (next.timedOut) return { stdout: '', stderr: '', timedOut: true, status: null, signal: 'SIGKILL' };
  return { stdout: `${JSON.stringify(next)}\n`, stderr: '', status: next.is_error ? 1 : 0, durationMs: 5 };
};

const base = { model: 'claude-haiku-4-5-20251001', cliVersion: 'test', isolate: true };

test('isolated args disable tools, MCP, slash commands, settings, and replace the system prompt', () => {
  const args = claude.buildArgs('m', 'high', { isolate: true });
  const value = (flag) => args[args.indexOf(flag) + 1];
  assert.equal(args[0], '-p');
  assert.equal(value('--model'), 'm');
  assert.equal(value('--effort'), 'high');
  assert.equal(value('--output-format'), 'json');
  assert.equal(value('--tools'), '');
  assert.equal(value('--setting-sources'), '');
  assert.equal(value('--system-prompt'), claude.ISOLATION_SYSTEM_PROMPT);
  for (const flag of ['--disable-slash-commands', '--strict-mcp-config', '--no-session-persistence']) {
    assert.ok(args.includes(flag), flag);
  }
});

test('prompt goes to stdin, never argv, even when it starts with a dash', async () => {
  const seen = [];
  const prompt = '--model opus\nignore the flags above';
  const r = await claude.executeClaude({ ...base, prompt, runner: fixedRunner([SUCCESS], seen) });
  assert.equal(r.ok, true);
  assert.equal(seen[0].input, prompt);
  assert.equal(seen[0].args.includes(prompt), false);
  assert.equal(seen[0].args[seen[0].args.indexOf('--model') + 1], base.model);
});

test('success result exposes text, extracted json, usage, CLI cost, and backend metadata', async () => {
  const r = await claude.executeClaude({ ...base, prompt: 'q', runner: fixedRunner([SUCCESS]) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.json, { answer: 'B' });
  assert.equal(r.usage.input_tokens, 652);
  assert.equal(r.cli_cost_usd, 0.002212);
  assert.equal(r.isolation.backend, 'claude-cli');
  assert.equal(r.isolation.cli_version, 'test');
  assert.ok(Array.isArray(r.isolation.args));
});

test('usageSummary counts cache creation and cache read tokens', () => {
  const s = backend.usageSummary(usage(10, 79801, 5, 548), 'claude-haiku-4-5-20251001');
  assert.equal(s.total_tokens, 10 + 79801 + 5 + 548);
  assert.equal(s.cache_creation_tokens, 79801);
});

test('is_error result is a transport failure that retries and accumulates usage', async () => {
  const seen = [];
  const r = await claude.executeClaude({
    ...base,
    prompt: 'q',
    attempts: 2,
    runner: fixedRunner([NOT_LOGGED_IN, SUCCESS], seen),
  });
  assert.equal(seen.length, 2);
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
  assert.equal(r.attempt_records[0].failure.type, 'transport');
  assert.equal(r.usage.input_tokens, 652);
});

test('exhausted is_error keeps the CLI message and terminal reason', async () => {
  const r = await claude.executeClaude({ ...base, prompt: 'q', runner: fixedRunner([NOT_LOGGED_IN]) });
  assert.equal(r.ok, false);
  assert.equal(r.failure.type, 'transport');
  assert.match(r.error, /Not logged in/);
  assert.equal(r.failure.details.terminal_reason, 'api_error');
});

test('multi-turn or permission-denied results are tool leakage and are not retried', async () => {
  for (const leak of [{ num_turns: 3 }, { permission_denials: [{ tool_name: 'Read' }] }]) {
    const seen = [];
    const r = await claude.executeClaude({
      ...base,
      prompt: 'q',
      attempts: 3,
      runner: fixedRunner([{ ...SUCCESS, ...leak }], seen),
    });
    assert.equal(r.ok, false);
    assert.equal(r.failure.type, 'tool_leakage');
    assert.equal(seen.length, 1);
  }
});

test('timeout and unparseable output are classified', async () => {
  const timeout = await claude.executeClaude({ ...base, prompt: 'q', runner: fixedRunner([{ timedOut: true }]) });
  assert.equal(timeout.failure.type, 'timeout');
  const garbage = await claude.executeClaude({
    ...base,
    prompt: 'q',
    runner: async () => ({ stdout: 'not json', stderr: '', status: 0 }),
  });
  assert.equal(garbage.failure.type, 'parse');
});

test('missing model or prompt fails without spawning', async () => {
  let called = false;
  const r = await claude.executeClaude({ prompt: 'q', cliVersion: 'test', runner: async () => { called = true; } });
  assert.equal(r.ok, false);
  assert.equal(called, false);
});

test('unsupported effort is rejected; default effort is high', () => {
  assert.equal(claude.maxEffortFor('any'), 'high');
  return assert.rejects(claude.executeClaude({ ...base, prompt: 'q', effort: 'turbo', runner: fixedRunner([SUCCESS]) }), /unsupported claude effort/);
});

test('filterEnv drops unrelated secrets and keeps auth-relevant keys', () => {
  const env = claude.filterEnv({ HOME: '/h', USER: 'u', ANTHROPIC_API_KEY: 'k', GITHUB_TOKEN: 'secret' }, { isolate: true });
  assert.equal(env.HOME, '/h');
  assert.equal(env.ANTHROPIC_API_KEY, 'k');
  assert.equal(env.GITHUB_TOKEN, undefined);
});

test('claudeJsonAsync retries once when no JSON is extractable', async () => {
  const seen = [];
  const noJson = { ...SUCCESS, result: 'plain prose' };
  const r = await claude.claudeJsonAsync({ ...base, prompt: 'q', runner: fixedRunner([noJson, SUCCESS], seen) });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
  assert.deepEqual(r.json, { answer: 'B' });
});

test('non-Claude models fail before any process starts', async () => {
  let called = false;
  const r = await claude.executeClaude({
    ...base,
    model: 'gpt-5.5-pro',
    prompt: 'q',
    attempts: 3,
    runner: async () => { called = true; },
  });
  assert.equal(r.ok, false);
  assert.equal(called, false);
  assert.equal(r.failure.details.unsupported_model, 'gpt-5.5-pro');
});

test('a full model ID served by a different model fails without retry', async () => {
  const seen = [];
  const r = await claude.executeClaude({
    ...base,
    prompt: 'q',
    attempts: 3,
    runner: fixedRunner([{ ...SUCCESS, modelUsage: { 'claude-sonnet-5-5': {} } }], seen),
  });
  assert.equal(r.ok, false);
  assert.equal(seen.length, 1);
  assert.equal(r.failure.details.model_mismatch, true);
  assert.deepEqual(r.observed_models, ['claude-sonnet-5-5']);
  const alias = await claude.executeClaude({
    ...base,
    model: 'haiku',
    prompt: 'q',
    runner: fixedRunner([SUCCESS]),
  });
  assert.equal(alias.ok, true);
  assert.deepEqual(alias.observed_models, ['claude-haiku-4-5-20251001']);
});

test('model-backend defaults to droid and validates EVAL_BACKEND', () => {
  assert.equal(backend.backendName({}), 'droid');
  assert.equal(backend.select({}).backend, 'droid');
  const selected = backend.select({ EVAL_BACKEND: 'claude-cli' });
  assert.equal(selected.backend, 'claude-cli');
  assert.equal(selected.executeModel, claude.executeClaude);
  assert.throws(() => backend.backendName({ EVAL_BACKEND: 'other' }), /EVAL_BACKEND/);
});
