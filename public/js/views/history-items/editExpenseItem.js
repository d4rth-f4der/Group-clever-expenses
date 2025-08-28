import { enrichLogDetails } from '../history/enrich.js';

export async function renderEditExpenseItem(log) {
  const rawTitle = log.title || log.message || 'Expense updated';
  const idx = rawTitle.indexOf(':');
  const actionText = idx > -1 ? rawTitle.slice(0, idx).trim() : null;
  const restText = idx > -1 ? rawTitle.slice(idx + 1).trim() : rawTitle;

  let whatHTML = actionText ? `<span class="history-action">${actionText}:</span> ${restText}` : restText;

  try {
    const d = await enrichLogDetails(log);
    const gName = (d?.groupName || '').toString().trim();
    if (gName) {
      whatHTML = `${whatHTML}<br><span class="history-sub">in group </span><span>${gName}</span>`;
    }
  } catch (_) { /* ignore */ }

  return { whatHTML };
}
