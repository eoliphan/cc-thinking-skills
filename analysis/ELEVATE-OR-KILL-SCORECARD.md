# ELEVATE-OR-KILL Scorecard — Canonical Single Source of Truth

**Generated:** 2026-06-07  
**Refreshed:** 2026-07-02 — verdict-studies mission (pre-registered `analysis/PRE-REGISTERED-VERDICT-STUDIES.md`, commit `7b35377` before any model call): scientific-method larger-N n=426 → **DIRECTIONAL-ONLY**; five-whys-plus and occams-razor fresh-item confirmations n=199 each → **NO-LIFT**. No skill holds ELEVATE.  
**Source:** `analysis/EVAL-COVERAGE.md` (cleanest snapshot) cross-checked against `evals/results/{run1,wavec,confirm,rerun}/*.json` and `evals/db/evals.db`; 2026-07-02 rows from `evals/results/{sci-method-larger-n,verdict-five-whys,verdict-occams}/`  
**Scope:** All 39 shipped skills (`skills/thinking-*`)

---

## Provenance Taxonomy (every evidence cell carries one tag)

| Tag | Meaning |
|-----|---------|
| `OBJ-powered-significant` | Objective ground-truth run, powered (n≥150), p<0.05 (may be a standalone replication run; does NOT imply the skill-level verdict is replicated) |
| `OBJ-powered-null` | Objective powered run, no significant effect (p≥0.05) |
| `OBJ-powered-directional` | Objective powered run, directional effect (same sign) but p≥0.05 |
| `OBJ-small-ceiling` | Small-N objective run, placebo at ceiling (90–100%), no headroom |
| `OBJ-small-negative` | Small-N objective run, negative delta |
| `routing/abstention-null` | Routing/abstention eval, null result |
| `judge-only-n3-superseded` | Judge-based behavioral eval (n=3–9 per skill), superseded by later evidence |
| `unmeasured` | No objective ground-truth run exists |

**Temporal/Significance Qualifiers:** `pre-edit` / `post-edit`, `directional` / `significant` / `null`, `replicated: false` (no skill-level ELEVATE verdict currently meets the replication gate; individual evidence rows may carry a significant replication signal that does not rescue a failed primary)

---

## Objective Evidence Summary

| Skill | Dataset | N | Placebo → Skill | Δ (pp) | p | Verdict | Provenance |
|-------|---------|---|-----------------|--------|---|---------|------------|
| **scientific-method** | SWE-bench Verified fresh pool (pre-registered larger-N, `2026-07-02`) | 426 | 88.5% → 92.5% | **+4.0** | 0.0005 | **DIRECTIONAL-ONLY** (significant, 19–2 discordant; Δ<5pp preregistered gate — third same-direction result after +5.3 p=0.061 / +8.0 p=0.001 on the old 150-item set) | `OBJ-powered-significant` |
| red-team | Security decisive (CWEs) | 70 | 43% → 44% | +1.4 | 1.0 | NO-LIFT (M5 primary; earlier +5.0 p=0.10 superseded) | `OBJ-powered-null` |
| first-principles | authored constraint | 30 | 93% → 100% | +6.7 | 0.48 | ceiling | `OBJ-small-ceiling` |
| systems | SWE-bench | 150 | 84% → 83% | −1.3 | 0.68 | no effect (was +5.3@n=150) | `OBJ-powered-null` |
| five-whys-plus | SWE-bench Verified fresh slice 1–200 (pre-registered, `2026-07-02`) | 199 | 88.4% → 89.9% | +1.5 | 0.546 | NO-LIFT (confirms n=150 +1.3 p=0.75 and decisive n=224 +0.9 p=0.724) | `OBJ-powered-null` |
| fermi-estimation | jeggers/fermi | 150 | 41% → 41% | +0.7 | 1.0 | flat (rework +7.5@n=40 was noise) | `OBJ-powered-null` |
| map-territory | authored verify | 30 | 97% → 100% | +3.3 | 1.0 | ceiling | `OBJ-small-ceiling` |
| occams-razor | SWE-bench Verified fresh slice 201–400 (pre-registered, `2026-07-02`) | 199 | 87.4% → 87.9% | +0.5 | 1.0 | NO-LIFT (confirms n=150 +2.0 p=0.505 and decisive n=224 −0.9 p=0.724) | `OBJ-powered-null` |
| second-order | consequence + StrategyQA | 70 | 90/85% → 83/85% | −6.7/0 | ns | no effect | `OBJ-powered-null` |
| cynefin | authored classify | 30 | 97% → 100% | +3.3 | 1.0 | ceiling | `OBJ-small-ceiling` |
| theory-of-constraints | authored bottleneck | 30 | 97% → 97% | 0 | 1.0 | ceiling | `OBJ-small-ceiling` |
| reversibility | authored doors | 30 | 100% → 100% | 0 | 1.0 | ceiling | `OBJ-small-ceiling` |
| socratic | authored clarify | 29 | 100% → 93% | −6.9 | 0.48 | ceiling, no benefit | `OBJ-small-ceiling` |
| margin-of-safety | authored provision | 30 | 87% → 77% | −10 | 0.25 | headroom, no benefit | `OBJ-small-negative` |
| circle-of-competence | SelfAware (abstention) | 70 | 70% → 70% | 0 | 0.77 | no calibration benefit | `routing/abstention-null` |
| bayesian | authored base-rate | 40 | 98% → 100% | +2 | 1.0 | ceiling | `OBJ-small-ceiling` |
| debiasing | authored bias | 40 | 100% → 98% | −2 | 1.0 | ceiling | `OBJ-small-ceiling` |
| **M5: red-team (reworked)** | Security decisive (CWEs) | 70 | 43% → 44% | +1.4 | 1.0 | NO-LIFT (post-edit) | `OBJ-powered-null` |
| **M5: five-whys-plus (reworked)** | SWE-bench (150) → FROZEN decisive (224) | 150→224 | 84%→84% (err) → 59%→59% (correct) | 0→+0.9 | 0.752→0.724 | NO-LIFT (corrected, n=224) | `OBJ-powered-null` |
| **M5: systems (reworked)** | SWE-bench | 150 | 83% → 84% | +1.3 | 0.724 | NO-LIFT (post-edit) | `OBJ-powered-null` |
| **M5: occams-razor (reworked)** | SWE-bench (150) → FROZEN decisive (224) | 150→224 | 80%→85% (err) → 55%→56% (correct) | +4.7→-0.9 | 0.096→0.724 | NO-LIFT (full-n=224; was DIRECTIONAL-NOT-REPLICATED — blocker 3 fixed) | `OBJ-powered-null` |
| **M5: map-territory (reworked)** ⚠️ | SWE-bench (150) → FROZEN decisive (224) | 150→224 | 84%→87% (err) → 57%→55% (correct) | +2.7→+2.2 | 0.221→0.074 | NO-LIFT (exploratory, full-n=224) | `OBJ-powered-null` |
| **M5: kepner-tregoe (reworked)** ⚠️ | SWE-bench (150) → FROZEN decisive (224) | 150→224 | 81%→84% (err) → 55%→56% (correct) | +2.7→−1.8 | 0.289→0.289 | NO-LIFT (exploratory, full-n=224) | `OBJ-powered-null` |
| **M5: archetypes (quarantine)** | Systems decisive (binary) | 117 | 72% → 73% | +0.9 | 1.0 | NO-LIFT (post-edit) | `OBJ-powered-null` |

⚠️ **map-territory** and **kepner-tregoe**: Tagged `exploratory: surface-mismatch (powered on fault-localization, not native surface)`. Their eval_family is Debugging/fault-localization (SWE-bench), which MISMATCHES their true value surfaces (routing/discoverability and paired-reasoning quality respectively). A no-lift here is NOT recorded as an honest kill. **FULL-N RESULTS (M5 decisive + hardened runner):** map-territory n=224, +2.2pp p=0.074; kepner-tregoe n=224, -1.8pp p=0.289.

⚠️ **archetypes**: In-band quarantine candidate (aggregate baseline 57.4%) given a fair calibrated chance on the systems-product-strategy-pairwise decisive split. No lift detected.

**M5 powered run (original):** solver `claude-sonnet-4-6`, CONC=4, isolation ON, EVAL_RUN=m5-primary. All 7 results were post-edit but were **powered on the WRONG dataset** (raw 150-item external/swebench.jsonl instead of the FROZEN 224-item decisive split). No skill passed the primary gate (≥5pp + p<0.05), so no replications were triggered from the primary batch.

**M5 decisive-split rerun (FIX):** solver `claude-sonnet-4-6`, CONC=4, isolation ON, EVAL_RUN=m5-primary-decisive. The 4 debugging-family skills (five-whys-plus, occams-razor, kepner-tregoe, map-territory) were rerun on the FROZEN 224-item decisive split. All 4 confirmed NO-LIFT. Dataset provenance now recorded in each result JSON (`dataset_path` + `n` + optional `provenance`). run-swe.js updated to support `SWE_DATASET_PATH` env var (defaults to original 150-item set for backward-compat and scientific-method replication).

**M5 fresh primary (VAL-POWERED-014 FIX):** FRESH post-edit PRIMARY for scientific-method on the ORIGINAL frozen 150-item SWE-bench set. Replaces the stale run1 primary (+9.3pp) whose mtime (Jun 1 03:51) predates the SKILL.md rewrite (Jun 1 06:05, commit 4a176d9). Result (full-n=150): 91% vs 85% placebo, +5.3pp, p=0.061, not significant at p<0.05. EVAL_RUN=m5-primary-sci, solver=claude-sonnet-4-6, CONC=4, isolation ON. Genuinely post-edit. **Primary gate not passed (p=0.061 > 0.05) — ELEVATE downgraded to DIRECTIONAL-NOT-REPLICATED per full-sample scrutiny (fix-m5-full-sample-completion).**
**M5 replication:** FRESH scientific-method replication on the ORIGINAL frozen 150-item SWE-bench set. Result: 90% vs 82% placebo, +8.0pp, p=0.001 — same direction as M5 fresh primary (+5.3pp). Significant replication but does not rescue a primary that fails the paired test.

**Total objectively measured: 19 / 39 skills**  
**Unmeasured (judge-only / thin / leakage-blocked / meta): 20 skills**

---

## Objective Evidence — Skill Detail

### DIRECTIONAL-ONLY (significant lift below the 5pp effect-size gate)

#### `scientific-method` — **DIRECTIONAL-ONLY (pre-registered larger-N, 2026-07-02)**
- **Pre-registered larger-N study (2026-07-02, supersedes the M5 verdict below as the current primary evidence):**
  - **Dataset:** SWE-bench Verified fresh pool (frozen n=427, zero overlap with any prior SWE item on disk; seed 20260702; SHA `1ad90907…`)
  - **N:** 426 scored (1/427 unscored after retries, reported in artifact)
  - **Placebo → Skill:** 88.5% → 92.5%
  - **Δ:** +4.0 pp
  - **McNemar p:** ≈0.0005 (19–2 discordant split, 21 discordant)
  - **Provenance:** `OBJ-powered-significant` | `post-edit` | `significant` | `replicated: false` (ELEVATE gate not met)
  - **Source:** `evals/results/sci-method-larger-n/swe-scientific-method.json`
  - **Note:** EVAL_RUN=sci-method-larger-n, solver=claude-sonnet-4-6 (high), CONC=4, isolation ON. Prereg committed `7b35377` BEFORE any model call; single stopping rule, no interim looks. Verdict rule verbatim: p<0.05 AND Δ<5pp → **DIRECTIONAL-ONLY**. Third same-direction result (+5.3 p=0.061, +8.0 p=0.001, +4.0 p≈0.0005): the lift is real but its best estimate at the largest clean n is ~4pp, below the preregistered 5pp MDE. Not ELEVATE.
- **M5 Fresh Primary (VAL-POWERED-014 fix — replaces stale run1 evidence, full-n=150):**
  - **Dataset:** SWE-bench fault localization (ORIGINAL frozen 150-item set)
  - **N:** 150
  - **Placebo → Skill:** 85% → 91%
  - **Δ:** +5.3 pp
  - **McNemar p:** 0.061
  - **Discordant pairs:** 14
  - **Provenance:** `OBJ-powered-directional` | `post-edit` | `directional` | `replicated: false`
  - **Source:** `evals/results/m5-primary-sci/swe-scientific-method.json`
  - **Note:** EVAL_RUN=m5-primary-sci, solver=claude-sonnet-4-6, CONC=4, isolation ON. Genuinely post-edit. Full-n=150; primary gate not passed (p=0.061 > 0.05). Replaces the stale run1 primary (+9.3pp). **Downgraded from ELEVATE: delta >=5pp but p=0.061 fails the paired-test threshold.**
- **M5 Fresh Replication (independent sample, same frozen 150-item SWE-bench set):**
  - **N:** 150
  - **Placebo → Skill:** 82% → 90%
  - **Δ:** +8.0 pp
  - **McNemar p:** 0.001
  - **Discordant pairs:** 12
  - **Direction:** SAME (positive), concordant with M5 fresh primary (+5.3pp)
  - **Provenance:** `OBJ-powered-significant` | `post-edit` | `significant` | `replicated: false`
  - **Source:** `evals/results/m5-repl/swe-scientific-method.json`
  - **Note:** EVAL_RUN=m5-repl. Significant replication at +8.0pp p=0.001, same direction. However, a successful replication cannot rescue a primary that fails the paired-test gate. Per architecture decision gates, ELEVATE requires BOTH primary pass AND replication pass.
- **Note:** This is the agent-native reworked skill (hypothesis-differential debugging). The original broad `scientific-method` scored 0pp at n=45. The v2 prototype scored +5.3pp p=0.061. Full-n=150 primary: +5.3pp p=0.061 — passes >=5pp threshold but fails p<0.05. Replication +8.0pp p=0.001 is significant but does not rescue the primary gate failure. **Downgraded to DIRECTIONAL-NOT-REPLICATED. No skill currently holds ELEVATE.**

---

### NO-LIFT (powered primary did not pass gate)

#### `red-team` — **NO-LIFT**
- **M5 Primary (decisive split):** Security/adversarial decisive split (70 items, diverse CWE, near-miss safe, distractors)
- **N:** 70
- **Placebo → Skill:** 43% → 44%
- **Δ:** +1.4 pp
- **McNemar p:** 1.0
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Source:** `evals/results/m5-primary/redteam-security-decisive.json`
- **Earlier evidence (superseded by decisive split):**
  - n=80 (DiverseVul balanced): 56% → 68%, +11.3pp, p=0.052 — `superseded`
  - n=200 (DiverseVul balanced): 59% → 64%, +5.0pp, p=0.10 — directional, not sig; `superseded`
- **Note:** The M5 powered primary on harder diverse-CWE decisive split (baseline 43% — in-band headroom) produced +1.4pp, p=1.0 — NO-LIFT. Earlier directional signals on easier diversevul-balanced pool (+11.3pp n=80, +5.0pp n=200) are superseded. The primary did not pass the ≥5pp + p<0.05 gate; therefore this is NO-LIFT, not directional-not-replicated (red-team never passed primary).

---

### Null (powered, no effect)

#### `systems` — **NO-LIFT (did not replicate)**
- **Original powered run (n=150):** 80% → 85%, +5.3pp, p=0.043, 12 discordant — **superseded**
- **Replication (n=150, restored content):** 84% → 83%, −1.3pp, p=0.683
- **M5 powered (n=150):** 83% → 84%, +1.3pp, p=0.724, NO-LIFT
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Sources:** `evals/results/run1/swe-systems-powered.json` (superseded), `evals/results/wavec/swe-systems-restored.json`, `evals/results/m5-primary/swe-systems.json`
- **Stale claim flagged:** Run1 scorecard "ELEVATE" and mid-document ELEVATE-OR-KILL.md "firm ELEVATE" — **both superseded**. The original p=0.043 was borderline noise; replication crossed back to negative.
- **Anti-p-hacking guarantee (VAL-DATASET-009):** Systems was NOT reworked in this mission (no rework spec; SKILL.md edit predates the mission, split frozen 2026-06-06 before the 2026-06-07 result), so its anti-p-hacking guarantee is `split-frozen-before-result` (VAL-DATASET-009 refined two-tier rule), and its NO-LIFT verdict is immune to win-manufacturing.

#### `five-whys-plus` — **NO-LIFT (pre-registered fresh-item confirmation, 2026-07-02)**
- **Pre-registered confirmation (2026-07-02, fresh SWE-bench Verified items, slice 1–200):** 88.4% → 89.9%, +1.5pp, p=0.546, 11 discordant, n=199 (1/200 unscored after retries, reported)
  - **Source:** `evals/results/verdict-five-whys/swe-five-whys-plus.json` — EVAL_RUN=verdict-five-whys, solver=claude-sonnet-4-6 (high), CONC=4, isolation ON; prereg `analysis/PRE-REGISTERED-VERDICT-STUDIES.md` (commit `7b35377`). Slice disjoint from the occams-razor slice.
- **Original powered run (n=150):** 83% → 87%, +4.0pp, p=0.041, 6 discordant — **superseded**
- **Replication (n=150):** 83% → 84%, +1.3pp, p=0.752
- **M5 decisive rerun (n=224, FROZEN split):** 59% → 59%, +0.9pp, p=0.724
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Sources:** `evals/results/run1/swe-five-whys-plus-powered.json` (superseded), `evals/results/wavec/swe-five-whys-plus-replication.json`, `evals/results/m5-primary-decisive/swe-five-whys-plus.json` (M5 decisive, n=224)
- **Stale claim flagged:** Run1 scorecard "ELEVATE" and mid-document ELEVATE-OR-KILL.md "firm ELEVATE" — **both superseded**.
- **Disposition impact:** third consecutive powered null on fresh items → moves from keep-full to **trigger-only candidate** in the consolidation recommendation.

#### `occams-razor` — **NO-LIFT (pre-registered fresh-item confirmation, 2026-07-02)**
- **Pre-registered confirmation (2026-07-02, fresh SWE-bench Verified items, slice 201–400):** 87.4% → 87.9%, +0.5pp, p=1.0, 13 discordant, n=199 (1/200 unscored after retries, reported)
  - **Source:** `evals/results/verdict-occams/swe-occams-razor.json` — EVAL_RUN=verdict-occams, solver=claude-sonnet-4-6 (high), CONC=4, isolation ON; prereg `analysis/PRE-REGISTERED-VERDICT-STUDIES.md` (commit `7b35377`). Slice disjoint from the five-whys-plus slice.
- **Dataset (prior evidence):** SWE-bench fault localization
- **N:** 150 (run1) → 224 (M5 decisive, full-n)
- **Placebo → Skill:** 83% → 85% (run1, +2.0pp) → 56% → 55% (M5 decisive, -0.9pp)
- **McNemar p:** 0.505 (run1) → 0.724 (M5 decisive)
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Sources:** `evals/results/run1/swe-occams-razor-improved.json` (run1, n=150), `evals/results/m5-primary-decisive/swe-occams-razor.json` (M5 decisive, n=224)
- **Note:** M5 primary run on 150-item set gave +4.7pp p=0.096 (directional, not significant — **originally misclassified as DIRECTIONAL-NOT-REPLICATED; corrected to NO-LIFT per blocker 3 fix**). M5 decisive-split rerun on the FROZEN 224-item split, full-n=224: -0.9pp, p=0.724 — a clear NO-LIFT. Trigger-scoped rework did not move needle.
- **Disposition impact:** third consecutive powered null on fresh items → moves from keep-full to **trigger-only candidate** in the consolidation recommendation.

#### `kepner-tregoe` — **NO-LIFT (exploratory — surface-mismatch, full-n=224)**
- **M5 decisive rerun (n=224, FROZEN split):** 55% → 56%, −1.8pp, p=0.289
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Source:** `evals/results/m5-primary-decisive/swe-kepner-tregoe.json`
- **Note:** **EXPLORATORY: surface-mismatch (powered on fault-localization, not native surface).** M5 full-sample (hardened runner) on the FROZEN 224-item debugging-fault-localization-decisive split. 54.5% vs 56.3% placebo, −1.8pp, p=0.289 — NO-LIFT. kepner-tregoe's native value surface is paired-reasoning quality, not fault localization. Prior M5 run on 150-item set (in error) gave +2.7pp p=0.289.

#### `map-territory` — **NO-LIFT (exploratory — surface-mismatch, full-n=224)**
- **M5 decisive rerun (n=224, FROZEN split):** 57% → 55%, +2.2pp, p=0.074
- **Provenance:** `OBJ-powered-null` | `post-edit` | `null` | `replicated: false`
- **Source:** `evals/results/m5-primary-decisive/swe-map-territory.json`
- **Note:** **EXPLORATORY: surface-mismatch (powered on fault-localization, not native surface).** M5 full-sample (hardened runner) on the FROZEN 224-item debugging-fault-localization-decisive split. 57.1% vs 54.9% placebo, +2.2pp, p=0.074 — NO-LIFT. map-territory's native value surface is routing/discoverability, not fault localization. Prior M5 run on 150-item set (in error) gave +2.7pp p=0.221.

---

### Ceiling (placebo 90–100%, no headroom — labeled CEILING, not KILL)

| Skill | Dataset | N | Placebo → Skill | Δ | p | Provenance |
|-------|---------|---|-----------------|---|---|------------|
| `first-principles` | authored constraint | 30 | 93% → 100% | +6.7 | 0.48 | `OBJ-small-ceiling` |
| `map-territory` | authored verify | 30 | 97% → 100% | +3.3 | 1.0 | `OBJ-small-ceiling` |
| `cynefin` | authored classify | 30 | 97% → 100% | +3.3 | 1.0 | `OBJ-small-ceiling` |
| `theory-of-constraints` | authored bottleneck | 30 | 97% → 97% | 0 | 1.0 | `OBJ-small-ceiling` |
| `reversibility` | authored doors | 30 | 100% → 100% | 0 | 1.0 | `OBJ-small-ceiling` |
| `bayesian` | authored base-rate | 40 | 98% → 100% | +2 | 1.0 | `OBJ-small-ceiling` |
| `debiasing` | authored bias | 40 | 100% → 98% | −2 | 1.0 | `OBJ-small-ceiling` |
| `socratic` | authored clarify | 29 | 100% → 93% | −6.9 | 0.48 | `OBJ-small-ceiling` |

**Note:** Ceiling means the model already solves these items without the skill. A real headroom test needs borderline (30–70%) items. These are **not** kill verdicts.

---

### Negative / No Headroom

| Skill | Dataset | N | Placebo → Skill | Δ | p | Provenance |
|-------|---------|---|-----------------|---|---|------------|
| `fermi-estimation` | jeggers/fermi | 150 | 41% → 41% | +0.7 | 1.0 | `OBJ-powered-null` |
| `margin-of-safety` | authored provision | 30 | 87% → 77% | −10 | 0.25 | `OBJ-small-negative` |

**Note on fermi-estimation:** Original n=40 showed −5pp. A rework prototype gave +7.5pp p=0.371 (n=40). The powered n=150 confirmation collapsed to +0.7pp p=1.0 — the rework "rescue" was n=40 noise.

---

### Routing / Abstention (null)

| Skill | Dataset | N | Metric | Result | Provenance |
|-------|---------|---|--------|--------|------------|
| `circle-of-competence` | SelfAware balanced | 70 | abstention accuracy | 70% → 70%, p=0.77 | `routing/abstention-null` |

---

## Judge-Based Behavioral Evidence (Tier 3, length-controlled, n=3–9/skill)

**Source:** `evals/results/run1/tier3-behavioral.json` (solver: claude-sonnet-4-6, judge: gemini-3.1-pro-preview)

**All judge-based claims carry provenance `judge-only-n3-superseded`** — these are small-N (n=3 per skill in pooled, n=9 in pairwise), pre-isolation results that are **superseded by later objective evidence where available**. They are retained for historical context, not as current verdicts.

| Skill | Win-rate | Lift | Run1 Verdict | Status |
|-------|----------|------|--------------|--------|
| `archetypes` | 67% | +1 | proven | superseded |
| `bayesian` | 50% | 0 | unproven-tie | superseded (ceiling) |
| `bounded-rationality` | 67% | +1 | proven | superseded |
| `circle-of-competence` | 67% | +1 | proven | superseded (Tier 1 flagged misleading) |
| `cynefin` | 67% | +1 | proven | superseded (ceiling) |
| `debiasing` | 0% | −3 | regresses | superseded (ceiling) |
| `dual-process` | 100% | +3 | proven | superseded |
| `effectuation` | 67% | +1 | proven | superseded |
| `fermi-estimation` | 67% | +1 | proven | superseded (powered null) |
| `first-principles` | 100% | +3 | proven | superseded (ceiling) |
| `five-whys-plus` | 33% | −1 | regresses | superseded (powered null) |
| `inversion` | 33% | −1 | regresses | superseded |
| `jobs-to-be-done` | 33% | −1 | regresses | superseded |
| `kepner-tregoe` | 67% | +1 | proven | superseded |
| `leverage-points` | 33% | −1 | regresses | superseded |
| `lindy-effect` | 33% | −1 | regresses | superseded |
| `map-territory` | 67% | +1 | proven | superseded (ceiling) |
| `margin-of-safety` | 50% | 0 | unproven-tie | superseded (powered negative) |
| `model-combination` | — | — | — | unmeasured |
| `model-router` | — | — | — | unmeasured |
| `model-selection` | — | — | — | unmeasured |
| `occams-razor` | 33% | −1 | regresses | superseded (powered directional) |
| `ooda` | 67% | +1 | proven | superseded |
| `opportunity-cost` | 33% | −1 | regresses | superseded |
| `pre-mortem` | 100% | +3 | proven | superseded |
| `probabilistic` | 67% | +1 | proven | superseded |
| `red-team` | 67% | +1 | proven | superseded (powered null, M5 no-lift) |
| `regret-minimization` | 0% | −3 | regresses | superseded |
| `reversibility` | 67% | +1 | proven | superseded (ceiling) |
| `scientific-method` | 67% | +1 | proven | superseded (directional-not-replicated) |
| `second-order` | 67% | +1 | proven | superseded (powered null) |
| `socratic` | 67% | +1 | proven | superseded (ceiling, Tier 1 flagged) |
| `steel-manning` | 67% | +1 | proven | superseded |
| `systems` | 33% | −1 | regresses | superseded (powered null) |
| `theory-of-constraints` | 100% | +3 | proven | superseded (ceiling) |
| `thought-experiment` | 100% | +3 | proven | superseded |
| `triz` | 0% | −3 | regresses | superseded |
| `via-negativa` | 67% | +1 | proven | superseded |

**Stale run1 claims:** The run1 `scorecard.md` table (n=3 wins per skill, mean win-rate 56%, "proven 22/36") is **statistically void** (3/3 has p=0.25) and **superseded**. All `judge-only-n3-superseded` entries above are retained for history but do not represent current evidence.

---

## Mid-Document ELEVATE-OR-KILL.md Narrative — Superseded Claims

The middle narrative sections of `analysis/ELEVATE-OR-KILL.md` contain the following **overturned claims**, now flagged `superseded`:

1. **"First significant verdict — thinking-systems = ELEVATE"** (+5.3pp p=0.043) → **Superseded**: replication gave −1.3pp p=0.683
2. **"Phase 7 answer — systems +5.3pp, five-whys-plus +4.0pp both firm ELEVATE"** → **Superseded**: neither replicated
3. **"Trimming regression lesson"** (systems +5.3→+3.3, five-whys +4.0→+3.3) → **Superseded**: replication shows both original and trimmed were noise draws from near-zero distribution
4. **"fermi-estimation rework rescued"** (+7.5pp p=0.371) → **Superseded**: powered n=150 gave +0.7pp p=1.0
5. **"Red-team +11.3pp p=0.052 strong ELEVATE-leaning"** → **Downgraded**: n=200 confirmation gave +5.0pp p=0.10 (directional only)
6. **39→26 consolidation map** → **Deferred by decision**; not actioned

**Only the final two sections of ELEVATE-OR-KILL.md are current.**

---

## SKILL-AUDIT.md Dispositions — Superseded Where Invalidated

| Skill | Audit Disposition | Status |
|-------|-------------------|--------|
| `systems` | KEEP-FULL + refocus to debugging hub | **Superseded** — no robust effect |
| `five-whys-plus` | KEEP; restore trimmed content | **Superseded** — no robust effect |
| `fermi-estimation` | KILL/REWORK | **Superseded** — powered null confirms kill |
| `red-team` | KEEP-FULL, narrow to security | **Downgraded** — directional only |
| `circle-of-competence` | REWORK → abstention | **Confirmed** — powered null |
| `debiasing` | KILL / trigger-only | **Confirmed** — ceiling |
| `bayesian` | MERGE → probabilistic | **Confirmed** — ceiling |

---

## Unmeasured Skills (20) — No Objective Ground Truth

| Group | Skills | Reason |
|-------|--------|--------|
| **Pairwise (T3 authored, not run objectively)** | `inversion`, `pre-mortem`, `triz`, `thought-experiment`, `jobs-to-be-done`, `effectuation`, `lindy-effect`, `leverage-points`, `feedback-loops`, `opportunity-cost`, `via-negativa`, `regret-minimization`, `steel-manning` | No clean objective formulation; judge-only |
| **Thin / hard-to-objectify** | `ooda`, `bounded-rationality`, `dual-process` | T3 n=3; resist objective framing |
| **Leakage-blocked** | `probabilistic` | Forecasting items resolve pre-cutoff |
| **Meta (routing only)** | `model-router`, `model-selection`, `model-combination` | T2 routing-cases only; need routing-accuracy eval |

---

## Verdict Summary (All 39 Skills)

| Skill | Objective Verdict | Judge Verdict (superseded) | Final Status |
|-------|-------------------|----------------------------|--------------|
| `archetypes` | null (powered, M5) | proven | no-lift |
| `bayesian` | ceiling | unproven-tie | ceiling |
| `bounded-rationality` | unmeasured | proven | unmeasured |
| `circle-of-competence` | routing/abstention-null | proven | no calibration benefit |
| `cynefin` | ceiling | proven | ceiling |
| `debiasing` | ceiling | regresses | ceiling |
| `dual-process` | unmeasured | proven | unmeasured |
| `effectuation` | unmeasured | proven | unmeasured |
| `feedback-loops` | unmeasured | regresses | unmeasured |
| `fermi-estimation` | null (powered) | proven | no-lift |
| `first-principles` | ceiling | proven | ceiling |
| `five-whys-plus` | null (powered, decisive n=224) | regresses | no-lift |
| `inversion` | unmeasured | regresses | unmeasured |
| `jobs-to-be-done` | unmeasured | regresses | unmeasured |
| `kepner-tregoe` | null (powered, decisive n=224, exploratory) | proven | no-lift (exploratory) |
| `leverage-points` | unmeasured | regresses | unmeasured |
| `lindy-effect` | unmeasured | regresses | unmeasured |
| `map-territory` | null (powered, decisive n=224, exploratory) | proven | no-lift (exploratory) |
| `margin-of-safety` | negative (small-N) | unproven-tie | headroom, no benefit |
| `model-combination` | unmeasured | — | unmeasured |
| `model-router` | unmeasured | — | unmeasured |
| `model-selection` | unmeasured | — | unmeasured |
| `occams-razor` | null (powered, decisive n=224) | regresses | no-lift |
| `ooda` | unmeasured | proven | unmeasured |
| `opportunity-cost` | unmeasured | regresses | unmeasured |
| `pre-mortem` | unmeasured | proven | unmeasured |
| `probabilistic` | unmeasured | proven | unmeasured |
| `red-team` | null (powered, M5 decisive) | proven | no-lift |
| `regret-minimization` | unmeasured | regresses | unmeasured |
| `reversibility` | ceiling | proven | ceiling |
| `scientific-method` | directional-not-replicated (full-n=150 primary: +5.3pp p=0.061) | proven | directional-not-replicated |
| `second-order` | null (powered) | proven | no effect |
| `socratic` | ceiling | proven | ceiling |
| `steel-manning` | unmeasured | proven | unmeasured |
| `systems` | null (powered) | regresses | no-lift |
| `theory-of-constraints` | ceiling | proven | ceiling |
| `thought-experiment` | unmeasured | proven | unmeasured |
| `triz` | unmeasured | regresses | unmeasured |
| `via-negativa` | unmeasured | proven | unmeasured |

---

## Dispositions (Cross-Cutting — Not Mutually-Exclusive Verdicts)

Dispositions are orthogonal to measured verdicts. A skill can carry both a measured verdict (e.g., NO-LIFT, CEILING, UNMEASURED) and a cross-cutting disposition (QUARANTINE-REDIRECT or TRIGGER-ONLY). Dispositions encode the mission's strategic recommendation; they do NOT replace or contradict the measured verdict.

| Skill | Disposition | Redirect Target | Measured Verdict |
|-------|-------------|-----------------|------------------|
| `bayesian` | QUARANTINE-REDIRECT | `probabilistic` | ceiling |
| `model-selection` | QUARANTINE-REDIRECT | `model-router` | unmeasured |
| `inversion` | QUARANTINE-REDIRECT | `pre-mortem` | unmeasured |
| `feedback-loops` | QUARANTINE-REDIRECT | `systems` | unmeasured |
| `archetypes` | QUARANTINE-REDIRECT | `systems` / `leverage-points` | no-lift |
| `regret-minimization` | QUARANTINE-REDIRECT | `reversibility` | unmeasured |
| `fermi-estimation` | QUARANTINE-REDIRECT | — (none) | no-lift |
| `debiasing` | QUARANTINE-REDIRECT | — (none) | ceiling |
| `dual-process` | QUARANTINE-REDIRECT | — (none) | unmeasured |

---

## Reconciliation: Stale Claims Exceptions (Stale Claims Explicitly Flagged)

| Stale Claim | Source | Superseded By | Flag |
|-------------|--------|---------------|------|
| "run1 scorecard: 22/36 proven, mean win-rate 56%" | `evals/results/run1/scorecard.md` | Powered objective runs + isolation | `judge-only-n3-superseded` |
| "systems +5.3pp p=0.043 = firm ELEVATE" | `analysis/ELEVATE-OR-KILL.md` (mid) | Replication n=150: −1.3pp p=0.683 | `superseded` |
| "five-whys-plus +4.0pp p=0.041 = firm ELEVATE" | `analysis/ELEVATE-OR-KILL.md` (mid) | Replication n=150: +1.3pp p=0.752 | `superseded` |
| "red-team +11.3pp p=0.052 = strong ELEVATE-leaning" | `analysis/ELEVATE-OR-KILL.md` (mid) | Confirmation n=200: +5.0pp p=0.10 | `superseded` |
| "fermi rework +7.5pp p=0.371 = rescued" | `analysis/ELEVATE-OR-KILL.md` (mid) | Powered n=150: +0.7pp p=1.0 | `superseded` |
| "trimming caused regression on systems/five-whys" | `analysis/ELEVATE-OR-KILL.md` (mid) | Both original and trimmed were noise | `superseded` |
| "39→26 consolidation map" | `analysis/SKILL-AUDIT.md` | Deferred by decision | `superseded` |

---

## Validation Checklist

- [x] **39 skills exactly** — matches `skills/thinking-*` directory slugs (count verified)
- [x] **Every evidence cell has provenance tag** — from allowed taxonomy only
- [x] **Objective vs Judge evidence separated** — distinct `objective_evidence` / `judge_evidence` fields
- [x] **Ceiling labeled as ceiling, not kill** — 8 skills at ceiling
- [x] **scientific-method downgraded to DIRECTIONAL-NOT-REPLICATED** — full-n=150 fresh primary 85→91%, +5.3pp p=0.061 (m5-primary-sci) fails p<0.05 gate despite >=5pp; replication 82→90%, +8.0pp p=0.001 (m5-repl) is significant same-direction but cannot rescue primary gate failure. No skill currently holds ELEVATE.
- [x] **Collapsed leads as null/directional** — systems, five-whys-plus, red-team, fermi-estimation
- [x] **Stale claims flagged superseded, not deleted** — run1 scorecard, mid-document ELEVATE-OR-KILL.md, SKILL-AUDIT.md
- [x] **JSON and MD mutually consistent** — same skills, same verdicts, same numbers
- [x] **Objective coverage: 19 measured / 20 unmeasured (19 of 39)** — consistent with the 19/39 figure above
- [x] **No skill directory deleted** — `skills/` still has 39 dirs
- [x] **No scientific-method-v2** — replaced in-place, no v2 directory
- [x] **Full-n sample completeness (M5 scrutiny round-2 fix)** — run-swe.js hardened with retry+per-item persistence; all 4 decisive-split results at n=224; scientific-method primary at n=150
- [x] **scientific-method re-evaluated at full-n=150** — +5.3pp p=0.061 fails p<0.05; ELEVATE downgraded to DIRECTIONAL-NOT-REPLICATED

---

*This scorecard is the canonical single source of truth for M1. All downstream milestones (contracts, calibration, powered runs, synthesis) reference this document.*
