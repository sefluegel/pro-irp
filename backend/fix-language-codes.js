// backend/fix-language-codes.js
// Script to update existing client records from full language names to codes
require('dotenv').config();

const { Pool } = require('pg');

async function fixLanguageCodes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Connecting to database...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');

    // Check for clients with old language format
    const checkQuery = `
      SELECT id, first_name, last_name, preferred_language
      FROM clients
      WHERE preferred_language IS NOT NULL
      AND preferred_language != ''
    `;

    const result = await pool.query(checkQuery);
    console.log(`\n📊 Found ${result.rows.length} clients with language preferences:`);

    if (result.rows.length === 0) {
      console.log('✅ No clients to update!');
      return;
    }

    // Show current values
    result.rows.forEach(row => {
      console.log(`  - ${row.first_name} ${row.last_name}: "${row.preferred_language}"`);
    });

    // Update English -> en
    const updateEnglish = await pool.query(`
      UPDATE clients
      SET preferred_language = 'en'
      WHERE preferred_language IN ('English', 'english', 'ENGLISH', 'EN')
      RETURNING id, first_name, last_name
    `);

    if (updateEnglish.rows.length > 0) {
      console.log(`\n✅ Updated ${updateEnglish.rows.length} clients to 'en':`);
      updateEnglish.rows.forEach(row => {
        console.log(`  - ${row.first_name} ${row.last_name}`);
      });
    }

    // Update Spanish -> es
    const updateSpanish = await pool.query(`
      UPDATE clients
      SET preferred_language = 'es'
      WHERE preferred_language IN ('Spanish', 'spanish', 'SPANISH', 'Español', 'español', 'ES')
      RETURNING id, first_name, last_name
    `);

    if (updateSpanish.rows.length > 0) {
      console.log(`\n✅ Updated ${updateSpanish.rows.length} clients to 'es':`);
      updateSpanish.rows.forEach(row => {
        console.log(`  - ${row.first_name} ${row.last_name}`);
      });
    }

    // Verify all clients now have valid codes
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM clients
      WHERE preferred_language NOT IN ('en', 'es', '', NULL)
    `;

    const verify = await pool.query(verifyQuery);
    if (verify.rows[0].count > 0) {
      console.log(`\n⚠️  Warning: ${verify.rows[0].count} clients still have invalid language codes`);
      const invalid = await pool.query(`
        SELECT id, first_name, last_name, preferred_language
        FROM clients
        WHERE preferred_language NOT IN ('en', 'es', '')
        AND preferred_language IS NOT NULL
      `);
      invalid.rows.forEach(row => {
        console.log(`  - ${row.first_name} ${row.last_name}: "${row.preferred_language}"`);
      });
    } else {
      console.log('\n✅ All clients now have valid language codes (en/es)!');
    }

    console.log('\n🎉 Language code migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixLanguageCodes();
