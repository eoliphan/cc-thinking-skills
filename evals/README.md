# Thinking Skills — Eval Harness

Outcome-based evaluation for the thinking skills. The repo's original
`scripts/validate-skills.js` measures **structural conformance** (does a file have
the right headers/tables/checkboxes). This harness measures whether a skill
actually **improves reasoning** and **fires at the right time**.

## Model-call backends

Unpinned runners (`run-routing.js`, `run-objective.js`, `run-pairwise.js`,
`run-calibration.js`, and `lib/judge.js`) select a backend through
`evals/lib/model-backend.js`:

| `EVAL_BACKEND` | Module | Use |
|---|---|---|
| `droid` (default) | `evals/lib/droid.js` | Historical path. Drives Claude, GPT, Gemini, and DeepSeek through the Factory `droid` CLI. |
| `claude-cli` | `evals/lib/claude-cli.js` | Drives `claude -p` with the interactive Claude Code login. Claude models only. |

The `claude-cli` backend sends the prompt on stdin. It runs from a neutral
directory. It disables all tools, MCP servers, slash commands, skills, and
settings sources, and replaces the system prompt. A structured check found
0 tools, 0 MCP servers, and 0 skills in the solver session. Each result records
the backend, CLI version, and exact arguments in `isolation`.

Do not pool `claude-cli` results with droid-era artifacts. Do not use them under
a droid-era preregistration. The solver context differs, so a measured study on
this backend needs a new `study_version` and preregistration. `cli_cost_usd` is
the cost that Claude Code reports. Under a subscription login it is notional.

`evals/lib/droid.js` is hash-pinned by
`evals/studies/scientific-method-vnext/manifest-tool-v1.json`. Do not edit it.
Its header still says that `claude -p` fails with a 401. That was true when the
file was frozen. It no longer holds for the interactive login.

## Canonical engines

| Runner | Cost | What it measures |
|---|---|---|
| `run-structural.js` | free | header/format conformance + substance-aware re-score |
| `run-routing.js` | LLM | catalog auto-routing / NONE |
| `run-objective.js` | free (fixture) / LLM | generic paired objective engine (boolean, MCQ, abstention, numeric OOM, Brier, file localization) |
| `run-pairwise.js` | free (fixture) / LLM study | generic blind pairwise engine with typed envelopes |
| `run-calibration.js` | free / LLM | dataset difficulty and calibration utilities |
| `run-replication.js` | free | replication parsing and disposition helpers |

## Objective / pairwise engines

```bash
node evals/run-objective.js --fixture path/to/fixture.json
FIXTURE=1 node evals/run-pairwise.js --fixture path/to/pairwise-fixture.json
```

Shared helpers live in `evals/lib/objective.js` and `evals/lib/pairwise.js`
(`parseBooleanAnswer`, `summarizePairedArms`, `balancedAcc` in `stats.js`, etc.).

## Retired specialized runners

The old correctness, routing-data, binary-decision, abstention, numeric,
behavioral, rubric, SWE, workflow, shell-batch, and experiment-specific runners
are historical producers only. Current studies use the generic objective or
pairwise engine. Historical manifests keep the retired command names and hashes
for provenance. Tool-localization v1 also preserves its pre-cutover
`skills/thinking-scientific-method/SKILL.md` path. Git cannot reproduce that
study byte for byte. No committed revision matches its pins for
`evals/lib/droid.js` or `evals/lib/tool-localization-runner.js`, and its
dataset is external. Its recorded disposition is diagnostic-only. Create a new
versioned manifest and runner for the current `plugin/skills/` layout instead
of changing its frozen pins.

## Other gates

```bash
EVAL_RUN=catalog-cutover node evals/run-structural.js
EVAL_RUN=run1 CONC=4 ROUTER_MODEL=claude-sonnet-4-6 node evals/run-routing.js
node evals/validate-dataset-splits.js
```

## Evidence policy

Public claims require machine-linked confirmatory artifacts under
`evals/studies/` and `analysis/evidence.json`. Historical result directories may
name older runners; those paths are historical only.
