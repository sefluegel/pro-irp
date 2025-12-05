// backend/migrations/012-sessions-table.js
// Creates sessions table for HIPAA-compliant session management
// Enables 1-session-per-user limit and session revocation

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function runMigration() {
  console.log('Creating sessions table for session management...\n');

  try {
    await db.query('BEGIN');

    // Create sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_info JSONB,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP WITH TIME ZONE,
        revoke_reason VARCHAR(50)
      )
    `);
    console.log('✓ Created sessions table');

    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id)
    `);
    console.log('✓ Created index on user_id');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
      ON sessions(token_hash)
    `);
    console.log('✓ Created index on token_hash');

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_active
      ON sessions(user_id, revoked, expires_at)
      WHERE revoked = false
    `);
    console.log('✓ Created partial index for active sessions lookup');

    // Add comment explaining the table
    await db.query(`
      COMMENT ON TABLE sessions IS 'HIPAA-compliant session tracking. Enables 1-session-per-user limit and forced logout capability.'
    `);

    await db.query('COMMIT');

    console.log('\n✅ Sessions table migration completed successfully!');
    console.log('\nThe sessions table enables:');
    console.log('  - 1 session per user (new login revokes old sessions)');
    console.log('  - Force logout from all devices');
    console.log('  - View active sessions in settings');
    console.log('  - Session revocation on password reset');

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await db.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
