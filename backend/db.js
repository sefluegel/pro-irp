// backend/db.js
// PostgreSQL connection with connection pooling (scales to thousands of users)

const { Pool } = require('pg');

// Connection pool configuration
// Pool reuses connections instead of creating new ones for each request
// This is CRITICAL for performance at scale
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Pool settings for scale
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Wait 10s max for a connection
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function: Run a query
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (helps debug performance issues)
    if (duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text);
    }

    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function: Get a client from the pool (for transactions)
async function getClient() {
  return await pool.connect();
}

// Helper function: Run code in a transaction
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
async function close() {
  await pool.end();
  console.log('Database connections closed');
}

module.exports = {
  query,
  getClient,
  transaction,
  pool,
  close,
};
