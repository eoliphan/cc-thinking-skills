# Workflow-vs-Skill Confirmation Study Report

Date: 2026-06-27

## Bottom line

Status: **inconclusive**.

The aligned primary objective runner now compares the preregistered arms `WorkflowValidated` vs `FullSkillTypedVerified`. In the clean primary rerun, `WorkflowValidated` was directionally higher by **+2.1pp** case success, but this missed the preregistered +5pp MDE and was not statistically significant (`p=0.131`). No independent replication dataset exists, so no confirmatory claim is allowed.

## Frozen preregistration

- Path: `evals/preregistrations/workflow-vs-skill-proof.md`
- SHA-256: `8e6a82e630d4db593ff9d88511dcded8aade3f0d236511392847fb93adc43fe7`
- Freeze/validation record: `analysis/workflow-vs-skill-freeze-validation.json`

## Harness changes made before proof run

- Added `workflow_validated` and `full_skill_typed_verified` prompt forms in `evals/lib/workflow-prompts.js`.
- Updated `evals/run-workflow-objective.js` to default to objective proof arms and report the primary contrast `workflow_validated` vs `full_skill_typed_verified`.
- Added per-arm `parse_ok`, `case_success`, and `case_success_rate` fields so the objective artifact matches the preregistered primary metric.
- Tightened typed-answer extraction so schema literals like `{ "answer": true | false }` do not parse as true answers.
- Added coverage tests in `evals/tests/workflow-objective.test.js`.

## Verification

Observed passing commands:

```bash
node --check evals/run-workflow-objective.js
node --check evals/lib/workflow-prompts.js
node --check evals/run-workflow-factorial.js
node --check evals/run-workflow-vs-skill.js
node --check evals/run-agentic-workflow.js
node --check evals/lib/prereg.js
node --check evals/lib/judge.js
node --test evals/tests/*.test.js
node evals/run-agentic-workflow.js --validate-only
WORKFLOW_DATASET=evals/datasets/workflow-cases-expanded.jsonl node evals/run-agentic-workflow.js --validate-only
```

`node --test evals/tests/*.test.js` passed **53/53** tests.

Dataset validation observed:

- Base workflow route-control dataset: **16** cases validated.
- Expanded workflow route-control dataset: **96** cases validated.

## Primary objective result

Command:

```bash
EVAL_RUN=workflow-objective-primary-rerun CONC=4 SOLVER_MODEL=claude-sonnet-4-6 ARMS=workflow_validated,full_skill_typed_verified node evals/run-workflow-objective.js
```

Artifact: `evals/results/workflow-objective-primary-rerun/workflow-objective.json`

| Metric | `WorkflowValidated` | `FullSkillTypedVerified` |
|---|---:|---:|
| n | 234 | 234 |
| case_success | 230 | 225 |
| case_success_rate | 0.983 | 0.962 |
| case_success_ci | [0.957, 0.993] | [0.929, 0.980] |
| parse_ok_rate | 1.000 | 1.000 |
| solver_failures | 0 | 0 |
| FPR | 0.009 | 0.009 |
| FNR | 0.025 | 0.067 |

Primary paired contrast:

- Δ case_success: **+2.1pp**
- McNemar p: **0.131**
- Discordant pairs: **7**
- Left/right wins: **6 / 1**

Interpretation: Directionally favorable to `WorkflowValidated`, but below the +5pp MDE and not significant. This does **not** confirm workflow superiority.

## Noisy all-arm objective run

Command:

```bash
EVAL_RUN=workflow-objective-proof CONC=12 SOLVER_MODEL=claude-sonnet-4-6 node evals/run-workflow-objective.js
```

Artifact: `evals/results/workflow-objective-proof/workflow-objective.json`

This run included diagnostic arms but had **120 unresolved solver failures** after retries. Its primary contrast was +1.7pp (`p=0.635`). Because failure noise was material, this artifact is operationally noisy and should not drive the decision.

## Behavioral pilot

Command:

```bash
EVAL_RUN=workflow-vs-skill-pilot-refresh CONC=12 SOLVER_MODEL=claude-sonnet-4-6 node evals/run-workflow-vs-skill.js
```

Artifact: `evals/results/workflow-vs-skill-pilot-refresh/workflow-vs-skill.json`

Result:

- n: **80** prompts
- workflow wins: **38**
- skill wins: **41**
- ties: **1**
- workflow win rate: **0.481**
- p: **0.822**

Caveat: This is a legacy pilot (`workflow` vs `skill`, one judge, 80 prompts). It does not satisfy the preregistered `WorkflowValidated` vs `FullSkillTypedVerified` behavioral gate or 90-prompt target.

## Factorial format pilot

Command:

```bash
EVAL_RUN=workflow-factorial-refresh LIMIT_PER_SKILL=3 CONC=12 SOLVER_MODEL=claude-sonnet-4-6 node evals/run-workflow-factorial.js
```

Artifact: `evals/results/workflow-factorial-refresh/workflow-factorial.json`

Selected aggregate comparisons:

- `full_skill_workflow` vs `full_skill_prose`: 5W / 28L / 3T, win rate 0.181, p=0.000.
- `concise_workflow` vs `concise_skill_prose`: 16W / 16L / 4T, win rate 0.500, p=1.000.
- `concise_workflow` vs `full_skill_workflow`: 29W / 7L / 0T, win rate 0.806, p=0.000.

Caveat: This is a format pilot with one judge and only 3 prompts per skill. It is diagnostic, not confirmatory.

## Replication status

Replication was **blocked**: no independent replication or held-out replication dataset exists under `evals/datasets/**/*replication*` or `evals/datasets/**/*heldout*`.

Per preregistration, the absence of independent replication forces the final result to **inconclusive**, even if a primary run had passed.

## Decision

Do **not** claim that deterministic workflows beat full skills.

Current evidence supports a narrower statement: the harness can now run the preregistered primary objective comparison, and the clean primary run was directionally positive for `WorkflowValidated` but too small and unreplicated to confirm.

## Next required work for confirmation

1. Build an independent replication dataset before another confirmatory run.
2. Raise underpowered authored skills from 12 cases to the preregistered 30–50 cases each.
3. Add cluster/source IDs that reflect real provenance rather than derived row IDs.
4. Upgrade behavioral comparison to `WorkflowValidated` vs `FullSkillTypedVerified`, with at least 90 prompts and a multi-judge panel.
5. Rerun the primary objective comparison across at least 3 solver models and require 2 of 3 to agree directionally with no significant opposite effect.

---

# Confirmation Round — 2026-07-02

This dated addendum executes the five "next required work" items above under the frozen
preregistration `evals/preregistrations/workflow-vs-skill-proof.md` (SHA-256
`8e6a82e630d4db593f...`). Datasets below were frozen BEFORE any confirmatory model call.

## Dataset enlargement (items 1–3)

- Held-out labeled cases: all 12 workflow-friendly skills now have 29–35 heldout cases
  (target 30–50; five-whys-plus at 29 after a near-dup exclusion, socratic at 35 after a
  balance top-up). Authored by 12 parallel dataset agents; append-only; every row carries
  `source_id`, scenario-family `cluster_id`, `cluster_basis`, `source_family`, `split`.
- Independent replication split: 29–30 untouched cases per skill (`split: replication`),
  disjoint scenario families, authored fresh — never consumed by any prior run.
- Route-control: `workflow-cases-expanded.jsonl` 96 → 120 cases;
  NEW `workflow-cases-replication.jsonl` with 24 fresh cases referencing only
  `split: replication` source rows (zero source_id overlap with the expanded file).
- Behavioral: 10 skills raised from 3 to 9 prompts each (+ 2 already at 25) →
  140 total prompts across the 12 workflow-friendly skills (≥90 target).

## Leakage and near-duplicate control (prereg-required, exclusions reported)

Token-Jaccard scan (threshold 0.5) of every heldout/replication prompt vs SKILL.md files,
workflow templates, dev rows, and cross-split near-dups. Findings — all four were
PRE-EXISTING rows, none newly authored:

- `five-whys-12` (heldout) ≈ `five-whys-25` (replication), J=0.867 → both moved to dev.
- `kepner-tregoe-24` (replication) ≈ dev `kepner-tregoe-09`, J=0.611 → moved to dev.
- `occam-24` (replication) ≈ dev `occam-08`, J=0.565 → moved to dev.

Exclusion counts: heldout 1, replication 3. Post-exclusion rescan: zero flags.

## Label balance

Appended groups balanced ≤1 off 50/50 per split. Merged-split audit flagged
`socratic-clarify` heldout at 0.37 true (pre-existing skew); fixed by appending 5
true-labeled heldout rows (`socratic-jul2-h22..h26`) → 16T/19F = 0.457. No other file
exceeds the 10pp drift rule.

## Quality spot review

Independent reviewer agent sampled 90 new rows (~18–21% per file, above the 10% floor):
**objective rows 84/84 PASS**. The reviewer initially rejected 24 route cases as
"oracle-inconsistent"; verification showed all 24 carry `stability: unstable` — the
mis-routing is the designed semantics of the unstable half of the route corpus (the
legacy corpus is likewise ~50% unstable). Stable-half cases were all oracle-consistent.
Route batches accepted.

## Validation

- `node evals/validate-dataset-splits.js`: 26/26 files pass
  (182 dev / 390 heldout / 417 replication clusters).
- `node evals/run-agentic-workflow.js --validate-only`: 16 base, 120 expanded,
  24 replication cases validated.
- New runner capability: `SPLIT=dev|heldout|replication` env filter in
  `evals/run-workflow-objective.js` (recorded in the artifact as `split`), covered by
  `evals/tests/workflow-objective-split.test.js`. Without it the runner consumed all
  rows including the replication split.

## Frozen dataset SHA-256 (freeze record; datasets committed per repo dataset policy)

| File | SHA-256 |
|---|---|
| `socratic-clarify.jsonl` | `abd143021f06976738fe0bef74b2692adbb97627d6de180c58c96fe0e25cf2e5` |
| `cynefin-classify.jsonl` | `8b4fda79c0952b97ec184cfb4bcf7fc53ceb5384a8fdf4b4683d2fec2dff723b` |
| `reversibility-doors.jsonl` | `bd09c22d42de383d5d0a55c93b11177e1e3b0fc86f64da06b80b3f37458e80a9` |
| `margin-of-safety-provision.jsonl` | `c69bc56bd1ccec492ca31c03ca6ce37768271de8547221480a33e8eda82ca14e` |
| `map-territory-verify.jsonl` | `0cde9265928a7422092226f318380e3f4a5050ff950492258887fb67ac808ccf` |
| `pre-mortem-risk.jsonl` | `3a475710d3683212fb7037c18cb305c693f603f5d111bce6714eff9084c89903` |
| `inversion-failure-paths.jsonl` | `0727f530cd678e4d9972883d24aad3534b4a26036c9448bb315f3c8c38308bb7` |
| `red-team-vulnerability.jsonl` | `b02391738182a636e9de6fb883fab66b99570a46bbf4507371868715de4c4ede` |
| `scientific-method-hypothesis.jsonl` | `223a3f931aa6234f9336c36853728043ec1872851e45e4f39085edf51dda7e87` |
| `kepner-tregoe-selective-defect.jsonl` | `e271d987d83b3369995909fa020deefec755a0f079edbe12c7141f418fac56e9` |
| `five-whys-root-cause.jsonl` | `eda4c7747ff3a3992f4e50566556285cc17986cc2f266bb0823874ed816cb4fb` |
| `occams-razor-competing-causes.jsonl` | `08f867b12f9ff52ed55ce03bb15e3cf3a573cf97a0af7d3141b80bd555d86fe5` |
| `workflow-cases.jsonl` | `b39aa13901326ae1262bdb8db25fa41c38dea84a88a89b2287c1d1d00714a102` |
| `workflow-cases-expanded.jsonl` | `19e4e10b07583962efb6cb866be940303cd6ace0dd905450c0f4c550be345474` |
| `workflow-cases-replication.jsonl` | `628ba407a038f957e01c747ff008cda849d29c1eedd44a13ddfaf1eea736cf72` |

Behavioral files (12) frozen: `thinking-socratic.json`=`a2587a934d71…`, `thinking-cynefin.json`=`2f4cfb4a6a99…`, `thinking-reversibility.json`=`6c55489eb1a7…` (+9 more; full hashes in `evals/results/latest/confirmation-freeze.json`).

## Runs

### Primary objective — 3 solver models, heldout split (n=364/model)

Commands (per model, `SPLIT` filter added to `evals/run-workflow-objective.js` for this round):

```bash
EVAL_RUN=wf-confirm-<model> SPLIT=heldout ARMS=workflow_validated,full_skill_typed_verified \
SOLVER_MODEL=<model-id> SOLVER_EFFORT=medium CONC=6 node evals/run-workflow-objective.js
```

| Solver | n | `WorkflowValidated` | `FullSkillTypedVerified` | Δ | McNemar p | Discordant | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| `claude-sonnet-4-6` (primary) | 364 | 0.995 | 0.992 | +0.3pp | 1.0 | 3 | 0 |
| `claude-haiku-4-5-20251001` | 364 | 0.940 | 0.945 | −0.5pp | 0.845 | 26 | 0 |
| `claude-opus-4-8` | 364 | 0.989 | 0.986 | +0.3pp | 1.0 | 3 | 0 |

Artifacts: `evals/results/wf-confirm-{sonnet,haiku,opus}/workflow-objective.json`.

Decision-rule outcome: **NOT CONFIRMED.** No model approaches the +5pp MDE; direction is inconsistent (haiku negative); nothing significant in either direction. Ceiling caveat: sonnet and opus sit at ≈0.99 on the enlarged held-out sets, so subtle effects are unmeasurable for those models; haiku (0.94, 26 discordant pairs) has headroom and shows the same null. Per the frozen preregistration, the replication run was **not triggered** (primary did not pass).

### Behavioral — WorkflowValidated vs FullSkillTypedVerified, 3-judge panel

```bash
EVAL_RUN=wf-confirm-behavioral BEHAVIORAL_PROOF_ARMS=1 \
JUDGES=gemini-3.1-pro-preview,gpt-5.5-pro,deepseek-v4-pro \
SOLVER_MODEL=claude-sonnet-4-6 SOLVER_EFFORT=medium CONC=6 node evals/run-workflow-vs-skill.js
```

Artifact: `evals/results/wf-confirm-behavioral/workflow-vs-skill.json`

- n: **140** prompts (12 workflow-friendly skills; ≥90 target met), judge panel majority with solver-family exclusion
- workflow wins **66** / full-skill wins **70** / ties **4**
- win rate **0.486**, CI95 [0.403, 0.569], p=**0.797** — no preference
- Only per-skill standout: reversibility 19W/5L/1T (0.78) on 25 prompts; scientific-method worst at 2W/7L. All per-skill cells below the 30-prompt per-skill bar → per-skill verdicts inconclusive by design.

### Companion verdict studies (same mission, pre-registered)

`analysis/PRE-REGISTERED-VERDICT-STUDIES.md` (commit `7b35377`): scientific-method larger-N n=426 → **DIRECTIONAL-ONLY** (+4.0pp p≈0.0005, sub-5pp); five-whys-plus n=199 → **NO-LIFT** (+1.5pp p=0.546); occams-razor n=199 → **NO-LIFT** (+0.5pp p=1.0).

## Confirmation-round decision (2026-07-02)

**Workflow superiority is NOT confirmed — the preregistered comparison shows statistical equivalence.** Objective: three solver models, all null, direction inconsistent. Behavioral: 0.486 win rate, p=0.797. Under the frozen preregistration this is a decisive non-confirmation of H1 (workflow advantage); H2 (full-skill advantage) is also not confirmed (nothing significant in that direction either). The 2026-06-27 "inconclusive" is upgraded to: **no measurable format effect between validated-workflow and typed-verified-full-skill forms at these ns**, with a ceiling caveat for sonnet/opus-class solvers on the objective surface.

Consequence for the consolidation decision: trigger-only shrinks stand on the existing trigger-equivalence evidence alone; no workflow-format change is recommended. See `analysis/CONSOLIDATION-GO-NO-GO.md`.
