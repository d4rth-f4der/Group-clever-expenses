const mongoose = require('mongoose');

const ActionLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'group:create', 'group:update', 'group:delete',
        'member:add', 'member:remove',
        'expense:create', 'expense:update', 'expense:delete'
      ],
      required: true,
    },
    entityType: { type: String, enum: ['group', 'expense'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    timestamp: { type: Date, default: Date.now, index: true },
    title: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    userAgent: String,
  },
  { versionKey: false }
);

ActionLogSchema.index({ participants: 1, timestamp: -1 });
ActionLogSchema.index({ groupId: 1, timestamp: -1 });
ActionLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('ActionLog', ActionLogSchema);
