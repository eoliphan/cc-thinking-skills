# Pre-Registered Verdict Studies — scientific-method, five-whys-plus, occams-razor

Date: 2026-07-02
Status: **frozen at commit time — committed BEFORE any model call for these studies.**

This document pre-registers three paired objective studies executing Track 2 of
`analysis/ACTIVE-PULL-FUTURE-WORK.md` plus the two contested-disposition confirmations
required by the consolidation go/no-go decision. No solver call for any of these
studies may precede the commit of this file.

## Shared design

- **Task surface:** SWE-bench fault-file localization (native-domain debugging,
  objective, isolated) via `evals/run-swe.js` — paired skill-vs-length-matched-placebo,
  identical harness and isolation settings as the M5 runs.
- **Solver:** `claude-sonnet-4-6`, effort `high`, `CONC=4`. Retry policy is the
  runner's built-in (up to 4 attempts per unresolved pair).
- **Analysis (pre-specified):** two-sided continuity-corrected McNemar as computed by
  `evals/lib/stats.js` (mid-p may be reported as supplementary), Wilson CIs per arm,
  both discordant-pair counts reported.
- **Stopping rule:** single run to the full pre-registered n per study. No interim
  looks, no early stopping, no item additions after seeing results, no alpha spending.
- **Verdict rule (verbatim, per study):**
  - p<0.05 AND Δ≥5pp → **ELEVATE**
  - p<0.05 AND Δ<5pp → **DIRECTIONAL-ONLY**
  - p≥0.05 → **NO-LIFT**
- One run per study. The artifact produced under the named `EVAL_RUN` is the verdict
  artifact regardless of outcome.

## Dataset provenance (frozen before this commit)

- **Source:** `princeton-nlp/SWE-bench_Verified` (`test` split, 500 rows) ingested via
  `evals/datasets/ingest-hf.js swebench-verified 500` (new source entry mirrors the
  existing `swebench` Lite mapping; keeps `instance_id`). 481 rows survived the
  map filter (items with no non-test source file in the gold patch, or empty problem
  statement, are dropped).
- **Exclusion:** every item whose generated prompt string exactly matches a prompt in
  any on-disk SWE-style dataset (`evals/datasets/external/swebench.jsonl`,
  `evals/datasets/calibrated/debugging-fault-localization-candidate-pool.jsonl`,
  `evals/datasets/calibrated/debugging-fault-localization-decisive.jsonl` — all three
  carry the same 150 unique M5 items) was removed: **54 overlapping items excluded**,
  leaving 427 fresh items.
- **Residual-risk caveat:** the M5 replication artifact
  (`evals/results/m5-repl/swe-scientific-method.json`) does not record its dataset
  path. If the M5 replication used a distinct 150-item file that is no longer on disk,
  overlap with those items cannot be excluded. This is documented rather than silently
  assumed away; the exclusion above covers every SWE item currently recoverable.
- **Sampling:** deterministic shuffle with `random.Random(20260702)` over the 427
  fresh items; all 427 taken (maximum available; below the 500 recommendation — see
  power note).
- **Frozen files (SHA-256):**
  - `evals/datasets/external/swebench-verified-500.jsonl` (n=427):
    `1ad909071d9a2a08fd8408c3589edad3c94df2d8ad2062bc6faf9e0798a35012`
  - `evals/datasets/external/swebench-verified-slice-1-200.jsonl` (rows 1–200):
    `7401434c83c34d11247b18ddb5bc6c9f382931e1f92e69ff2838fdda8b70a4c8`
  - `evals/datasets/external/swebench-verified-slice-201-400.jsonl` (rows 201–400):
    `c3a9a36fcae07eccebc01c1ed3a7ddd85fa3885ff90dabced74e534072c3d0e0`
  - Dataset files are gitignored (third-party data is never committed); the SHAs above
    are the freeze record.

## Post-edit skill provenance

The studies test the CURRENT on-disk skill text (which includes uncommitted
working-tree edits; that text is the candidate shipping content). Frozen content
hashes (SHA-256 of `skills/thinking-<skill>/SKILL.md` at freeze time):

- `scientific-method`: `9a7a94d31c47d2e905eca47f4bd6185ca4edbb180369aad23e62ddd6e988671b`
- `five-whys-plus`: `eec1f6e940e133d78cb0a8f45f74a623da3d7238bac50b9de7ded5d891e91f21`
- `occams-razor`: `42adf8e4274dd6d03f4cb24417a83f67c849f44bc0683af64a0978feec0db4f4`

## Study 1 — scientific-method larger-N (the consolidation gate)

- **Items:** all 427 of `swebench-verified-500.jsonl`.
- **Run:** `EVAL_RUN=sci-method-larger-n FORCE_SKILL=scientific-method SWE_DATASET_PATH=evals/datasets/external/swebench-verified-500.jsonl SOLVER_MODEL=claude-sonnet-4-6 SOLVER_EFFORT=high CONC=4 node evals/run-swe.js`
- **Artifact:** `evals/results/sci-method-larger-n/swe-scientific-method.json`
- **Power note:** Track 2 recommended n=500; the fresh non-overlapping Verified pool
  caps n at 427. Under the M5 empirical discordant rate (~9.3% → ≈40 discordant pairs)
  a +5pp effect projects continuity-corrected χ² ≈ 10 (p≈0.002); under Track 2's
  conservative 4% discordant assumption power is materially lower (its own n=400
  example was borderline). n=427 is accepted as the maximum clean sample; no items
  will be added post hoc.
- **Baseline facts (context, not inputs):** M5 primary +5.3pp p=0.061 (n=150),
  M5 replication +8.0pp p=0.001 (n=150).

## Study 2 — five-whys-plus confirmation

- **Items:** rows 1–200 of the frozen file (`swebench-verified-slice-1-200.jsonl`).
- **Run:** `EVAL_RUN=verdict-five-whys FORCE_SKILL=five-whys-plus SWE_DATASET_PATH=evals/datasets/external/swebench-verified-slice-1-200.jsonl SOLVER_MODEL=claude-sonnet-4-6 SOLVER_EFFORT=high CONC=4 node evals/run-swe.js`
- **Artifact:** `evals/results/verdict-five-whys/swe-five-whys-plus.json`
- **Prior evidence being confirmed/refuted:** OBJ-powered-null +1.3pp p=0.75 (n=150).

## Study 3 — occams-razor confirmation

- **Items:** rows 201–400 of the frozen file (`swebench-verified-slice-201-400.jsonl`).
- **Run:** `EVAL_RUN=verdict-occams FORCE_SKILL=occams-razor SWE_DATASET_PATH=evals/datasets/external/swebench-verified-slice-201-400.jsonl SOLVER_MODEL=claude-sonnet-4-6 SOLVER_EFFORT=high CONC=4 node evals/run-swe.js`
- **Artifact:** `evals/results/verdict-occams/swe-occams-razor.json`
- **Prior evidence being confirmed/refuted:** OBJ-powered-null +2.0pp p=0.505 (n=150).
- **Trap-case note:** `analysis/PER-SKILL-EVAL-PROTOCOL.md`'s occams-razor trap-case
  requirement (complex-cause-correct items) targets authored simplicity-biased sets.
  Real SWE-bench issues are not simplicity-biased by construction, so no trap
  authoring is added for this surface.

## Slice disjointness rationale

Studies 2 and 3 use disjoint 200-item slices so the two contested-skill verdicts do
not share item-difficulty noise. Study 1 necessarily overlaps both (it uses the full
427). All three studies draw from one parent pool that is fresh relative to ALL prior
M5 evidence for these skills, so within-skill replication independence is preserved:
no skill's prior evidence used any of these items.
