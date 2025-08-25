const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/user');
const ActionLog = require('../models/actionLog');
const mongoose = require('mongoose');

router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email
    });
});

// Get current user's action logs
// GET /users/me/logs?groupId=&entityType=&entityId=&action=&before=&limit=
router.get('/me/logs', protect, async (req, res) => {
    try {
        const { groupId, entityType, entityId, action, before, limit } = req.query;

        const q = { participants: req.user._id };

        if (groupId) {
            if (!mongoose.Types.ObjectId.isValid(String(groupId))) {
                return res.status(400).json({ message: 'Invalid groupId' });
            }
            q.groupId = groupId;
        }
        if (entityType) {
            if (!['group', 'expense'].includes(entityType)) {
                return res.status(400).json({ message: 'Invalid entityType' });
            }
            q.entityType = entityType;
        }
        if (entityId) {
            if (!mongoose.Types.ObjectId.isValid(String(entityId))) {
                return res.status(400).json({ message: 'Invalid entityId' });
            }
            q.entityId = entityId;
        }
        if (action) {
            const allowed = new Set([
                'group:create','group:update','group:delete',
                'member:add','member:remove',
                'expense:create','expense:update','expense:delete'
            ]);
            if (!allowed.has(action)) {
                return res.status(400).json({ message: 'Invalid action' });
            }
            q.action = action;
        }

        const pageSize = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);

        const sort = { timestamp: -1, _id: -1 };
        if (before) {
            const beforeDate = new Date(before);
            if (beforeDate.toString() !== 'Invalid Date') {
                q.timestamp = { $lt: beforeDate };
            }
        }

        const logs = await ActionLog.find(q)
            .sort(sort)
            .limit(pageSize)
            .populate({ path: 'actorUserId', select: 'username email' })
            .lean();

        const items = logs.map(l => ({
            ...l,
            actorName: l.actorUserId?.username || l.actorUserId?.email || 'Unknown',
            actor: l.actorUserId?.username || undefined,
            actorEmail: l.actorUserId?.email || undefined,
        }));

        res.json({ items, hasMore: logs.length === pageSize });
    } catch (e) {
        console.error('Fetch user logs error:', e);
        res.status(500).json({ message: 'Server error fetching logs' });
    }
});

router.get('/:username', protect, async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select('_id username');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            _id: user._id,
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;