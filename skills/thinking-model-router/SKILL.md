---
name: thinking-model-router
description: Route to the right mental model based on your domain and problem type. The single entry point for all thinking skills.
disable-model-invocation: true
---

# Model Router

## Overview

This is the **master routing skill** for all mental models. Instead of knowing 28 frameworks, start here. Identify your domain and problem type, and this skill points you to the right model(s). Think of it as the "which tool do I use?" guide.

**Core Principle:** Don't memorize models—memorize how to find the right one. Domain + Problem Type → Model.

## Short-Circuit: Skip the Router

**If you already know the right model, invoke it directly — don't route.** This skill is for when you're *unsure* which model fits. If the problem obviously calls for a specific model (e.g., "where's the bottleneck?" → theory-of-constraints; "how would an attacker break this?" → red-team), go straight to it. Routing is overhead you only pay when the match isn't obvious.

**Default outcome is NONE or one skill.** If no model clearly helps, reason directly (NONE) — do not force a skill. Prefer exactly one primary skill when something fits. Reach for multiple skills only when their mechanisms are truly complementary (distinct roles, not near-duplicates).

## Selection Criteria

When the match is not obvious, choose with these criteria — then stop at the first adequate fit (satisficing, not exhaustive ranking):

1. **Problem type** — Diagnose / Decide / Understand / Create / Evaluate / Predict / Optimize.
2. **Constraints** — time pressure, information gaps, stakes, reversibility, complexity.
3. **Mechanism fit** — does this skill's procedure attack the actual unknown (not habit or familiarity)?
4. **Blind spots** — what does the candidate ignore that still matters for this problem?
5. **Exit** — abandon after ~15 minutes with no insight, or when key facts refuse the frame; re-route or fall back to NONE rather than force the model.

**Routing defaults:**

| Outcome | When |
|---------|------|
| **NONE** | No skill clearly improves the work; problem is routine; match is forced or cosmetic |
| **One primary skill** | Default when a model fits — name it and apply it |
| **2–3 skills max** | Only if each has a distinct complementary role (e.g. reverse-risk then decide). Never stack near-duplicates. Prefer sequential over parallel unless independent checks are needed |

Quick defaults by type (override when constraints demand otherwise):
- Diagnostic → five-whys-plus or scientific-method
- Decision → reversibility first
- Understanding → systems
- Creative → first-principles
- Evaluation → steel-manning

### Deliberate selection (when several candidates remain)

Use only if the domain map and defaults leave 2+ plausible models, or stakes are high enough that a forced default is unsafe. Still end at **NONE or one primary** unless complementary multi-skill is justified.

1. Characterize the problem (type, constraints, stakes, reversibility, information).
2. Name **2–5 candidate models** (include the type default; do not pad with near-duplicates).
3. Score each candidate 1–5 on the weighted criteria below; pick the highest total that still fits mechanism and blind-spot checks.
4. Consider multi-skill only after a single winner leaves a material blind spot (see When to Combine Models).
5. Record rationale + exit signals; if no candidate scores well, choose **NONE**.

| Criterion | Weight | What to judge |
|-----------|--------|---------------|
| Problem fit | 30% | Does the skill's mechanism attack this unknown? |
| Available info | 20% | Do you have the inputs the skill needs? |
| Time to apply | 15% | Can it finish inside the real time budget? |
| Stakeholder acceptance | 15% | Will the framing be usable with the people affected? |
| Competence with model | 20% | Can you apply it correctly without cargo-culting? |

Mismatch signals (wrong model or overuse): analysis feels forced; important factors ignored; results only fit by distortion; same model applied by habit to every problem → return to NONE or re-route.

## Quick Router

### Step 1: What's Your Domain?

| Domain | You're working on... |
|--------|---------------------|
| **Coding/Debugging** | Bugs, errors, performance issues, root cause |
| **Architecture** | System design, technical decisions, scalability |
| **Product** | Features, user needs, prioritization, roadmap |
| **Business Strategy** | Competition, growth, market, organization |
| **Personal Decisions** | Career, life choices, major commitments |
| **Abstract/Analytical** | Arguments, ideas, theories, pure reasoning |
| **Risk/Safety** | What could go wrong, preparation, resilience |
| **Innovation** | New ideas, breakthroughs, creative solutions |

### Step 2: What's Your Problem Type?

| Type | You need to... |
|------|----------------|
| **Diagnose** | Find root cause, understand why |
| **Decide** | Choose between options |
| **Understand** | Grasp how something works |
| **Create** | Generate new solutions |
| **Evaluate** | Judge quality or validity |
| **Predict** | Forecast outcomes |
| **Optimize** | Improve performance |

---

## Domain → Model Maps

### 🖥️ Coding & Debugging

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Bug with unknown cause           → Scientific Method, 5 Whys Plus
Performance degradation          → Theory of Constraints, Systems Thinking
Spans multiple services          → Systems Thinking
Incident postmortem              → 5 Whys Plus, Systems Thinking
Flaky/intermittent behavior      → Scientific Method (hypothesis testing)
"It works on my machine"         → Map-Territory (model vs reality gap)
```

**Default for debugging:** Start with **5 Whys Plus**, escalate to **Systems Thinking** if it spans components.

---

### 🏗️ Architecture & Technical Decisions

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Technology choice                → Lindy Effect, Reversibility
Build vs buy                     → Opportunity Cost, First Principles
Scalability design               → Systems Thinking
Microservices vs monolith        → Cynefin, Reversibility
Database selection               → Lindy Effect, Theory of Constraints
API design tradeoffs             → TRIZ (resolve contradictions)
Should we rewrite?               → Second-Order, Opportunity Cost
```

**Default for architecture:** Start with **Reversibility** (is this Type 1 or Type 2?), then **Systems Thinking** for interconnections.

---

### 📦 Product & Feature Development

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
What should we build?            → Jobs to be Done
Feature prioritization           → Opportunity Cost, Theory of Constraints
Why aren't users engaging?       → Jobs to be Done, 5 Whys Plus
New product exploration          → Effectuation, First Principles
Should we pivot?                 → Opportunity Cost, Reversibility
Product-market fit               → Jobs to be Done, Probabilistic
Roadmap planning                 → Theory of Constraints, Opportunity Cost
A/B test interpretation          → Probabilistic
```

**Default for product:** Start with **Jobs to be Done** (what job is the user hiring this for?).

---

### 📈 Business Strategy

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Competitive analysis             → Red Team, Second-Order
Market entry                     → Cynefin, Effectuation
Growth strategy                  → Systems Thinking
Organizational dysfunction       → Systems Thinking
Resource allocation              → Theory of Constraints, Opportunity Cost
Startup strategy                 → Effectuation, Margin of Safety
M&A evaluation                   → Pre-mortem, Steel-manning
Pricing decisions                → First Principles, Probabilistic
```

**Default for strategy:** Start with **Cynefin** (what domain is this problem in?), then match approach.

---

### 🧑 Personal & Career Decisions

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Should I take this job?          → Opportunity Cost, Reversibility
Career direction                 → Circle of Competence, Opportunity Cost
Major life decision              → Opportunity Cost, Pre-mortem
Learning what to learn           → Circle of Competence, Lindy Effect
Negotiation prep                 → Steel-manning, Red Team
Should I start a company?        → Effectuation, Margin of Safety, Pre-mortem
Time allocation                  → Opportunity Cost, Theory of Constraints
```

**Default for personal:** Start with **Opportunity Cost** (what alternative are you giving up?).

---

### 🧠 Abstract & Analytical Thinking

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Evaluating an argument           → Steel-manning, Probabilistic
Challenging assumptions          → First Principles, Socratic
Estimating unknowns              → Probabilistic
Updating beliefs                 → Probabilistic
Exploring edge cases             → Thought Experiment, Pre-mortem
Finding logical flaws            → Pre-mortem, Steel-manning
Complex causation                → Systems Thinking
Philosophical questions          → Thought Experiment, First Principles
```

**Default for abstract:** Start with **Steel-manning** (argue the strongest opposing view first).

---

### ⚠️ Risk & Safety

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
What could go wrong?             → Pre-mortem, Red Team
Security review                  → Red Team, Pre-mortem
Disaster preparation             → Pre-mortem, Margin of Safety
Avoiding catastrophic failure    → Margin of Safety, Via Negativa
Stress-testing plans             → Red Team, Pre-mortem
Probability of failure           → Probabilistic
Building resilience              → Via Negativa, Margin of Safety
```

**Default for risk:** Start with **Pre-mortem** (assume failure, explain why).

---

### 💡 Innovation & Creativity

```
PROBLEM                          → MODEL(S)
─────────────────────────────────────────────────────
Breakthrough needed              → First Principles, TRIZ
Stuck on contradictions          → TRIZ
Limited resources                → Effectuation, Via Negativa
Simplification                   → Via Negativa, Scientific Method
Challenging "impossible"         → First Principles, TRIZ
New market creation              → Effectuation, Jobs to be Done
Removing complexity              → Via Negativa, Scientific Method
```

**Default for innovation:** Start with **First Principles** (strip to fundamentals, rebuild).

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENTAL MODEL QUICK ROUTER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "Why is this broken?"        → 5 Whys Plus, Scientific Method  │
│  "How does this system work?" → Systems Thinking                  │
│  "What should we build?"      → Jobs to be Done                 │
│  "Should I do this?"          → Reversibility, Opportunity Cost │
│  "What could go wrong?"       → Pre-mortem, Red Team            │
│  "How do I innovate?"         → First Principles, TRIZ          │
│  "What's the probability?"    → Probabilistic                   │
│  "Where's the bottleneck?"    → Theory of Constraints           │
│  "What am I giving up?"       → Opportunity Cost                │
│  "Is this argument valid?"    → Steel-manning                   │
│  "Will this technology last?" → Lindy Effect                    │
│  "How complex is this?"       → Cynefin                         │
│  "What to remove?"            → Via Negativa                    │
│  "Is this safe enough?"       → Margin of Safety                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Decision Flow

```
START HERE
    │
    ▼
┌─────────────────────┐
│ What's your domain? │
└──────────┬──────────┘
           │
     ┌─────┴─────┬──────────┬──────────┬──────────┐
     ▼           ▼          ▼          ▼          ▼
  Coding    Architecture  Product   Strategy   Personal
     │           │          │          │          │
     ▼           ▼          ▼          ▼          ▼
┌─────────────────────┐
│ What problem type?  │
│ Diagnose/Decide/    │
│ Understand/Create/  │
│ Evaluate/Predict    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Look up in domain   │
│ table above         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Any skill clearly helps?│
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
   NO            YES
    │             │
    ▼             ▼
  NONE      Single model enough?
  (reason         │
   directly) ┌────┴────┐
             ▼         ▼
            YES        NO (complementary roles only)
             │         │
             ▼         ▼
          Apply it  At most 3 skills
                    (prefer sequential)
```

## Model Inventory by Category

### Diagnostic Models (Find root cause)
- `5 Whys Plus` - Iterative "why" with bias guards
- `Scientific Method` - Competing hypotheses, least-assumptive survivors, discriminating tests
- `Kepner-Tregoe` - Systematic problem/decision analysis

### Decision Models (Choose wisely)
- `Reversibility` - Type 1 vs Type 2 decisions
- `Opportunity Cost` - What are you giving up?
- `Probabilistic` - Calibrated probability estimates, Bayesian updates, Fermi bounds

### Systems Models (Understand interconnections)
- `Systems Thinking` - Boundaries, stocks/flows, feedback loops/delays, leverage, archetypes
- `Theory of Constraints` - Find and exploit the bottleneck

### Risk Models (Prepare for failure)
- `Pre-mortem` - Assume failure, reverse-analyze why, prevent
- `Red Team` - Attack your own plan
- `Margin of Safety` - Build in buffers

### Innovation Models (Create breakthroughs)
- `First Principles` - Strip to fundamentals, rebuild
- `TRIZ` - Resolve technical contradictions
- `Effectuation` - Start with means, not goals
- `Via Negativa` - Improve by removing

### Evaluation Models (Judge quality)
- `Steel-manning` - Argue strongest opposing view
- `Lindy Effect` - Older = likely to last longer
- `Circle of Competence` - Know your expertise boundaries

### Context Models (Match approach to situation)
- `Cynefin` - Clear/Complicated/Complex/Chaotic domains
- `Model Combination` - Multiple models only when mechanisms are complementary

### Product Models (Build the right thing)
- `Jobs to be Done` - What job is user hiring this for?
- `Thought Experiment` - Structured imagination

## When to Combine Models

Default remains **one skill** (or NONE). Combine only when a single model leaves a material blind spot and each added skill contributes a **different mechanism**. Cap at three. Prefer sequential (narrow → decide) over parallel unless independent checks are required.

Use **model-combination** patterns only after the one-skill default fails the blind-spot check:

| Situation | Pattern | Example |
|-----------|---------|---------|
| High-stakes decision | Sequential | Reversibility → Pre-mortem → Opportunity Cost |
| System diagnosis | Nested | Cynefin (macro) → ToC (meso) → OODA (micro) |
| Validating strategy | Parallel | Red Team + Steel-manning + Second-Order |
| Innovation under constraints | Sequential | First Principles → TRIZ → Effectuation |
| Career decision | Temporal | 5 Whys (past) → Circle of Competence (present) → Opportunity Cost / Reversibility (future) |

Do **not** combine when: one skill already covers the unknown; the second skill is a synonym/near-neighbor of the first; time is tight and a single adequate model exists.

## Template
```markdown
# Model Router Analysis

## Context
Domain: [Coding/Architecture/Product/Strategy/Personal/Abstract/Risk/Innovation]
Problem: [Brief description]
Problem Type: [Diagnose/Decide/Understand/Create/Evaluate/Predict/Optimize]
Constraints: [Time / Information / Stakes / Reversibility / Complexity]

## Route
Outcome: [NONE | One skill | 2–3 complementary skills]
Primary: [Main model, or NONE]
Secondary: [Only if distinct complementary role]
Tertiary: [Only if distinct complementary role]
Combination pattern: [None / Sequential / Parallel / Nested]
Candidates (deliberate path only): [2–5 models scored]
Scores: [fit 30% / info 20% / time 15% / stakeholders 15% / competence 20%]
Rationale: [Why this fit; what blind spots remain]
Exit: [Signals to abandon and re-route or fall back to NONE]

## Application
[Apply the selected model(s) here — or direct reasoning if NONE]

## Verification
- [ ] Domain and problem type identified
- [ ] Chose NONE or one primary by default
- [ ] If deliberate: scored 2–5 candidates on weighted criteria
- [ ] Multi-skill only when mechanisms are complementary (≤3)
- [ ] Fit is by mechanism, not habit
- [ ] Exit criteria set

```

## Key Questions

- "What domain am I operating in?"
- "What type of problem is this—diagnose, decide, understand, create, or evaluate?"
- "Does any skill clearly help, or is NONE the right answer?"
- "What's the default single model for this domain + type?"
- "If several candidates remain, which wins on fit/info/time/stakeholders/competence?"
- "If combining, does each skill contribute a distinct complementary mechanism?"
- "Am I using a model because it fits, or because it's familiar?"
- "What would make me abandon this model and re-route?"

---

**Remember:** Prefer NONE or one skill. You don't need every model—you need the right one, or none. Domain + problem type → route → apply (or reason directly).
