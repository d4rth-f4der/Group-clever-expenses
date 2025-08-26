export function renderGroupDelete(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { name, participants = [], expensesCount } = details;

  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap-8');

  const title = document.createElement('div');
  title.classList.add('history-title');
  title.textContent = `Group deleted: ${name || '(no name)'}`;

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

  const count = document.createElement('div');
  count.classList.add('history-text');
  count.textContent = `Expenses: ${typeof expensesCount === 'number' ? expensesCount : 'N/A'}`;

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(membersLabel);
  wrap.appendChild(members);
  wrap.appendChild(count);
  return wrap;
}
