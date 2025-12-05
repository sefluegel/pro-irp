// backend/migrations/011-bulk-import-history.js
// Track bulk import batches for undo functionality

const db = require('../db');

async function up() {
  console.log('[migration] Creating bulk_imports table...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS bulk_imports (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      filename VARCHAR(255),
      total_rows INTEGER NOT NULL DEFAULT 0,
      created_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'reversed', 'partial')),
      reversed_at TIMESTAMP,
      reversed_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bulk_imports_user ON bulk_imports(user_id);
    CREATE INDEX IF NOT EXISTS idx_bulk_imports_created ON bulk_imports(created_at DESC);
  `);

  // Add batch_id column to clients table to track which import they came from
  await db.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS bulk_import_id INTEGER REFERENCES bulk_imports(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_clients_bulk_import ON clients(bulk_import_id);
  `);

  console.log('[migration] bulk_imports table created successfully');
}

async function down() {
  console.log('[migration] Dropping bulk_imports table...');

  await db.query(`
    ALTER TABLE clients DROP COLUMN IF EXISTS bulk_import_id;
    DROP TABLE IF EXISTS bulk_imports CASCADE;
  `);

  console.log('[migration] bulk_imports table dropped');
}

module.exports = { up, down };
