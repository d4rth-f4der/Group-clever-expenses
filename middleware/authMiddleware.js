const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1]; // splits to array by 'space' and takes token from [Bearer, token]
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password'); // .select(-password) excludes hashed pswrd from response
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized - token failed' });
        }
    }

    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
}

module.exports = { protect };