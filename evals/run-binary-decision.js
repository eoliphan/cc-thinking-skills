#!/usr/bin/env node
'use strict';

/**
 * Binary-decision powered eval for the systems-product-strategy-pairwise family.
 * Reads decisive split items (mode=binary-decision), runs paired skill+placebo,
 * scores against the ground-truth label (true=YES, false=NO).
 *
 * Usage: EVAL_RUN=m5-primary FORCE_SKILL=systems CONC=4 node evals/run-binary-decision.js
 */

const fs = require('fs');
const path = require('path');
const { droidExecAsync } = require('./lib/droid');
const { runDir, writeJson, mapPool } = require('./lib/io');
const { neutralFiller, wordCount } = require('./lib/conditions');
const { mcnemar, wilson } = require('./lib/stats');

const SOLVER = process.env.SOLVER_MODEL || 'claude-sonnet-4-6';
const SOLVER_EFFORT = process.env.SOLVER_EFFORT || 'medium';
const CONC = parseInt(process.env.CONC || '4', 10);
const FORCE_SKILL = process.env.FORCE_SKILL;
const FILE = path.join(__dirname, 'datasets', 'calibrated', 'systems-product-strategy-pairwise-decisive.jsonl');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function loadItems() {
  let L = fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  if (process.env.LIMIT) L = L.slice(0, parseInt(process.env.LIMIT, 10));
  return L;
}

function skillContent(s) {
  return fs.readFileSync(path.join(SKILLS_DIR, 'thinking-' + s.replace(/^thinking-/, ''), 'SKILL.md'), 'utf8');
}

function extractYesNo(text) {
  const m = text.match(/ANSWER:\s*(yes|no)/i) || 
            text.match(/\b(YES|NO)\b[.!]*\s*$/im) ||
            text.match(/\b(yes|no)\b[.!]*\s*$/im);
  return m ? m[1].toLowerCase() : null;
}

function isCorrect(item, answer) {
  if (answer == null) return false;
  const expected = item.label === true ? 'yes' : 'no';
  return answer === expected;
}

async function runItem(item, skillMd) {
  const answerInstr = `\n\nEnd your response with exactly: ANSWER: <Yes or No>`;
  const skillP = `Use the following thinking-skill guide to reason about the problem. Apply it substantively.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n${item.decision_instruction || ''}\n\n${item.prompt}${answerInstr}`;
  const placeboP = `Some general notes:\n\n${neutralFiller(wordCount(skillMd))}\n\n${item.decision_instruction || ''}\n\n${item.prompt}${answerInstr}`;
  
  const [s, p] = await Promise.all([
    droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: skillP }),
    droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: placeboP }),
  ]);
  if (!s.ok || !p.ok) return null;
  return {
    id: item.id,
    target: item.target === true,
    skill_correct: isCorrect(item, extractYesNo(s.text)),
    placebo_correct: isCorrect(item, extractYesNo(p.text)),
  };
}

async function main() {
  if (!FORCE_SKILL) { console.error('set FORCE_SKILL'); process.exit(1); }
  const skillMd = skillContent(FORCE_SKILL);
  const items = loadItems();
  console.log(`Binary-decision eval: ${items.length} items, skill=${FORCE_SKILL}, solver=${SOLVER}(${SOLVER_EFFORT}), isolation ${process.env.EVAL_NO_ISOLATE === '1' ? 'OFF' : 'ON'}`);
  
  let done = 0;
  const results = (await mapPool(items, CONC, async it => { const x = await runItem(it, skillMd); done++; if (done % 10 === 0) console.log(`  ${done}/${items.length}`); return x; })).filter(Boolean);

  const targets = results.filter(r => r.target);
  const distractors = results.filter(r => !r.target);
  
  // Overall stats
  const SC = results.filter(r => r.skill_correct).length;
  const PC = results.filter(r => r.placebo_correct).length;
  const N = results.length;
  const b = results.filter(r => r.skill_correct && !r.placebo_correct).length;
  const cC = results.filter(r => !r.skill_correct && r.placebo_correct).length;
  
  // Target-only stats
  const tSC = targets.filter(r => r.skill_correct).length;
  const tPC = targets.filter(r => r.placebo_correct).length;
  const tN = targets.length;
  const tb = targets.filter(r => r.skill_correct && !r.placebo_correct).length;
  const tc = targets.filter(r => !r.skill_correct && r.placebo_correct).length;
  
  // Distractor stats (FPR)
  const dSC = distractors.filter(r => r.skill_correct).length;
  const dPC = distractors.filter(r => r.placebo_correct).length;
  const dN = distractors.length;
  
  const out = {
    mode: 'binary-decision',
    skill: FORCE_SKILL,
    solver: SOLVER,
    n: N,
    n_target: tN,
    n_distractor: dN,
    // Overall
    acc_with_skill: +(SC / N).toFixed(3),
    acc_with_skill_ci: wilson(SC, N).map(x => +x.toFixed(3)),
    acc_placebo: +(PC / N).toFixed(3),
    acc_placebo_ci: wilson(PC, N).map(x => +x.toFixed(3)),
    delta_pp: +(((SC - PC) / N) * 100).toFixed(1),
    mcnemar_p: +mcnemar(b, cC).toFixed(3),
    significant: mcnemar(b, cC) < 0.05,
    discordant: b + cC,
    // Target only
    target_acc_with: +(tSC / tN).toFixed(3),
    target_acc_placebo: +(tPC / tN).toFixed(3),
    target_delta_pp: +(((tSC - tPC) / tN) * 100).toFixed(1),
    target_mcnemar_p: +mcnemar(tb, tc).toFixed(3),
    // Distractor (FPR)
    distractor_acc_with: +(dSC / dN).toFixed(3),
    distractor_acc_placebo: +(dPC / dN).toFixed(3),
    // FPR = false alarm on distractor (model says YES when label=false → incorrect)
    distractor_fpr_with: +((dN - dSC) / dN).toFixed(3),
    distractor_fpr_placebo: +((dN - dPC) / dN).toFixed(3),
  };
  
  const file = process.env.OUTFILE || path.join(runDir(), `binary-${FORCE_SKILL}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, out);
  console.log(`\n  Overall: WITH skill ${(out.acc_with_skill * 100).toFixed(0)}% vs placebo ${(out.acc_placebo * 100).toFixed(0)}%  Δ${out.delta_pp >= 0 ? '+' : ''}${out.delta_pp}pp  McNemar p=${out.mcnemar_p}${out.significant ? ' SIG' : ''}`);
  console.log(`  Targets: WITH ${(out.target_acc_with * 100).toFixed(0)}% vs placebo ${(out.target_acc_placebo * 100).toFixed(0)}%  Δ${out.target_delta_pp >= 0 ? '+' : ''}${out.target_delta_pp}pp  McNemar p=${out.target_mcnemar_p}`);
  console.log(`  Distractor FPR: WITH ${(out.distractor_fpr_with * 100).toFixed(0)}% vs placebo ${(out.distractor_fpr_placebo * 100).toFixed(0)}%`);
  console.log(`  -> ${file}`);
}
main();
