const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const morgan = require('morgan');
const path = require('path');
const { connectMongo, disconnectMongo } = require('./db/mongo');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { errors: celebrateErrors } = require('celebrate');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
// use ('trust proxy', 1) for Render deploy only: //
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN;

app.disable('x-powered-by');
app.use(helmet());

// Settings of Content Security Policy
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      // in next line 'unsafe-inline' is required for inline styles
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"], // для preconnect
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'self'"]
    }
  })
);

// Body size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// CORS
if (CORS_ORIGIN) {
  const origins = CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : CORS_ORIGIN, credentials: true }));
} else {
  app.use(cors());
}
app.use(morgan('dev'));

app.use(express.static('public'));

// NoSQL injection & HTTP parameter pollution protection
// express-mongo-sanitize's middleware reassigns req.query which is read-only in Express 5.
// Use its sanitize() function directly to mutate objects in place.
app.use((req, res, next) => {
  try {
    if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
    if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    if (req.query && typeof req.query === 'object') mongoSanitize.sanitize(req.query, { replaceWith: '_' });
  } catch (e) {
    // Fail open: log and continue
    console.warn('mongoSanitize error:', e);
  }
  next();
});
app.use(hpp());

// Serve Flatpickr locally from node_modules to avoid external CDNs
try {
  const flatpickrDist = path.dirname(require.resolve('flatpickr/dist/flatpickr.min.js'));
  app.use('/vendor/flatpickr', express.static(flatpickrDist));
} catch (e) {
  // If flatpickr is not installed yet, the route won't be mounted; installation step will fix it
  // console.warn('flatpickr not installed; run npm i flatpickr');
}

// Required ENV validation
if (!MONGO_URI) {
  console.error('Missing MONGO_URI env variable');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET env variable');
  process.exit(1);
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const authSlowdown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 10,
  delayMs: 250,
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth', authSlowdown);

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const listener = app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Celebrate validation error handler
app.use(celebrateErrors());

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down ...`);
  listener.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
