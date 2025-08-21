const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/user');

router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email
    });
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