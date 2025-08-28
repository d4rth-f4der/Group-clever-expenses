import { renderCreateGroupItem } from './createGroupItem.js';
import { renderDeleteGroupItem } from './deleteGroupItem.js';
import { renderCreateExpenseItem } from './createExpenseItem.js';
import { renderEditExpenseItem } from './editExpenseItem.js';
import { renderDeleteExpenseItem } from './deleteExpenseItem.js';

const map = new Map([
  ['group:create', renderCreateGroupItem],
  ['group:delete', renderDeleteGroupItem],
  ['expense:create', renderCreateExpenseItem],
  ['expense:update', renderEditExpenseItem],
  ['expense:delete', renderDeleteExpenseItem],
]);

export function getHistoryItemRenderer(action) {
  return map.get(action) || null;
}
