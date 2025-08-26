import { apiRequest } from '../../../api.js';

export function renderExpenseUpdate(log) {
  const { actorName, timestamp, details = {} } = log || {};
  const {
    description,
    changes = [],
    groupName,
    date,
    payerName,
    amount,
    currency = 'UAH',
    participants = [],
  } = details;

  // Final fallbacks from diff payload (after -> before)
  const after = details.after || {};
  const before = details.before || {};
  const effDate = (date !== undefined && date !== null) ? date : (after.date !== undefined ? after.date : before.date);
  const effAmount = (amount !== undefined && amount !== null) ? amount : (after.amount !== undefined ? after.amount : before.amount);
  const effPayer = (payerName && String(payerName).trim())
    ? payerName
    : (after.payerName || before.payerName || after.payerId || before.payerId || undefined);
  const effParticipants = (Array.isArray(participants) && participants.length)
    ? participants
    : (Array.isArray(after.participants) ? after.participants : (Array.isArray(before.participants) ? before.participants : []));

  const wrap = document.createElement('div');
  wrap.classList.add('history-wrap-8');

  const meta = document.createElement('div');
  meta.classList.add('history-meta');
  const ts = new Date(timestamp);
  meta.textContent = `${actorName || 'Unknown'} • ${isNaN(+ts) ? '' : ts.toLocaleString()}`;

  const groupDiv = document.createElement('div');
  groupDiv.classList.add('history-text');
  groupDiv.textContent = `Group: ${groupName || 'N/A'}`;

  // Determine which fields changed to decide what to show in the summary
  const changedSet = new Set((Array.isArray(changes) ? changes : []).map(c => c.field));

  // Date (only if not changed)
  let dateDiv = null;
  if (!changedSet.has('date')) {
    dateDiv = document.createElement('div');
    dateDiv.classList.add('history-text');
    const d = effDate ? new Date(effDate) : null;
    dateDiv.textContent = `Date: ${d && !isNaN(+d) ? d.toLocaleString() : 'N/A'}`;
  }

  // Payer (only if not changed)
  let payerDiv = null;
  if (!changedSet.has('payer')) {
    payerDiv = document.createElement('div');
    payerDiv.classList.add('history-text');
    payerDiv.textContent = `Payer: ${effPayer || 'N/A'}`;
  }

  // Amount (only if amount and currency not changed)
  let amountDiv = null;
  if (!changedSet.has('amount') && !changedSet.has('currency')) {
    amountDiv = document.createElement('div');
    amountDiv.classList.add('history-text');
    const amtNum = typeof effAmount === 'number' ? effAmount : Number.isFinite(Number(effAmount)) ? Number(effAmount) : undefined;
    const amt = typeof amtNum === 'number' ? amtNum.toFixed(2) : (effAmount ?? 'N/A');
    amountDiv.textContent = `Amount: ${amt ?? 'N/A'} ${currency}`;
  }

  // Participants (only if not changed)
  let partsLabel = null;
  let parts = null;
  if (!changedSet.has('participants')) {
    partsLabel = document.createElement('div');
    partsLabel.classList.add('history-label');
    partsLabel.textContent = 'Participants:';

    parts = document.createElement('div');
    parts.classList.add('history-chips');
    (Array.isArray(effParticipants) ? effParticipants : []).forEach(p => {
      const chip = document.createElement('span');
      chip.textContent = String(p?.username || p?.name || p);
      chip.classList.add('history-chip');
      parts.appendChild(chip);
    });
  }

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
  // Resolve group name if needed
  const gid = String(log?.groupId || '').trim();
  const currentName = String(groupName || '');
  if (gid && /^([a-f\d]{24})$/i.test(gid) && (!currentName || currentName === gid)) {
    (async () => {
      try {
        const groups = await apiRequest(`groups?ts=${Date.now()}`);
        const found = (Array.isArray(groups) ? groups : []).find(g => String(g._id) === gid);
        if (found?.name) groupDiv.textContent = `Group: ${found.name}`;
      } catch (_) { /* ignore */ }
    })();
  }
  if (dateDiv) wrap.appendChild(dateDiv);
  if (payerDiv) wrap.appendChild(payerDiv);
  if (amountDiv) wrap.appendChild(amountDiv);
  if (partsLabel) wrap.appendChild(partsLabel);
  if (parts) wrap.appendChild(parts);
  wrap.appendChild(list);
  return wrap;
}
