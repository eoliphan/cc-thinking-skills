# Consolidation Go/No-Go Recommendation

**Date:** 2026-07-02
**Status:** RECOMMENDATION ONLY — **awaiting separate approval; no catalog changes made.** The shipped skill count remains 39.
**Inputs:** the 2026-07-02 pre-registered verdict studies (`analysis/PRE-REGISTERED-VERDICT-STUDIES.md`, commit `7b35377`), the workflow-vs-skill confirmation round (`analysis/workflow-vs-skill-final-report.md`, 2026-07-02 addendum), the refreshed canonical scorecard (`analysis/ELEVATE-OR-KILL-SCORECARD.{json,md}`), and `analysis/FUTURE-CONSOLIDATION-PLAN.md` (the 39→~26 proposal this document gates).

This document applies the verdict mapping that was pre-decided when the mission was approved. It computes; it does not re-litigate.

---

## 1. Evidence table

| Study | Artifact | Result | Verdict (pre-registered rule) |
|---|---|---|---|
| scientific-method larger-N (n=426, fresh SWE-bench Verified pool, frozen SHA `1ad90907…`) | `evals/results/sci-method-larger-n/swe-scientific-method.json` | 88.5% → 92.5%, **+4.0pp**, McNemar **p≈0.0005** (19–2 discordant) | **DIRECTIONAL-ONLY** (p<0.05 AND Δ<5pp) |
| five-whys-plus confirmation (n=199, fresh Verified slice 1–200) | `evals/results/verdict-five-whys/swe-five-whys-plus.json` | 88.4% → 89.9%, +1.5pp, p=0.546 | **NO-LIFT** (p≥0.05) |
| occams-razor confirmation (n=199, fresh Verified slice 201–400) | `evals/results/verdict-occams/swe-occams-razor.json` | 87.4% → 87.9%, +0.5pp, p=1.0 | **NO-LIFT** (p≥0.05) |
| Workflow-vs-skill objective, 3 solver models, heldout split (n=364/model) | `evals/results/wf-confirm-{sonnet,haiku,opus}/workflow-objective.json` | sonnet +0.3pp p=1.0 (0.995 ceiling); haiku −0.5pp p=0.845; opus +0.3pp p=1.0 (0.99 ceiling) | **NOT CONFIRMED** — no model near +5pp MDE, direction inconsistent, replication not triggered per prereg |
| Workflow-vs-skill behavioral (WorkflowValidated vs FullSkillTypedVerified, 3-judge panel, 140 prompts) | `evals/results/wf-confirm-behavioral/workflow-vs-skill.json` | 66W / 70L / 4T, win rate **0.486**, CI95 [0.403, 0.569], **p=0.797** | **NO PREFERENCE** — concordant with the objective null; secondary and cannot rescue the failed objective primary per prereg thresholds |

All three verdict studies were pre-registered with the dataset SHAs and stopping rules committed (`7b35377`) before any model call. Each SWE study reports 1 unscored item after exhausted retries (documented in-artifact; the prereg set no minimum scoring rate — 199/200 and 426/427 are reported as-is).

## 2. Verdict mapping (pre-decided)

- **Kills (4: regret-minimization, fermi-estimation, debiasing, dual-process) and merges (8→4: bayesian→probabilistic, model-selection→model-router, inversion+pre-mortem, feedback-loops+archetypes→systems)** — **GO regardless of the new studies.** Their evidence (powered nulls, ceilings, judge regressions) was already settled in `FUTURE-CONSOLIDATION-PLAN.md` §2–3 and none of the three studies bears on them.
- **scientific-method → DIRECTIONAL-ONLY.** Keep-full status is retained but downgraded from "near-ELEVATE flagship" to **"earns its length on procedure; real but sub-5pp lift."** The +4.0pp effect at p≈0.0005 is the catalog's only statistically robust objective signal (third same-direction result), but it is below the pre-registered 5pp MDE, so **no ELEVATE claim ships**. Per the pre-decided mapping, consolidation is still recommended GO — the 39→~26 case never depended on scientific-method winning; the gate existed because an ELEVATE could have changed the calculus upward.
- **five-whys-plus → NO-LIFT (third consecutive powered null, now on fresh items).** Moves from keep-full to **trigger-only candidate**. Trigger-only cohort grows 13 → 14; keep-full shrinks 16 → 15.
- **occams-razor → NO-LIFT (third consecutive powered null, now on fresh items).** Already in the proposal's trigger-only list; this verdict **removes the contested status** — its trigger-only placement is now evidence-confirmed, not audit-only.
- **Workflow confirmation → NOT CONFIRMED.** Deterministic workflow form does not beat full-skill form on the enlarged held-out sets (statistical equivalence; sonnet/opus at ceiling, haiku with headroom shows the same null). Per the pre-decided mapping: **trigger-only shrinks stand on the existing trigger-equivalence evidence alone; no workflow-format change is recommended.**

## 3. Resulting proposed catalog

| Category | FUTURE-CONSOLIDATION-PLAN (2026-06-07) | Updated by this recommendation |
|---|---|---|
| Merged | 8 skills → 4 | unchanged |
| Killed | 4 skills | unchanged |
| Trigger-only | 13 | **14** (+ five-whys-plus) |
| Keep-full | 16 | **15** (− five-whys-plus) |
| **Total active dirs** | ~26 (range 23–28) | **~25 (range 22–27)** |

The original plan's naming/overlap caveats (§6: merge-target naming; archetypes appears in both the merge and trigger lists) still apply and must be resolved during execution, not here.

## 4. Recommended action

**GO — execute `analysis/FUTURE-CONSOLIDATION-PLAN.md` with the two disposition updates above** (five-whys-plus → trigger-only; scientific-method keep-full with sub-5pp framing), via the plan's coordinated-update checklist (§7) as a single atomic commit: skill directories, README, plugin metadata, routing cases, eval contracts, scorecard, CLAUDE/AGENTS counts, trigger-card appendix, validation (`node scripts/validate-skills.js`, structural eval).

Honest framing requirement for the shipped catalog: **the catalog ships with zero proven-ELEVATE skills.** Its defensible value is reasoning framing, discoverability, and one real-but-small (~4pp) debugging lift from scientific-method.

**This document makes no catalog changes. Execution requires a separate explicit approval.**

## 5. Workflow behavioral result (final)

Completed after the draft: n=140 prompts across the 12 workflow-friendly skills, solver `claude-sonnet-4-6`, judge panel `gemini-3.1-pro-preview` + `gpt-5.5-pro` + `deepseek-v4-pro` (solver-family excluded), A/B order balanced. Result: **66W / 70L / 4T, win rate 0.486, CI95 [0.403, 0.569], p=0.797 — no preference between the two forms.** Full details in the 2026-07-02 addendum of `analysis/workflow-vs-skill-final-report.md`. As pre-decided, this changes nothing in §4: the objective primary had already failed confirmation, and the behavioral result is concordant with it.
