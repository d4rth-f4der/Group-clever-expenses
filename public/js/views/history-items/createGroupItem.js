import { enrichLogDetails } from '../history/enrich.js';

export async function renderCreateGroupItem(log) {
  const whatHTML = (() => {
    const rawTitle = log.title || log.message || 'Group created';
    const idx = rawTitle.indexOf(':');
    if (idx > -1) {
      const a = rawTitle.slice(0, idx).trim();
      const rest = rawTitle.slice(idx + 1).trim();
      return `<span class="history-action">${a}:</span> ${rest}`;
    }
    return rawTitle;
  })();

  const extras = [];
  try {
    const d = await enrichLogDetails(log);
    const parts = Array.isArray(d?.participants) ? d.participants : [];
    if (parts.length) {
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
      extras.push(membersWrap);
    }
  } catch (_) { /* ignore */ }

  return { whatHTML, extras };
}
