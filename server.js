const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static('public'));

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

const listener = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
