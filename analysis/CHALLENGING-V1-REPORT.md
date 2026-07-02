# Challenging-v1 Diagnostic Report

Date: 2026-07-02

## Bottom line

Status: **diagnostic only — not confirmatory.**

Four runs were captured on 2026-07-02 under `evals/results/challenging-v1/`. None supports a
confirmatory claim about workflows vs. full skills:

- **Objective binary** (`evals/results/challenging-v1/workflow-objective.json`): near-total ceiling.
  Every arm scored 100% case success except `workflow_validated` (96.7%, 29/30). The preregistered
  primary contrast `workflow_validated` vs `full_skill_typed_verified` was **−3.3pp** (McNemar
  `p=1.0`, 1 discordant pair) — directionally *against* workflow, driven entirely by a single
  red-team false positive. `claim_status: inconclusive`.
- **Behavioral pairwise** (`evals/results/challenging-v1/workflow-vs-skill.json`): `workflow_validated`
  won **34/80** judged pairs (win rate **0.438**, lift **−10pp**, `p=0.308`, not significant), i.e.
  the full skill was judged better on balance. `claim_status: pilot_only`.
- **Agentic routing** (`evals/results/challenging-v1/agentic-workflow.json`): on 16 route cases,
  `workflow_validated` beat `dynamic_verified` on case success by **+18.8pp** (50.0% vs 31.3%,
  `p=0.248`, not significant). `claim_status: pilot_only`.
- **Factorial** (`evals/results/challenging-v1/workflow-factorial-checkpoint.json`): an **INCOMPLETE
  checkpoint** — 66 of the planned pairs finished, `thinking-red-team` interrupted after 1 case, no
  aggregate/contrast/verdict computed. **Not evidence** (see §Factorial checkpoint below).

Every number below is diagnostic: these runs used small authored sets (medium solver effort, single
behavioral judge, small route pool) and predate the enlarged held-out datasets and the independent
replication set being built separately. Treat the results as signal for design, not as a decision.

## Frozen preregistration

- Path: `evals/preregistrations/workflow-vs-skill-proof.md`
- SHA-256: `8e6a82e630d4db593ff9d88511dcded8aade3f0d236511392847fb93adc43fe7` (verified 2026-07-02)
- All four artifacts recorded this same prereg path + SHA in their `preregistration` block.

## Commands / configuration

All four runs used `EVAL_RUN=challenging-v1`, solver `claude-sonnet-4-6`, `SOLVER_EFFORT=medium`,
and reported **0 solver failures** (`decision_eligible: true`). Config below is read from each
artifact's `run`/`solver`/`run_health` metadata, not inferred.

| Run | Runner (from artifact `run.command`) | CONC | Judges | solver_calls | Artifact |
|---|---|---:|---|---:|---|
| Objective | `evals/run-workflow-objective.js` | 8 | — | 150 | `evals/results/challenging-v1/workflow-objective.json` |
| Behavioral | `evals/run-workflow-vs-skill.js` | 3 | `gemini-3.1-pro-preview` (1) | 160 | `evals/results/challenging-v1/workflow-vs-skill.json` |
| Agentic | `evals/run-agentic-workflow.js` | 3 | — | 114 | `evals/results/challenging-v1/agentic-workflow.json` |
| Factorial | (checkpoint file; no `run` block) | — | — | — | `evals/results/challenging-v1/workflow-factorial-checkpoint.json` |

## Dataset provenance

The **objective run** records a per-skill `source_file` for each of its 8 skills, and those paths
are exactly the authored challenging datasets. Verified by listing `evals/datasets/authored/` and
counting non-empty lines (2026-07-02):

| File | Items | Objective run n |
|---|---:|---:|
| `evals/datasets/authored/challenging-red-team.jsonl` | 6 | 6 |
| `evals/datasets/authored/challenging-scientific-method.jsonl` | 4 | 4 |
| `evals/datasets/authored/challenging-second-order.jsonl` | 4 | 4 |
| `evals/datasets/authored/challenging-pre-mortem.jsonl` | 4 | 4 |
| `evals/datasets/authored/challenging-kepner-tregoe.jsonl` | 3 | 3 |
| `evals/datasets/authored/challenging-margin-of-safety.jsonl` | 3 | 3 |
| `evals/datasets/authored/challenging-inversion.jsonl` | 3 | 3 |
| `evals/datasets/authored/challenging-cynefin.jsonl` | 3 | 3 |
| **Total (8 skills)** | **30** | **30** |
| `evals/datasets/authored/challenging-real-world-v1.jsonl` | 30 | (not consumed by these 4 artifacts) |

Notes on the other runs' provenance (reported from artifact metadata, not assumed):

- **Behavioral** (`workflow-vs-skill.json`) does not record source-file paths. Its problem IDs
  (`cynefin-1`, `socratic-1`, `reversibility-1`…`-25`, `pre-mortem-1`…`-25`, `five-whys-plus-1`,
  `occams-razor-1`, …) span **12** skills — a broader set than the 8 challenging files, drawing from
  the repo's per-skill authored case pools (`thinking-reversibility` and `thinking-pre-mortem`
  contribute 25 cases each; the other 10 skills contribute 3 each → 80 problems).
- **Agentic** (`agentic-workflow.json`) records `dataset:
  evals/datasets/workflow-cases.jsonl`, `dataset_sha256:
  b39aa13901326ae1262bdb8db25fa41c38dea84a88a89b2287c1d1d00714a102`, n=16 route cases.
- `challenging-real-world-v1.jsonl` (30 items) is part of the authored challenging-v1 family but is
  **not cited** in any of the four artifacts' recorded metadata; it was not consumed by these runs.

## Objective binary run

Artifact: `evals/results/challenging-v1/workflow-objective.json`
(mode `workflow-objective-proof-arms`, 8 skills, 30 items, 5 arms, 150 solver calls, 0 failures).

| Arm | n | case_success | case_success_rate | case_success_ci | parse_ok_rate | solver_failures |
|---|---:|---:|---:|---|---:|---:|
| `placebo` | 30 | 30 | 1.000 | [0.886, 1.000] | 1.000 | 0 |
| `full_skill_prose` | 30 | 30 | 1.000 | [0.886, 1.000] | 1.000 | 0 |
| `concise_workflow` | 30 | 30 | 1.000 | [0.886, 1.000] | 1.000 | 0 |
| `workflow_validated` | 30 | 29 | 0.967 | [0.833, 0.994] | 1.000 | 0 |
| `full_skill_typed_verified` | 30 | 30 | 1.000 | [0.886, 1.000] | 1.000 | 0 |

Primary paired contrast (`workflow_validated` vs `full_skill_typed_verified`):

- Δ case_success: **−3.3pp**
- McNemar p: **1.0**
- Discordant pairs: **1** (left/`workflow_validated` wins 0, right/`full_skill_typed_verified` wins 1)

Per-skill primary contrast (all 8 skills):

| Skill | n | `workflow_validated` | `full_skill_typed_verified` | Δpp | McNemar p |
|---|---:|---:|---:|---:|---:|
| thinking-red-team | 6 | 0.833 | 1.000 | −16.7 | 1.0 |
| thinking-scientific-method | 4 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-second-order | 4 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-pre-mortem | 4 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-kepner-tregoe | 3 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-margin-of-safety | 3 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-inversion | 3 | 1.000 | 1.000 | 0 | 1.0 |
| thinking-cynefin | 3 | 1.000 | 1.000 | 0 | 1.0 |

Interpretation: a **ceiling effect** — the authored items are too easy at this arm strength, so the
contrast has no room to move. The only non-tie is one red-team false positive under
`workflow_validated`. `claim_status: inconclusive`. Diagnostic, not confirmatory.

## Behavioral pairwise run

Artifact: `evals/results/challenging-v1/workflow-vs-skill.json`
(mode `workflow-vs-skill`, 12 skills, 80 problems, 1 judge, 160 solver calls, 0 failures).

Aggregate (`left_arm: workflow_validated`, `right_arm: full_skill_typed_verified`):

| Metric | Value |
|---|---:|
| n (problems) | 80 |
| `workflow_validated` wins | 34 |
| `full_skill_typed_verified` wins | 44 |
| ties | 2 |
| `workflow_validated` win rate | 0.438 |
| lift | −10pp |
| win-rate 95% CI | [0.331, 0.546] |
| p_value | 0.308 |
| significant | false |

Per-skill (only the significant/large cells called out; all others `p=1.0` or `p=0.248` and n.s.):

- **thinking-pre-mortem** (n=25): `workflow_validated` 4 wins / 21 losses, win rate **0.16**,
  **`p=0.001`** — full skill judged clearly better. This is the only significant per-skill cell.
- thinking-reversibility (n=25): 14 / 9 / 2 ties, win rate 0.60, `p=0.404` (n.s.).
- Remaining 10 skills are n=3 each (underpowered): margin-of-safety, red-team, and five-whys-plus
  each 3/0 for workflow (`p=0.248`); kepner-tregoe 0/3 for skill (`p=0.248`); the rest split.

`claim_status: pilot_only`. This is a single-judge pilot; it does not meet the preregistered
90-prompt / multi-judge behavioral bar. Diagnostic.

## Agentic routing run

Artifact: `evals/results/challenging-v1/agentic-workflow.json`
(mode `agentic-workflow`, 6 arms, n=16 route cases, 114 solver calls, 0 failures,
`parse_ok_rate` 1.000 for every arm). Case success requires exact node-level routing, correct
branch decisions, and all gold answers correct (per artifact `scoring_notes`).

| Arm | n | case_success_rate | route_exact_rate | branch_decision_acc | node_acc |
|---|---:|---:|---:|---:|---:|
| `dynamic_loose` | 16 | 0.563 | 0.125 | 0.500 | 0.938 |
| `dynamic_typed` | 16 | 0.250 | 0.750 | 0.375 | 0.969 |
| `dynamic_verified` | 16 | 0.313 | 0.813 | 0.500 | 1.000 |
| `workflow_loose` | 16 | 0.438 | 0.500 | 0.500 | 0.844 |
| `workflow_typed` | 16 | 0.500 | 0.500 | 0.500 | 0.875 |
| `workflow_validated` | 16 | 0.500 | 0.500 | 0.500 | 0.875 |

Contrasts (paired McNemar):

| Contrast | Δ case_success pp | p | discordant | left / right wins |
|---|---:|---:|---:|---|
| `workflow_validated` vs `dynamic_verified` | +18.8 | 0.248 | 3 | 3 / 0 |
| `workflow_loose` vs `dynamic_loose` | −12.5 | 0.683 | 6 | 2 / 4 |
| `workflow_typed` vs `workflow_loose` | +6.3 | 1.0 | 1 | 1 / 0 |
| `workflow_validated` vs `workflow_typed` | 0 | 1.0 | 0 | 0 / 0 |
| `dynamic_verified` vs `dynamic_typed` | +6.3 | 1.0 | 1 | 1 / 0 |

Interpretation: workflow arms are directionally ahead of their dynamic counterparts on end-to-end
case success (the +18.8pp validated-vs-verified gap is the largest), but n=16 gives no significance
(smallest p=0.248). Dynamic arms achieve higher `route_exact_rate` yet lower case success — they
over-route (`over_routing_avg` up to 1.0–2.0 in unstable strata), which the exact-route case metric
penalizes. `claim_status: pilot_only`. Diagnostic.

## Factorial checkpoint — INCOMPLETE, NOT EVIDENCE

Artifact: `evals/results/challenging-v1/workflow-factorial-checkpoint.json`.

This file is a **raw run checkpoint**, not a finished result. It contains only two top-level keys —
`problems` and `updated_at` (`2026-07-02T06:38:09.459Z`) — with **no** aggregate, contrasts, run
config, verdict, or `claim_status`. The run was interrupted mid-flight and never resumed (and, per
mission constraints, will not be resumed here).

Completed pairs at checkpoint time: **66** across 8 skills, with `thinking-red-team` cut off after
1 case:

| Skill | Completed problems |
|---|---:|
| thinking-reversibility | 25 |
| thinking-pre-mortem | 25 |
| thinking-cynefin | 3 |
| thinking-socratic | 3 |
| thinking-margin-of-safety | 3 |
| thinking-map-territory | 3 |
| thinking-inversion | 3 |
| thinking-red-team | 1 (partial — interrupted) |
| **Total** | **66** |

**This checkpoint is excluded from all conclusions in this report.**

## Status of goal-baseline runs

`evals/results/goal-baseline-objective/` and `evals/results/goal-baseline-agentic/` were both
verified on 2026-07-02 to be **empty directories (0 entries each)** — abandoned/aborted run
directories that contain no artifacts and no evidence. They are left in place per repo constraints
(no destructive cleanup of untracked run dirs) and carry no weight in this analysis.

## Caveats

- Objective set is at ceiling (nearly all arms 100%); it cannot discriminate arms at n=30 with these
  authored items.
- Behavioral run is a single-judge (`gemini-3.1-pro-preview`) pilot, n=80, with 10 of 12 skills at
  n=3 — far below any confirmatory power target.
- Agentic run is n=16 across 8 strata (2 cases each); no contrast reaches significance.
- Solver effort was `medium` (not the high-effort setting used by the separate confirmatory track),
  so absolute rates here should not be compared to high-effort runs.
- All runs share the frozen prereg above but none satisfies its dataset-size and replication
  requirements.

## Decision

Everything in this report is **diagnostic**. Read together, the four runs give no confirmatory
evidence that validated workflows beat full skills:

- Objective: ceiling, primary contrast −3.3pp (n.s.).
- Behavioral: workflow win rate 0.438, −10pp, `p=0.308` (n.s.); the one significant cell
  (pre-mortem, `p=0.001`) favors the full skill.
- Agentic: workflow arms directionally ahead (+18.8pp validated-vs-verified) but n.s. at n=16.
- Factorial: incomplete checkpoint, excluded.

The confirmatory path remains the preregistered protocol in
`evals/preregistrations/workflow-vs-skill-proof.md`
(SHA-256 `8e6a82e630d4db593ff9d88511dcded8aade3f0d236511392847fb93adc43fe7`), which requires enlarged
held-out per-skill datasets (30–50 cases/skill) and an independent, frozen replication set — both
being built separately. No confirmatory claim may be made from the challenging-v1 runs.
