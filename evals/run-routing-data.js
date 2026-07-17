#!/usr/bin/env node
'use strict';

/**
 * Binary-decision-on-labeled-data eval (objective, judge-bias-free).
 *
 * For "routing/classification" skills whose value is making the RIGHT call about
 * HOW to engage a problem, not solving it:
 *   - socratic: is this request ambiguous enough that I should ASK a clarifying
 *     question before acting? (label = needs_clarification)
 *   - cynefin: is this an UN-ordered problem (complex/chaotic — probe/act first,
 *     emergent) vs an ordered one (clear/complicated — analyze then plan)?
 *     (label = unordered)
 * Any skill with a balanced binary-labeled set + a decision instruction works.
 *
 * Each item carries its own `decision_instruction` defining what YES/NO mean, a
 * boolean `label` (true => correct answer is YES), and `skill_fit`. The SOLVER
 * decides twice IN THE SAME RUN — WITH the skill vs WITH a length-matched
 * placebo. We score the binary decision against the label and report paired
 * McNemar + a confusion breakdown (so we see whether the skill fixes
 * under-triggering, over-triggering, or both). Balanced datasets => accuracy is
 * meaningful and a trivial always-YES/always-NO baseline scores 50%.
 *
 * Reads mode=binary-decision items from evals/datasets/external/*.jsonl OR
 * evals/datasets/authored/*.jsonl
 *   { prompt, label: bool, decision_instruction, skill_fit: [...] }
 *
 * Usage: EVAL_RUN=run1 FORCE_SKILL=socratic node evals/run-routing-data.js socratic-clarify
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
const DIRS = [path.join(__dirname, 'datasets', 'authored'), path.join(__dirname, 'datasets', 'external')];
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function loadItems(tags) {
  const out = [];
  for (const t of tags) {
    for (const d of DIRS) {
      const f = path.join(d, `${t}.jsonl`);
      if (!fs.existsSync(f)) continue;
      for (const line of fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean)) {
        const o = JSON.parse(line);
        if (o.mode === 'binary-decision' && typeof o.label === 'boolean' && o.prompt) out.push(o);
      }
      break; // first dir that has the file wins
    }
  }
  return process.env.LIMIT ? out.slice(0, parseInt(process.env.LIMIT, 10)) : out;
}

function skillContent(short) {
  const f = path.join(SKILLS_DIR, 'thinking-' + short.replace(/^thinking-/, ''), 'SKILL.md');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
}
function pickSkill(item) {
  if (FORCE_SKILL) { const f = FORCE_SKILL.replace(/^thinking-/, ''); return skillContent(f) ? f : null; }
  for (const s of (item.skill_fit || [])) if (skillContent(s)) return s.replace(/^thinking-/, '');
  return null;
}

function instr(item) {
  return `\n\n${item.decision_instruction}\nEnd your response with exactly: ANSWER: <Yes or No>`;
}
function withSkillPrompt(item, skillMd) {
  return `Use the following thinking-skill guide to reason about this. Apply it substantively.\n\n=== THINKING SKILL ===\n${skillMd}\n=== END SKILL ===\n\n${item.prompt}${instr(item)}`;
}
function placeboPrompt(item, skillMd) {
  return `Some general notes:\n\n${neutralFiller(wordCount(skillMd))}\n\n${item.prompt}${instr(item)}`;
}
function decideYes(text) {
  const m = text.match(/ANSWER:\s*(yes|no)/i) || text.match(/\b(yes|no)\b\s*\.?\s*$/i);
  return m ? /yes/i.test(m[1]) : null;
}
function isCorrect(item, text) {
  const d = decideYes(text);
  if (d == null) return false;
  return d === item.label;
}

async function runItem(item) {
  const skill = pickSkill(item);
  if (!skill) return null;
  const skillMd = skillContent(skill);
  const [w, p] = await Promise.all([
    droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: withSkillPrompt(item, skillMd) }),
    droidExecAsync({ model: SOLVER, effort: SOLVER_EFFORT, prompt: placeboPrompt(item, skillMd) }),
  ]);
  if (!w.ok || !p.ok) return null;
  return {
    skill, label: item.label,
    skill_correct: isCorrect(item, w.text), placebo_correct: isCorrect(item, p.text),
    skill_yes: decideYes(w.text), placebo_yes: decideYes(p.text),
  };
}

function balancedAcc(rows, who) {
  // Null predictions are always incorrect — never true negatives or true positives.
  // who is a prediction field such as 'skill_yes' | 'placebo_yes' (true/false/null).
  const pos = rows.filter(r => r.label);
  const neg = rows.filter(r => !r.label);
  const tpr = pos.length ? pos.filter(r => r[who] === true).length / pos.length : 0;
  const tnr = neg.length ? neg.filter(r => r[who] === false).length / neg.length : 0;
  return +(((tpr + tnr) / 2)).toFixed(3);
}

async function main() {
  if (!FORCE_SKILL && !process.argv.slice(2).length) { console.error('set FORCE_SKILL and/or pass dataset tags'); process.exit(1); }
  const tags = process.argv.slice(2);
  const items = loadItems(tags);
  console.log(`Binary-decision eval: ${items.length} items [${tags.join(', ')}], skill=${FORCE_SKILL || '(per-item)'}, solver=${SOLVER}(${SOLVER_EFFORT}), isolation ${process.env.EVAL_NO_ISOLATE === '1' ? 'OFF' : 'ON'}`);
  if (!items.length) { console.log('  no binary-decision candidates found.'); return; }

  let done = 0;
  const r = (await mapPool(items, CONC, async it => { const x = await runItem(it); done++; if (done % 10 === 0) console.log(`  ${done}/${items.length}`); return x; })).filter(Boolean);

  const N = r.length;
  const SC = r.filter(x => x.skill_correct).length, PC = r.filter(x => x.placebo_correct).length;
  const b = r.filter(x => x.skill_correct && !x.placebo_correct).length;
  const c = r.filter(x => !x.skill_correct && x.placebo_correct).length;
  const out = {
    mode: 'binary-decision', skill: FORCE_SKILL || r[0].skill, tags, solver: SOLVER, n: N,
    n_yes_label: r.filter(x => x.label).length, n_no_label: r.filter(x => !x.label).length,
    acc_with_skill: +(SC / N).toFixed(3), acc_with_skill_ci: wilson(SC, N).map(x => +x.toFixed(3)),
    acc_placebo: +(PC / N).toFixed(3), acc_placebo_ci: wilson(PC, N).map(x => +x.toFixed(3)),
    delta_pp: +(((SC - PC) / N) * 100).toFixed(1),
    balanced_acc_with_skill: balancedAcc(r, 'skill_yes'), balanced_acc_placebo: balancedAcc(r, 'placebo_yes'),
    mcnemar_p: +mcnemar(b, c).toFixed(3), significant: mcnemar(b, c) < 0.05, discordant: b + c,
  };
  const file = process.env.OUTFILE || path.join(runDir(), `routing-data-${out.skill}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, out);
  console.log(`\n  accuracy WITH skill ${(out.acc_with_skill * 100).toFixed(0)}% CI[${(out.acc_with_skill_ci[0] * 100).toFixed(0)},${(out.acc_with_skill_ci[1] * 100).toFixed(0)}]  vs placebo ${(out.acc_placebo * 100).toFixed(0)}%  Δ${out.delta_pp >= 0 ? '+' : ''}${out.delta_pp}pp  McNemar p=${out.mcnemar_p}${out.significant ? ' SIG' : ''}`);
  console.log(`  balanced-acc: skill ${(out.balanced_acc_with_skill * 100).toFixed(0)}% vs placebo ${(out.balanced_acc_placebo * 100).toFixed(0)}%  (labels: ${out.n_yes_label} YES / ${out.n_no_label} NO)`);
  console.log(`  -> ${file}`);
}
module.exports = { balancedAcc, decideYes, isCorrect };
if (require.main === module) {
  main();
}
