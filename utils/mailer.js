const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  // Dev fallback: stream to console
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'noreply@example.com';
  const transporter = createTransport();
  const info = await transporter.sendMail({ from, to, subject, text, html });
  if (info?.message) {
    // Stream transport prints raw message to console; helpful in dev
    try { console.log('[mail] message preview:\n' + info.message.toString()); } catch (_) {}
  }
  return info;
}

module.exports = { sendMail };
