export function renderExpenseDelete(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const { description, amount, currency = 'UAH', payerName, participants = [] } = details;

  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap-8');

  const meta = document.createElement('div');
  meta.classList.add('history-meta');
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const pay = document.createElement('div');
  pay.classList.add('history-text');
  const amt = typeof amount === 'number' ? amount.toFixed(2) : amount;
  pay.textContent = `Payer: ${payerName || 'N/A'}, Amount: ${amt ?? 'N/A'} ${currency}`;

  const partsLabel = document.createElement('div');
  partsLabel.classList.add('history-label');
  partsLabel.textContent = 'Participants:';

  const parts = document.createElement('div');
  parts.classList.add('history-chips');

  (Array.isArray(participants) ? participants : []).forEach(p => {
    const chip = document.createElement('span');
    chip.textContent = (p.username || p.name || p).toString();
    chip.classList.add('history-chip');
    parts.appendChild(chip);
  });

  wrap.appendChild(meta);
  wrap.appendChild(pay);
  wrap.appendChild(partsLabel);
  wrap.appendChild(parts);
  return wrap;
}
