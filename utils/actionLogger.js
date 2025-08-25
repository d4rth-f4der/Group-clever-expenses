const ActionLog = require('../models/actionLog');

function participantsFromGroup(group) {
  // group.members may be ObjectIds or populated; normalize to ObjectId strings
  return group.members.map(m => String(m._id || m));
}

function id(val) {
  return val ? String(val._id || val) : undefined;
}

function toIdArray(arr) {
  return (arr || []).map(v => String(v._id || v));
}

function arrayDiff(beforeArr, afterArr) {
  const beforeSet = new Set(beforeArr);
  const afterSet = new Set(afterArr);
  const added = [...afterSet].filter(x => !beforeSet.has(x));
  const removed = [...beforeSet].filter(x => !afterSet.has(x));
  return { added, removed };
}

function buildExpenseDiff(beforeDoc, afterDoc) {
  const before = {
    amount: beforeDoc.amount,
    description: beforeDoc.description,
    payerId: id(beforeDoc.payer),
    participants: toIdArray((beforeDoc.participants || []).map(p => p.user || p)),
    date: beforeDoc.date ? new Date(beforeDoc.date) : undefined,
  };
  const after = {
    amount: afterDoc.amount,
    description: afterDoc.description,
    payerId: id(afterDoc.payer),
    participants: toIdArray((afterDoc.participants || []).map(p => p.user || p)),
    date: afterDoc.date ? new Date(afterDoc.date) : undefined,
  };

  const changedFields = [];
  if (before.amount !== after.amount) changedFields.push('amount');
  if ((before.description || '') !== (after.description || '')) changedFields.push('description');
  if ((before.payerId || '') !== (after.payerId || '')) changedFields.push('payerId');
  if ((before.date ? +new Date(before.date) : null) !== (after.date ? +new Date(after.date) : null)) changedFields.push('date');
  // participants equality by set
  const beforeP = new Set(before.participants);
  const afterP = new Set(after.participants);
  const sameSize = beforeP.size === afterP.size;
  const sameMembers = sameSize && [...beforeP].every(x => afterP.has(x));
  if (!sameMembers) changedFields.push('participants');

  const { added: participantsAdded, removed: participantsRemoved } = arrayDiff(before.participants, after.participants);

  const diff = {
    changedFields,
    before: {},
    after: {},
    participantsAdded,
    participantsRemoved,
  };

  for (const key of changedFields) {
    diff.before[key] = before[key];
    diff.after[key] = after[key];
  }
  return diff;
}

async function logAction({ action, entityType, entityId, groupId, actorUserId, participants, title, details, req }) {
  try {
    await ActionLog.create({
      action,
      entityType,
      entityId,
      groupId,
      actorUserId,
      participants: participants.map(String),
      title,
      details,
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  } catch (e) {
    // Do not break primary flow on logging errors
    console.error('ActionLog error:', e?.message || e);
  }
}

module.exports = { logAction, buildExpenseDiff, participantsFromGroup };
