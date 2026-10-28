# Backlog

## Make selected skills model-invocable

Requested 2026-10-28 by the user, relayed from the myclaudeplugins coordinator.
Background: `myclaudeplugins` branch `docs/architecture-plugins`,
`cdocs/2026-10-28-architecture-plugins.md`, section 10.3.

All 28 skills set `disable-model-invocation: true`. An architecture-review plugin
in `myclaudeplugins` wants to invoke some of them.

### (a) Architecture-review set

- Candidates now: `thinking-map-territory`, `thinking-steel-manning`,
  `thinking-pre-mortem`, `thinking-reversibility`.
- Candidates after trigger-accuracy measurement: `thinking-second-order`,
  `thinking-systems`.

### (b) Whole-catalog review

Consider each of the 28 skills. Record a reason per skill for its decision:
model-invocable or manual-only.

### Gate before any skill changes

- Measure trigger accuracy and cost for each candidate. A model-invocable skill
  adds its description to every session's skill listing, so it costs context in
  every session.
- The marketplace steering evals found that guidance injection raised cost by 28
  to 63% with no gain on tasks that plain search already solved.
- The current routing eval (`evals/run-routing.js`) selects one skill from a
  catalog prompt. It does not measure Claude Code's real auto-invocation, and it
  does not measure cost. A new eval is needed for both.

### Evidence so far (post-edit, directional)

The 2026-10-15 `claude-cli` routing runs (Haiku, Sonnet, and Opus 5.5;
`evals/results/cc-routing-*`) show that `kepner-tregoe` and `pre-mortem` take
cases labelled `steel-manning` and `reversibility`. Sharpen those descriptions
before flipping `steel-manning`, `reversibility`, or `pre-mortem`.
