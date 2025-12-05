// Setup script: Make your account admin and run migrations
// Run with: node setup-admin.js your-email@example.com

require('dotenv').config();
const db = require('./db');

async function setupAdmin() {
  try {
    const email = process.argv[2];

    if (!email) {
      console.error('❌ Error: Please provide your email address');
      console.log('Usage: node setup-admin.js your-email@example.com');
      process.exit(1);
    }

    console.log('🚀 Starting Pro IRP Admin Setup...\n');

    // 1. Check if user exists
    const userCheck = await db.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userCheck.rows.length === 0) {
      console.error(`❌ Error: No user found with email: ${email}`);
      console.log('Please sign up first, then run this script.');
      process.exit(1);
    }

    const user = userCheck.rows[0];
    console.log(`✅ Found user: ${user.name || user.email} (current role: ${user.role})`);

    // 2. Update user to admin role
    await db.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['admin', user.id]
    );

    console.log(`✅ Updated ${user.email} to ADMIN role\n`);

    // 3. Check promo codes
    const promoCheck = await db.query(
      "SELECT code, description, max_uses, used_count FROM promo_codes WHERE code = 'PILOT2025'"
    );

    if (promoCheck.rows.length > 0) {
      const promo = promoCheck.rows[0];
      console.log('✅ Promo code PILOT2025 exists');
      console.log(`   Description: ${promo.description}`);
      console.log(`   Uses: ${promo.used_count}/${promo.max_uses || '∞'}\n`);
    } else {
      console.log('⚠️  Warning: PILOT2025 promo code not found');
      console.log('   Run the migration SQL first (002-auth-upgrade.sql)\n');
    }

    // 4. Show summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ADMIN SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Next steps:');
    console.log('1. Log out of Pro IRP');
    console.log('2. Log back in to get new token with admin role');
    console.log('3. You should now see admin-only features');
    console.log('');
    console.log('Pilot agencies can sign up with promo code: PILOT2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);

  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  }
}

setupAdmin();
