import { defaultRenderer } from './defaultRenderer.js';
import { renderGroupCreate } from './groupCreate.js';
import { renderGroupDelete } from './groupDelete.js';
import { renderExpenseCreate } from './expenseCreate.js';
import { renderExpenseDelete } from './expenseDelete.js';
import { renderExpenseUpdate } from './expenseUpdate.js';
import { enrichLogDetails } from '../enrich.js';

const map = new Map([
  ['group:create', renderGroupCreate],
  ['group:delete', renderGroupDelete],
  ['expense:create', renderExpenseCreate],
  ['expense:delete', renderExpenseDelete],
  ['expense:update', renderExpenseUpdate],
]);

export async function renderHistoryDetails(log) {
  const action = log?.action;
  const renderer = action && map.get(action);
  try {
    // Build a normalized details payload (usernames, participants, changes)
    const enriched = await enrichLogDetails(log);
    const hydrated = { ...log, details: { ...log.details, ...enriched } };
    return (renderer || defaultRenderer)(hydrated);
  } catch (e) {
    return defaultRenderer(log);
  }
}
