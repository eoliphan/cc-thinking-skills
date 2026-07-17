'use strict';

const { mcnemar } = require('./stats');

const AGENTIC_ARMS = Object.freeze([
  'dynamic_loose',
  'dynamic_typed',
  'dynamic_typed_self_checked',
  'workflow_loose',
  'workflow_typed',
  'workflow_none_typed',
  'workflow_typed_self_checked',
]);

const AGENTIC_CONTRASTS = Object.freeze([
  ['workflow_loose_vs_dynamic_loose', 'workflow_loose', 'dynamic_loose'],
  ['workflow_typed_vs_workflow_loose', 'workflow_typed', 'workflow_loose'],
  ['workflow_typed_vs_workflow_none_typed', 'workflow_typed', 'workflow_none_typed'],
  ['workflow_typed_self_checked_vs_workflow_typed', 'workflow_typed_self_checked', 'workflow_typed'],
  ['dynamic_typed_self_checked_vs_dynamic_typed', 'dynamic_typed_self_checked', 'dynamic_typed'],
  ['workflow_typed_self_checked_vs_dynamic_typed', 'workflow_typed_self_checked', 'dynamic_typed'],
  ['workflow_typed_self_checked_vs_workflow_none_typed', 'workflow_typed_self_checked', 'workflow_none_typed'],
]);

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractRouteFromText(text, knownSkillNames) {
  const hay = String(text || '');
  const hits = [];
  for (let order = 0; order < knownSkillNames.length; order++) {
    const name = knownSkillNames[order];
    const bare = name.replace(/^thinking-/, '');
    const exact = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(name)}([^A-Za-z0-9]|$)`, 'i');
    const short = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(bare)}([^A-Za-z0-9]|$)`, 'i');
    const exactMatch = exact.exec(hay);
    const shortMatch = short.exec(hay);
    const indexes = [exactMatch, shortMatch].filter(Boolean).map(match => match.index + (match[1] ? match[1].length : 0));
    if (indexes.length) hits.push({ name, index: Math.min(...indexes), order });
  }
  hits.sort((a, b) => (a.index - b.index) || (a.order - b.order));
  return hits.map(hit => hit.name);
}

function evalBranchRules(rules, afterNodeId, answersByDecisionKey, completedNodeIds, queuedNodeIds) {
  const completed = completedNodeIds instanceof Set ? completedNodeIds : new Set(completedNodeIds || []);
  const queued = queuedNodeIds instanceof Set ? queuedNodeIds : new Set(queuedNodeIds || []);
  const out = [];
  for (const rule of rules || []) {
    if (rule.after !== afterNodeId) continue;
    if (!Object.prototype.hasOwnProperty.call(answersByDecisionKey, rule.if.decision_key)) {
      throw new Error(`missing branch decision answer for ${rule.if.decision_key}`);
    }
    const chosen = answersByDecisionKey[rule.if.decision_key] === rule.if.equals ? rule.then : rule.else;
    for (const nodeId of chosen || []) {
      if (completed.has(nodeId) || queued.has(nodeId) || out.includes(nodeId)) continue;
      out.push(nodeId);
    }
  }
  return out;
}

function scoreRoute(selectedRoute, goldRoute) {
  const selected = Array.isArray(selectedRoute) ? selectedRoute : [];
  const gold = Array.isArray(goldRoute) ? goldRoute : [];
  const routeExact = selected.length === gold.length && selected.every((value, index) => value === gold[index]);
  const selectedSet = new Set(selected);
  const goldSet = new Set(gold);
  const union = new Set([...selectedSet, ...goldSet]);
  let intersection = 0;
  for (const value of selectedSet) if (goldSet.has(value)) intersection++;
  return {
    route_exact: routeExact,
    route_jaccard: union.size === 0 ? 1 : intersection / union.size,
  };
}

function expectedBranch(rule, goldSet) {
  const thenBranch = rule.then || [];
  const elseBranch = rule.else || [];
  const thenIncluded = thenBranch.filter(id => goldSet.has(id));
  const elseIncluded = elseBranch.filter(id => goldSet.has(id));
  const thenMatches = thenIncluded.length === thenBranch.length && elseIncluded.length === 0;
  const elseMatches = elseIncluded.length === elseBranch.length && thenIncluded.length === 0;

  if (thenMatches && !elseMatches) return thenBranch;
  if (elseMatches && !thenMatches) return elseBranch;
  if (thenBranch.length === 0 && elseIncluded.length === 0) return thenBranch;
  if (elseBranch.length === 0 && thenIncluded.length === 0) return elseBranch;
  return [];
}

function scoreCaseResult(workflowCase, armResult) {
  const nodesById = new Map((workflowCase.nodes || []).map(node => [node.node_id, node]));
  const goldRoute = (workflowCase.gold_node_ids || []).map(id => {
    const node = nodesById.get(id);
    if (!node) throw new Error(`${workflowCase.id || 'case'}: unknown gold node ${id}`);
    return node.skill;
  });
  const selectedRoute = Array.isArray(armResult.selected_route) ? armResult.selected_route : [];
  const selectedNodeIds = Array.isArray(armResult.selected_node_ids)
    ? armResult.selected_node_ids
    : (Array.isArray(armResult.scheduled_node_ids)
      ? armResult.scheduled_node_ids
      : (Array.isArray(armResult.node_answers)
        ? armResult.node_answers.map(answer => answer && answer.node_id).filter(Boolean)
        : []));
  const goldNodeIds = workflowCase.gold_node_ids || [];
  const route = scoreRoute(selectedRoute, goldRoute);
  const nodeRoute = scoreRoute(selectedNodeIds, goldNodeIds);
  const selectedSet = new Set(selectedNodeIds);
  const goldSet = new Set(goldNodeIds);
  const overRoutingNodeIds = selectedNodeIds.filter(id => !goldSet.has(id));
  const underRoutingNodeIds = goldNodeIds.filter(id => !selectedSet.has(id));
  const answers = new Map();
  for (const answer of armResult.node_answers || []) {
    if (answer && typeof answer.node_id === 'string' && typeof answer.answer === 'boolean') {
      answers.set(answer.node_id, answer.answer);
    }
  }

  let correct = 0;
  for (const nodeId of goldNodeIds) {
    const node = nodesById.get(nodeId);
    if (node && answers.get(nodeId) === node.label) correct++;
  }
  const goldCount = goldNodeIds.length;
  const nodeAcc = goldCount ? correct / goldCount : 0;
  const allGoldCorrect = goldCount > 0 && correct === goldCount;
  const branchDecisions = [];
  for (const rule of workflowCase.workflow_branch_rules || []) {
    const afterNode = nodesById.get(rule.after);
    const answer = afterNode ? answers.get(rule.after) : undefined;
    if (typeof answer !== 'boolean') continue;
    const actual = answer === rule.if.equals ? (rule.then || []) : (rule.else || []);
    const expected = expectedBranch(rule, goldSet);
    branchDecisions.push({
      after: rule.after,
      decision_key: rule.if.decision_key,
      actual,
      expected,
      correct: JSON.stringify(actual) === JSON.stringify(expected),
    });
  }
  const branchDecisionAcc = branchDecisions.length
    ? branchDecisions.filter(branch => branch.correct).length / branchDecisions.length
    : null;
  const parseOk = armResult.parse_ok !== false;

  return {
    selected_route: selectedRoute,
    gold_route: goldRoute,
    selected_node_ids: selectedNodeIds,
    gold_node_ids: goldNodeIds,
    route_exact: route.route_exact,
    route_jaccard: route.route_jaccard,
    node_route_exact: nodeRoute.route_exact,
    node_route_jaccard: nodeRoute.route_jaccard,
    over_routing_count: overRoutingNodeIds.length,
    under_routing_count: underRoutingNodeIds.length,
    over_routing_node_ids: overRoutingNodeIds,
    under_routing_node_ids: underRoutingNodeIds,
    branch_decisions: branchDecisions,
    branch_decision_acc: branchDecisionAcc,
    node_acc: nodeAcc,
    parse_ok: parseOk,
    case_success: route.route_exact
      && nodeRoute.route_exact
      && overRoutingNodeIds.length === 0
      && underRoutingNodeIds.length === 0
      && (branchDecisionAcc === null || branchDecisionAcc === 1)
      && allGoldCorrect
      && parseOk,
  };
}

function rate(items, predicate) {
  return items.length ? +(items.filter(predicate).length / items.length).toFixed(3) : 0;
}

function summarizeOne(items) {
  const n = items.length;
  const branchRows = items.filter(row => typeof row.branch_decision_acc === 'number');
  return {
    n,
    case_success_rate: rate(items, row => row.case_success),
    route_exact_rate: rate(items, row => row.route_exact),
    route_jaccard_avg: n ? +(items.reduce((sum, row) => sum + (row.route_jaccard || 0), 0) / n).toFixed(3) : 0,
    over_routing_avg: n ? +(items.reduce((sum, row) => sum + (row.over_routing_count || 0), 0) / n).toFixed(3) : 0,
    under_routing_avg: n ? +(items.reduce((sum, row) => sum + (row.under_routing_count || 0), 0) / n).toFixed(3) : 0,
    branch_decision_acc: branchRows.length
      ? +(branchRows.reduce((sum, row) => sum + row.branch_decision_acc, 0) / branchRows.length).toFixed(3)
      : null,
    node_acc: n ? +(items.reduce((sum, row) => sum + (row.node_acc || 0), 0) / n).toFixed(3) : 0,
    parse_ok_rate: rate(items, row => row.parse_ok !== false),
  };
}

function summarizeArms(scoredCases, arms) {
  const out = {};
  for (const arm of arms) {
    const items = scoredCases.map(row => row.by_arm && row.by_arm[arm]).filter(Boolean);
    const summary = summarizeOne(items);
    const strata = {};
    for (const workflowCase of scoredCases) {
      const result = workflowCase.by_arm && workflowCase.by_arm[arm];
      if (!result) continue;
      const key = `${workflowCase.stability}|${workflowCase.branching}|${workflowCase.novelty}`;
      (strata[key] ||= []).push(result);
    }
    summary.by_stratum = Object.fromEntries(Object.entries(strata).map(([key, rows]) => [key, summarizeOne(rows)]));
    out[arm] = summary;
  }
  return out;
}

function contrast(scoredCases, left, right) {
  const pairs = scoredCases
    .map(workflowCase => [workflowCase.by_arm && workflowCase.by_arm[left], workflowCase.by_arm && workflowCase.by_arm[right]])
    .filter(([leftResult, rightResult]) => leftResult && rightResult);
  const leftWins = pairs.filter(([leftResult, rightResult]) => leftResult.case_success && !rightResult.case_success).length;
  const rightWins = pairs.filter(([leftResult, rightResult]) => !leftResult.case_success && rightResult.case_success).length;
  const leftRate = pairs.length ? pairs.filter(([leftResult]) => leftResult.case_success).length / pairs.length : 0;
  const rightRate = pairs.length ? pairs.filter(([, rightResult]) => rightResult.case_success).length / pairs.length : 0;
  return {
    delta_case_success_pp: +((leftRate - rightRate) * 100).toFixed(1),
    mcnemar_p: +mcnemar(leftWins, rightWins).toFixed(3),
    discordant: leftWins + rightWins,
    left_wins: leftWins,
    right_wins: rightWins,
  };
}

function computeContrasts(scoredCases, arms, contrasts = AGENTIC_CONTRASTS) {
  const available = new Set(arms);
  const out = {};
  for (const [name, left, right] of contrasts) {
    if (available.has(left) && available.has(right)) out[name] = contrast(scoredCases, left, right);
  }
  return out;
}

module.exports = {
  AGENTIC_ARMS,
  AGENTIC_CONTRASTS,
  extractRouteFromText,
  evalBranchRules,
  scoreRoute,
  scoreCaseResult,
  summarizeOne,
  summarizeArms,
  contrast,
  computeContrasts,
};
