const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { celebrate, Joi, Segments } = require('celebrate');
const User = require('../models/user');
const VerificationToken = require('../models/verificationToken');
const { sendMail } = require('../utils/mailer');

// require('crypto').randomBytes(32).toString('hex') - for JWS_SECRET generation

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

// Registration with validation and email verification
router.post(
  '/register',
  celebrate({
    [Segments.BODY]: Joi.object({
      username: Joi.string().min(3).max(32).regex(/^[a-z0-9_.-]+$/i).required(),
      email: Joi.string().email().max(254).required(),
      password: Joi.string().min(8).max(128).required(),
    })
  }),
  async (req, res) => {
    const { username, email, password } = req.body;
    try {
      const userExists = await User.findOne({ $or: [{ email }, { username }] }).select('_id');
      if (userExists) {
        return res.status(409).json({ message: 'Username or email already exists' });
      }

      const user = await User.create({ username, email, password, emailVerified: false });

      // Create verification token (24h)
      const raw = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await VerificationToken.create({ userId: user._id, tokenHash, expiresAt });

      // Send verification email
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${raw}`;
      // In development without SMTP, print a clean URL for easy testing
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        try { console.log(`[dev] Email verification link: ${verifyUrl}`); } catch (_) {}
      }
      await sendMail({
        to: user.email,
        subject: 'Verify your email',
        text: `Welcome to Clever Expenses! Please verify your email by opening: ${verifyUrl}`,
        html: `<p>Welcome to Clever Expenses!</p><p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`
      });

      return res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
    } catch (error) {
      console.error('Registration error', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

router.post(
  '/login',
  celebrate({
    [Segments.BODY]: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
    })
  }),
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });

      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials (email/password)' });
      }
      if (!user.emailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      res.status(200).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id)
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// Verify email endpoint
router.get('/verify-email', celebrate({
  [Segments.QUERY]: Joi.object({ token: Joi.string().length(64).hex().required() })
}), async (req, res) => {
  const { token } = req.query;
  try {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const record = await VerificationToken.findOne({ tokenHash });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.emailVerified = true;
    await user.save();
    await VerificationToken.deleteMany({ userId: user._id });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (e) {
    console.error('Verify email error:', e);
    return res.status(500).json({ message: 'Server error verifying email' });
  }
});

// Resend verification email
router.post('/resend-verification', celebrate({
  [Segments.BODY]: Joi.object({ email: Joi.string().email().required() })
}), async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email }).select('_id email emailVerified');
    // Always respond 200 to avoid user enumeration
    if (!user) {
      return res.status(200).json({ message: 'If the account exists, a verification email has been sent.' });
    }
    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }

    await VerificationToken.deleteMany({ userId: user._id });
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await VerificationToken.create({ userId: user._id, tokenHash, expiresAt });

    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${raw}`;
    // In development without SMTP, print a clean URL for easy testing
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      try { console.log(`[dev] Email verification link (resend): ${verifyUrl}`); } catch (_) {}
    }
    await sendMail({
      to: user.email,
      subject: 'Verify your email',
      text: `Please verify your email by opening: ${verifyUrl}`,
      html: `<p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`
    });

    return res.status(200).json({ message: 'If the account exists, a verification email has been sent.' });
  } catch (e) {
    console.error('Resend verification error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
