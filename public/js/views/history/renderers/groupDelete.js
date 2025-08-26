export function renderGroupDelete(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { name, participants = [], expensesCount } = details;

  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '8px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.color = '#111827';
  title.textContent = `Group deleted: ${name || '(no name)'}`;

  const meta = document.createElement('div');
  meta.style.color = '#6B7280';
  meta.style.fontSize = '12px';
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const membersLabel = document.createElement('div');
  membersLabel.style.color = '#6b7280';
  membersLabel.textContent = 'Participants:';

  const members = document.createElement('div');
  members.style.display = 'flex';
  members.style.flexWrap = 'wrap';
  members.style.gap = '6px';

  (Array.isArray(participants) ? participants : []).forEach(p => {
    const chip = document.createElement('span');
    chip.textContent = (p.username || p.name || p).toString();
    chip.style.background = '#fee2e2';
    chip.style.color = '#7f1d1d';
    chip.style.padding = '4px 8px';
    chip.style.borderRadius = '9999px';
    chip.style.fontSize = '12px';
    members.appendChild(chip);
  });

  const count = document.createElement('div');
  count.style.color = '#374151';
  count.textContent = `Expenses: ${typeof expensesCount === 'number' ? expensesCount : 'N/A'}`;

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(membersLabel);
  wrap.appendChild(members);
  wrap.appendChild(count);
  return wrap;
}
