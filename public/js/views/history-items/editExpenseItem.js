import { enrichLogDetails } from '../history/enrich.js';

export async function renderEditExpenseItem(log) {
  const actor = log?.actorName || log?.actor || 'Unknown';

  let description = log?.details?.description || '';
  let groupName = log?.details?.groupName || log?.details?.name || '';

  // Enrich for description and group name
  try {
    const d = await enrichLogDetails(log);
    description = description || d?.description || '';
    groupName = groupName || d?.groupName || '';
  } catch (_) { /* ignore */ }

  const safeDesc = (description || '(no description)').toString();
  const safeGroup = (groupName || '(no name)').toString();
  const whatHTML = `
    <span class="history-row-obj">${actor}</span> 
    <span class="history-verb-expense-update">updated</span> 
    <span class="history-row-obj">${safeDesc}</span> in 
    <span class="history-row-obj">${safeGroup}</span>
  `;

  const extras = [];

  // Date/time line
  const when = document.createElement('div');
  when.className = 'history-meta';
  const ts = new Date(log?.timestamp);
  if (!isNaN(+ts)) {
    const dateStr = ts.toLocaleDateString();
    const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    when.innerHTML = `<div>${dateStr}</div><div>${timeStr}</div>`;
  } else {
    when.textContent = '';
  }
  extras.push(when);

  return { whatHTML, extras, overrideMeta: true };
}
