const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const jwt = require('jsonwebtoken');

// require('crypto').randomBytes(32).toString('hex') - для генерации JWS_SECRET

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const User = require('./models/user');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log('MongoDB connection error:', err));

const generateToken = (id) => { // вот тут синтаксис = (id) => не понял
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
            return res.status(409).json({message: "Username or email already exists"});
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
                token: generateToken(user._id), // вот тут забыл спросить. у нас же поле должно быть password, почему его не используем, а используем token?
            });
        } else {
            return res.status(400).json({ message: 'Invalid user data'});
        }
    } catch (error) {
        console.error('Registration error', error);
        res.status(500).json({message: 'Server error during registration'});
    }
});

app.get('/', (req, res) => {
    res.send('Group Clever Expenses API is running!');
});

const listener = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));