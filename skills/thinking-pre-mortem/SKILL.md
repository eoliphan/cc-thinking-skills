---
name: thinking-pre-mortem
description: Before committing to a plan or launch, assume it has already failed and reason backward through why — prospective hindsight surfaces risks that "what could go wrong?" misses.
disable-model-invocation: true
---

# Pre-Mortem Analysis

## Overview
The pre-mortem, developed by psychologist Gary Klein, uses "prospective hindsight": instead of asking "What could go wrong?", assume the plan HAS failed and reason backward through why. Stating failure as already-happened surfaces concrete risks that forward-looking risk assessment glosses over.

**Core Principle:** It's easier to explain a failure that "already happened" than to predict one. Use that asymmetry productively in a single reasoning pass.

## When to Use
- Project kickoff (before work begins)
- Before committing to a major technical decision
- Sprint planning for high-risk work
- Before launch or major release
- When team seems overconfident
- After a plan is formed but before execution

Decision flow:
```
Starting significant work? → yes → Plan looks solid / on track? → yes → PRE-MORTEM ESSENTIAL
                                                              ↘ no → Pre-mortem still valuable
                         ↘ no → Standard risk assessment may suffice
```

## When NOT to Use
- The work is small, local, and reversible — failure is cheap to undo, so skip the ceremony.
- You're mid-incident under time pressure — act on the likely cause now (ooda/scientific-method); pre-mortem belongs *before* execution, not during firefighting.
- You'd only generate generic risks ("requirements unclear", "scope creep") that don't bind to this specific plan — stop if nothing concrete surfaces.
- The risks are already enforced by automated gates (CI, canary, rollback) — don't re-list what the system already catches.

## Trigger Card

Before committing to a plan or launch where optimism may be hiding risks:

1. **Assume it has already failed** — "It's six months later. The project was a disaster. What happened?"
2. **List concrete failure reasons** — specific to THIS plan, not generic. Why did it actually fail?
3. **Mitigate the top 3-5** — for each top failure reason, add a concrete safeguard or change the plan.

Skip if you'd only generate generic risks that don't bind to this specific plan. If risks are already enforced by automated gates (CI, canary, rollback), don't re-list what the system already catches. For a full launch risk review, run the full procedure.

## The Process

### Step 1: Set the Failure Frame
Adopt the stance that the plan has already failed, stated in past tense:
> "It is [future date, post-deadline]. This plan didn't just slip — it failed. The launch was rolled back / the migration corrupted data / adoption never happened."

Past tense is what makes this work: you are *explaining* a failure, not *predicting* one.

### Step 2: Generate Failure Reasons (one prospective-hindsight pass)
Reason through *why* it failed across every angle. Push for breadth, not comfort — aim for 15+ distinct reasons before filtering:
- **Technical:** wrong architecture, integration/contract breaks, scale limits, data loss
- **Process:** untested paths, no rollback, deploy timing, missing migration step
- **Assumptions:** which load-bearing assumption turned out false?
- **Dependencies/external:** upstream API, vendor, rate limits, config drift
- Force a second sweep: "What did I, the author of this plan, most want to be true that wasn't?"

Generate the full list first; do not prune or rank while generating (premature filtering anchors on the obvious risks).

### Step 3: Categorize and Prioritize
Group by theme and assess:

| Category | Risk | Likelihood | Impact | Priority |
|----------|------|------------|--------|----------|
| Technical | API integration fails | High | Critical | P0 |
| Process | Requirements unclear | Medium | High | P1 |
| People | Key person leaves | Low | Critical | P1 |
| External | Vendor delays | Medium | Medium | P2 |

### Step 4: Develop Mitigations
For top risks, define:
```
Risk: API integration fails
Mitigation:
- Spike on integration first, before depending on it
- Identify fallback vendor / degrade path
- Build abstraction layer for swap-ability
Verification: integration smoke test passes before downstream work begins
```

### Step 5: Failure-First Reverse Analysis
For each top failure scenario, work backward from the failed outcome to the conditions that made it inevitable, then lock preventions as plan requirements:

1. **State the failed outcome in past tense** — e.g., "Auth launch was rolled back after credential stuffing emptied accounts."
2. **Trace necessary conditions** — list what had to be true for that failure (missing controls, false assumptions, absent checks). Ask: "What conditions made this failure possible or guaranteed?"
3. **Invert each condition into a prevention requirement** — turn the condition into an explicit avoid/require rule with a verifiable criterion (not a vague intention).
4. **Bind to the plan** — attach owner, verification checkpoint, and whether the requirement blocks ship or is staged.

```
Failed outcome: Credential stuffing emptied accounts after launch
Necessary conditions:
- No rate limiting on login
- Passwords stored with weak hashing
- No anomaly alerting on auth failures
Prevention requirements:
- Require rate limit + lockout on auth endpoints (verified by load/abuse test)
- Require bcrypt cost ≥ 12 or an explicitly configured Argon2id policy (verified by config audit)
- Require auth-failure anomaly alert before GA (verified by alert fire test)
```

Use this pass when a failure reason is still abstract ("security fails") or when optimism is hiding the concrete path. Prefer reverse analysis over forward brainstorming once the failure frame is set.

### Step 6: Update the Plan
Incorporate mitigations and reverse-analysis prevention requirements into the plan:
- Add spike/investigation tasks ahead of dependent work
- Build in contingency for the highest P×S risks
- Add a concrete verification/checkpoint for each top risk
- Encode inverted conditions as explicit ship/stage gates

## Pre-Mortem Template

```markdown
# Pre-Mortem: [Project Name]
Date: [Date]

## The Scenario
It is [Future Date]. [Project] has failed. 

## Failure Reasons Identified

### Technical
- [Reason 1]
- [Reason 2]

### Process  
- [Reason 1]
- [Reason 2]

### People/Team
- [Reason 1]
- [Reason 2]

### External/Dependencies
- [Reason 1]
- [Reason 2]

## Priority Risks and Mitigations

### P0: [Risk Name]
- **Description**: [What went wrong]
- **Mitigation**: [How to prevent]
- **Owner**: [Who]
- **Checkpoint**: [When to verify]

### P1: [Risk Name]
...

## Plan Updates
- [ ] [Action item from pre-mortem]
- [ ] [Action item from pre-mortem]
```

## Why Pre-Mortems Work

1. **Reframes prediction as explanation**: Explaining an "already-happened" failure is concrete; predicting one stays vague.
2. **Defeats first-plausible-answer lock-in**: Generating the full failure list before ranking stops anchoring on the obvious risk.
3. **Surfaces buried assumptions**: Asking "what did the plan need to be true that wasn't?" exposes load-bearing assumptions the forward plan hid.
4. **Counters optimism**: The forced-failure stance overrides the natural bias toward "this will work."

## Common Failure Categories to Prompt

| Category | Example Failures |
|----------|-----------------|
| Requirements | Scope creep, unclear success criteria, missing stakeholder |
| Technical | Wrong architecture, integration failures, scale issues |
| Timeline | Underestimation, dependencies delayed, parallel work blocked |
| Team | Key person unavailable, skill gaps, communication breakdown |
| External | Vendor issues, regulatory changes, market shift |
| Process | Insufficient testing, deployment problems, no rollback |

## Execution Tips
- **Use past tense** consistently ("failed" not "might fail") — it's what triggers the hindsight effect.
- **Generate before filtering** — collect the full list, then rank; don't prune mid-sweep.
- **Interrogate the plan's own optimism** — what did the author most want to be true?
- **Convert to action** — a pre-mortem with no plan change is wasted; each top risk needs a mitigation + verification.

## Decision Output

When this skill is used as a workflow gate, produce:

```json
{
  "decision_key": "pre_mortem_warranted",
  "answer": true,
  "rationale": "one concise sentence"
}
```

## Escalate to Full Skill When

- The answer depends on scenario generation, not binary classification.
- The first pass surfaces multiple plausible branches.
- The task is novel enough that the checklist may be stale.
- The consequence of misrouting is high.

## Verification Checklist
- [ ] Run before significant work begins (not mid-incident)
- [ ] Failure frame stated in past tense
- [ ] 15+ distinct failure reasons generated before ranking
- [ ] Risks prioritized by likelihood × impact
- [ ] Top 3-5 risks have explicit mitigations
- [ ] Top failures reverse-analyzed: necessary conditions → prevention requirements with verification
- [ ] Each mitigation has a concrete verification/checkpoint
- [ ] Plan updated to incorporate findings

## Key Questions
- "The plan failed. Why?"
- "What conditions had to be true for this failure to occur?"
- "What was obvious in retrospect that the plan missed?"
- "What warning signs would have shown up first?"
- "Which load-bearing assumption turned out to be false?"
- "What did the plan most need to be true that wasn't?"
- "What prevention requirement would have made this failure path impossible?"
