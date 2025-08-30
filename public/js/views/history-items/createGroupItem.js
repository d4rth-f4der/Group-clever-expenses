import { enrichLogDetails } from '../history/enrich.js';
import { escapeHTML } from '../../utils/escape.js';

export async function renderCreateGroupItem(log) {
  const actor = log?.actorName || log?.actor || 'Unknown';
  let groupName = log?.details?.name || '';

  // Try to enrich to get group name and participants
  let participants = [];
  try {
    const d = await enrichLogDetails(log);
    groupName = groupName || d?.groupName || '';
    participants = Array.isArray(d?.participants) ? d.participants : [];
  } catch (_) { /* ignore */ }

  const safeActor = escapeHTML(actor);
  const safeGroup = escapeHTML(groupName || '(no name)');
  const whatHTML = `
    <span class="history-row-obj">${safeActor}</span> 
    <span class="history-verb-group-create">created group</span> 
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

  // Participants chips line
  if (participants.length) {
    const membersWrap = document.createElement('div');
    membersWrap.className = 'history-row-members';
    const chips = document.createElement('div');
    chips.className = 'history-chips';
    participants.forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'history-chip';
      chip.textContent = (p.username || p.name || p).toString();
      chips.appendChild(chip);
    });
    membersWrap.appendChild(chips);
    extras.push(membersWrap);
  }

  return { whatHTML, extras, overrideMeta: true };
}
