#!/usr/bin/env node
'use strict';

/**
 * Build a SQLite database from the eval results + adversarial reviews.
 * No npm deps: generates SQL and pipes it to the system `sqlite3` CLI.
 *
 * Usage: EVAL_RUN=run1 node evals/db/build-db.js   ->  evals/db/evals.db
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RUN = process.env.EVAL_RUN || 'run1';
const ROOT = path.join(__dirname, '..', '..');
const RESULTS = path.join(ROOT, 'evals', 'results', RUN);
const REVIEWS = path.join(ROOT, 'reviews');
const DB = path.join(__dirname, 'evals.db');

const CATEGORY = {
  'first-principles': 'Decision', 'second-order': 'Decision',
  'pre-mortem': 'Decision', 'kepner-tregoe': 'Decision', 'reversibility': 'Decision',
  'opportunity-cost': 'Decision',
  'bounded-rationality': 'Cognitive', 'socratic': 'Cognitive', 'probabilistic': 'Cognitive',
  'steel-manning': 'Cognitive', 'map-territory': 'Cognitive', 'circle-of-competence': 'Cognitive',
  'systems': 'Systems', 'ooda': 'Systems',
  'theory-of-constraints': 'Systems', 'cynefin': 'Systems',
  'scientific-method': 'Systems', 'five-whys-plus': 'Systems',
  'triz': 'Innovation/Risk', 'thought-experiment': 'Innovation/Risk',
  'margin-of-safety': 'Innovation/Risk', 'lindy-effect': 'Innovation/Risk', 'via-negativa': 'Innovation/Risk',
  'red-team': 'Innovation/Risk', 'jobs-to-be-done': 'Product', 'effectuation': 'Product',
  'model-router': 'Meta', 'model-combination': 'Meta',
};
const META = new Set(['thinking-model-router', 'thinking-model-combination']);

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function sq(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function j(v) { return v == null ? 'NULL' : `'${JSON.stringify(v).replace(/'/g, "''")}'`; }

const SCHEMA = `
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS run; DROP TABLE IF EXISTS skill; DROP TABLE IF EXISTS tier0;
DROP TABLE IF EXISTS tier1; DROP TABLE IF EXISTS tier2_case; DROP TABLE IF EXISTS tier3;
DROP TABLE IF EXISTS tier3_pair; DROP TABLE IF EXISTS tier3_problem;
DROP TABLE IF EXISTS review_holistic; DROP TABLE IF EXISTS review_perskill;
CREATE TABLE run(id TEXT PRIMARY KEY, created_at TEXT, solver TEXT, judge TEXT, router TEXT);
CREATE TABLE skill(name TEXT PRIMARY KEY, category TEXT, description TEXT, desc_len INT, is_meta INT);
CREATE TABLE tier0(run_id TEXT, skill TEXT, strict_pct INT, loose_pct INT, gap INT, words INT);
CREATE TABLE tier1(run_id TEXT, skill TEXT, judge TEXT, fidelity INT, applicability INT, actionability INT,
  discrimination INT, discoverability INT, avg REAL, weakest TEXT, would_mislead INT, mislead_note TEXT, top_fix TEXT, verdict TEXT);
CREATE TABLE tier2_case(run_id TEXT, case_id TEXT, type TEXT, expected TEXT, chosen TEXT, correct INT, correct_strict INT, confidence REAL, rationale TEXT);
CREATE TABLE tier3(run_id TEXT, variant TEXT, skill TEXT, solver TEXT, headline_pair TEXT, wins INT, losses INT, ties INT, win_rate REAL, lift INT, verdict TEXT, vocab_only INT);
CREATE TABLE tier3_pair(run_id TEXT, variant TEXT, skill TEXT, pair TEXT, wins INT, losses INT, ties INT, win_rate REAL, lift INT, vocab_only INT);
CREATE TABLE tier3_problem(run_id TEXT, variant TEXT, skill TEXT, problem_id TEXT, pair TEXT, winner TEXT, margin TEXT, vocab_only INT, why TEXT);
CREATE TABLE review_holistic(model TEXT PRIMARY KEY, overall_take TEXT, eval_would_catch INT, router_critique TEXT, contrarian TEXT,
  weakest_json TEXT, merges_json TEXT, missing_json TEXT, improvements_json TEXT, eval_flaws_json TEXT);
CREATE TABLE review_perskill(skill TEXT, model TEXT, verdict TEXT, would_mislead INT, mislead_scenario TEXT, weakest_part TEXT, highest_leverage_fix TEXT, missing_boundaries_json TEXT, fidelity_problems_json TEXT);
`;

function build() {
  const out = [SCHEMA, 'BEGIN;'];
  const ts = new Date().toISOString();

  // --- skills (from tier0 rows, which cover all 39) ---
  const t0 = readJson(path.join(RESULTS, 'tier0-structural.json'));
  out.push(`INSERT INTO run VALUES(${sq(RUN)}, ${sq(ts)}, 'claude-sonnet-4-6', 'gemini-3.1-pro-preview', 'claude-sonnet-4-6');`);
  if (t0) for (const r of t0.rows) {
    const short = r.name.replace(/^thinking-/, '');
    out.push(`INSERT INTO skill VALUES(${sq(r.name)}, ${sq(CATEGORY[short] || '?')}, NULL, ${sq(r.descLen)}, ${META.has(r.name) ? 1 : 0});`);
    out.push(`INSERT INTO tier0 VALUES(${sq(RUN)}, ${sq(r.name)}, ${sq(r.strict_pct)}, ${sq(r.loose_pct)}, ${sq(r.gap)}, ${sq(r.words)});`);
  }

  // --- tier1 ---
  const t1 = readJson(path.join(RESULTS, 'tier1-rubric.json'));
  if (t1) for (const r of t1.results) {
    if (!r.ok) continue;
    const s = r.scores || {};
    out.push(`INSERT INTO tier1 VALUES(${sq(RUN)}, ${sq(r.skill)}, ${sq(t1.judge)}, ${sq(s.fidelity)}, ${sq(s.applicability)}, ${sq(s.actionability)}, ${sq(s.discrimination)}, ${sq(s.discoverability)}, ${sq(r.avg)}, ${sq(r.weakest_dimension)}, ${r.would_mislead ? 1 : 0}, ${sq(r.mislead_note)}, ${sq(r.top_fix)}, ${sq(r.one_line_verdict)});`);
  }

  // --- tier2 ---
  const t2 = readJson(path.join(RESULTS, 'tier2-routing.json'));
  if (t2) for (const r of t2.results) {
    if (!r.ok) continue;
    out.push(`INSERT INTO tier2_case VALUES(${sq(RUN)}, ${sq(r.id)}, ${sq(r.type)}, ${sq(r.expected)}, ${sq(r.chosen)}, ${r.correct ? 1 : 0}, ${r.correctStrict ? 1 : 0}, ${sq(r.confidence)}, ${sq(r.rationale)});`);
  }

  // --- tier3 (3 variants) ---
  const variants = [
    { variant: 'main', file: 'tier3-behavioral.json' },
    { variant: 'trigger', file: 'tier3-trigger-probe.json' },
    { variant: 'haiku', file: 'tier3-haiku.json' },
  ];
  for (const v of variants) {
    const d = readJson(path.join(RESULTS, v.file));
    if (!d) continue;
    for (const s of d.skills) {
      const hp = (s.pairs && s.pairs[d.headline_pair]) || {};
      out.push(`INSERT INTO tier3 VALUES(${sq(RUN)}, ${sq(v.variant)}, ${sq(s.skill)}, ${sq(d.solver)}, ${sq(d.headline_pair)}, ${sq(hp.wins)}, ${sq(hp.losses)}, ${sq(hp.ties)}, ${sq(s.win_rate)}, ${sq(s.lift)}, ${sq(s.verdict)}, ${sq(hp.vocab_only)});`);
      for (const [pair, pr] of Object.entries(s.pairs || {})) {
        out.push(`INSERT INTO tier3_pair VALUES(${sq(RUN)}, ${sq(v.variant)}, ${sq(s.skill)}, ${sq(pair)}, ${sq(pr.wins)}, ${sq(pr.losses)}, ${sq(pr.ties)}, ${sq(pr.win_rate)}, ${sq(pr.lift)}, ${sq(pr.vocab_only)});`);
      }
      for (const p of s.problems || []) {
        if (!p.ok) continue;
        for (const [pair, pr] of Object.entries(p.pairs || {})) {
          if (!pr.ok) continue;
          out.push(`INSERT INTO tier3_problem VALUES(${sq(RUN)}, ${sq(v.variant)}, ${sq(s.skill)}, ${sq(p.id)}, ${sq(pair)}, ${sq(pr.winner)}, ${sq(pr.margin)}, ${pr.vocab_only ? 1 : 0}, ${sq(pr.why)});`);
        }
      }
    }
  }

  // --- holistic reviews ---
  for (const model of ['gpt-5.5-pro', 'gemini-3.1-pro-preview', 'deepseek-v4-pro']) {
    const d = readJson(path.join(REVIEWS, 'holistic', `${model}.json`));
    if (!d || !d.ok) continue;
    const ec = d.eval_design_critique || {};
    out.push(`INSERT INTO review_holistic VALUES(${sq(model)}, ${sq(d.overall_take)}, ${ec.would_catch_a_bad_skill ? 1 : 0}, ${sq(d.router_critique)}, ${sq(d.most_contrarian_idea)}, ${j(d.weakest_skills)}, ${j(d.redundant_or_should_merge)}, ${j(d.missing_use_cases_or_models)}, ${j(d.top_improvements)}, ${j(ec.biggest_flaws)});`);
  }

  // --- per-skill reviews ---
  const psDir = path.join(REVIEWS, 'per-skill');
  if (fs.existsSync(psDir)) for (const f of fs.readdirSync(psDir).filter(x => x.endsWith('.json'))) {
    const d = readJson(path.join(psDir, f));
    if (!d || !d.ok) continue;
    out.push(`INSERT INTO review_perskill VALUES(${sq(d.skill)}, ${sq(d.model)}, ${sq(d.verdict)}, ${d.would_mislead_agent ? 1 : 0}, ${sq(d.mislead_scenario)}, ${sq(d.weakest_part)}, ${sq(d.highest_leverage_fix)}, ${j(d.missing_boundaries)}, ${j(d.fidelity_problems)});`);
  }

  out.push('COMMIT;');
  return out.join('\n');
}

function main() {
  const sql = build();
  try { fs.unlinkSync(DB); } catch (_) {}
  const res = spawnSync('sqlite3', [DB], { input: sql, encoding: 'utf8' });
  if (res.status !== 0) { console.error('sqlite3 error:', res.stderr || res.error); process.exit(1); }
  // quick counts
  const counts = spawnSync('sqlite3', [DB, `SELECT 'skills='||count(*) FROM skill; SELECT 'tier1='||count(*) FROM tier1; SELECT 'tier2='||count(*) FROM tier2_case; SELECT 'tier3='||count(*) FROM tier3; SELECT 'holistic='||count(*) FROM review_holistic; SELECT 'perskill='||count(*) FROM review_perskill;`], { encoding: 'utf8' });
  console.log(`Built ${DB}`);
  console.log(counts.stdout.trim().split('\n').map(s => '  ' + s).join('\n'));
}

main();
