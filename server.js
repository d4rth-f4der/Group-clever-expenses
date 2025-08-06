const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

// require('crypto').randomBytes(32).toString('hex') - для генерации JWS_SECRET

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const User = require('./models/user.js');
const Group = require('./models/group.js');
const Expense = require('./models/expense.js');
const { protect } = require('./middleware/authMiddleware.js');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log('MongoDB connection error:', err));

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all required fields' });
    }

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(409).json({ message: "Username or email already exists" });
        }

        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Required fields: email, password" });
    }

    try {
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials (email/password)' });
        }

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id)
        });
    }

    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: "Server error during login" });
    }
});

app.post('/api/groups', protect, async (req, res) => {
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

app.post('/api/groups/:groupId/expenses', protect, async (req, res) => {
    const { description, amount, payer, participants, date } = req.body;
    const { groupId } = req.params;

    if (!description || amount <= 0 || !payer || !participants || !Array.isArray(participants) || participants.length === 0) {
        // в будущем: Использовать библиотеку для валидации (например, `joi` или `express-validator`)
        return res.status(400).json({ message: 'Mandatory: description, amount, payer, participant(s)' });
    }

    let expenseDate = date ? new Date(date) : undefined;
    if (date && (expenseDate.toString() === 'Invalid Date')) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD (or YYYY-MM-DDTHH:MM:SSZ).' });
    }

    try {
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (!group.members.includes(req.user._id)) return res.status(403).json({ message: 'Not authorised to add expenses to this group' });
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

app.get('/', (req, res) => {
    res.send('Group Clever Expenses API is running!');
});

app.get('/api/users/profile', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email
    });
});

app.get('/api/groups', protect, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id }).populate('members', 'username email');
        return res.status(200).json(groups);
    } catch (error) {
        console.error('Fetch groups error:', error);
        return res.status(500).json({ message: 'Server error fetching groups' });
    }
});

app.get('/api/groups/:groupId/expenses', protect, async (req, res) => {
    const { groupId } = req.params;

    try {
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (!group.members.map(String).includes(String(req.user._id))) {
            return res.status(403).json({ message: 'Not authorized to view this group expenses' });
        }

        const expenses = await Expense.find({ group: groupId })
            .populate('payer', 'username email')
            .populate('participants.user', 'username email');

        return res.status(200).json(expenses);
    } catch (err) {
        console.error('Fetch expenses error:', err);
        return res.status(500).json({ message: 'Server error on attempt to fetch expenses' });
    }
});

const listener = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));