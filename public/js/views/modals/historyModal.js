import { DOM } from '../../dom/domRefs.js';
import { apiRequest } from '../../api.js';
import { openHistoryItemDetails } from './historyDetailsModal.js';
import { getHistoryItemRenderer } from '../history-items/index.js';

export function toggleHistoryModal(show) {
  if (!DOM.historyModal) return;
  if (show) {
    DOM.historyModal.classList.remove('hidden');
  } else {
    DOM.historyModal.classList.add('hidden');
    if (DOM.historyList) DOM.historyList.innerHTML = '';
  }
}

function actionClass(action) {
  switch (action) {
    case 'group:create': return 'history-row--group-create';
    case 'group:delete': return 'history-row--group-delete';
    case 'expense:create': return 'history-row--expense-create';
    case 'expense:update': return 'history-row--expense-update';
    case 'expense:delete': return 'history-row--expense-delete';
    default: return '';
  }
}

async function renderRow(log) {
  const row = document.createElement('div');
  row.className = `history-row ${actionClass(log?.action)}`.trim();
  row.addEventListener('click', () => openHistoryItemDetails(log));

  // First row: what happened (left) + timestamp (right)
  const what = document.createElement('div');
  const rawTitle = log.title || log.message || log.action || 'change';
  // Split into action: value — style action lighter
  let mainHTML = '';
  const colonIdx = rawTitle.indexOf(':');
  if (colonIdx > -1) {
    const actionText = rawTitle.slice(0, colonIdx).trim();
    const restText = rawTitle.slice(colonIdx + 1).trim();
    mainHTML = `<span class="history-action">${actionText}:</span> ${restText}`;
  } else {
    mainHTML = rawTitle;
  }
  what.className = 'history-row-what';

  // Delegate item-specific rendering to history-items renderers
  let extras = [];
  const renderer = getHistoryItemRenderer(log?.action);
  if (renderer) {
    try {
      const res = await renderer(log);
      what.innerHTML = (res && res.whatHTML) ? res.whatHTML : mainHTML;
      if (res && Array.isArray(res.extras)) extras = res.extras;
    } catch (_) {
      what.innerHTML = mainHTML;
    }
  } else {
    what.innerHTML = mainHTML;
  }

  const right = document.createElement('div');
  const ts = new Date(log.timestamp);
  right.textContent = isNaN(+ts) ? '' : ts.toLocaleString();
  right.className = 'history-row-right';

  // Second row: who (actor), spans both columns
  const who = document.createElement('div');
  who.textContent = log.actorName || log.actor || 'Unknown';
  who.className = 'history-row-who history-row-actor';

  row.appendChild(what);
  row.appendChild(right);
  row.appendChild(who);
  // Append any extras returned by per-item renderer after the actor row
  if (extras && extras.length) {
    extras.forEach(el => { if (el) row.appendChild(el); });
  }
  return row;
}

export async function openHistoryModal() {
  try {
    if (DOM.historyList) {
      DOM.historyList.innerHTML = '<div class="history-loading">Loading...</div>';
    }
    toggleHistoryModal(true);
    const res = await apiRequest('users/me/logs');
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
    if (!DOM.historyList) return;
    DOM.historyList.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No history yet.';
      DOM.historyList.appendChild(empty);
      return;
    }
    for (const it of items) {
      const el = await renderRow(it);
      DOM.historyList.appendChild(el);
    }
  } catch (e) {
    if (DOM.historyList) {
      DOM.historyList.innerHTML = `<div class="inline-error">${e?.message || 'Failed to load history'}</div>`;
    }
  }
}

// wire close buttons once
if (DOM.closeHistoryBtn) {
  DOM.closeHistoryBtn.addEventListener('click', () => toggleHistoryModal(false));
}
if (DOM.historyCloseBtn) {
  DOM.historyCloseBtn.addEventListener('click', () => toggleHistoryModal(false));
}
