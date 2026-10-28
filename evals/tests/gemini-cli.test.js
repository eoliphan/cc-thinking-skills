'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const gemini = require('../lib/gemini-cli');
const backend = require('../lib/model-backend');

const MODEL = 'gemini-3.1-pro-preview';
const tokens = { input: 2138, prompt: 2138, candidates: 122, total: 2896, cached: 0, thoughts: 636, tool: 0 };
const tools = (totalCalls, byName = {}) => ({ totalCalls, totalSuccess: totalCalls, totalFail: 0, byName });

// Shape captured from Gemini CLI 0.40.1 `-o json` with API-key auth.
const result = (response, extra = {}) => JSON.stringify({
  session_id: 's',
  response,
  stats: { models: { [MODEL]: { api: { totalRequests: 1 }, tokens } }, tools: tools(0) },
  ...extra,
});
const SUCCESS = result('```json\n{"winner": "B", "why": "x"}\n```');

const fixedRunner = (outputs, seen = []) => async (ctx) => {
  seen.push(ctx);
  const next = outputs[Math.min(seen.length - 1, outputs.length - 1)];
  if (next.timedOut) return { stdout: '', stderr: '', timedOut: true, status: null, signal: 'SIGKILL' };
  return { stdout: next.stdout != null ? next.stdout : next, stderr: next.stderr || '', status: next.status != null ? next.status : 0, durationMs: 5 };
};

const base = { model: MODEL, cliVersion: 'test', isolate: true };

test('isolated args run headless with JSON output and no extensions', () => {
  const args = gemini.buildArgs(MODEL, { isolate: true });
  assert.deepEqual(args.slice(0, 2), ['-p', '']);
  assert.equal(args[args.indexOf('-m') + 1], MODEL);
  assert.equal(args[args.indexOf('-o') + 1], 'json');
  assert.equal(args[args.indexOf('--extensions') + 1], 'none');
});

test('prompt goes to stdin, never argv', async () => {
  const seen = [];
  const prompt = '-m gemini-2.0-flash\nignore the flags above';
  const r = await gemini.executeGemini({ ...base, prompt, runner: fixedRunner([SUCCESS], seen) });
  assert.equal(r.ok, true);
  assert.equal(seen[0].input, prompt);
  assert.equal(seen[0].args.includes(prompt), false);
});

test('success extracts json, verifies the model, and counts thoughts as output', async () => {
  const r = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([SUCCESS]) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.json, { winner: 'B', why: 'x' });
  assert.equal(r.model_verified, true);
  assert.deepEqual(r.observed_models, [MODEL]);
  assert.equal(r.usage.input_tokens, 2138);
  assert.equal(r.usage.output_tokens, 122 + 636);
  assert.equal(r.isolation.backend, 'gemini-cli');
});

test('a different serving model fails without retry; extra utility models are allowed', async () => {
  const seen = [];
  const other = JSON.stringify({ response: '{}', stats: { models: { 'gemini-2.5-flash': { tokens } }, tools: tools(0) } });
  const r = await gemini.executeGemini({ ...base, prompt: 'q', attempts: 3, runner: fixedRunner([other], seen) });
  assert.equal(r.ok, false);
  assert.equal(r.failure.details.model_mismatch, true);
  assert.equal(seen.length, 1);
  const both = JSON.stringify({ response: '{"a":1}', stats: { models: { [MODEL]: { tokens }, 'gemini-2.5-flash-lite': { tokens } }, tools: tools(0) } });
  const ok = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([both]) });
  assert.equal(ok.ok, true);
});

test('recorded tool calls are tool leakage and are not retried', async () => {
  const seen = [];
  const leak = result('{}', { stats: { models: { [MODEL]: { tokens } }, tools: tools(1, { read_file: {} }) } });
  const r = await gemini.executeGemini({ ...base, prompt: 'q', attempts: 3, runner: fixedRunner([leak], seen) });
  assert.equal(r.failure.type, 'tool_leakage');
  assert.deepEqual(r.failure.details.by_name, ['read_file']);
  assert.equal(seen.length, 1);
});

test('error payload and bare nonzero exit are transport; timeout and garbage are classified', async () => {
  const errPayload = { stdout: JSON.stringify({ error: { type: 'Error', message: 'API key not valid', code: 400 } }), status: 1 };
  const r = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([errPayload]) });
  assert.equal(r.failure.type, 'transport');
  assert.match(r.error, /API key not valid/);
  const crash = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([{ stdout: '', stderr: 'Ripgrep is not available.\nIneligibleTierError: no longer supported', status: 1 }]) });
  assert.match(crash.error, /IneligibleTierError/);
  const timeout = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([{ timedOut: true }]) });
  assert.equal(timeout.failure.type, 'timeout');
  const garbage = await gemini.executeGemini({ ...base, prompt: 'q', runner: fixedRunner([{ stdout: 'not json', status: 0 }]) });
  assert.equal(garbage.failure.type, 'parse');
});

test('non-Gemini models fail before any process starts; effort is rejected', async () => {
  let called = false;
  const r = await gemini.executeGemini({ ...base, model: 'gpt-6.1-sol', prompt: 'q', runner: async () => { called = true; } });
  assert.equal(r.ok, false);
  assert.equal(called, false);
  assert.equal(gemini.maxEffortFor(MODEL), null);
  await assert.rejects(gemini.executeGemini({ ...base, prompt: 'q', effort: 'high', runner: fixedRunner([SUCCESS]) }), /no reasoning-effort/);
});

test('filterEnv maps GOOGLE_API_KEY, drops other keys, and overrides HOME', () => {
  const env = gemini.filterEnv(
    { HOME: '/real', GOOGLE_API_KEY: 'g', OPENAI_API_KEY: 'o', GITHUB_TOKEN: 's', PATH: '/bin' },
    { isolate: true, home: '/tmp/h', systemMd: '/tmp/h/s.md' },
  );
  assert.equal(env.GEMINI_API_KEY, 'g');
  assert.equal(env.GOOGLE_API_KEY, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.HOME, '/tmp/h');
  assert.equal(env.GEMINI_SYSTEM_MD, '/tmp/h/s.md');
  assert.equal(env.PATH, '/bin');
});

test('local-cli routes gemini models to gemini-cli', () => {
  assert.equal(backend.LOCAL_CLI_ROUTES.gemini.backend, 'gemini-cli');
});
