export function renderExpenseUpdate(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { description, changes = [] } = details;

  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '8px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.color = '#111827';
  title.textContent = `Expense updated: ${description || '(no description)'}`;

  const meta = document.createElement('div');
  meta.style.color = '#6B7280';
  meta.style.fontSize = '12px';
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '6px';

  (Array.isArray(changes) ? changes : []).forEach(ch => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr';
    row.style.gap = '2px';
    row.style.padding = '8px';
    row.style.border = '1px solid #e5e7eb';
    row.style.borderRadius = '8px';
    row.style.background = '#fff';

    const field = document.createElement('div');
    field.style.fontWeight = '600';
    field.textContent = ch.field || 'field';

    const fromTo = document.createElement('div');
    fromTo.style.fontSize = '12px';
    fromTo.style.color = '#374151';
    const from = ch.from !== undefined ? JSON.stringify(ch.from) : '—';
    const to = ch.to !== undefined ? JSON.stringify(ch.to) : '—';
    fromTo.textContent = `${from} → ${to}`;

    row.appendChild(field);
    row.appendChild(fromTo);
    list.appendChild(row);
  });

  if (!list.childElementCount) {
    const empty = document.createElement('div');
    empty.style.color = '#6B7280';
    empty.textContent = 'No change details provided.';
    list.appendChild(empty);
  }

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(list);
  return wrap;
}
