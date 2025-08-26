import { apiRequest } from '../../api.js';

// Cache of userId -> username and groupId -> groupName built from /groups
let userNameById = new Map();
let groupNameById = new Map();
let loaded = false;
let loadingPromise = null;

async function loadUsersFromGroups() {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const groups = await apiRequest(`groups?ts=${Date.now()}`);
      const map = new Map();
      const gmap = new Map();
      (Array.isArray(groups) ? groups : []).forEach(g => {
        if (g && g._id) {
          gmap.set(String(g._id), g.name || String(g._id));
        }
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
      groupNameById = gmap;
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

function groupNameOf(id) {
  const key = String(id || '');
  return (groupNameById.get(key) || key);
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
    groupName: (typeof details.groupName === 'string' && details.groupName.trim())
      ? details.groupName
      : (typeof details.name === 'string' && details.name.trim())
        ? details.name
        : groupNameOf(log?.groupId),
  };

  // Do NOT call balances here; logs must be self-sufficient even if group was deleted later
  // If name remains an ID after using cached groups and details.groupName/name, we leave it as-is.

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
      // Skip no-op changes where normalized values are equal
      const same = JSON.stringify(from) === JSON.stringify(to);
      if (!same) {
        changes.push({ field: label, from, to });
      }
    }
    base.changes = changes;
    // prefer description from details.after if present
    base.description = (details.after && details.after.description) != null
      ? details.after.description
      : (details.before && details.before.description) != null
        ? details.before.description
        : (base.description || log?.title?.replace(/^Expense updated:\s*/i, '') || undefined);

    // Backfill display fields for summary (use after -> before)
    const after = details.after || {};
    const before = details.before || {};

    if (base.amount === undefined) base.amount = (after.amount !== undefined) ? after.amount : before.amount;
    if (!base.currency) base.currency = (after.currency !== undefined) ? after.currency : (before.currency !== undefined ? before.currency : base.currency);
    if (!base.date) base.date = (after.date !== undefined) ? after.date : before.date;
    if (!base.payerName) {
      const pid = (after.payerId !== undefined) ? after.payerId : before.payerId;
      if (pid) base.payerName = nameOf(pid);
    }
    if (!Array.isArray(base.participants) || base.participants.length === 0) {
      const parts = (after.participants !== undefined) ? after.participants : before.participants;
      if (Array.isArray(parts)) {
        base.participants = toNameArray(parts);
      }
    }
  }

  // For group delete we also pass expensesCount through
  if (action === 'group:delete' && details && details.expensesCount !== undefined) {
    const n = Number(details.expensesCount);
    base.expensesCount = Number.isFinite(n) ? n : details.expensesCount;
  }

  return base;
}
