import { DOM } from '../../dom/domRefs.js';
import { apiRequest } from '../../api.js';

export function toggleHistoryModal(show) {
  if (!DOM.historyModal) return;
  if (show) {
    DOM.historyModal.classList.remove('hidden');
  } else {
    DOM.historyModal.classList.add('hidden');
    if (DOM.historyList) DOM.historyList.innerHTML = '';
  }
}

function renderRow(log) {
  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr auto';
  row.style.gap = '8px';
  row.style.padding = '8px 10px';
  row.style.border = '1px solid #E5E7EB';
  row.style.borderRadius = '8px';
  row.style.background = '#fff';

  const left = document.createElement('div');
  const who = document.createElement('div');
  who.textContent = log.actorName || log.actor || 'Unknown';
  who.style.fontWeight = '600';
  who.style.color = '#111827';

  const what = document.createElement('div');
  what.textContent = log.title || log.message || log.action || 'change';
  what.style.color = '#374151';
  what.style.fontSize = '13px';

  left.appendChild(who);
  left.appendChild(what);

  const right = document.createElement('div');
  const ts = new Date(log.timestamp);
  right.textContent = isNaN(+ts) ? '' : ts.toLocaleString();
  right.style.color = '#6B7280';
  right.style.fontSize = '12px';

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

export async function openHistoryModal() {
  try {
    if (DOM.historyList) {
      DOM.historyList.innerHTML = '<div style="color:#6B7280;">Loading...</div>';
    }
    toggleHistoryModal(true);
    const res = await apiRequest('users/me/logs');
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
    if (!DOM.historyList) return;
    DOM.historyList.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No history yet.';
      empty.style.color = '#6B7280';
      DOM.historyList.appendChild(empty);
      return;
    }
    for (const it of items) {
      DOM.historyList.appendChild(renderRow(it));
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
