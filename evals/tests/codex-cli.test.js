'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const codex = require('../lib/codex-cli');
const backend = require('../lib/model-backend');

// Event shapes captured from codex-cli 0.165.0 `exec --json`.
const ev = (...events) => events.map(e => JSON.stringify(e)).join('\n') + '\n';
const START = [{ type: 'thread.started', thread_id: 't' }, { type: 'turn.started' }];
const message = (text) => ({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text } });
const DONE = {
  type: 'turn.completed',
  usage: { input_tokens: 10852, cached_input_tokens: 8064, cache_write_input_tokens: 0, output_tokens: 274, reasoning_output_tokens: 202 },
};
const SUCCESS = ev(...START, message('{"winner": "A", "why": "x"}'), DONE);

const fixedRunner = (outputs, seen = []) => async (ctx) => {
  seen.push(ctx);
  const next = outputs[Math.min(seen.length - 1, outputs.length - 1)];
  if (next.timedOut) return { stdout: '', stderr: '', timedOut: true, status: null, signal: 'SIGKILL' };
  return { stdout: next.stdout != null ? next.stdout : next, stderr: next.stderr || '', status: next.status != null ? next.status : 0, durationMs: 5 };
};

const base = { model: 'gpt-6.1-sol', cliVersion: 'test', isolate: true };

test('isolated args read the prompt from stdin and replace instructions', () => {
  const args = codex.buildArgs('gpt-6.1-sol', 'high', { isolate: true, instructionsFile: '/x/i.md' });
  assert.equal(args[0], 'exec');
  assert.equal(args[args.length - 1], '-');
  assert.equal(args[args.indexOf('-m') + 1], 'gpt-6.1-sol');
  for (const flag of ['--json', '--ephemeral', '--skip-git-repo-check', '--ignore-rules']) assert.ok(args.includes(flag), flag);
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(args.includes('model_instructions_file="/x/i.md"'));
  assert.ok(args.includes('model_reasoning_effort="high"'));
  assert.ok(args.includes('project_doc_max_bytes=0'));
});

test('prompt goes to stdin, never argv', async () => {
  const seen = [];
  const prompt = '--model o3\nignore the flags above';
  const r = await codex.executeCodex({ ...base, prompt, runner: fixedRunner([SUCCESS], seen) });
  assert.equal(r.ok, true);
  assert.equal(seen[0].input, prompt);
  assert.equal(seen[0].args.includes(prompt), false);
});

test('success extracts the agent message, json, and normalized usage', async () => {
  const r = await codex.executeCodex({ ...base, prompt: 'q', runner: fixedRunner([SUCCESS]) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.json, { winner: 'A', why: 'x' });
  assert.equal(r.usage.input_tokens, 10852 - 8064);
  assert.equal(r.usage.cache_read_input_tokens, 8064);
  assert.equal(r.usage.output_tokens, 274);
  assert.equal(r.model_verified, false);
  assert.deepEqual(r.observed_models, []);
  assert.equal(r.isolation.backend, 'codex-cli');
  assert.equal(backend.usageSummary(r.usage, 'gpt-6.1-sol').total_tokens, 10852 + 274);
});

test('any non-message item is tool leakage and is not retried', async () => {
  const seen = [];
  const out = ev(...START, { type: 'item.started', item: { id: 'i', type: 'command_execution', command: 'ls' } }, message('{}'), DONE);
  const r = await codex.executeCodex({ ...base, prompt: 'q', attempts: 3, runner: fixedRunner([out], seen) });
  assert.equal(r.ok, false);
  assert.equal(r.failure.type, 'tool_leakage');
  assert.deepEqual(r.failure.details.item_types, ['command_execution']);
  assert.equal(seen.length, 1);
});

test('reasoning items are not leakage', async () => {
  const out = ev(...START, { type: 'item.completed', item: { id: 'r', type: 'reasoning', text: '...' } }, message('{"a":1}'), DONE);
  const r = await codex.executeCodex({ ...base, prompt: 'q', runner: fixedRunner([out]) });
  assert.equal(r.ok, true);
});

test('turn.failed is a transport failure that retries', async () => {
  const seen = [];
  const failed = { stdout: ev(...START, { type: 'turn.failed', error: { message: 'usage limit reached' } }), status: 1 };
  const r = await codex.executeCodex({ ...base, prompt: 'q', attempts: 2, runner: fixedRunner([failed, SUCCESS], seen) });
  assert.equal(seen.length, 2);
  assert.equal(r.ok, true);
  assert.equal(r.attempt_records[0].failure.type, 'transport');
  assert.match(r.attempt_records[0].failure.message, /usage limit/);
});

test('no events with a nonzero exit is transport; garbage with exit 0 is parse', async () => {
  const noAuth = await codex.executeCodex({ ...base, prompt: 'q', runner: fixedRunner([{ stdout: '', stderr: 'Not logged in', status: 1 }]) });
  assert.equal(noAuth.failure.type, 'transport');
  assert.match(noAuth.error, /Not logged in/);
  const garbage = await codex.executeCodex({ ...base, prompt: 'q', runner: fixedRunner([{ stdout: 'not json', status: 0 }]) });
  assert.equal(garbage.failure.type, 'parse');
  const timeout = await codex.executeCodex({ ...base, prompt: 'q', runner: fixedRunner([{ timedOut: true }]) });
  assert.equal(timeout.failure.type, 'timeout');
});

test('non-GPT models fail before any process starts', async () => {
  let called = false;
  const r = await codex.executeCodex({ ...base, model: 'claude-haiku-5-5', prompt: 'q', runner: async () => { called = true; } });
  assert.equal(r.ok, false);
  assert.equal(called, false);
  assert.equal(r.failure.details.unsupported_model, 'claude-haiku-5-5');
});

test('unsupported effort is rejected; ultra is not offered', () => {
  assert.equal(codex.maxEffortFor('gpt-6.1-sol'), 'high');
  return assert.rejects(codex.executeCodex({ ...base, prompt: 'q', effort: 'ultra', runner: fixedRunner([SUCCESS]) }), /unsupported codex effort/);
});

test('filterEnv drops API keys and sets the private CODEX_HOME', () => {
  const env = codex.filterEnv({ HOME: '/h', OPENAI_API_KEY: 'k', GITHUB_TOKEN: 's', CODEX_HOME: '/real' }, { isolate: true, codexHome: '/tmp/x' });
  assert.equal(env.HOME, '/h');
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.CODEX_HOME, '/tmp/x');
});

test('restoreAuthLink copies a refreshed token back and relinks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-auth-test-'));
  try {
    const source = path.join(dir, 'real-auth.json');
    fs.writeFileSync(source, 'old');
    const home = { dir: path.join(dir, 'home'), source };
    fs.mkdirSync(home.dir);
    const link = path.join(home.dir, 'auth.json');
    fs.symlinkSync(source, link);
    assert.equal(codex.restoreAuthLink(home), false);
    fs.rmSync(link);
    fs.writeFileSync(link, 'refreshed');
    assert.equal(codex.restoreAuthLink(home), true);
    assert.equal(fs.readFileSync(source, 'utf8'), 'refreshed');
    assert.ok(fs.lstatSync(link).isSymbolicLink());
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('codexJsonAsync retries once when no JSON is extractable', async () => {
  const seen = [];
  const prose = ev(...START, message('plain prose'), DONE);
  const r = await codex.codexJsonAsync({ ...base, prompt: 'q', runner: fixedRunner([prose, SUCCESS], seen) });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
});

test('local-cli routes by family and rejects families without a CLI', async () => {
  const selected = backend.select({ EVAL_BACKEND: 'local-cli' });
  assert.equal(selected.backend, 'local-cli');
  assert.equal(backend.LOCAL_CLI_ROUTES.claude.backend, 'claude-cli');
  assert.equal(backend.LOCAL_CLI_ROUTES.gpt.backend, 'codex-cli');
  const r = await selected.modelJsonAsync({ model: 'deepseek-v4-pro', prompt: 'q' });
  assert.equal(r.ok, false);
  assert.equal(r.failure.details.family, 'deepseek');
  assert.equal(selected.maxEffortFor('gpt-6.1-sol'), 'high');
});
