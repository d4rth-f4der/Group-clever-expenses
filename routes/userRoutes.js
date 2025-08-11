const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email
    });
});

module.exports = router;