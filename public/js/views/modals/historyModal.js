import { DOM } from '../../dom/domRefs.js';
import { apiRequest } from '../../api.js';
import { openHistoryItemDetails } from './historyDetailsModal.js';
import { enrichLogDetails } from '../history/enrich.js';

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

  // For expense actions, append group name on a new line
  if (log?.action === 'expense:create' || log?.action === 'expense:update' || log?.action === 'expense:delete') {
    try {
      const d = await enrichLogDetails(log);
      const gName = (d?.groupName || '').toString().trim();
      if (gName) {
        what.innerHTML = `${mainHTML}<br><span class="history-sub">in group </span><span>${gName}</span>`;
      } else {
        what.innerHTML = mainHTML;
      }
    } catch (_) { /* ignore enrich errors */ }
  } else {
    // non-expense: just main line
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
  // For group create/delete, show participants as chips (usernames) after the actor row
  if (log?.action === 'group:create' || log?.action === 'group:delete') {
    try {
      const d = await enrichLogDetails(log);
      const parts = Array.isArray(d?.participants) ? d.participants : [];
      if (parts.length > 0) {
        const membersWrap = document.createElement('div');
        membersWrap.className = 'history-row-members';

        const chips = document.createElement('div');
        chips.className = 'history-chips';

        parts.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'history-chip';
          chip.textContent = (p.username || p.name || p).toString();
          chips.appendChild(chip);
        });

        membersWrap.appendChild(chips);
        row.appendChild(membersWrap);
      }
    } catch (_) {
      // ignore enrich errors; show without chips
    }
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
