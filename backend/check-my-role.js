// Check your user role in the database
require('dotenv').config();
const { Pool } = require('pg');

async function checkRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const email = process.argv[2];

    if (!email) {
      console.log('Usage: node check-my-role.js your-email@example.com');
      process.exit(1);
    }

    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      console.log(`❌ No user found with email: ${email}`);
    } else {
      const user = result.rows[0];
      console.log('\n✅ User found:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}\n`);

      if (user.role === 'admin') {
        console.log('✅ Role is ADMIN - you should see Founder Metrics!');
      } else {
        console.log(`⚠️  Role is ${user.role} - not admin`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRole();
