export function renderExpenseDelete(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { description, amount, currency = 'UAH', payerName, participants = [] } = details;

  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gap = '8px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.color = '#111827';
  title.textContent = `Expense deleted: ${description || '(no description)'}`;

  const meta = document.createElement('div');
  meta.style.color = '#6B7280';
  meta.style.fontSize = '12px';
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const pay = document.createElement('div');
  pay.style.color = '#374151';
  const amt = typeof amount === 'number' ? amount.toFixed(2) : amount;
  pay.textContent = `Payer: ${payerName || 'N/A'}, Amount: ${amt ?? 'N/A'} ${currency}`;

  const partsLabel = document.createElement('div');
  partsLabel.style.color = '#6b7280';
  partsLabel.textContent = 'Participants:';

  const parts = document.createElement('div');
  parts.style.display = 'flex';
  parts.style.flexWrap = 'wrap';
  parts.style.gap = '6px';

  (Array.isArray(participants) ? participants : []).forEach(p => {
    const chip = document.createElement('span');
    chip.textContent = (p.username || p.name || p).toString();
    chip.style.background = '#fde68a';
    chip.style.color = '#7a4b00';
    chip.style.padding = '4px 8px';
    chip.style.borderRadius = '9999px';
    chip.style.fontSize = '12px';
    parts.appendChild(chip);
  });

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(pay);
  wrap.appendChild(partsLabel);
  wrap.appendChild(parts);
  return wrap;
}
