---
name: thinking-systems
description: Use when debugging across services/an incident where a fix in one place breaks another, or behavior is emergent and no single component explains it. Maps the system and traces causes.
disable-model-invocation: true
---

# Systems Thinking

## Overview
Systems thinking views a problem as part of an interconnected whole rather than isolated components. It focuses on relationships, feedback loops, delays, and emergent properties—behaviors that arise from interactions and can't be predicted from parts alone. Its proven payoff is cross-service/incident debugging, where "obvious" single-component fixes fail.

**Core Principle:** The behavior of a system cannot be understood by analyzing components in isolation. Look at connections, feedback, and emergence.

## When to Use
- Debugging issues that span multiple services/components
- A fix in one place breaks something in another
- Behavior is emergent—no single component is at fault, but the whole misbehaves
- Analyzing incidents and outages with non-obvious causes
- Performance issues where the slow part isn't the actual cause
- The same problem keeps recurring despite multiple fixes (match structure, not only symptoms)
- Parameter/buffer tweaks keep not sticking—need to rank where to intervene by leverage

```
Problem spans multiple components?        → yes → APPLY SYSTEMS THINKING
Fix in one place caused issue in another? → yes → APPLY SYSTEMS THINKING
Behavior seems "emergent" or unexpected?  → yes → APPLY SYSTEMS THINKING
```

## When NOT to Use
- A single-component, linear bug (one service, clear stack trace) → just trace and fix it; the systems overhead buys nothing.
- The cause is already obvious from the recent diff or one log line → fix directly.
- The work is a contained refactor or feature with no cross-component interactions → skip.

## Systems Debugging Process
This is the core of the skill—apply it first.

### Step 1: Map the System
Draw components, connections, and data/control flows:
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│   API   │────▶│   DB    │
└─────────┘     └────┬────┘     └─────────┘
                     │
                     ▼
               ┌─────────┐
               │  Cache  │
               └─────────┘
```

### Step 2: Identify Feedback Loops and Delays
For each candidate loop, run this check:
1. **Classify the behavior:** growing/collapsing → reinforcing; oscillating → balancing with delay; stuck/resisting change → dominant balancing; settling cleanly → healthy balancing.
2. **Trace the loop:** list variables that feed back into themselves; mark each link same-direction (+) or opposite (-). Even count of (-) = reinforcing; odd = balancing.
3. **Name the delay:** where does cause lag effect (cache TTL, deploy pipeline, ramp-up, metric lag)? Long delays cause overshoot/oscillation—shorten the delay, reduce correction gain, or wait for feedback before acting again.
4. **Find the leverage on the loop:** shorten a delay, change loop gain, add a balancing loop to a runaway reinforcing one, or weaken a balancing loop that blocks needed change.

```
Retry Storm Loop (Reinforcing - Dangerous):
Service slow → Clients retry → More load → Service slower → More retries
Delay: retry backoff / client timeout; intervention: circuit breaker + shed load
```

### Step 3: Trace Upstream
Follow the symptom backward to find originating cause:
```
Symptom: High latency in Service C
→ Service C waiting on Service B
  → Service B waiting on Service A
    → Service A doing full table scan (ROOT CAUSE)
```

### Step 4: Look for Interactions
What happens when components interact under stress?
- Circuit breakers tripping
- Cascading timeouts
- Resource contention
- Thundering herd

### Step 5: Consider Time Dynamics
- When did this start?
- What changed recently (deploys, config, traffic)?
- Is it periodic? (Cron jobs, cache expiration, batch processes)
- Is it growing or stabilizing?

### Step 6: Match Recurring Structure (Archetypes)
When the same problem keeps recurring despite fixes, match the structure before inventing a new diagnosis:

| Archetype | Recognize | Structure check | Intervene by asking |
|-----------|-----------|-----------------|---------------------|
| Fixes That Fail | Fix returns worse later; needs larger doses | Quick fix + delayed side effect | What side effect will this fix create? |
| Shifting the Burden | Permanent workaround; real fix starved | Symptomatic fix atrophies fundamental capability | What capability are we not building? |
| Limits to Growth | Strong growth then plateau | Reinforcing growth hits a balancing constraint | What limits us at 10x? |
| Tragedy of the Commons | Shared resource degrades under local optima | Individual gain, collective depletion | Who owns long-term health of this resource? |
| Escalation | Arms race / mutual reaction spiral | Two reinforcing responses to each other | Can we change the game instead of playing harder? |
| Success to the Successful | Winner takes investment; alternatives starve | Initial advantage compounds via resource allocation | Are we starving future options to feed the incumbent? |
| Growth and Underinvestment | Reactive capacity only after crisis | Demand grows; capacity investment delayed | What fails if we grow 50% without capacity now? |

If no archetype fits after a genuine look, keep the from-scratch map—do not force a pattern. One-off linear bugs need no archetype.

## Common System Patterns

### Cascading Failure
```
One component fails → Dependent components overload → They fail
                                                    ↓
                              ← More traffic to remaining ←
```
**Mitigation:** Circuit breakers, bulkheads, graceful degradation

### Thundering Herd
```
Cache expires → All requests hit backend simultaneously → Overload
```
**Mitigation:** Jittered expiration, cache warming, request coalescing

### Queue Backup
```
Processing rate < Arrival rate → Queue grows → Memory pressure → OOM
```
**Mitigation:** Backpressure, rate limiting, queue bounds

### Resource Contention
```
Multiple processes → Same resource → Lock contention → Serialization
                                                     ↓
                    Throughput collapses despite available CPU
```
**Mitigation:** Sharding, optimistic locking, resource isolation

## Key Concepts

### 1. Feedback Loops
**Reinforcing (Positive) Loops:** Amplify change
```
Technical Debt Loop:
Deadline pressure → Shortcuts → More bugs → More firefighting
                                           ↓
                            ← Less time for quality ←
```

**Balancing (Negative) Loops:** Counteract change
```
Auto-scaling Loop:
Load increases → More instances spawn → Load per instance decreases
                                       ↓
                    ← Fewer instances needed ←
```

**Questions to identify loops:**
- Does this effect feed back into its cause? Classify reinforcing vs balancing (even/odd count of opposite links).
- Where is the delay, and would acting before feedback arrives overcorrect?
- What keeps this system in equilibrium—or what would make the loop unstable?

### 2. Stocks and Flows
**Stocks:** Accumulated quantities (users, technical debt, cache size)
**Flows:** Rates of change (registrations/day, bugs fixed/sprint)

```
┌─────────────────────────────────────┐
│  Inflow → [Stock] → Outflow         │
│                                     │
│  New bugs → [Bug Backlog] → Fixes   │
│  Requests → [Queue Depth] → Processed│
│  Hires → [Team Size] → Attrition    │
└─────────────────────────────────────┘
```

**Key insight:** Stocks change slowly even when flows change quickly. Queue depth doesn't drop instantly when you add capacity.

### 3. Delays
Time lags between cause and effect obscure relationships:
```
Code deployed → [Delay: Cache TTL] → Users see change
Feature shipped → [Delay: Adoption curve] → Metrics change  
New hire starts → [Delay: Ramp-up] → Productivity impact
```

**Danger:** Acting before feedback arrives leads to overcorrection.

### 4. Non-Linear Relationships
Small changes can have large effects (and vice versa):
```
Linear assumption: 2x traffic = 2x latency
Reality: Traffic crosses threshold → 10x latency (queue buildup)

Linear assumption: Adding engineer adds capacity
Reality: Communication overhead grows O(n²)
```

### 5. Emergent Properties
Behaviors that arise from interactions, not individual components:
- **Distributed system:** No single service is slow, but the system is slow (cascading delays)
- **Team dynamics:** No individual is toxic, but collaboration is toxic (incentive interactions)
- **Market behavior:** No actor intends a bubble, but bubble emerges

## Causal Loop Diagram Template

```
┌──────────────────────────────────────────────────────────────┐
│                    System: [Name]                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌─────────┐                        ┌─────────┐           │
│    │ Factor  │──────(+)──────────────▶│ Factor  │           │
│    │    A    │                        │    B    │           │
│    └─────────┘                        └────┬────┘           │
│         ▲                                  │                │
│         │                                  │                │
│        (-)                                (+)               │
│         │                                  │                │
│         │         ┌─────────┐              │                │
│         └─────────│ Factor  │◀─────────────┘                │
│                   │    C    │                               │
│                   └─────────┘                               │
│                                                              │
│   Legend: (+) = same direction, (-) = opposite direction    │
│   Loop type: Reinforcing / Balancing                        │
└──────────────────────────────────────────────────────────────┘
```

## Rank Interventions by Leverage and Side Effects
After mapping the system and loops, rank candidate interventions top-down. Prefer the highest-leverage point you can actually move; then check side effects before committing.

| Level (high→low) | Leverage class | Examples |
|------------------|----------------|----------|
| Goals / paradigm | Highest | Change what the system optimizes for; rethink architecture assumptions |
| Rules / information | High | CI gates, contracts, policies; surface a missing metric/signal |
| Loop structure | Medium–high | Add/strengthen balancing loops; weaken runaway reinforcing loops; shorten delays |
| Stock/flow structure | Medium | Topology, schema, connection paths |
| Buffers / parameters | Lowest | Queue sizes, timeouts, retry counts, instance counts |

**Ranking procedure:**
1. List current and proposed interventions; map each to a level above.
2. For every low-level move, ask for the higher version (more instances → fix the inefficient path; longer timeout → shorten the delay; patch each bug → make the class unrepresentable / gate it).
3. Score feasibility: can you move this point now? Cost, resistance, blast radius.
4. Pick the highest feasible leverage; if blocked, stage toward it (warn-only gate → enforce; observe metric → act on it).
5. **Side-effect check before acting:** What feeds back into what after this change? What breaks elsewhere? What delayed effect could reverse the gain (Fixes That Fail)? Prefer interventions that strengthen needed balancing loops or cut harmful reinforcing gain without creating a new commons/escalation.

## Verification Checklist
- [ ] Mapped system components, connections, stocks/flows
- [ ] Classified reinforcing vs balancing loops and named delays
- [ ] Traced symptom upstream to potential root causes
- [ ] Checked for a recurring archetype when the problem keeps returning
- [ ] Looked for emergent/interaction effects
- [ ] Ranked interventions by leverage; chose highest feasible
- [ ] Side-effect check: delayed consequences, other components, new loops

## Key Questions
- "What feeds back into what?"
- "Where are the delays in this system?"
- "What happens when this scales 10x?"
- "What would an observer see vs. what's actually happening?"
- "If I fix this here, what breaks over there?"
- "What behavior emerges that no single component intends?"
- "Where is the highest-leverage change I can actually make, and what side effects follow?"

## Meadows' Reminder
"We can't control systems or figure them out. But we can dance with them."

Systems resist simple fixes. Effective intervention requires understanding the whole, finding leverage points, and accepting that you're influencing, not controlling.
