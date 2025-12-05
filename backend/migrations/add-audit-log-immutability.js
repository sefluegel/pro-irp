// backend/migrations/add-audit-log-immutability.js
// Makes audit logs immutable (HIPAA requirement for tamper-proof audit trails)

const db = require('../db');

async function up() {
  console.log('[migration] Adding audit log immutability constraints...');

  try {
    // Create a function that prevents updates and deletes on audit_logs
    await db.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'HIPAA VIOLATION: Audit logs are immutable and cannot be modified or deleted';
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to prevent updates
    await db.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;
      CREATE TRIGGER audit_logs_prevent_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_modification();
    `);

    // Create trigger to prevent deletes
    await db.query(`
      DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;
      CREATE TRIGGER audit_logs_prevent_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_modification();
    `);

    // Add index for faster querying of audit logs
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
    `);

    console.log('[migration] ✅ Audit log immutability constraints added successfully');
    console.log('[migration] ⚠️  Note: Audit logs can no longer be updated or deleted');

  } catch (error) {
    console.error('[migration] ❌ Failed to add audit log constraints:', error.message);
    throw error;
  }
}

async function down() {
  console.log('[migration] Removing audit log immutability constraints...');

  try {
    await db.query(`DROP TRIGGER IF EXISTS audit_logs_prevent_update ON audit_logs;`);
    await db.query(`DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON audit_logs;`);
    await db.query(`DROP FUNCTION IF EXISTS prevent_audit_log_modification();`);

    console.log('[migration] ✅ Audit log constraints removed');
  } catch (error) {
    console.error('[migration] ❌ Failed to remove constraints:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const action = process.argv[2] || 'up';

  (async () => {
    try {
      if (action === 'up') {
        await up();
      } else if (action === 'down') {
        await down();
      } else {
        console.log('Usage: node add-audit-log-immutability.js [up|down]');
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
