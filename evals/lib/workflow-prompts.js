'use strict';

const { neutralFiller, triggerSummary, wordCount } = require('./conditions');


/** Concise deterministic workflows for testing workflow-form instructions vs full SKILL.md guides. */

const WORKFLOW_FRIENDLY_SKILLS = [
  'thinking-socratic',
  'thinking-cynefin',
  'thinking-reversibility',
  'thinking-margin-of-safety',
  'thinking-map-territory',
  'thinking-pre-mortem',
  'thinking-red-team',
  'thinking-scientific-method',
  'thinking-kepner-tregoe',
  'thinking-five-whys-plus',
];

const OBJECTIVE_AUTHORED_COVERAGE = [
  'thinking-socratic',
  'thinking-cynefin',
  'thinking-reversibility',
  'thinking-margin-of-safety',
  'thinking-map-territory',
  'thinking-pre-mortem',
  'thinking-red-team',
  'thinking-scientific-method',
  'thinking-kepner-tregoe',
  'thinking-five-whys-plus',
];

const WORKFLOW_PROMPTS = {
  'thinking-socratic': `Use this workflow before proposing a solution:\n1. Restate the concrete decision to be made.\n2. List the request's hidden assumptions and undefined terms.\n3. Identify what evidence would distinguish the stated solution from alternatives.\n4. If a missing answer would change the work, ask that question before designing; otherwise proceed with the smallest justified next step.\n5. End with the questions or next action that prevents guessing.`,

  'thinking-cynefin': `Use this workflow to choose the operating mode:\n1. Classify the situation as clear, complicated, complex, chaotic, or confused.\n2. If clear, apply known best practice directly.\n3. If complicated, analyze with expertise before acting.\n4. If complex, run safe-to-fail probes and learn before scaling.\n5. If chaotic, stabilize first, then reassess.\n6. State the classification and the matching next action.`,

  'thinking-reversibility': `Use this workflow before deciding how much deliberation is needed:\n1. Decide whether the action is a one-way door or two-way door.\n2. Name what would make reversal costly: data loss, contracts, user trust, migration, lock-in, safety, or legal exposure.\n3. If two-way, prefer a fast bounded trial.\n4. If one-way, look for canaries, flags, backups, staged rollout, rollback, or delay.\n5. Recommend the reversible version of the decision when possible.`,

  'thinking-margin-of-safety': `Use this workflow for estimates, capacity, limits, and commitments:\n1. Identify the expected load, estimate, or requirement.\n2. Identify the cost of being under the requirement versus over it.\n3. Check variance, unknowns, tails, and correlated failure modes.\n4. Choose a buffer proportional to downside risk, not to optimism.\n5. State whether the margin is adequate and what buffer or contingency is needed.`,

  'thinking-map-territory': `Use this workflow when a plan depends on a model, doc, dashboard, test, or assumption:\n1. State the map being relied on.\n2. Identify the territory observation that would prove or disprove it.\n3. Prefer direct evidence from running code, production behavior, logs, users, or data.\n4. If territory contradicts the map, update the conclusion and stop reasoning from the stale description.\n5. Recommend the next verification or correction.`,

  'thinking-pre-mortem': `Use this workflow before a launch, migration, or plan commitment, or when optimism may hide failure paths:\n1. Assume it is later and the plan has failed badly, or ask how you would guarantee failure.\n2. Write the most plausible high-probability or high-damage failure story in concrete terms.\n3. Separate preventable/controllable causes from acceptable residual risks.\n4. Convert the top preventable causes into launch blockers, requirements, constraints, tests, or monitoring.\n5. Recommend the simplest changes that make failure less likely before proceeding.`,

  'thinking-red-team': `Use this workflow for security-sensitive code, auth, APIs, data, and permissions:\n1. Identify assets, trust boundaries, actors, and attacker goals.\n2. Enumerate concrete attack paths, not generic concerns.\n3. Check authn/authz, input handling, secrets, data exposure, rate limits, and unsafe defaults.\n4. Keep only findings with a reproducible exploit path and realistic impact.\n5. Report severity, exploit steps, and the minimal fix.`,

  'thinking-scientific-method': `Use this workflow to debug an uncertain symptom or choose among competing causes:\n1. State the observed symptom precisely.\n2. Generate competing falsifiable hypotheses and count the assumptions each requires.\n3. Rank them by prior likelihood, assumption count, and cheapness of discriminating tests; prefer the least-assumptive hypothesis that fits known facts.\n4. Run or propose the cheapest observation that would rule hypotheses in or out; escalate only when evidence rules out the simple explanation.\n5. Update based on evidence and choose the next test or fix, avoiding exotic causes until boring ones fail.`,

  'thinking-kepner-tregoe': `Use this workflow for selective defects:\n1. Define the deviation from expected behavior.\n2. Map what IS affected by object, location, time, and extent.\n3. Map what IS NOT affected but could have been.\n4. Compare the boundary and ask what changed there.\n5. Test the cause that explains all IS facts and none of the IS-NOT facts.`,

  'thinking-five-whys-plus': `Use this workflow when a proximate fault is known but the systemic root is not:\n1. Start with the observed fault and immediate cause.\n2. Ask why each cause was possible, grounding each answer in evidence.\n3. At every step, test whether fixing that cause would prevent recurrence.\n4. Stop at the first actionable systemic cause with a clear counterfactual.\n5. Recommend the prevention, not just the patch.`,

  'thinking-second-order': `Use this workflow when a decision has effects beyond the immediate outcome:\n1. State the decision and its intended first-order effect.\n2. Ask "and then what?" — trace how people, systems, or incentives will adapt.\n3. Identify reinforcing or balancing feedback loops that amplify or dampen the effect.\n4. Consider second and third-order consequences across different time horizons.\n5. Decide whether the goal survives the downstream cascade before committing.`,
};

function workflowPromptFor(skillName) {
  const prompt = WORKFLOW_PROMPTS[skillName];
  if (!prompt) throw new Error(`missing workflow prompt for ${skillName}`);
  return prompt;
}

function padToWords(content, targetWords) {
  const have = wordCount(content);
  return targetWords > have ? `${content}\n\nAdditional neutral context for length control:\n${neutralFiller(targetWords - have)}` : content;
}

function buildFactorialPrompt(form, problemText, skillContent, skillName, options = {}) {
  const workflow = workflowPromptFor(skillName);
  const targetWords = options.targetWords || Math.max(wordCount(skillContent), wordCount(workflow), wordCount(triggerSummary(skillContent, skillName)));
  const tail = '\n\nThink carefully and give your best, decision-useful answer.';
  const typedVerifier = options.behavioralOutput
    ? 'Before giving your final answer, self-check it against the exact decision instruction above: does your answer follow from the steps? If not, revise. Then give your full reasoning and conclusion as prose.'
    : 'Use the same typed decision schema and self-check for this answer: first decide whether the correct answer is true/false, then verify it against the exact decision instruction and problem facts. Return a single JSON object only, with no markdown or extra prose: { "answer": true | false, "rationale": "<one concise sentence>" }.';
  let body;
  if (form === 'full_skill_prose') {
    body = `Use the following thinking-skill guide to structure your reasoning. Apply it substantively; do not merely name it.\n\n=== THINKING SKILL ===\n${skillContent}\n=== END THINKING SKILL ===`;
  } else if (form === 'full_skill_workflow') {
    body = `Execute the following thinking-skill guide as a deterministic workflow. Turn its guidance into explicit ordered steps while preserving the full substance of the guide.\n\n=== THINKING SKILL CONTENT TO EXECUTE AS WORKFLOW ===\n${skillContent}\n=== END THINKING SKILL CONTENT ===`;
  } else if (form === 'concise_skill_prose') {
    body = `Consider this concise thinking approach and apply it substantively if relevant.\n\n=== CONCISE THINKING SKILL ===\n${triggerSummary(skillContent, skillName)}\n=== END CONCISE THINKING SKILL ===`;
  } else if (form === 'concise_workflow') {
    body = `Use this deterministic workflow to structure your reasoning. Follow the steps substantively; do not merely name the workflow.\n\n=== WORKFLOW ===\n${workflow}\n=== END WORKFLOW ===`;
  } else if (form === 'workflow_validated') {
    body = `Use this deterministic workflow to structure your reasoning. Follow the steps substantively; do not merely name the workflow.\n\n=== WORKFLOW ===\n${workflow}\n=== END WORKFLOW ===\n\n=== SELF-CHECK VERIFIER ===\n${typedVerifier}\n=== END SELF-CHECK VERIFIER ===`;
  } else if (form === 'full_skill_typed_verified') {
    body = `Use the following thinking-skill guide to structure your reasoning. Apply it substantively; do not merely name it.\n\n=== THINKING SKILL ===\n${skillContent}\n=== END THINKING SKILL ===\n\n=== SELF-CHECK VERIFIER ===\n${typedVerifier}\n=== END SELF-CHECK VERIFIER ===`;
  } else if (form === 'placebo') {
    body = 'Some general notes before the task:';
  } else {
    throw new Error(`unknown factorial prompt form ${form}`);
  }
  const padded = form === 'placebo'
    ? `${body}\n\n${neutralFiller(targetWords)}`
    : padToWords(body, targetWords);
  return `${padded}\n\nNow address this problem:\n\n${problemText}${tail}`;
}

function factorialForms() {
  return ['full_skill_prose', 'full_skill_workflow', 'concise_skill_prose', 'concise_workflow', 'placebo'];
}

function objectiveForms() {
  return ['placebo', 'full_skill_prose', 'concise_workflow', 'workflow_validated', 'full_skill_typed_verified'];
}

module.exports = {
  WORKFLOW_FRIENDLY_SKILLS,
  OBJECTIVE_AUTHORED_COVERAGE,
  WORKFLOW_PROMPTS,
  workflowPromptFor,
  padToWords,
  buildFactorialPrompt,
  factorialForms,
  objectiveForms,
};
