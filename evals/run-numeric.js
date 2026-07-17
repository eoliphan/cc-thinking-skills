#!/usr/bin/env node
'use strict';

/**
 * Correctness eval for NUMERIC and BINARY-PROBABILITY ground truth (paired,
 * isolated, length-controlled). Unlocks probabilistic (order-of-magnitude Fermi
 * bounds; forecasting → accuracy + Brier).
 *
 *   numeric      : score within K orders of magnitude of answer_num (default K=1)
 *   binary-prob  : model gives P(yes); correct if (P>0.5)==answer_bin; also Brier
 *
 * Compares FORCE_SKILL vs length-matched placebo (paired McNemar). Optional
 * trigger arm via PAIRS-like TRIGGER=1.
 *
 * Usage: EVAL_RUN=run1 FORCE_SKILL=probabilistic MODE=numeric node evals/run-numeric.js fermi
 *        FORCE_SKILL=probabilistic MODE=binary-prob node evals/run-numeric.js forecasting
 */

const fs = require('fs');
const path = require('path');
const { droidExecAsync } = require('./lib/droid');
const { runDir, writeJson, mapPool } = require('./lib/io');
const { neutralFiller, wordCount, triggerSummary } = require('./lib/conditions');
const { mcnemar, wilson, summarize } = require('./lib/stats');

const SOLVER = process.env.SOLVER_MODEL || 'claude-sonnet-4-6';
const SOLVER_EFFORT = process.env.SOLVER_EFFORT || 'medium';
const CONC = parseInt(process.env.CONC || '4', 10);
const MODE = process.env.MODE || 'numeric';
const OOM = parseFloat(process.env.OOM || '1'); // orders of magnitude tolerance
const FORCE_SKILL = process.env.FORCE_SKILL;
const DO_TRIGGER = process.env.TRIGGER === '1';
const EXT = path.join(__dirname, 'datasets', 'external');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function loadItems(tags) {
  const out = [];
  for (const t of tags) {
    const f = path.join(EXT, `${t}.jsonl`);
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean)) out.push(JSON.parse(l));
  }
  return process.env.LIMIT ? out.slice(0, parseInt(process.env.LIMIT, 10)) : out;
}
function skillContent(s) { const f = path.join(SKILLS_DIR, 'thinking-' + s.replace(/^thinking-/, ''), 'SKILL.md'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; }

function prompts(item, skillMd, skillName) {
  const p = item.prompt;
  const skill = `Use the following thinking-skill guide to reason. Apply it substantively.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n${p}`;
  const placebo = `Some general notes:\n\n${neutralFiller(wordCount(skillMd))}\n\n${p}`;
  const trigger = `Consider this approach if relevant:\n${triggerSummary(skillMd, skillName)}\n\n${p}`;
  return { skill, placebo, trigger };
}

function extractNum(text) {
  const m = text.match(/ANSWER:\s*\$?\s*(-?[\d,]*\.?\d+(?:\s*[eE]\s*[-+]?\d+)?(?:\s*[×x]\s*10\^?-?\d+)?)/);
  if (!m) { const all = text.match(/-?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?/g); return all ? parseFloat(all[all.length - 1].replace(/,/g, '')) : null; }
  let s = m[1].replace(/,/g, '').replace(/\s/g, '').replace(/[×x]10\^?/, 'e');
  return parseFloat(s);
}
function numericCorrect(item, text) {
  const est = extractNum(text);
  if (est == null || !isFinite(est) || est === 0) return false;
  return Math.abs(Math.log10(Math.abs(est) / Math.abs(item.answer_num))) <= OOM;
}
function extractProb(text) {
  const m = text.match(/ANSWER:\s*(0?\.\d+|1\.0+|1|0|\d{1,3})\s*%?/i);
  if (!m) return null;
  let v = parseFloat(m[1]); if (/%/.test(m[0]) || v > 1) v = v / 100; return Math.max(0, Math.min(1, v));
}

async function runItem(item, skillName, skillMd) {
  const P = prompts(item, skillMd, skillName);
  const conds = DO_TRIGGER ? ['skill', 'placebo', 'trigger'] : ['skill', 'placebo'];
  const res = await Promise.all(conds.map(c => droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: P[c] })));
  if (res.some(r => !r.ok)) return null;
  const by = Object.fromEntries(conds.map((c, i) => [c, res[i].text]));
  const score = txt => MODE === 'numeric' ? numericCorrect(item, txt) : ((extractProb(txt) > 0.5 ? 1 : 0) === item.answer_bin);
  const brier = txt => { if (MODE !== 'binary-prob') return null; const p = extractProb(txt); return p == null ? null : Math.pow(p - item.answer_bin, 2); };
  return {
    skill_correct: score(by.skill), placebo_correct: score(by.placebo),
    trigger_correct: DO_TRIGGER ? score(by.trigger) : null,
    skill_brier: brier(by.skill), placebo_brier: brier(by.placebo),
  };
}

async function main() {
  const tags = process.argv.slice(2);
  if (!FORCE_SKILL) { console.error('set FORCE_SKILL'); process.exit(1); }
  const skillMd = skillContent(FORCE_SKILL);
  if (!skillMd) { console.error('no skill ' + FORCE_SKILL); process.exit(1); }
  const items = loadItems(tags).filter(i => MODE === 'numeric' ? i.answer_num != null : i.answer_bin != null);
  console.log(`Numeric eval [${MODE}]: ${items.length} items, skill=${FORCE_SKILL}, solver=${SOLVER}(${SOLVER_EFFORT}), OOM=${OOM}, isolation ${process.env.EVAL_NO_ISOLATE === '1' ? 'OFF' : 'ON'}`);
  let done = 0;
  const r = (await mapPool(items, CONC, async it => { const x = await runItem(it, FORCE_SKILL, skillMd); done++; if (done % 10 === 0) console.log(`  ${done}/${items.length}`); return x; })).filter(Boolean);

  const SC = r.filter(x => x.skill_correct).length, PC = r.filter(x => x.placebo_correct).length, N = r.length;
  const b = r.filter(x => x.skill_correct && !x.placebo_correct).length, c = r.filter(x => !x.skill_correct && x.placebo_correct).length;
  const out = {
    mode: MODE, skill: FORCE_SKILL, solver: SOLVER, n: N,
    acc_with_skill: +(SC / N).toFixed(3), acc_with_skill_ci: wilson(SC, N).map(x => +x.toFixed(3)),
    acc_placebo: +(PC / N).toFixed(3), acc_placebo_ci: wilson(PC, N).map(x => +x.toFixed(3)),
    delta_pp: +(((SC - PC) / N) * 100).toFixed(1), mcnemar_p: +mcnemar(b, c).toFixed(3), significant: mcnemar(b, c) < 0.05, discordant: b + c,
  };
  if (DO_TRIGGER) { const TC = r.filter(x => x.trigger_correct).length; out.acc_trigger = +(TC / N).toFixed(3); }
  if (MODE === 'binary-prob') {
    const sb = r.map(x => x.skill_brier).filter(v => v != null), pb = r.map(x => x.placebo_brier).filter(v => v != null);
    out.brier_skill = +(sb.reduce((a, v) => a + v, 0) / (sb.length || 1)).toFixed(3);
    out.brier_placebo = +(pb.reduce((a, v) => a + v, 0) / (pb.length || 1)).toFixed(3);
  }
  const file = process.env.OUTFILE || path.join(runDir(), `numeric-${FORCE_SKILL}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true }); writeJson(file, out);
  console.log(`\n  acc WITH skill ${(out.acc_with_skill * 100).toFixed(0)}% CI[${(out.acc_with_skill_ci[0] * 100).toFixed(0)},${(out.acc_with_skill_ci[1] * 100).toFixed(0)}]  vs placebo ${(out.acc_placebo * 100).toFixed(0)}% CI[${(out.acc_placebo_ci[0] * 100).toFixed(0)},${(out.acc_placebo_ci[1] * 100).toFixed(0)}]  Δ${out.delta_pp >= 0 ? '+' : ''}${out.delta_pp}pp  McNemar p=${out.mcnemar_p}${out.significant ? ' SIG' : ''}`);
  if (out.brier_skill != null) console.log(`  Brier skill ${out.brier_skill} vs placebo ${out.brier_placebo} (lower=better)`);
  if (out.acc_trigger != null) console.log(`  acc TRIGGER ${(out.acc_trigger * 100).toFixed(0)}%`);
  console.log(`  -> ${file}`);
}
main();
