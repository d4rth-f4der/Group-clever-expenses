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

export function buildHistoryTitle(log) {
  const action = log?.action || '';
  const d = log?.details || {};
  const desc = d.description || log?.message || log?.title;
  switch (action) {
    case 'group:create':
      return `Group created: ${d.name || '(no name)'}`;
    case 'group:delete':
      return `Group deleted: ${d.name || '(no name)'}`;
    case 'expense:create':
      return `Expense created: ${desc || '(no description)'}`;
    case 'expense:delete':
      return `Expense deleted: ${desc || '(no description)'}`;
    case 'expense:update':
      return `Expense updated: ${desc || '(no description)'}`;
    default:
      return log?.title || log?.message || action || 'History item';
  }
}

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
