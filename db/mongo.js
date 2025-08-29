const mongoose = require('mongoose');

const DEFAULTS = {
  serverSelectionTimeoutMS: 50_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 20_000,
  heartbeatFrequencyMS: 10_000,
  maxPoolSize: 20,
};

function isRetryable(err) {
  const name = err?.name || '';
  const msg = String(err?.message || '');
  return (
    name === 'MongooseServerSelectionError' ||
    name === 'MongoServerSelectionError' ||
    /server selection timed out/i.test(msg) ||
    /ReplicaSetNoPrimary/i.test(msg) ||
    /ECONNREFUSED|ENETUNREACH|ETIMEDOUT|EHOSTUNREACH/i.test(msg)
  );
}

function wireConnectionLogging() {
  const conn = mongoose.connection;
  if (conn.__loggingWired) return;
  conn.__loggingWired = true;

  conn.on('connected', () => console.log('[mongo] connected'));
  conn.on('disconnected', () => console.warn('[mongo] disconnected'));
  conn.on('reconnectFailed', () => console.error('[mongo] reconnect failed'));
  conn.on('error', (e) => console.error('[mongo] error:', e?.message));
}

async function connectMongo(uri, opts = {}) {
  if (!uri) throw new Error('Mongo URI is required');

  mongoose.set('bufferCommands', false);
  // Harden queries: drop unrecognized filters and sanitize $ operators in filters
  // strictQuery helps avoid accidental broad queries; sanitizeFilter mitigates NoSQL injection
  mongoose.set('strictQuery', true);
  // Do NOT enable global sanitizeFilter because it breaks legitimate operators
  // like `$in` used in server-side queries (e.g., User.find({_id: {$in: [...]}})).
  // We rely on express-level sanitization instead.

  const options = { ...DEFAULTS, ...opts };
  const maxAttempts = options.maxAttempts ?? 7;
  const baseDelayMs = options.baseDelayMs ?? 1000; // 1s
  const maxDelayMs = options.maxDelayMs ?? 15000; // 15s

  let attempt = 0;
  let lastErr;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await mongoose.connect(uri, options);
      wireConnectionLogging();
      return mongoose.connection;
    } catch (err) {
      lastErr = err;
      const willRetry = isRetryable(err) && attempt < maxAttempts;
      console.error(`[mongo] connect attempt ${attempt}/${maxAttempts} failed:`, err?.message);
      if (!willRetry) break;

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastErr;
}

async function disconnectMongo(timeoutMs = 5000) {
  try {
    const p = mongoose.connection.close();
    await Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('close timeout')), timeoutMs)),
    ]);
  } catch (e) {
    console.error('[mongo] close error:', e?.message);
  }
}

module.exports = {
  connectMongo,
  disconnectMongo,
};
