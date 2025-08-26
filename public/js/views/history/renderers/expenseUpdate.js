export function renderExpenseUpdate(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { description, changes = [], groupName } = details;

  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap-8');

  const meta = document.createElement('div');
  meta.classList.add('history-meta');
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const groupDiv = document.createElement('div');
  groupDiv.classList.add('history-text');
  groupDiv.textContent = `Group: ${groupName || 'N/A'}`;

  const list = document.createElement('div');
  list.classList.add('history-list');

  (Array.isArray(changes) ? changes : []).forEach(ch => {
    const row = document.createElement('div');
    row.classList.add('history-card');

    const field = document.createElement('div');
    field.classList.add('history-field');
    field.textContent = ch.field || 'field';

    const fromTo = document.createElement('div');
    fromTo.classList.add('history-text-sm');
    const from = ch.from !== undefined ? JSON.stringify(ch.from) : '—';
    const to = ch.to !== undefined ? JSON.stringify(ch.to) : '—';
    fromTo.textContent = `${from} → ${to}`;

    row.appendChild(field);
    row.appendChild(fromTo);
    list.appendChild(row);
  });

  if (!list.childElementCount) {
    const empty = document.createElement('div');
    empty.classList.add('history-meta');
    empty.textContent = 'No change details provided.';
    list.appendChild(empty);
  }

  wrap.appendChild(meta);
  wrap.appendChild(groupDiv);
  wrap.appendChild(list);
  return wrap;
}
