const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Group = require('../models/group');
const User = require('../models/user');
const Expense = require('../models/expense');

router.post('/', protect, async (req, res) => {
    const { name, members } = req.body;

    if (!name || !members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: "Provide group name and at least one member" });
    }

    const uniqueMembers = new Set(members.map(String));
    uniqueMembers.add(String(req.user._id));

    const existingMembers = await User.find({ '_id': { $in: Array.from(uniqueMembers) } }).select('_id');
    if (existingMembers.length !== uniqueMembers.size) {
        return res.status(400).json({ message: "Some of provided member IDs invalid" });
    }
    const validMemberIds = existingMembers.map(member => member._id);

    try {
        const group = await Group.create({
            name,
            members: validMemberIds,
            admin: req.user._id
        });

        res.status(201).json({
            _id: group._id,
            name: group.name,
            members: group.members,
            admin: group.admin,
            message: `Group '${name}' successfully created`
        });
    } catch (error) {
        console.error('Group creation error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Group name already exists' });
        }
        return res.status(500).json({ message: 'Server error during group creation' });
    }
});

router.post('/:groupId/expenses', protect, async (req, res) => {
    const { description, amount, payer, participants, date } = req.body;
    const { groupId } = req.params;

    if (!description || amount <= 0 || !payer || !participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ message: 'Mandatory: description, amount, payer, participant(s)' });
    }

    let expenseDate = date ? new Date(date) : undefined;
    if (date && (expenseDate.toString() === 'Invalid Date')) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD (or YYYY-MM-DDTHH:MM:SSZ).' });
    }

    try {
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (!group.members.map(String).includes(String(req.user._id))) return res.status(403).json({ message: 'Not authorised to add expenses to this group' });
        if (!group.members.map(String).includes(String(payer))) return res.status(400).json({ message: 'payer must be member of this group' });

        const invalidParticipants = participants.filter(pId => !group.members.map(String).includes(String(pId)));
        if (invalidParticipants.length > 0) return res.status(400).json({ message: "some participants aren't in this group" });

        const expense = await Expense.create({
            description,
            amount,
            group: groupId,
            payer,
            participants: participants.map(pId => ({ user: pId })),
            date: expenseDate
        });

        return res.status(201).json({
            _id: expense._id,
            description: expense.description,
            amount: expense.amount,
            group: expense.group,
            payer: expense.payer,
            participants: expense.participants,
            date: expense.date,
            message: 'Expense added successfully'
        });
    } catch (err) {
        console.error('Add expense:', err);
        return res.status(500).json({ message: 'Server error on attempt to add expense' });
    }
});

router.get('/', protect, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id }).populate('members', 'username email');
        return res.status(200).json(groups);
    } catch (error) {
        console.error('Fetch groups error:', error);
        return res.status(500).json({ message: 'Server error fetching groups' });
    }
});

router.get('/:groupId/expenses', protect, async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (!group.members.map(String).includes(String(req.user._id))) {
            return res.status(403).json({ message: 'Not authorized to view this group expenses' });
        }

        const expenses = await Expense.find({ group: groupId })
            .sort({ date: -1, _id: -1 })
            .populate('payer', 'username email')
            .populate('participants.user', 'username email');

        return res.status(200).json(expenses);
    } catch (err) {
        console.error('Fetch expenses error:', err);
        return res.status(500).json({ message: 'Server error on attempt to fetch expenses' });
    }
});

router.delete('/:groupId/expenses/:expenseId', protect, async (req, res) => {
	const { groupId, expenseId } = req.params;

	try {
		const group = await Group.findById(groupId);
		if (!group) return res.status(404).json({ message: 'Group not found' });

		const isMember = group.members.map(String).includes(String(req.user._id));
		if (!isMember) {
			return res.status(403).json({ message: 'Not authorised to delete expenses in this group' });
		}

		const expense = await Expense.findOne({ _id: expenseId, group: groupId });
		if (!expense) {
			return res.status(404).json({ message: 'Expense not found' });
		}

		const isAdmin = String(group.admin) === String(req.user._id);
		const isPayer = String(expense.payer) === String(req.user._id);

		if (!isAdmin && !isPayer) {
			return res.status(403).json({ message: 'Only group admin or payer can delete this expense' });
		}

		await expense.deleteOne();
		return res.status(200).json({ message: 'Expense deleted successfully' });
	} catch (err) {
		console.error('Delete expense error:', err);
		return res.status(500).json({ message: 'Server error on attempt to delete expense' });
	}
});

// Delete entire group by ID (admin only)
router.delete('/:groupId', protect, async (req, res) => {
    const { groupId } = req.params;
    try {
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const isAdmin = String(group.admin) === String(req.user._id);
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admin can delete this group' });
        }

        // Remove all expenses linked to this group
        await Expense.deleteMany({ group: groupId });
        await group.deleteOne();

        return res.status(200).json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error('Delete group error:', err);
        return res.status(500).json({ message: 'Server error on attempt to delete group' });
    }
});

router.get('/:groupId/balances', protect, async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findById(groupId).populate('members', 'username email');
        
        if (!group) return res.status(404).json({ message: 'Group not found' });
    
        const isMember = group.members.map(m => String(m._id)).includes(String(req.user._id));
        if (!isMember) {
            return res.status(403).json({ message: 'Not authorized to view balances of this group' });
        }

        const expenses = await Expense.find({ group: groupId })
            .populate('payer', 'username email')
            .populate('participants.user', 'username email');

        const balances = new Map();
        group.members.forEach(member => {
            balances.set(String(member._id), 0);
        });

        expenses.forEach(expense => {
            const payerId = String(expense.payer._id);
            const amount = expense.amount;
            const numParticipants = expense.participants.length;

            balances.set(payerId, balances.get(payerId) + amount);

            const share = amount / numParticipants;

            expense.participants.forEach(participant => {
                const participantId = String(participant.user._id);
                balances.set(participantId, balances.get(participantId) - share);
            });
        });

        const debts = [];
        const users = Array.from(balances.keys());
        const tempBalances = new Map(balances);

        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const user1Id = users[i];
                let balance1 = tempBalances.get(user1Id);
                const user2Id = users[j];
                let balance2 = tempBalances.get(user2Id);

                if (balance1 > 0 && balance2 < 0) {
                    const amountToSettle = Math.min(balance1, Math.abs(balance2));
                    if (amountToSettle > 0.01) {
                        debts.push({
                            from: group.members.find(m => String(m._id) === user2Id),
                            to: group.members.find(m => String(m._id) === user1Id),
                            amount: parseFloat(amountToSettle.toFixed(2))
                        });
                        tempBalances.set(user1Id, balance1 - amountToSettle);
                        tempBalances.set(user2Id, balance2 + amountToSettle);
                    }
                } else if (balance2 > 0 && balance1 < 0) {
                    const amountToSettle = Math.min(balance2, Math.abs(balance1));
                    if (amountToSettle > 0.01) {
                        debts.push({
                            from: group.members.find(m => String(m._id) === user1Id),
                            to: group.members.find(m => String(m._id) === user2Id),
                            amount: parseFloat(amountToSettle.toFixed(2))
                        });
                        tempBalances.set(user2Id, balance2 - amountToSettle);
                        tempBalances.set(user1Id, balance1 + amountToSettle);
                    }
                }
            }
        }

        const finalBalances = Array.from(balances.entries()).map(([userId, balance]) => ({
            user: group.members.find(m => String(m._id) === userId),
            balance: parseFloat(balance.toFixed(2))
        }));

        return res.status(200).json({
            group: {
                _id: group._id,
                name: group.name,
                members: group.members,
            },
            summary: finalBalances,
            debts: debts
        });
    } catch (err) {
        console.error('Fetch balances error:', err);
        return res.status(500).json({ message: 'Server error on fetching balances' });
    }
});

module.exports = router;