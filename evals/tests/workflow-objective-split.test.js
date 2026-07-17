'use strict';

// SPLIT is read from env at module load, so this file sets it BEFORE requiring
// the runner. It runs in its own process under `node --test`, isolated from
// workflow-objective.test.js (which loads the runner without SPLIT).
process.env.SPLIT = 'heldout';

const test = require('node:test');
const assert = require('node:assert');
const { loadItems } = require('../run-workflow-objective.js');

test('SPLIT=heldout restricts loadItems to heldout rows only', () => {
  const items = loadItems('thinking-socratic');
  assert.ok(items.length > 0, 'expected at least one heldout row');
  assert.ok(items.every(i => i.split === 'heldout'), 'every row must carry split=heldout');
});

test('SPLIT filter applies before LIMIT_PER_SKILL and keeps schema fields', () => {
  const items = loadItems('thinking-scientific-method');
  assert.ok(items.every(i => i.split === 'heldout'));
  assert.ok(items.every(i => typeof i.label === 'boolean'));
  assert.ok(items.every(i => i.cluster_id));
});
