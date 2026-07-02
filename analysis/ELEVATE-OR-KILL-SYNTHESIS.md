# Elevate-or-Kill — Executive Synthesis

**Generated:** 2026-06-07  
**Source:** `analysis/ELEVATE-OR-KILL-SCORECARD.{json,md}` (canonical single source of truth)  
**Mission:** Full replication-gated evaluation of all 39 shipped thinking skills  
**M5 Powered Run:** 7 skills powered (hard cap 10), solver `claude-sonnet-4-6`, CONC=4, isolation ON  

---

## Headline Result

**The mission produced ZERO robust-ELEVATE skills.** No skill met the full ELEVATE bar (≥5pp lift on its primary value surface, passes paired test at p<0.05, AND replicates on a fresh independent sample in the same direction). The strongest candidate — `scientific-method` — finished **DIRECTIONAL-NOT-REPLICATED**. Its M5 fresh primary scored +5.3pp, p=0.061, post-edit, directional, NOT replicated (fails the p<0.05 gate). Its replication was significant (+8.0pp, p=0.001, post-edit, significant, replication-sample that does NOT rescue the failed primary → skill-level NOT replicated), but a successful replication cannot rescue a primary that fails the paired-test gate.

> **✅ 2026-07-02 UPDATE:** the recommended pre-registered larger-N study was executed (`analysis/PRE-REGISTERED-VERDICT-STUDIES.md`, commit `7b35377`; artifact `evals/results/sci-method-larger-n/swe-scientific-method.json`). Result: n=426 on a fresh frozen SWE-bench Verified pool, **+4.0pp, McNemar p≈0.0005 — significant but below the 5pp gate → `scientific-method` is now DIRECTIONAL-ONLY** (verdict rule verbatim: p<0.05 AND Δ<5pp). The lift is real (third same-direction result) but its best estimate is ~4pp. ZERO skills hold ELEVATE. Companion confirmations: `five-whys-plus` NO-LIFT (n=199, +1.5pp p=0.546) and `occams-razor` NO-LIFT (n=199, +0.5pp p=1.0) on fresh disjoint Verified slices.

This is an honest, evidence-backed conclusion. The mission deliberately did NOT chase significance by enlarging samples after seeing borderline p-values (per documented anti-p-hacking decision 2026-06-07 in AGENTS.md). The properly pre-registered larger-N primary study recommended here as future work **has since been run — see the 2026-07-02 update above.**

---

## Section 1: Verdict Categories — Complete Listing

Every claim below carries the three required provenance dimensions: **pre/post-edit**, **directional/significant/null**, **replicated: false** (no skill-level ELEVATE verdict achieved replication). Each category is listed even when empty.

### 1.1 robust-ELEVATE — EMPTY

**ZERO skills achieved robust-ELEVATE.** No skill met the full bar: ≥5pp lift on its primary value surface, passes paired test at p<0.05, AND replicates on a fresh independent sample in the same direction. The mission outcome is zero robust-ELEVATE — this is documented explicitly per synthesis requirements.

### 1.2 DIRECTIONAL-NOT-REPLICATED

Skills where primary showed a positive signal but failed the replication gate (either primary did not pass p<0.05, or replication failed/mismatched). The direction is correct but the evidence does not clear the ELEVATE bar.

| Skill | Primary | Replication | Status |
|-------|---------|-------------|--------|
| **scientific-method** | +5.3pp, p=0.061 (n=150, post-edit, directional, not replicated) | +8.0pp, p=0.001 (n=150, post-edit, significant, not replicated) | Primary fails p<0.05 gate; replication significant same-direction but cannot rescue. **Downgraded from ELEVATE.** _2026-07-02: pre-registered larger-N (n=426, fresh Verified pool) gave **+4.0pp p≈0.0005 → DIRECTIONAL-ONLY** — significant, sub-5pp. No skill holds ELEVATE._ |

### 1.3 TRIGGER-ONLY — None Currently Verified

No skill has been verified as TRIGGER-ONLY through a powered trigger-card-vs-full-guide comparison on calibrated in-domain tasks. Earlier trigger-vs-full probes (e.g., on conceptual skills at small N) showed trigger ≈ full guide as a directional signal, but no powered verification was run during this mission. Trigger-card variants exist for some skills but remain unverified by decisive evidence.

### 1.4 QUARANTINE-REDIRECT

Skills flagged for quarantine/redirect based on evidence: either (a) showed no lift on their value surface, (b) were at ceiling, (c) duplicated another skill's mechanism, or (d) were not agent-applicable. All received "When NOT to Use" boundaries and explicit redirect language. No skill directory was deleted — the public count remains 39.

| Skill | Redirect Target | Basis |
|-------|----------------|-------|
| `bayesian` | `probabilistic` (post-edit, null, not replicated) | Ceiling (98% placebo); probabilistic covers calibration better |
| `model-selection` | `model-router` (unmeasured) | Duplicates router mechanism; audit recommends merge |
| `inversion` | `pre-mortem` (post-edit, directional, not replicated) | Overlap — inversion is pre-mortem's core move |
| `feedback-loops` | `systems` (unmeasured) | Duplicated Meadows content |
| `archetypes` | `systems` / `leverage-points` (post-edit, null, not replicated) | Powered null on decisive split; systems covers the same ground |
| `regret-minimization` | `reversibility` (unmeasured) | Not agent-applicable; reversibility/opportunity-cost cover decision regret |
| `fermi-estimation` | — (post-edit, null, not replicated) | Powered flat at n=150; no known target |
| `debiasing` | — (post-edit, null, not replicated) | Ceiling (100% placebo); LLMs already debiased on standard framings |
| `dual-process` | — (unmeasured) | Resist objective framing; human stage-directions flagged in audit |

### 1.5 NO-LIFT

Skills that received a powered evaluation on their calibrated decisive split and showed no significant lift over placebo. These were given a fair chance — calibrated headroom, frozen split, post-edit evaluation.

| Skill | Dataset | N | Placebo → Skill | Δ (pp) | p | Family | Notes |
|-------|---------|---|-----------------|--------|---|--------|-------|
| **red-team** | Security/adversarial decisive | 70 | 43% → 44% | +1.4 | 1.0 | Security/adversarial | M5 powered primary on harder diverse-CWE decisive split (post-edit, null, not replicated). Earlier n=80 +11.3pp p=0.052 (post-edit, directional, not replicated, **superseded**); n=200 +5.0pp p=0.10 (post-edit, directional, not replicated, **superseded**). Primary did not pass ≥5pp + p<0.05 gate → NO-LIFT (not directional-not-replicated — red-team never passed primary). |
| **systems** | SWE-bench decisive split | 150 | 83% → 84% | +1.3 | 0.724 | Debugging/fault-localization | Original +5.3pp p=0.043 (post-edit, significant, not replicated, **superseded**); replication −1.3pp p=0.683 (post-edit, null, not replicated). Not reworked this mission; split frozen before result. |
| **five-whys-plus** | debugging-fault-localization-decisive | 224 | 59% → 59% | +0.9 | 0.724 | Debugging/fault-localization | Original +4.0pp p=0.041 (post-edit, significant, not replicated, **superseded**); replication +1.3pp p=0.752 (post-edit, null, not replicated). M4 reworked skill, decisive split, full-n=224. |
| **occams-razor** | debugging-fault-localization-decisive | 224 | 56% → 55% | −0.9 | 0.724 | Debugging/fault-localization | M4 reworked skill (post-edit, null, not replicated); trigger-scoped rework did not move needle. Full-n=224. |
| **archetypes** | systems-product-strategy-pairwise decisive | 117 | 72% → 73% | +0.9 | 1.0 | Systems/product/strategy pairwise | In-band quarantine candidate given fair chance (post-edit, null, not replicated). No lift detected. |
| **fermi-estimation** | jeggers/fermi | 150 | 41% → 41% | +0.7 | 1.0 | Quantitative/uncertainty | Rework "rescue" at n=40 (+7.5pp — post-edit, directional, not replicated) was noise. Powered n=150 confirmation flat (post-edit, null, not replicated). |

### 1.6 NO-LIFT (Exploratory — Surface Mismatch)

Skills powered on a debugging/fault-localization surface that does NOT match their native value surface. A no-lift here is NOT an honest kill — these skills need evaluation on their true surface. All evidence in this section is post-edit, null, not replicated.

| Skill | Powered Surface | Native Surface | N | Δ (pp) | p | Provenance |
|-------|----------------|----------------|---|--------|---|------------|
| **kepner-tregoe** | fault-localization | paired reasoning quality | 224 | −1.8 | 0.289 | post-edit, null, not replicated |
| **map-territory** | fault-localization | routing/discoverability | 224 | +2.2 | 0.074 | post-edit, null, not replicated |

### 1.7 CEILING-NEEDS-HARDER-DATA

Skills where the placebo/baseline accuracy is at or near ceiling (90–100%), leaving no headroom to measure a skill effect. These are NOT kill verdicts — they need harder calibrated items before a powered verdict is possible. All evidence in this section is post-edit, null, not replicated.

| Skill | Dataset | N | Placebo | Δ (pp) | Provenance |
|-------|---------|---|---------|--------|------------|
| `first-principles` | authored constraint | 30 | 93% | +6.7 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `map-territory` | authored verify | 30 | 97% | +3.3 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `cynefin` | authored classify | 30 | 97% | +3.3 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `theory-of-constraints` | authored bottleneck | 30 | 97% | 0 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `reversibility` | authored doors | 30 | 100% | 0 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `bayesian` | authored base-rate | 40 | 98% | +2 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `debiasing` | authored bias | 40 | 100% | −2 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |
| `socratic` | authored clarify | 29 | 100% | −6.9 (ns) | `OBJ-small-ceiling`, post-edit, null, not replicated |

### 1.8 UNRESOLVED/UNMEASURED — Pending Objective Evaluation

Skills with no objective ground-truth run — either because their value surface resists objective formulation (paired reasoning quality), they are routing meta-skills, or they were not in the M5 powered batch. All skills in this section carry provenance: pre-edit (judge-only evidence superseded), unmeasured objective, not replicated.

| Group | Skills | Reason |
|-------|--------|--------|
| **Pairwise/behavioral only** | `inversion`, `pre-mortem`, `triz`, `thought-experiment`, `jobs-to-be-done`, `effectuation`, `lindy-effect`, `leverage-points`, `feedback-loops`, `opportunity-cost`, `via-negativa`, `regret-minimization`, `steel-manning` | No clean objective formulation; value surface = paired reasoning quality |
| **Thin / hard-to-objectify** | `ooda`, `bounded-rationality`, `dual-process` | Resist objective framing; small-N judge-only evidence only |
| **Leakage-blocked** | `probabilistic` | Forecasting items resolve pre-cutoff |
| **Meta (routing only)** | `model-router`, `model-selection`, `model-combination` | Routing-only evaluation; need routing-accuracy metric |
| **Other** | `circle-of-competence`, `second-order`, `margin-of-safety` | Measured but non-powered or small-N negative |

---

## Section 2: Cross-Cutting Conclusions

### 2.1 The Replication Gate Works As Designed

The mission's defining finding is NOT that skills lack value — it is that **borderline p≈0.04–0.05 results at modest N do not survive replication.** The pattern is consistent across five skills (every claim provenance-tagged):

- `systems`: +5.3pp p=0.043 (post-edit, significant, not replicated, **superseded**) → replication −1.3pp p=0.683 (post-edit, null, not replicated)
- `five-whys-plus`: +4.0pp p=0.041 (post-edit, significant, not replicated, **superseded**) → replication +1.3pp p=0.752 (post-edit, null, not replicated)
- `red-team`: +11.3pp p=0.052 n=80 (post-edit, directional, not replicated, **superseded**) → +5.0pp p=0.10 n=200 (post-edit, directional, not replicated, **superseded**)
- `fermi-estimation`: rework +7.5pp n=40 (post-edit, directional, not replicated, **superseded**) → +0.7pp p=1.0 n=150 (post-edit, null, not replicated)
- `scientific-method`: +9.3pp p=0.002 old run1 (pre-edit, significant, not replicated, **superseded**) → +5.3pp p=0.061 M5 fresh primary (post-edit, directional, not replicated)

The replication gate prevented false ELEVATE claims that a single-p<0.05 approach would have declared. **"Replication, not a single p<0.05" is the standard any future ELEVATE claim must meet.**

### 2.2 Scientific-Method Is the Closest to ELEVATE — But Not There

`scientific-method` (hypothesis-differential debugging) is the strongest skill in the catalog. Its M5 replication (+8.0pp, p=0.001, post-edit, significant, replication-sample → skill-level NOT replicated) is a genuine signal — the effect is real and in the right direction. But the M5 fresh primary (+5.3pp, p=0.061, post-edit, directional, NOT replicated) falls just short of the paired-test gate.

**We deliberately did NOT enlarge the primary sample to chase p<0.05** — that would be optional-stopping/p-hacking (see AGENTS.md Anti-P-Hacking decision 2026-06-07). A properly pre-registered larger-N study (~n=300–400) with a single pre-specified stopping rule is the correct next step (see `analysis/FUTURE-CONSOLIDATION-PLAN.md` and `analysis/ACTIVE-PULL-FUTURE-WORK.md`).

### 2.3 Domain-Fit Determines the Sign

The native-domain debugging run showed that 3/4 debugging skills had a consistent small positive lift (+4–9pp at n=45, post-edit, directional, not replicated), while the same skills were flat or negative in proxy domains (medical dx, post-edit, null, not replicated). The value of thinking skills is **entirely conditional on domain-fit** — they do not generalize across unrelated problem types.

### 2.4 The Catalog's Value Is in Reasoning Framing, Not Measurable Correctness

On objective, judge-free tasks, injecting a thinking-skill guide produces **no reliable accuracy lift for 38 of 39 skills.** The honest value proposition of the catalog is:
- **Reasoning framing on open-ended work** (the pooled 63% pairwise lift, p=0.015 — pre-edit, significant, not replicated, **superseded** — though per-skill is directional only)  
- **Discoverability** — well-bounded, situation-named references  
- **One near-ELEVATE debugging skill** (scientific-method, directional-not-replicated: primary +5.3pp p=0.061 post-edit directional not replicated)  

### 2.5 Quarantine/Redirect Strategy Is Evidence-Grounded

Skills flagged for quarantine/redirect (`bayesian`→`probabilistic`, `model-selection`→`model-router`, `inversion`→`pre-mortem`, `feedback-loops`/`archetypes`→`systems`/`leverage-points`, `regret-minimization`→`reversibility`, `fermi-estimation`, `debiasing`, `dual-process`) were evaluated against their evidence and either: (a) showed no lift on their value surface, (b) were at ceiling, (c) duplicated another skill's mechanism, or (d) were not agent-applicable. All were given "When NOT to Use" boundaries and explicit redirect language. No skill directory was deleted — the public count remains 39.

---

## Section 3: Active-Pull Track — Deferred

The **active-pull** experiment track (described in `analysis/ACTIVE-PULL-FUTURE-WORK.md`) is documented as future work only. Nothing was built or wired into the shipped harness. The concept: pre-register a study where the harness actively fetches fresh items (e.g., newly reported CVEs, post-cutoff forecasting questions, recent SWE-bench issues) at evaluation time, eliminating leakage concerns and enabling continuous calibration. This requires a live data pipeline, a freshness-gated sampling protocol, and pre-registered stopping rules — all out of scope for this mission.

---

## Section 4: Future Consolidation Plan — Not Executed

A separate consolidation plan (`analysis/FUTURE-CONSOLIDATION-PLAN.md`) proposes reducing the catalog below 39 skills (merging overlapping skills, retiring kill candidates, and shrinking trigger-only skills to trigger cards). This plan is a **proposal only** — the skill count remains 39 and no directories were removed or renamed. The plan includes a coordinated-update checklist for any future reduction: README, plugin metadata, routing cases, eval docs, and directory changes must all be updated together.

---

## Section 5: Provenance Integrity

Every eval claim in this synthesis and in the canonical scorecard carries:
- **Pre/post-edit** — identifying whether evidence predates or postdates the skill's most recent rewrite  
- **Directional/significant/null** — the statistical strength of the finding  
- **Replicated: false** — no skill-level verdict currently meets the replication gate  

There are **no unsupported +5–10pp claims.** Every numeric lift is backed by a specific result JSON file, a sample size, a p-value or CI, and a provenance tag. Stale claims from earlier mission phases (run1 scorecard n=3 wins, mid-document ELEVATE-OR-KILL.md ELEVATE assertions, SKILL-AUDIT.md "systems as proven hub") are explicitly flagged superseded in the scorecard and in the stale-claim cleanup notes.

---

## Section 6: Stale-Claim Cleanup — Summary

See `analysis/STALE-CLAIM-CLEANUP.md` for the full cleanup notes. Key actions:

1. **`analysis/SKILL-AUDIT.md`**: A superseded banner was prepended. The audit's recommendation that `systems` be kept as a "proven debugging hub" is **superseded** (systems produced no-lift at power). The 39→26 consolidation map is **obsolete** — this mission's evidence invalidated its assumptions. The audit's best-practices rubric remains useful; its per-skill dispositions are superseded where contradicted by powered evidence.

2. **`analysis/ELEVATE-OR-KILL.md`**: A superseded banner was prepended to the mid-document narrative. The "trimming regression" lesson (section ★★★) is **retracted** — the dips were NOT caused by trimming but by regression to the mean from borderline-significant draws. Only the final two sections (★ Wave C replication failure + ★★★★★ Powered confirmation collapse) and the final program verdict section are current. All earlier ELEVATE claims (systems, five-whys-plus, red-team +11.3pp (pre-edit/small-N, directional, NOT replicated — canonical verdict NO-LIFT), fermi rework rescue) are superseded.

3. **`analysis/ELEVATE-OR-KILL-SCORECARD.md`**: The provenance taxonomy wording was updated to remove the implication that any skill currently achieves a "replicated" status. The `OBJ-powered-significant` tag description no longer says "replicated direction" — it now clarifies this tag may describe a standalone replication run that does NOT imply the skill-level verdict is replicated.

---

## Section 7: Scorecard Summary (All 39 Skills)

### 7.1 Measured Verdicts (Mutually Exclusive — Sums to 39)

Each skill carries exactly one measured verdict below. These categories are mutually exclusive and exhaustive — every one of the 39 skills falls into exactly one row.

| Verdict Category | Count | Skills |
|------------------|-------|--------|
| **robust-ELEVATE** | **0** | — (ZERO skills achieved ELEVATE; mission outcome) |
| **DIRECTIONAL-ONLY** (2026-07-02, was DIRECTIONAL-NOT-REPLICATED) | 1 | `scientific-method` (pre-registered larger-N n=426: +4.0pp p≈0.0005 significant, Δ<5pp gate; prior M5 +5.3pp p=0.061 / repl +8.0pp p=0.001) |
| **NO-LIFT** | 6 | `red-team`, `systems`, `five-whys-plus` (reconfirmed 2026-07-02: n=199 +1.5pp p=0.546), `occams-razor` (reconfirmed 2026-07-02: n=199 +0.5pp p=1.0), `archetypes`, `fermi-estimation` |
| **NO-LIFT (exploratory)** | 2 | `kepner-tregoe`, `map-territory` (surface-mismatch) |
| **CEILING-NEEDS-HARDER-DATA** | 7 | `first-principles`, `cynefin`, `theory-of-constraints`, `reversibility`, `bayesian`, `debiasing`, `socratic` |
| **Other measured** | 3 | `circle-of-competence` (no calibration benefit, post-edit, null, not replicated), `second-order` (no effect, post-edit, null, not replicated), `margin-of-safety` (headroom, no benefit, post-edit, null, not replicated) |
| **UNRESOLVED/UNMEASURED** | 20 | `model-selection`, `inversion`, `feedback-loops`, `regret-minimization`, `dual-process`, `model-router`, `model-combination`, `probabilistic`, `bounded-rationality`, `effectuation`, `jobs-to-be-done`, `leverage-points`, `lindy-effect`, `ooda`, `opportunity-cost`, `pre-mortem`, `steel-manning`, `thought-experiment`, `triz`, `via-negativa` |
| **Total** | **39** | — |

> Footnote: `map-territory` was at ceiling on its authored subset, but its canonical verdict is NO-LIFT (exploratory); it is counted once there.

### 7.2 Cross-Cutting Dispositions (NOT Mutually Exclusive — Overlap with Verdicts)

Dispositions are orthogonal to measured verdicts. A skill can carry both a measured verdict (e.g., NO-LIFT, CEILING, UNMEASURED) and a cross-cutting disposition (QUARANTINE-REDIRECT or TRIGGER-ONLY). The 9 QUARANTINE-REDIRECT skills below are already counted under their measured verdicts in §7.1 — they are NOT double-counted.

| Disposition | Count | Skills | Overlaps With |
|-------------|-------|--------|---------------|
| **QUARANTINE-REDIRECT** | 9 | `bayesian`→`probabilistic`, `model-selection`→`model-router`, `inversion`→`pre-mortem`, `feedback-loops`→`systems`, `archetypes`→`systems`/`leverage-points`, `regret-minimization`→`reversibility`, `fermi-estimation` (no target), `debiasing` (no target), `dual-process` (no target) | NO-LIFT (archetypes, fermi-estimation), CEILING (bayesian, debiasing), UNMEASURED (model-selection, inversion, feedback-loops, regret-minimization, dual-process) |
| **TRIGGER-ONLY** | **0** | — (None verified by powered trigger-vs-full comparison) | — |

---

*This executive synthesis is the definitive summary of the Elevate-or-Kill mission. All numeric claims are verifiable against the canonical scorecard at `analysis/ELEVATE-OR-KILL-SCORECARD.json` and the result JSONs under `evals/results/`.*
