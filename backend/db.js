const { Pool } = require('pg');
require('dotenv').config();

const parseBool = (value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
};

const getHostFromDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) return undefined;
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return undefined;
  }
};

const isLocalHost = (host) => ['localhost', '127.0.0.1', 'postgres', 'db'].includes(host || '');
const dbHostFromUrl = getHostFromDatabaseUrl(process.env.DATABASE_URL);
const resolvedHost = process.env.DB_HOST || dbHostFromUrl || 'localhost';
const explicitSsl = parseBool(process.env.DB_SSL);
const useSslByDefault = process.env.NODE_ENV === 'production' && !isLocalHost(resolvedHost);
const useSsl = explicitSsl ?? useSslByDefault;
const sslRejectUnauthorized = parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED) ?? false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: sslRejectUnauthorized } : false,
  // Fallback for local dev if DATABASE_URL is not set
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cafeduo',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const logger = require('./utils/logger');

// Connection test
// Connection Test with Retry Logic
const connectWithRetry = (attempts = 5) => {
  pool.connect((err, client, release) => {
    if (err) {
      logger.error(`❌ DB Connection Attempt Failed: ${err.message}`);
      if (attempts > 1) {
        logger.info(`🔄 Retrying in 3 seconds... (${attempts - 1} attempts left)`);
        setTimeout(() => connectWithRetry(attempts - 1), 3000);
      } else {
        logger.error('❌ All connection attempts failed.');
        logger.warn('⚠️  UYARI: PostgreSQL bağlantısı kurulamadı.');
        logger.warn('   Sunucu "In-Memory" (Geçici Bellek) modunda çalışacak.');
      }
    } else {
      logger.info('✅ Veritabanı bağlantısı başarılı.');
      release();
    }
  });
};

connectWithRetry();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
