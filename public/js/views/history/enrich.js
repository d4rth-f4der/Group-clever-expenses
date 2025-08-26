import { apiRequest } from '../../api.js';

// Cache of userId -> username built from /groups
let userNameById = new Map();
let loaded = false;
let loadingPromise = null;

async function loadUsersFromGroups() {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const groups = await apiRequest('groups');
      const map = new Map();
      (Array.isArray(groups) ? groups : []).forEach(g => {
        (g.members || []).forEach(m => {
          const id = String(m._id || m);
          const name = (m.username || m.email || id);
          if (!map.has(id)) map.set(id, name);
        });
        if (g.admin) {
          const id = String(g.admin._id || g.admin);
          const name = (g.admin.username || g.admin.email || id);
          if (!map.has(id)) map.set(id, name);
        }
      });
      userNameById = map;
      loaded = true;
    } catch (_) {
      // keep empty map on failure; renderers will fallback to IDs
      loaded = true;
    }
  })();
  return loadingPromise;
}

function nameOf(id) {
  const key = String(id || '');
  return (userNameById.get(key) || key);
}

function toNameArray(ids) {
  return (Array.isArray(ids) ? ids : []).map(v => {
    const id = String(v && (v._id || v));
    return { username: nameOf(id) };
  });
}

function formatDate(val) {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(+d) ? undefined : d.toLocaleString();
}

export async function enrichLogDetails(log) {
  await loadUsersFromGroups();
  const details = log?.details || {};
  const action = log?.action || '';

  // Normalize a base shape
  const base = {
    description: details.description,
    amount: details.amount,
    currency: details.currency || 'UAH',
    payerName: details.payerName, // may be undefined; we'll fill from payerId
    participants: details.participants, // may be IDs or objects
    date: details.date,
  };

  // Fill payerName if only payerId provided
  if (!base.payerName && details.payerId) {
    base.payerName = nameOf(details.payerId);
  }

  // Normalize participants to array of {username}
  if (Array.isArray(base.participants)) {
    const looksLikeIds = base.participants.every(p => typeof p === 'string' || typeof p === 'object');
    if (looksLikeIds) {
      base.participants = base.participants.map(p => {
        const id = String(p && (p._id || p.user || p));
        return { username: nameOf(id) };
      });
    }
  } else if (Array.isArray(details.members)) {
    // group create/delete uses members
    base.participants = toNameArray(details.members);
  } else {
    base.participants = [];
  }

  // Expense update: build readable changes from diff
  if (action === 'expense:update' && details && Array.isArray(details.changedFields)) {
    const changes = [];
    for (const field of details.changedFields) {
      let from = details.before?.[field];
      let to = details.after?.[field];
      let label = field;
      if (field === 'payerId') {
        label = 'payer';
        from = from ? nameOf(from) : undefined;
        to = to ? nameOf(to) : undefined;
      } else if (field === 'participants') {
        label = 'participants';
        from = toNameArray(from).map(x => x.username);
        to = toNameArray(to).map(x => x.username);
      } else if (field === 'date') {
        from = formatDate(from);
        to = formatDate(to);
      }
      changes.push({ field: label, from, to });
    }
    base.changes = changes;
    // prefer description from details.after if present
    base.description = (details.after && details.after.description) != null
      ? details.after.description
      : (details.before && details.before.description) != null
        ? details.before.description
        : (base.description || log?.title?.replace(/^Expense updated:\s*/i, '') || undefined);
  }

  // For group delete we also pass expensesCount through
  if (action === 'group:delete' && details && details.expensesCount !== undefined) {
    const n = Number(details.expensesCount);
    base.expensesCount = Number.isFinite(n) ? n : details.expensesCount;
  }

  return base;
}
