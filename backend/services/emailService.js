const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const parseBool = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeSmtpPassword = (password, host) => {
  const raw = String(password || '').trim();
  if (!raw.includes(' ')) return raw;
  const normalized = raw.replace(/\s+/g, '');
  if (
    String(host || '')
      .toLowerCase()
      .includes('gmail')
  ) {
    logger.warn('SMTP_PASS contained whitespace; normalized for Gmail app-password format.');
    return normalized;
  }
  return raw;
};

const resolveTransport = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBool(process.env.SMTP_SECURE) || port === 465;
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = normalizeSmtpPassword(process.env.SMTP_PASS, host);
  const connectionTimeout = parsePositiveInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 10_000);
  const greetingTimeout = parsePositiveInt(process.env.SMTP_GREETING_TIMEOUT_MS, 10_000);
  const socketTimeout = parsePositiveInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 15_000);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
  });
};

const getTransporter = () => {
  try {
    return resolveTransport();
  } catch (error) {
    logger.error('SMTP transporter init failed', {
      message: error?.message || String(error),
    });
    return null;
  }
};

const isRetryableSmtpError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  return ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET', 'EAI_AGAIN'].includes(code);
};

const sendWithTimeout = async ({ transporter, from, to, subject, text, timeoutMs }) =>
  Promise.race([
    transporter.sendMail({
      from,
      to,
      subject,
      text,
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`SMTP send timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

/**
 * Send via Resend HTTPS API. Preferred path because it just needs one
 * env var (RESEND_API_KEY) — no SMTP host/port/auth dance. If the API
 * call fails (network, 4xx/5xx), we let the caller try the SMTP path
 * as fallback.
 *
 * Resend free tier: 100 emails/day, 3000/month — plenty for password
 * reset traffic.
 */
const sendViaResend = async ({ from, to, subject, text }) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = await response.json().catch(() => ({}));
  return data?.id || 'resend-ok';
};

const sendPasswordResetEmail = async ({ to, username, resetUrl, expiresInMinutes }) => {
  const safeTo = String(to || '').trim();
  if (!safeTo) {
    throw new Error('Recipient e-mail is required.');
  }

  const fromAddress =
    String(process.env.RESEND_FROM || '').trim() ||
    String(process.env.SMTP_FROM || '').trim() ||
    String(process.env.SMTP_USER || '').trim() ||
    'CafeDuo <noreply@cafeduotr.com>';
  const ttl = Math.max(5, Number(expiresInMinutes) || 30);
  const subject = 'CafeDuo - Şifre Sıfırlama';
  const displayName = String(username || 'Oyuncu').trim() || 'Oyuncu';
  const text = [
    `Merhaba ${displayName},`,
    '',
    'Şifre sıfırlama talebiniz alındı.',
    `Bağlantı (${ttl} dakika geçerli):`,
    resetUrl,
    '',
    'Eğer bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.',
    '',
    'CafeDuo Güvenlik',
  ].join('\n');

  // Try Resend first if RESEND_API_KEY is set — single-env-var setup,
  // no SMTP servers to manage. Falls through to nodemailer SMTP on error
  // or when the key isn't configured.
  if (String(process.env.RESEND_API_KEY || '').trim()) {
    try {
      const messageId = await sendViaResend({ from: fromAddress, to: safeTo, subject, text });
      logger.info('Password reset e-mail sent', {
        to: safeTo,
        mode: 'resend',
        messageId,
      });
      return { delivered: true, mode: 'resend', messageId };
    } catch (error) {
      logger.error('Resend delivery failed; falling back to SMTP if configured', {
        to: safeTo,
        message: error?.message || String(error),
      });
      // Fall through to SMTP attempt below
    }
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(
      'No email provider configured (RESEND_API_KEY + SMTP both missing). Reset link logged instead.',
      {
        to: safeTo,
        resetUrl,
      }
    );
    return { delivered: false, mode: 'log-only' };
  }

  const sendTimeoutMs = parsePositiveInt(process.env.SMTP_SEND_TIMEOUT_MS, 15_000);
  const maxAttempts = Math.max(1, Math.min(4, parsePositiveInt(process.env.SMTP_SEND_RETRIES, 2)));

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const info = await sendWithTimeout({
        transporter,
        from: fromAddress,
        to: safeTo,
        subject,
        text,
        timeoutMs: sendTimeoutMs,
      });

      logger.info('Password reset e-mail sent', {
        to: safeTo,
        attempt,
        mode: 'smtp',
        messageId: info?.messageId || null,
      });

      return { delivered: true, mode: 'smtp', attempt };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableSmtpError(error);
      logger.error('Password reset e-mail delivery failed', {
        to: safeTo,
        attempt,
        retryable,
        code: error?.code || null,
        responseCode: error?.responseCode || null,
        message: error?.message || String(error),
      });

      if (!retryable || attempt >= maxAttempts) {
        break;
      }
      await wait(400 * attempt);
    }
  }

  throw lastError || new Error('SMTP send failed');
};

module.exports = {
  sendPasswordResetEmail,
};
