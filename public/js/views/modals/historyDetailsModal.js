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
  const loadingDiv = document.createElement('div');
  loadingDiv.style.color = '#6B7280';
  loadingDiv.textContent = 'Loading...';
  DOM.historyDetailsContent.innerHTML = '';
  DOM.historyDetailsContent.appendChild(loadingDiv);
  toggleHistoryDetailsModal(true);
  try {
    if (DOM.historyDetailsTitle) {
      DOM.historyDetailsTitle.textContent = buildHistoryTitle(log);
    }
    const content = await renderHistoryDetails(log);
    DOM.historyDetailsContent.innerHTML = '';
    DOM.historyDetailsContent.appendChild(content);
  } catch (e) {
    const err = document.createElement('div');
    err.className = 'inline-error';
    err.textContent = e?.message || 'Failed to render details';
    DOM.historyDetailsContent.innerHTML = '';
    DOM.historyDetailsContent.appendChild(err);
  }
}

// Close button
if (DOM.closeHistoryDetailsBtn) {
  DOM.closeHistoryDetailsBtn.addEventListener('click', () => toggleHistoryDetailsModal(false));
}
