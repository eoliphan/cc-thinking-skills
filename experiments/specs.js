'use strict';

/**
 * Registry of lift experiments (from analysis/LIFT-HYPOTHESES.md) + the
 * interventions that mutate skills inside a worktree. `run:true` ones are
 * executed end-to-end; the rest are registered in the ledger as 'planned' so
 * every hypothesis is tracked with a unique id.
 */

const fs = require('fs');
const path = require('path');
const { droidExecAsync } = require('../evals/lib/droid');

function skillFile(root, short) { return path.join(root, 'skills', 'thinking-' + short.replace(/^thinking-/, ''), 'SKILL.md'); }
function splitFrontmatter(md) {
  const m = md.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: md };
}

// --- interventions (mutate worktree skills in place) ---

// L1: replace a conceptual skill's long body with a compact trigger card.
async function conceptualToTrigger(root, skills) {
  for (const s of skills) {
    const f = skillFile(root, s);
    const md = fs.readFileSync(f, 'utf8');
    const { fm } = splitFrontmatter(md);
    const title = (md.match(/^#\s+(.+)$/m) || [, s])[1];
    const core = (md.match(/\*\*Core Principle:\*\*\s*(.+)/) || [, ''])[1].trim();
    const desc = (md.match(/description:\s*(.+)/) || [, ''])[1].trim();
    const whenBullets = (md.match(/## When to Use\n([\s\S]*?)(\n##|\n$)/) || [, ''])[1]
      .split('\n').filter(l => l.trim().startsWith('-')).slice(0, 4).join('\n');
    const trigger = `${fm}# ${title}\n\n${desc}\n\n**Core Principle:** ${core || desc}\n\n## When to Use\n${whenBullets || '- ' + desc}\n\n(Trigger card — apply the model directly; do not narrate the framework.)\n`;
    fs.writeFileSync(f, trigger);
  }
}

// L2: rewrite a skill for an AI-agent consumer (strip human stage-directions,
// reframe around LLM failure modes, add explicit stop conditions).
async function llmNativeRewrite(root, skills) {
  for (const s of skills) {
    const f = skillFile(root, s);
    const md = fs.readFileSync(f, 'utf8');
    const { fm, body } = splitFrontmatter(md);
    const prompt = `Rewrite the following thinking-skill guide so it is optimal for an autonomous AI CODING/REASONING AGENT (not a human in a meeting). Requirements:
- Remove human-only stage directions ("gather the team", "project to age 80", "silent brainstorming", "your gut feeling").
- Reframe around how LLMs actually fail (sycophancy to the user's framing, recency/anchoring on the prompt, fabricating specific numbers/probabilities, over-confident calibration), not human cognition.
- Add an explicit "## When NOT to Use / Stop Conditions" section: when the agent should skip this and just answer directly.
- Add a "do not fabricate facts or invent precise numbers you don't have" guard where relevant.
- Keep it concrete and tighter than the original; keep useful steps/examples.
Return ONLY the markdown BODY (no YAML frontmatter, no preamble).

ORIGINAL BODY:
${body}`;
    const r = await droidExecAsync({ model: 'gpt-5.5-pro', effort: 'high', prompt, timeoutMs: 600000 });
    const newBody = (r.ok && r.text && r.text.length > 200) ? r.text.replace(/^```\w*\n?|```$/g, '').trim() : body;
    fs.writeFileSync(f, fm + newBody + '\n');
  }
}

const INTERVENTIONS = { 'conceptual-to-trigger': conceptualToTrigger, 'llm-native-rewrite': llmNativeRewrite };

const SPECS = [
  { hypothesis: 'L1', title: 'Bifurcation: conceptual skills → trigger cards', run: true,
    intervention: 'conceptual-to-trigger', skills: ['scientific-method', 'five-whys-plus', 'pre-mortem', 'systems'],
    description: 'Replace verbose conceptual skills the model already knows with a 2-3 sentence trigger card; test trigger >= full file.' },
  { hypothesis: 'L2', title: 'LLM-native rewrite of human-artifact skills', run: true,
    intervention: 'llm-native-rewrite', skills: ['reversibility', 'probabilistic', 'circle-of-competence'],
    description: 'Strip human stage-directions, reframe around LLM failure modes, add stop conditions + no-fabrication guards.' },
  { hypothesis: 'L3', title: 'Procedural skills as executable checklists', run: false,
    intervention: 'executable-checklist', skills: ['probabilistic', 'pre-mortem', 'opportunity-cost'],
    description: 'Convert procedural skills to inputs→steps→stop→answer-template; planned (needs intervention impl).' },
  { hypothesis: 'L4', title: 'Universal "When NOT to use" boundaries', run: false,
    intervention: 'add-boundaries', skills: ['ALL'],
    description: 'Class-B: measurable only with an expanded distractor eval (off-target problems).' },
  { hypothesis: 'L5', title: 'Consolidate 5 overlap clusters', run: false,
    intervention: 'consolidate-clusters', skills: ['probabilistic', 'pre-mortem', 'model-router'],
    description: 'Merge unanimous clusters; mainly improves routing discrimination (Class-B).' },
  { hypothesis: 'VGATE', title: 'Post-skill verifier / reversion gate', run: false,
    intervention: 'harness-verifier', skills: [],
    description: 'GPT unique idea: a no-framework verifier pass reverts framework-theater outputs. Harness change, not skill edit.' },
  { hypothesis: 'APULL', title: 'Active-pull consult_mental_model tool', run: false,
    intervention: 'architecture-active-pull', skills: [],
    description: 'Gemini unique idea: on-demand tool instead of auto-injection. Architecture change; needs Class-B eval.' },
];

module.exports = { SPECS, INTERVENTIONS };
