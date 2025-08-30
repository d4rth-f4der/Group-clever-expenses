import { DOM } from '../../dom/domRefs.js';
import { apiRequest } from '../../api.js';
import { openHistoryItemDetails } from './historyDetailsModal.js';
import { getHistoryItemRenderer } from '../history-items/index.js';
import { escapeHTML } from '../../utils/escape.js';

export function toggleHistoryModal(show) {
  if (!DOM.historyModal) return;
  if (show) {
    DOM.historyModal.classList.remove('hidden');
  } else {
    DOM.historyModal.classList.add('hidden');
    if (DOM.historyList) DOM.historyList.innerHTML = '';
  }
}

async function renderRow(log) {
  const row = document.createElement('div');
  row.className = 'history-row';
  row.addEventListener('click', () => openHistoryItemDetails(log));

  // First row: what happened (left) + timestamp (right)
  const what = document.createElement('div');
  const rawTitle = log.title || log.message || log.action || 'change';
  // Split into action: value — style action lighter
  let mainHTML = '';
  const colonIdx = rawTitle.indexOf(':');
  if (colonIdx > -1) {
    const actionText = escapeHTML(rawTitle.slice(0, colonIdx).trim());
    const restText = escapeHTML(rawTitle.slice(colonIdx + 1).trim());
    mainHTML = `<span class="history-action">${actionText}:</span> ${restText}`;
  } else {
    mainHTML = escapeHTML(rawTitle);
  }
  what.className = 'history-row-what';

  // Delegate item-specific rendering to history-items renderers
  let extras = [];
  let overrideMeta = false;
  const renderer = getHistoryItemRenderer(log?.action);
  if (renderer) {
    try {
      const res = await renderer(log);
      what.innerHTML = (res && res.whatHTML) ? res.whatHTML : mainHTML;
      if (res && Array.isArray(res.extras)) extras = res.extras;
      if (res && res.overrideMeta) overrideMeta = true;
    } catch (_) {
      what.innerHTML = mainHTML;
    }
  } else {
    what.innerHTML = mainHTML;
  }

  let right = null;
  if (!overrideMeta) {
    right = document.createElement('div');
    const ts = new Date(log.timestamp);
    if (!isNaN(+ts)) {
      const dateStr = ts.toLocaleDateString();
      const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      right.innerHTML = `<div>${dateStr}</div><div>${timeStr}</div>`;
    } else {
      right.textContent = '';
    }
    right.className = 'history-row-right';
  }

  // Second row: who (actor), spans both columns
  let who = null;
  if (!overrideMeta) {
    who = document.createElement('div');
    who.textContent = log.actorName || log.actor || 'Unknown';
    who.className = 'history-row-who history-row-actor';
  }

  row.appendChild(what);
  if (right) row.appendChild(right);
  if (who) row.appendChild(who);
  // Append any extras returned by per-item renderer after the actor row
  if (extras && extras.length) {
    extras.forEach(el => { if (el) row.appendChild(el); });
  }
  return row;
}

export async function openHistoryModal() {
  try {
    if (DOM.historyList) {
      const loading = document.createElement('div');
      loading.className = 'history-loading';
      loading.textContent = 'Loading...';
      DOM.historyList.innerHTML = '';
      DOM.historyList.appendChild(loading);
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
      const err = document.createElement('div');
      err.className = 'inline-error';
      err.textContent = e?.message || 'Failed to load history';
      DOM.historyList.innerHTML = '';
      DOM.historyList.appendChild(err);
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
