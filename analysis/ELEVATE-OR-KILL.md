# Elevate-or-Kill — synthesis & current verdicts

> **✅ 2026-07-02 UPDATE — pre-registered verdict studies (see `analysis/PRE-REGISTERED-VERDICT-STUDIES.md`, commit `7b35377`):**
> - **`scientific-method` → DIRECTIONAL-ONLY.** Larger-N study on a fresh frozen SWE-bench Verified pool: n=426, 88.5%→92.5%, **+4.0pp, McNemar p≈0.0005 (19–2 discordant)** — statistically robust, third same-direction result, but Δ<5pp preregistered gate. Not ELEVATE. Artifact: `evals/results/sci-method-larger-n/swe-scientific-method.json`.
> - **`five-whys-plus` → NO-LIFT confirmed** on fresh Verified items (n=199, +1.5pp, p=0.546). Artifact: `evals/results/verdict-five-whys/swe-five-whys-plus.json`.
> - **`occams-razor` → NO-LIFT confirmed** on fresh Verified items (n=199, +0.5pp, p=1.0). Artifact: `evals/results/verdict-occams/swe-occams-razor.json`.
> - Every `DIRECTIONAL-NOT-REPLICATED` reference to scientific-method below is superseded by DIRECTIONAL-ONLY (significant, sub-5pp). ZERO skills hold ELEVATE. Canonical rows: `ELEVATE-OR-KILL-SCORECARD.{json,md}`.

Ties the per-skill protocol (`PER-SKILL-EVAL-PROTOCOL.md`) to what we've actually measured this session. At the time of writing, most skills were **PENDING** a powered run (protocol + dataset ready); a subset had directional evidence from the isolated harness.

## Current evidence (isolated, length-controlled) [SUPERSEDED — historical pre-M5 exploration log; canonical verdicts in ELEVATE-OR-KILL-SCORECARD.{json,md}]
- [SUPERSEDED] **In-domain pooled, 10 skills** (second-order, inversion, opportunity-cost, theory-of-constraints, systems, pre-mortem, via-negativa, occams-razor, first-principles, debiasing): **63% beat placebo, n=90, p=0.015 SIGNIFICANT** → these collectively **ELEVATE**, but per-skill is directional (n≈9 each) — needs ≥20–40/skill to assign individual verdicts. [SUPERSEDED — canonical: pooled finding never replicated at per-skill level; mission outcome ZERO robust-ELEVATE]
- [SUPERSEDED] **Trigger-vs-full (L1)** on conceptual skills (occams-razor, five-whys-plus, inversion, systems): trigger ≈/> full guide, p=0.046 → **TRIGGER-ONLY leaning** for these (ship the lean version).
- [SUPERSEDED] **Stacking** (first-principles+second-order+red-team): beats placebo 78% (p=0.074), beats single 72% (p=0.22) → directional synergy.
- [SUPERSEDED] **bayesian out-of-domain** (medical MCQ): negative — **NOT a kill** (domain mismatch; no skill claims medicine).

## Per-skill verdict status [SUPERSEDED — historical pre-M5 exploration log; canonical verdicts in ELEVATE-OR-KILL-SCORECARD.{json,md}]
| Skill | Current lean | Next step (from protocol) |
|---|---|---|
| second-order, inversion, opportunity-cost, theory-of-constraints, systems, pre-mortem, via-negativa, first-principles | [SUPERSEDED] ELEVATE-leaning (in pooled 63% set) | per-skill powered run (≥25 problems) to confirm |
| occams-razor, five-whys-plus | [SUPERSEDED] ELEVATE but **TRIGGER-ONLY** leaning | trigger-vs-full at N≥40 on ddxplus/OpenRCA / SWE-bench |
| **debiasing** | [SUPERSEDED] **INCONCLUSIVE-ceiling** (RAN) | placebo 100% (no headroom), skill 98% — redundant at textbook difficulty; re-test harder |
| red-team | [SUPERSEDED] PENDING | balanced vuln/safe (DiverseVul train negatives or CIRCL patches), N≥200 |
| **fermi-estimation** | [SUPERSEDED] **KILL/REWORK** (RAN) | 38% vs 43% placebo, trigger=43%, p=0.72, n=40 — no lift on `jeggers/fermi` |
| **bayesian** | [SUPERSEDED] **INCONCLUSIVE-ceiling** (RAN) | placebo 98% (no headroom), skill 100% — redundant on textbook base-rate; re-test harder/embedded |
| probabilistic | [SUPERSEDED] PENDING | `forecasting` (post-cutoff filter for leakage) |
| dual-process | [SUPERSEDED] PENDING; TRIGGER-ONLY likely | BBQ / GSM8K override-traps, N≥50 |
| scientific-method, kepner-tregoe(PA) | [SUPERSEDED] PENDING (correctness) | SWE-bench_Lite / OpenRCA, N≥60 |
| circle-of-competence | [SUPERSEDED] PENDING (routing) | `selfAware` (downloaded) — needs abstention runner |
| socratic, bounded-rationality, map-territory, margin-of-safety, ooda, cynefin | [SUPERSEDED] PENDING (routing) | ClariQ / authored — needs routing-on-data runner |
| steel-manning, feedback-loops, archetypes, leverage-points, triz, thought-experiment, lindy-effect, jobs-to-be-done, effectuation, reversibility, regret-minimization | [SUPERSEDED] PENDING (pairwise) | authored in-domain sets (+ ibm/argument_quality, CRASS) |
| model-router, model-selection, model-combination | [SUPERSEDED] PENDING (routing) | OUR catalog + labeled prompts; model-selection must beat router-alone or **MERGE** |

## What's needed to finish all 39 (staged Phase 4)
Two small harness additions enable the remaining modes: **(a) a numeric/OOM + Brier scorer** in `run-correctness.js` (unlocks bayesian/probabilistic/fermi), and **(b) an abstention/routing-on-external-data runner** (unlocks circle-of-competence/socratic/map-territory/bounded-rationality/cynefin/ooda). Pairwise skills need authored in-domain sets (~25 each). Then run each per the protocol's N targets. Estimated ~6–8k model calls for the full powered sweep → run as a background batch per eval-mode group.

## Datasets downloaded this session (`evals/datasets/external/`)
`diversevul.jsonl` (400 vuln functions — red-team; **note: test split all-positive, need negatives**), `selfaware.jsonl` (60 — circle-of-competence abstention), plus `financial`, `medical` (120 MCQ), `legal`, `glm-distractor`. Verified-but-not-yet-downloaded ids are listed per skill in the protocol (StrategyQA does not serve via the HF rows API).

## Phase-4 correctness results (RAN, isolated, judge-bias-free) [SUPERSEDED — historical pre-M5 exploration; n=40 directional only]
| Skill | Dataset | placebo | skill | Δ | p (McNemar) | n | Verdict |
|---|---|---|---|---|---|---|---|
| fermi-estimation | jeggers/fermi | 43% | 38% | −5 | 0.72 | 40 | [SUPERSEDED] KILL/REWORK (headroom, no lift) |
| occams-razor | MedReason dx (proxy) | 40% | 45% | +5 | 0.62 | 40 | [SUPERSEDED] ELEVATE-leaning (ns) |
| scientific-method | MedReason dx (proxy) | 48% | 43% | −5 | 0.62 | 40 | [SUPERSEDED] KILL/REWORK-leaning (ns) |
| debiasing | authored bias MCQ | 100% | 98% | −2 | 1.0 | 40 | [SUPERSEDED] INCONCLUSIVE-ceiling |
| bayesian | authored base-rate MCQ | 98% | 100% | +2 | 1.0 | 40 | [SUPERSEDED] INCONCLUSIVE-ceiling |
| debiasing (haiku) | authored | 100% | 100% | 0 | 1.0 | 40 | [SUPERSEDED] ceiling persists |
| bayesian (haiku) | authored | 100% | 100% | 0 | 1.0 | 40 | [SUPERSEDED] ceiling persists |

### Cross-cutting conclusion (objective correctness) [SUPERSEDED — historical pre-M5 exploration]
[SUPERSEDED] **No skill shows a significant objective-correctness lift.** Where there is headroom, deltas are noise-level (±5pp, p≈0.6); where there isn't, the targeted failure mode is already solved (ceiling, even on haiku). This **converges with the in-domain pairwise result** (modest, significant 63% lift on *open-ended reasoning quality*, p=0.015): the skills add a little to how a model *reasons through open problems*, but **do not improve accuracy on objective single-answer tasks**. Net: the collection's value is in reasoning *process/framing* on open work, not in correctness on solvable tasks — and even that is partly trigger-replaceable.

### Honest limits / remaining (staged)
- All correctness verdicts are n=40 → directional. Significance needs ~150–200/skill.
- occams/scientific-method ran in a **proxy domain** (medical dx), not native software → a SWE-bench run (native debugging) is the definitive test for scientific-method/five-whys/systems/occams.
- Pairwise group (17 skills) still needs authored in-domain sets at ≥25/skill for per-skill verdicts.

## NATIVE-domain debugging (SWE-bench_Lite fault localization, isolated, n=45) [SUPERSEDED — historical pre-M5 exploration; n=45 directional only; systems/five-whys-plus later failed replication]
| Skill | placebo | skill | Δ | p | Verdict |
|---|---|---|---|---|---|
| systems | 80% | 89% | +8.9 | 0.22 | [SUPERSEDED] ELEVATE-leaning (ns) — canonical: NO-LIFT |
| five-whys-plus | 82% | 89% | +6.7 | 0.25 | [SUPERSEDED] ELEVATE-leaning (ns) — canonical: NO-LIFT |
| occams-razor | 84% | 89% | +4.4 | 0.62 | [SUPERSEDED] ELEVATE-leaning (ns) |
| scientific-method | 84% | 84% | 0 | 1.0 | [SUPERSEDED] no effect / REWORK — canonical: DIRECTIONAL-NOT-REPLICATED |

### Updated conclusion (domain-fit determines the sign) [SUPERSEDED — historical pre-M5 exploration]
[SUPERSEDED] The native-domain run **nuances the earlier "no objective lift" finding**: in their TRUE domain (software debugging), 3/4 debugging skills show a **consistent small positive lift (+4 to +9pp)** — vs the medical *proxy* where the same `scientific-method` went −5pp. So **domain-fit, not the skill alone, determines whether it helps.** Caveats: (1) placebo is high (80–84%) → partial ceiling caps the effect; (2) n=45 → few discordant pairs → none significant; `systems` (+8.9pp) is the strongest and the best candidate for a powered (~150–300 issue) confirmation. (3) `scientific-method` is flat even in-domain → REWORK candidate.

[SUPERSEDED — canonical: ZERO robust-ELEVATE; scientific-method=DIRECTIONAL-NOT-REPLICATED; systems/five-whys-plus=NO-LIFT] **Synthesis across all Phase-4 evidence:** the thinking skills add (a) a modest *significant* lift on **open-ended in-domain reasoning** (pairwise 63%, p=0.015), (b) a *consistent directional* lift on **objective native-domain debugging** (+4–9pp, ns at n=45), and (c) **nothing** out-of-domain or where the model is already at ceiling. The value is real but small and **entirely conditional on domain-fit** — supporting situation-named descriptions, trigger-only delivery for redundant skills, and rework/kill for the consistently-flat ones (`scientific-method`, `fermi-estimation`).

> **⚠️ SUPERSEDED NARRATIVE — 2026-06-07 (M5/M6 scrutiny round-1)**
> The canonical scorecard (`analysis/ELEVATE-OR-KILL-SCORECARD.json`) is AUTHORITATIVE for ALL verdicts and supersedes ALL conflicting claims anywhere in this document — including any robust-ELEVATE assertions in the supposedly-current final sections (★ Wave C and ★★★★★).
>
> **EVERY section of this document is superseded wherever it asserts robust-ELEVATE for ANY skill** (including `scientific-method`, `systems`, `five-whys-plus`, `red-team`). The M5 evidence conclusively established:
> - **ZERO skills achieved robust-ELEVATE** (mission outcome)
> - **`scientific-method` is DIRECTIONAL-NOT-REPLICATED** (M5 fresh primary +5.3pp p=0.061 post-edit directional — fails p<0.05 gate; replication +8.0pp p=0.001 post-edit significant cannot rescue). The claim "scientific-method is the only skill with a robust, significant, replicated objective lift (+9.3pp, p=0.002)" in sections ★★★★ and ★★★★★ is **SUPERSEDED** — that +9.3pp was the old run1 primary (pre-edit, superseded). The M5 fresh post-edit primary (+5.3pp p=0.061) failed the gate.
> - **`red-team` is NO-LIFT** (M5 powered primary +1.4pp p=1.0 on harder CWE decisive split; earlier +5.0pp p=0.10 on diversevul also fails gate)
> - **`systems` and `five-whys-plus` did not replicate** (NO-LIFT)
>
> These sections are retained for historical provenance only. The CURRENT verdicts are documented in `analysis/ELEVATE-OR-KILL-SCORECARD.{json,md}`. See `analysis/STALE-CLAIM-CLEANUP.md` for the full cleanup notes.
>
> Key overturned claims below: `systems` +5.3pp p=0.043 was not replicated (−1.3pp p=0.683); `five-whys-plus` +4.0pp p=0.041 was not replicated (+1.3pp p=0.752); the "trimming regression" lesson is retracted (both original and trimmed were noise draws); `scientific-method` +9.3pp p=0.002 was the old run1 primary (superseded by M5 fresh primary +5.3pp p=0.061 — DIRECTIONAL-NOT-REPLICATED); `red-team` +11.3pp p=0.052 was not confirmed (+5.0pp p=0.10, then +1.4pp p=1.0 on harder split — NO-LIFT).

[SUPERSEDED] ## ★ FIRST SIGNIFICANT VERDICT — thinking-systems = ELEVATE [SUPERSEDED — canonical: systems=NO-LIFT; did not replicate on fresh sample]
[SUPERSEDED] Powered SWE-bench fault localization, n=150, isolated, length-controlled:
[SUPERSEDED] **placebo 80% → skill 85%, Δ+5.3pp, McNemar p=0.043 (SIGNIFICANT).** 12 discordant pairs. [SUPERSEDED — canonical: this +5.3pp p=0.043 did NOT replicate (−1.3pp p=0.683 on fresh n=150); systems=NO-LIFT]
[SUPERSEDED] `thinking-systems` was at the time the first skill to clear the elevate bar with a real, judge-bias-free, native-domain effect. The lift appeared **modest (+5pp) but genuine** — and it required domain-fit (software debugging) + adequate power (n=150) to surface; at n=45 it was directional-only. [SUPERSEDED — canonical: this +5.3pp did NOT replicate (−1.3pp p=0.683 on fresh n=150); systems=NO-LIFT]

### Final elevate-or-kill posture (evidence to date) [SUPERSEDED — historical pre-M5 posture; canonical: ZERO robust-ELEVATE]
- [SUPERSEDED] **ELEVATE (firm):** `systems` (+5.3pp, p=0.043, native debugging). [SUPERSEDED — canonical: systems=NO-LIFT, five-whys-plus=NO-LIFT, scientific-method=DIRECTIONAL-NOT-REPLICATED]
- [SUPERSEDED] **ELEVATE-leaning (directional, needs power):** `five-whys-plus`, `occams-razor` (native debugging +4–7pp, ns).
- [SUPERSEDED] **KILL/REWORK:** `fermi-estimation` (−5pp w/ headroom), `scientific-method` (flat in-domain AND negative in proxy).
- [SUPERSEDED] **REDUNDANT at current capability (ceiling):** `debiasing`, `bayesian` (LLMs already debiased/Bayesian on standard framings — even haiku).
- [SUPERSEDED] **TRIGGER-ONLY leaning:** `occams-razor`, `five-whys-plus` (trigger ≈ full guide in earlier probe).
- [SUPERSEDED] **ELEVATE-leaning (open reasoning):** the 10-skill in-domain pairwise pool (63%, p=0.015) — per-skill still directional.
- [SUPERSEDED] **Remaining 20+ skills:** protocol + datasets ready; staged powered runs.

[SUPERSEDED — canonical: ZERO robust-ELEVATE; systems=NO-LIFT; scientific-method=DIRECTIONAL-NOT-REPLICATED] **The one-line takeaway:** thinking skills were historically thought to produce a real but small lift, *strictly conditional on domain-fit, headroom, and power* — initially suggested by `systems` clearing significance when all three aligned, but that result did NOT replicate. The methodology now reliably distinguishes elevate / kill / redundant / trigger-only.

## ★★ Phase 7 — "Can we get +5 on the other skills?" — ANSWERED
SWE-bench fault localization, isolated, length-controlled, n=150:
| Skill | placebo→skill | Δ | p | Outcome |
|---|---|---|---|---|
| systems | 80→85% | +5.3 | **0.043** | ELEVATE (firm) [SUPERSEDED — canonical: systems=NO-LIFT] |
| five-whys-plus | 83→87% | +4.0 | **0.041** | ELEVATE (firm) [SUPERSEDED — canonical: five-whys-plus=NO-LIFT] |
| occams-razor | 83→85% | +2.0 | 0.45 | NOT confirmed (n=45 +4.4 was noise) |
| **scientific-method (old broad version)** | — | **+0** | — | flat |
| **scientific-method rework prototype** | 84→89% | **+5.3** | 0.061 | near-sig — **rework converted 0 → +5** |

### Answer [SUPERSEDED — historical pre-M5; canonical: ZERO robust-ELEVATE]
[SUPERSEDED] **Yes — but only two ways, and not for every skill:**
1. [SUPERSEDED] **Confirm it where domain-fit + headroom already exist.** `systems` and `five-whys-plus` were at the time *firm significant ELEVATEs* (+4–5pp) in native debugging [SUPERSEDED — canonical: systems=NO-LIFT, five-whys-plus=NO-LIFT, scientific-method=DIRECTIONAL-NOT-REPLICATED]. `occams-razor` is NOT (regressed to +2pp ns — it was n=45 noise).
2. [SUPERSEDED] **Engineer it by reworking the skill** per the audit best-practices (agent-native, narrowed domain, evidence-ranked procedure, drop human stage-directions, add boundaries). The hypothesis-differential prototype went **0pp → +5.3pp (p=0.061)**, then replaced the shipped `thinking-scientific-method` and improved further to **+9.3pp (p=0.002)** [SUPERSEDED — canonical: scientific-method=DIRECTIONAL-NOT-REPLICATED; the +9.3pp was pre-edit run1 primary, not post-edit M5].

[SUPERSEDED] **Where +5 is NOT available:** redundant-at-ceiling skills (`debiasing`, `bayesian` — model already ~100%), measured-negative skills (`fermi`), and any skill applied out-of-domain. For those, the move is kill/merge/trigger-only, not "+5."

[SUPERSEDED — canonical: ZERO robust-ELEVATE; the +5 did NOT replicate] **Takeaway:** the +5 was historically thought to be real, sparse, and *manufacturable* — reworking a skill to the best-practices spec appeared to turn a flat skill into a measurable lift, seemingly demonstrated end-to-end on `scientific-method`, but the M5 fresh primary (+5.3pp p=0.061) failed the paired-test gate and the replication (+8.0pp p=0.001) cannot rescue it; scientific-method is DIRECTIONAL-NOT-REPLICATED.

[SUPERSEDED] ## ★★★ Post-improvement verification (improve → re-measure loop) [SUPERSEDED — historical pre-M5 exploration; all +9.3pp claims are pre-edit run1 data]
[SUPERSEDED] After applying the audit best-practices to all 39 skills, re-ran the **entire debugging cluster** on SWE-bench (n=150, isolated, length-controlled). This closes the improve→re-measure loop for every skill that has a native objective eval:
| Skill | pre-improvement | post-improvement | read |
|---|---|---|---|
| **scientific-method** (hypothesis-differential replacement) | 0pp (flat) | **+9.3pp, p=0.002 SIG** | [SUPERSEDED — canonical: scientific-method=DIRECTIONAL-NOT-REPLICATED] rework WORKED — flat→firm ELEVATE (historical pre-edit run1 data; M5 fresh post-edit primary +5.3pp p=0.061 FAILED gate) |
| **systems** (trimmed) | +5.3pp, p=0.043 SIG | +3.3pp, p=0.182 ns | [SUPERSEDED] within-noise dip after trimming — canonical: NO-LIFT; the "trimming regression" lesson was later retracted (both were noise draws) |
| **five-whys-plus** (trimmed) | +4.0pp, p=0.041 SIG | +3.3pp, p=0.131 ns | [SUPERSEDED] within-noise dip after trimming — canonical: NO-LIFT; the "trimming regression" lesson was later retracted |
| **occams-razor** (trigger-scoped) | +2.0pp, p=0.45 ns | +2.0pp, p=0.505 ns | [SUPERSEDED] flat both ways — never confirmed, TRIGGER-ONLY stands |

[SUPERSEDED] **Three lessons, all evidence-backed:**
1. [SUPERSEDED] **Reworking a broken skill is the highest-leverage move** — `scientific-method` went 0 → +9.3pp (p=0.002) purely from the agent-native rewrite (evidence-ranked differential, native scope, boundaries, no human stage-directions). [SUPERSEDED — canonical: scientific-method=DIRECTIONAL-NOT-REPLICATED] It was at the time the **strongest single ELEVATE** in the program.
2. [SUPERSEDED — retracted: both original and trimmed were noise draws that did not replicate] **"Improving" an already-proven skill can regress it — now backed by TWO data points.** Both proven skills dipped to ns after trimming: `systems` +5.3→+3.3 and `five-whys-plus` +4.0→+3.3. The description/boundary edits are safe; the content *trimming* is the suspect. Restore the trimmed procedure content and re-validate before shipping.
3. [SUPERSEDED] **A cosmetic edit is not a rework.** `occams-razor` was edited (trigger-scoped) but stayed at +2pp ns — only a true agent-native rewrite moved the needle. Editing ≠ reworking.

[SUPERSEDED] **Firm significant ELEVATEs to date (native debugging):** `scientific-method` (+9.3pp, p=0.002, current) [SUPERSEDED — canonical: scientific-method=DIRECTIONAL-NOT-REPLICATED]. `systems` (+5.3pp) and `five-whys-plus` (+4pp) were firm pre-trim [SUPERSEDED — canonical: systems=NO-LIFT, five-whys-plus=NO-LIFT] and need their trimmed content restored to recover significance. The rework recipe is validated end-to-end (audit → agent-native rewrite → +9pp); the trimming caution is now backed by two regressions, not one.

## ★★★★ Wave C — NEW objective verdicts + a REPLICATION FAILURE that revises the headline
Powered, isolated, length-controlled sweep (`evals/run-wavec.sh`). Four previously-**unmeasured** skills got their first objective verdicts; the two "firm ELEVATE" debugging skills were **re-run on a fresh n=150** as a replication test.

| Skill | mode (dataset) | placebo→skill | Δ | p | verdict |
|---|---|---|---|---|---|
| **red-team** | correctness (DiverseVul balanced, n=80) | 56→68% | **+11.3** | **0.052** | [SUPERSEDED — canonical: red-team=NO-LIFT; +1.4pp p=1.0 on harder CWE decisive split] **STRONG ELEVATE-leaning** — was the largest objective effect in the program at the time; confirm at n=150/200 |
| circle-of-competence | abstention (SelfAware balanced, n=70) | 70→70% | +0.0 | 0.773 | **KILL/REWORK** — no calibration benefit (abstains slightly *less* on unanswerable) |
| socratic | binary-decision (clarify, n=29) | 100→93% | −6.9 | 0.479 | no benefit; placebo at ceiling — INCONCLUSIVE |
| cynefin | binary-decision (classify, n=30) | 97→100% | +3.3 | 1.0 | INCONCLUSIVE-ceiling |
| **systems** (restored) | SWE localize (n=150) | 84→83% | **−1.3** | 0.683 | **DID NOT REPLICATE** (was +5.3pp p=0.043) |
| **five-whys-plus** | SWE localize (n=150) | 83→84% | **+1.3** | 0.752 | **DID NOT REPLICATE** (was +4.0pp p=0.041) |

### The headline correction (most important result of the session)
**The two "firm ELEVATE" debugging skills do not replicate on a fresh sample.** `systems` went +5.3pp (p=0.043) → −1.3pp, and `five-whys-plus` +4.0pp (p=0.041) → +1.3pp. Restoring `systems`' trimmed leverage table did **not** recover the effect. This means:
- The earlier "trimming regression" lesson was **wrong** — the dips weren't caused by trimming (content was barely touched). Both the original +5pp *and* the trimmed +3pp were draws from a distribution centered near **zero**; the p≈0.04 originals were **borderline-significance noise that doesn't survive replication.**
- **Replication, not a single p<0.05, is the bar.** A lone borderline result at n=150 is not enough — these effects are small (a handful of discordant pairs out of 150) and a fresh sample easily crosses back.
- **Only `scientific-method` (+9.3pp, p=0.002) remains a robust ELEVATE** **[⛔ SUPERSEDED: this +9.3pp was the old run1 primary (pre-edit). M5 fresh post-edit primary +5.3pp p=0.061 failed the paired-test gate; scientific-method is now DIRECTIONAL-NOT-REPLICATED per canonical scorecard.]** — its effect is larger and its p an order of magnitude stronger. It should still be independently replicated, but it is in a different class than the borderline debugging skills.
- [SUPERSEDED — canonical: red-team=NO-LIFT; the +1.4pp p=1.0 on harder CWE decisive split killed the candidate] **`red-team` (+11.3pp, p=0.052) was at the time the new strongest candidate** — a large effect on balanced objective security data. It needed an n=150/200 confirmation run to settle significance, but was at the time the most promising un-confirmed skill.

### Revised program conclusion [SUPERSEDED — historical; the canonical scorecard is AUTHORITATIVE]
[SUPERSEDED] Across all evidence now: thinking skills produce **at most a small effect on objective tasks, and most apparent "ELEVATEs" are at the edge of significance and do not robustly replicate.** The honest scorecard at the time:
- [SUPERSEDED] **Robust ELEVATE:** `scientific-method` (debugging rework, +9.3pp p=0.002). **[⛔ SUPERSEDED: M5 fresh post-edit primary +5.3pp p=0.061 failed gate; scientific-method is DIRECTIONAL-NOT-REPLICATED per canonical scorecard. No skill currently holds ELEVATE.]**
- [SUPERSEDED — canonical: red-team=NO-LIFT] **Strong candidate, unconfirmed:** `red-team` (security, +11.3pp p=0.052 — confirm at higher N).
- **Not replicated (downgrade from ELEVATE to "no robust effect"):** `systems`, `five-whys-plus`.
- **No effect / redundant-at-ceiling:** `circle-of-competence`, `cynefin`, `socratic`, `debiasing`, `bayesian`.
- [SUPERSEDED — canonical: fermi=NO-LIFT; rework-rescue was n=40 noise; powered +0.7pp p=1.0 n=150] **Rework-rescued (directional):** `fermi-estimation` — the agent-native rework flipped it from −5pp to +7.5pp (p=0.371, n=40)… **but see the powered confirmation below.**
- **Negative/flat:** `occams-razor`.
[SUPERSEDED] The defensible value of the catalog is in **reasoning framing on open work** and as **discoverable, well-bounded references** — not in measurable accuracy lifts on objective tasks.

## ★★★★★ Powered confirmation of the two live candidates — both collapse
The only two un-confirmed positive effects were re-run at power. Both shrank toward zero, exactly like systems/five-whys:

| Skill | small-N | POWERED | verdict |
|---|---|---|---|
| **red-team** | +11.3pp p=0.052 (n=80) | **+5.0pp p=0.10 (n=200)** | [SUPERSEDED — canonical: red-team=NO-LIFT; later CWE decisive split +1.4pp p=1.0 killed the candidate] directional positive, **NOT significant** |
| **fermi-estimation** (reworked) | +7.5pp p=0.37 (n=40) | **+0.7pp p=1.0 (n=150)** | [SUPERSEDED — canonical: fermi=NO-LIFT] **flat** — the rework-rescue was n=40 noise |

### Final program verdict (after full powering) — [⛔ SUPERSEDED by M5/M6 scrutiny round-1]

**`scientific-method` is the only skill with a robust, significant, replicated objective lift (+9.3pp, p=0.002).** **[⛔ SUPERSEDED: This +9.3pp was the old run1 primary (pre-edit). The M5 fresh post-edit primary (+5.3pp, p=0.061, n=150) on the original frozen SWE-bench set FAILED the p<0.05 paired-test gate. Replication (+8.0pp, p=0.001, same direction, post-edit, significant) cannot rescue a primary that fails. scientific-method is DIRECTIONAL-NOT-REPLICATED per the canonical scorecard. Mission outcome is ZERO robust-ELEVATE skills.]** Every other apparent ELEVATE — systems, five-whys-plus, red-team, fermi-rework — **regressed to non-significance once powered to n≥150.** The consistent pattern across *five* skills is decisive: **borderline p≈0.04–0.05 results at small N are draws from a near-zero-centered distribution and do not survive replication.** 

[SUPERSEDED — canonical: ZERO ELEVATE, scientific-method=DIRECTIONAL-NOT-REPLICATED] Honest bottom line: on objective, judge-free tasks, injecting a thinking-skill guide produces **no reliable accuracy lift for 38 of 39 skills**; the one apparent exception (a debugging skill reworked to be agent-native and evidence-ranked) finished DIRECTIONAL-NOT-REPLICATED — its M5 fresh primary (+5.3pp, p=0.061, post-edit, directional, NOT replicated) failed the p<0.05 gate. The catalog's value is reasoning *framing* and *discoverability*, not measurable correctness — and "replication, not a single p<0.05" is the standard any future ELEVATE claim must meet.
