#!/usr/bin/env node
'use strict';

/**
 * Tier 3 — Behavioral A/B lift (the headline signal), length-controlled.
 *
 * Per problem the SOLVER answers under multiple CONDITIONS, then a cross-family
 * JUDGE does blind, order-deterministic pairwise comparisons for each PAIR.
 *
 *   conditions: placebo (length-matched filler), skill (full SKILL.md), trigger (name+2-3 sentences), empty
 *   default PAIRS: "skill:placebo"  -> isolates skill CONTENT from mere context length
 *   add "skill:trigger" to test whether the full guide beats a one-liner.
 *
 * Solver = Claude (the real consumer). Judge = different family. Order assigned
 * by problem-index parity to balance position bias and stay reproducible.
 *
 * Usage:
 *   EVAL_RUN=run1 node evals/run-behavioral.js                       # all skills, skill:placebo
 *   PAIRS="skill:placebo,skill:trigger" node evals/run-behavioral.js thinking-pre-mortem
 *   SOLVER_MODEL=claude-haiku-4-5-20251001 PAIRS="skill:placebo" EVAL_RUN=run1-haiku node evals/run-behavioral.js <subset>
 */

const fs = require('fs');
const path = require('path');
const { droidExecAsync, maxEffortFor } = require('./lib/droid');
const { runDir, writeJson, mapPool } = require('./lib/io');
const { buildConditionPrompt } = require('./lib/conditions');
const { panelJudge, panelModels } = require('./lib/judge');
const { summarize } = require('./lib/stats');

const SOLVER = process.env.SOLVER_MODEL || 'claude-sonnet-4-6';
const SOLVER_EFFORT = process.env.SOLVER_EFFORT || 'medium';
const JUDGE = process.env.JUDGE_MODEL || 'gemini-3.1-pro-preview';
const CONC = parseInt(process.env.CONC || '3', 10);
const PAIRS = (process.env.PAIRS || 'skill:placebo').split(',').map(p => p.trim().split(':'));
const OUTFILE = process.env.OUTFILE || 'tier3-behavioral.json';
const DATA_DIR = path.join(__dirname, 'datasets', 'behavioral');
const RUBRIC = fs.readFileSync(path.join(__dirname, 'rubrics', 'behavioral-pairwise.md'), 'utf8');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function listDatasets(argv) {
  const names = argv.length ? argv : fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
  return names.map(name => JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')));
}
function skillContent(name) { return fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8'); }

function judgePrompt(problem, respA, respB) {
  return `${RUBRIC}\n\n=== PROBLEM ===\n${problem.prompt}\n\n=== RESPONSE A ===\n${respA}\n\n=== RESPONSE B ===\n${respB}\n\n=== END ===\nReturn ONLY the JSON verdict.`;
}

async function runProblem(skillName, skillMd, problem, idx, neededConditions) {
  // solve each needed condition (concurrently)
  const solves = await Promise.all(neededConditions.map(c =>
    droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: buildConditionPrompt(c, problem.prompt, skillMd, skillName) })
      .then(r => [c, r])
  ));
  const byCond = Object.fromEntries(solves);
  const failed = neededConditions.filter(c => !byCond[c].ok);
  if (failed.length) return { id: problem.id, ok: false, error: `solver fail: ${failed.join(',')} (${byCond[failed[0]].error})` };

  // judge each pair
  const pairResults = {};
  for (const [left, right] of PAIRS) {
    const key = `${left}:${right}`;
    // deterministic order: even idx -> left is A
    const leftIsA = idx % 2 === 0;
    const respA = leftIsA ? byCond[left].text : byCond[right].text;
    const respB = leftIsA ? byCond[right].text : byCond[left].text;
    const v = await panelJudge(judgePrompt(problem, respA, respB));
    let winner = 'tie';
    if (v.winner === 'A') winner = leftIsA ? left : right;
    else if (v.winner === 'B') winner = leftIsA ? right : left;
    pairResults[key] = { ok: true, winner, vocab_only: v.vocab_only, votes: v.tally, why: (v.whys || [])[0] };
  }
  return { id: problem.id, ok: true, pairs: pairResults, failure_mode: problem.failure_mode || '' };
}

function summarizePair(problems, key, leftCond) {
  const ok = problems.filter(p => p.ok && p.pairs[key] && p.pairs[key].ok);
  const wins = ok.filter(p => p.pairs[key].winner === leftCond).length;
  const ties = ok.filter(p => p.pairs[key].winner === 'tie').length;
  const losses = ok.length - wins - ties;
  const n = ok.length || 1;
  return { n: ok.length, wins, losses, ties, win_rate: +(((wins + 0.5 * ties) / n)).toFixed(3), lift: wins - losses, vocab_only: ok.filter(p => p.pairs[key].vocab_only).length };
}

async function runSkill(ds) {
  const skillMd = skillContent(ds.skill);
  const needed = [...new Set(PAIRS.flat())];
  const problems = [];
  for (let i = 0; i < ds.problems.length; i++) problems.push(await runProblem(ds.skill, skillMd, ds.problems[i], i, needed));
  const summary = { skill: ds.skill, n: problems.filter(p => p.ok).length, pairs: {}, problems };
  for (const [left, right] of PAIRS) summary.pairs[`${left}:${right}`] = summarizePair(problems, `${left}:${right}`, left);
  const head = summary.pairs[`${PAIRS[0][0]}:${PAIRS[0][1]}`];
  summary.win_rate = head.win_rate; summary.lift = head.lift;
  summary.verdict = head.lift > 0 ? 'proven' : (head.lift === 0 ? 'unproven-tie' : 'regresses');
  return summary;
}

async function main() {
  const argv = process.argv.slice(2);
  const datasets = listDatasets(argv);
  console.log(`Tier 3 — behavioral: ${datasets.length} skills, solver=${SOLVER}(${SOLVER_EFFORT}) judges=${panelModels().join('+')}, conc=${CONC}`);
  console.log(`  pairs (left vs right; win = left wins): ${PAIRS.map(p => p.join(' vs ')).join(', ')}`);

  let done = 0;
  const scored = await mapPool(datasets, CONC, async (ds) => {
    const r = await runSkill(ds);
    done++;
    const head = r.pairs[`${PAIRS[0][0]}:${PAIRS[0][1]}`];
    console.log(`  [${done}/${datasets.length}] ${r.skill}: ${head.wins}W ${head.losses}L ${head.ties}T  ${(head.win_rate * 100).toFixed(0)}% -> ${r.verdict}${head.vocab_only ? `  (vocab-only x${head.vocab_only})` : ''}`);
    return r;
  });

  scored.sort((a, b) => a.win_rate - b.win_rate);
  const headKey = `${PAIRS[0][0]}:${PAIRS[0][1]}`;
  // aggregate significance across ALL problems for the headline pair
  let aw = 0, al = 0, at = 0;
  for (const s of scored) { const h = s.pairs[headKey] || {}; aw += h.wins || 0; al += h.losses || 0; at += h.ties || 0; }
  const aggregate = summarize(aw, al, at);
  const out = {
    tier: 3, solver: SOLVER, solver_effort: SOLVER_EFFORT, judges: panelModels(),
    pairs: PAIRS.map(p => p.join(':')), headline_pair: headKey,
    n_skills: scored.length,
    aggregate_significance: aggregate,
    mean_win_rate: +(scored.reduce((a, r) => a + r.win_rate, 0) / (scored.length || 1)).toFixed(3),
    proven: scored.filter(r => r.verdict === 'proven').map(r => r.skill),
    unproven: scored.filter(r => r.verdict !== 'proven').map(r => ({ skill: r.skill, win_rate: r.win_rate, verdict: r.verdict })),
    skills: scored,
  };
  const file = path.join(runDir(), OUTFILE);
  writeJson(file, out);
  console.log(`\n  mean win-rate (${headKey}): ${(out.mean_win_rate * 100).toFixed(0)}%   proven: ${out.proven.length}/${scored.length}`);
  console.log(`  AGGREGATE: ${aggregate.wins}W ${aggregate.losses}L ${aggregate.ties}T → ${(aggregate.win_rate * 100).toFixed(0)}%  95% CI [${(aggregate.ci95[0] * 100).toFixed(0)}%, ${(aggregate.ci95[1] * 100).toFixed(0)}%]  p=${aggregate.p_value}  ${aggregate.significant ? 'SIGNIFICANT' : 'directional'}`);
  console.log(`  -> ${file}`);
}

main();
