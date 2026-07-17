# Thinking Skills — Eval Harness

Outcome-based evaluation for the thinking skills. The repo's original
`scripts/validate-skills.js` measures **structural conformance** (does a file have
the right headers/tables/checkboxes). This harness measures whether a skill
actually **improves reasoning** and **fires at the right time**.

All model calls go through the authenticated `droid` CLI (`evals/lib/droid.js`).
`claude -p` is not used — the headless subprocess fails auth (401); `droid` has
provider keys configured and can drive Claude/GPT/Gemini/DeepSeek uniformly.

## Tiers

| Tier | Script | Cost | What it measures |
|---|---|---|---|
| 0 | `run-structural.js` | free | header/format conformance + a substance-aware re-score (shows where the strict lint under-counts content-rich skills) |
| 1 | `run-rubric.js` | LLM | a judge grades each SKILL.md's content: fidelity / applicability / actionability / discrimination / discoverability (1–5) + a "would mislead an agent" flag |
| 2 | `run-routing.js` | LLM | given a natural prompt + all 28 descriptions, does the right skill get picked, and correctly NOT fire on routine requests? Reports **lenient** (accept siblings) vs **strict/unique** accuracy |
| 3 | `run-behavioral.js` | LLM | legacy behavioral comparison over the current 26 leaf-skill datasets; reports per-skill win rate and lift, but is not confirmatory without a declared study |

## Tier 3 methodology (length-controlled)

The naive test — skill vs *empty* baseline — confounds the skill's reasoning with
simply having 2–4k more words of context. So Tier 3 uses **length-matched
conditions** (`lib/conditions.js`):

- `placebo` — problem + neutral, content-free filler matched to the skill's word count
- `skill` — problem + the full SKILL.md
- `trigger` — problem + skill name + a 2–3 sentence trigger summary

Headline comparison is **`skill` vs `placebo`** (isolates content from length).
The optional **`skill` vs `trigger`** comparison tests whether the full guide
beats a one-liner — i.e. whether the SKILL.md is a textbook worth shipping or
dead weight. Solver = Claude (the real consumer); judge = a different family to
limit self-preference. Pair ordering is assigned by problem-index parity
(deterministic, position-bias-balanced).

> **Evidence caveat:** legacy behavioral coverage is heterogeneous and was not
> uniformly preregistered. Treat its per-skill results as provisional; use declared
> heldout and untouched-replication studies for product dispositions.

## Agentic workflow ablation

`run-agentic-workflow.js` is a pilot for multi-step route-vs-node scoring. It
separates control-flow route accuracy from per-node binary decision accuracy,
typed I/O effects, validator/repair effects, and verifier effects. Do not cite
it as powered proof until the dataset is enlarged and pre-registered.

```bash
EVAL_RUN=workflow-pilot CONC=3 SOLVER_MODEL=claude-sonnet-4-6 \
  node evals/run-agentic-workflow.js
```

## Running

```bash
# Tier 0 (free)
EVAL_RUN=run1 node evals/run-structural.js

# Tier 1 — judge defaults to gemini-3.1-pro-preview
EVAL_RUN=run1 CONC=4 JUDGE_MODEL=gemini-3.1-pro-preview node evals/run-rubric.js [skill ...]

# Tier 2 — router defaults to claude-sonnet-4-6
EVAL_RUN=run1 CONC=4 ROUTER_MODEL=claude-sonnet-4-6 node evals/run-routing.js

# Tier 3 — length-controlled headline
EVAL_RUN=run1 CONC=4 SOLVER_MODEL=claude-sonnet-4-6 JUDGE_MODEL=gemini-3.1-pro-preview \
  PAIRS="skill:placebo" node evals/run-behavioral.js [skill ...]

# Tier 3 — trigger-vs-instruction probe
PAIRS="skill:placebo,skill:trigger" EVAL_RUN=run1 node evals/run-behavioral.js <subset>

# Tier 3 — capability curve on a weaker solver
SOLVER_MODEL=claude-haiku-4-5-20251001 OUTFILE=tier3-haiku.json EVAL_RUN=run1 \
  node evals/run-behavioral.js <subset>

# Merge everything into one scorecard
EVAL_RUN=run1 node evals/aggregate-scorecard.js   # -> results/run1/scorecard.md
```

## Models & reasoning effort

`lib/droid.js` maps each model to its highest supported effort: `gpt-5.5-pro`→`xhigh`,
`gemini-3.1-pro-preview`→`high`, `deepseek-v4-pro`→`max`, `claude-opus-4-8`→`max`.
Override per call with the `effort` option / `SOLVER_EFFORT` env.

## Datasets

- `datasets/routing-cases.jsonl` — 71 cases (39 positive / 16 negative / 16 ambiguous) mapped to the 28-skill catalog.
- `datasets/behavioral/<skill>.json` — 412 legacy problems across 26 leaf-skill datasets. Prompts never name the framework; these datasets remain provisional unless a declared study supplies eligible splits and provenance.

## Adversarial review (../reviews/)

`reviews/build-packet.js` assembles the shared context; `reviews/run-holistic.js`
and `reviews/run-perskill.js` drive gpt-5.5-pro / gemini-3.1-pro-preview /
deepseek-v4-pro at max effort; `reviews/aggregate.js` collates findings into
`reviews/digest.json` for synthesis.
