const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const morgan = require('morgan');
const { connectMongo, disconnectMongo } = require('./db/mongo');

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

// Connect to Mongo with retries and logging
(async () => {
  try {
    await connectMongo(MONGO_URI, {
      serverSelectionTimeoutMS: 50_000,
      socketTimeoutMS: 45_000,
      connectTimeoutMS: 20_000,
      heartbeatFrequencyMS: 10_000,
      maxPoolSize: 20,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

const listener = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down ...`);
  listener.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
