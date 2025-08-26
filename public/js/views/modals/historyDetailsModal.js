import { DOM } from '../../dom/domRefs.js';
import { renderHistoryDetails, buildHistoryTitle } from '../history/renderers/index.js';

export function toggleHistoryDetailsModal(show) {
  if (!DOM.historyDetailsModal) return;
  if (show) {
    DOM.historyDetailsModal.classList.remove('hidden');
  } else {
    DOM.historyDetailsModal.classList.add('hidden');
    if (DOM.historyDetailsContent) DOM.historyDetailsContent.innerHTML = '';
    if (DOM.historyDetailsTitle) DOM.historyDetailsTitle.textContent = '';
  }
}

export async function openHistoryItemDetails(log) {
  if (!DOM.historyDetailsContent) return;
  DOM.historyDetailsContent.innerHTML = '<div style="color:#6B7280;">Loading...<\/div>';
  toggleHistoryDetailsModal(true);
  try {
    if (DOM.historyDetailsTitle) {
      DOM.historyDetailsTitle.textContent = buildHistoryTitle(log);
    }
    const content = await renderHistoryDetails(log);
    DOM.historyDetailsContent.innerHTML = '';
    DOM.historyDetailsContent.appendChild(content);
  } catch (e) {
    DOM.historyDetailsContent.innerHTML = `<div class="inline-error">${e?.message || 'Failed to render details'}<\/div>`;
  }
}

// Close button
if (DOM.closeHistoryDetailsBtn) {
  DOM.closeHistoryDetailsBtn.addEventListener('click', () => toggleHistoryDetailsModal(false));
}
