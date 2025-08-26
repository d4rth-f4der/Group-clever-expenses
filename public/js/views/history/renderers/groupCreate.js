export function renderGroupCreate(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { name, participants = [] } = details;

  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap-8');

  const meta = document.createElement('div');
  meta.classList.add('history-meta');
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const membersLabel = document.createElement('div');
  membersLabel.classList.add('history-label');
  membersLabel.textContent = 'Participants:';

  const members = document.createElement('div');
  members.classList.add('history-chips');

  (Array.isArray(participants) ? participants : []).forEach(p => {
    const chip = document.createElement('span');
    chip.textContent = (p.username || p.name || p).toString();
    chip.classList.add('history-chip');
    members.appendChild(chip);
  });

  wrap.appendChild(meta);
  wrap.appendChild(membersLabel);
  wrap.appendChild(members);
  return wrap;
}
