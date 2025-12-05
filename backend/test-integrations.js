// backend/test-integrations.js - Test all third-party integrations
// Run this script after setting up all your credentials in .env

require('dotenv').config();
const { sendSMS } = require('./utils/twilio');
const { sendEmail } = require('./utils/sendgrid');

console.log('\n🧪 Testing Pro IRP Third-Party Integrations\n');
console.log('='.repeat(60));

// Test Twilio SMS
async function testTwilio() {
  console.log('\n📱 Testing Twilio (SMS)...\n');

  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log('❌ TWILIO_ACCOUNT_SID not found in .env');
    console.log('   → Skip this test if you haven\'t set up Twilio yet\n');
    return false;
  }

  try {
    // Replace with your phone number for testing
    const testPhone = process.env.TEST_PHONE_NUMBER || '+15551234567';

    console.log(`   Sending test SMS to ${testPhone}...`);

    const result = await sendSMS({
      to: testPhone,
      body: 'Test message from Pro IRP! Your integrations are working. 🎉',
      clientId: null, // No client for test
      userId: null // No user for test
    });

    console.log(`   ✅ SMS sent successfully!`);
    console.log(`   Message SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);

    if (process.env.TWILIO_HIPAA_ENABLED !== 'true') {
      console.log('\n   ⚠️  WARNING: HIPAA BAA not yet signed with Twilio');
      console.log('   Do NOT send PHI until BAA is executed!\n');
    }

    return true;

  } catch (error) {
    console.log(`   ❌ Twilio test failed: ${error.message}\n`);
    return false;
  }
}

// Test SendGrid Email
async function testSendGrid() {
  console.log('\n📧 Testing SendGrid (Email)...\n');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in .env');
    console.log('   → Skip this test if you haven\'t set up SendGrid yet\n');
    return false;
  }

  try {
    // Replace with your email for testing
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';

    console.log(`   Sending test email to ${testEmail}...`);

    const result = await sendEmail({
      to: testEmail,
      subject: 'Pro IRP Test Email',
      text: 'This is a test email from Pro IRP!\n\nYour SendGrid integration is working correctly. 🎉\n\nYou can now send emails to your clients.',
      html: '<h2>Pro IRP Test Email</h2><p>This is a test email from Pro IRP!</p><p>Your SendGrid integration is working correctly. 🎉</p><p>You can now send emails to your clients.</p>',
      clientId: null,
      userId: null
    });

    console.log(`   ✅ Email sent successfully!`);
    console.log(`   Message ID: ${result.messageId}`);

    if (process.env.SENDGRID_HIPAA_ENABLED !== 'true') {
      console.log('\n   ⚠️  WARNING: HIPAA BAA not yet signed with SendGrid');
      console.log('   Do NOT send PHI until BAA is executed!\n');
    }

    return true;

  } catch (error) {
    console.log(`   ❌ SendGrid test failed: ${error.message}\n`);
    return false;
  }
}

// Test Google Calendar (just check credentials)
function testGoogleCalendar() {
  console.log('\n📅 Checking Google Calendar credentials...\n');

  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  if (hasClientId && hasClientSecret) {
    console.log('   ✅ Google Calendar credentials found');
    console.log('   Client ID:', process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
    console.log('   → Calendar sync will work once users connect their accounts\n');
    return true;
  } else {
    console.log('   ❌ Google Calendar credentials not found');
    console.log('   → Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env\n');
    return false;
  }
}

// Test Microsoft Outlook (just check credentials)
function testMicrosoftOutlook() {
  console.log('\n📅 Checking Microsoft Outlook credentials...\n');

  const hasClientId = !!process.env.MICROSOFT_CLIENT_ID;
  const hasClientSecret = !!process.env.MICROSOFT_CLIENT_SECRET;

  if (hasClientId && hasClientSecret) {
    console.log('   ✅ Microsoft Outlook credentials found');
    console.log('   Client ID:', process.env.MICROSOFT_CLIENT_ID.substring(0, 20) + '...');
    console.log('   → Calendar sync will work once users connect their accounts\n');
    return true;
  } else {
    console.log('   ❌ Microsoft Outlook credentials not found');
    console.log('   → Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env\n');
    return false;
  }
}

// Test OpenAI (just check API key)
function testOpenAI() {
  console.log('\n🤖 Checking OpenAI credentials...\n');

  const hasApiKey = !!process.env.OPENAI_API_KEY;

  if (hasApiKey) {
    console.log('   ✅ OpenAI API key found');
    console.log('   Model:', process.env.OPENAI_MODEL || 'gpt-4o-mini');
    console.log('   → AI helper features will work\n');
    return true;
  } else {
    console.log('   ❌ OpenAI API key not found');
    console.log('   → Set OPENAI_API_KEY in .env to enable AI features\n');
    return false;
  }
}

// Test Stripe (just check credentials)
function testStripe() {
  console.log('\n💳 Checking Stripe credentials...\n');

  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasPublishableKey = !!process.env.STRIPE_PUBLISHABLE_KEY;

  if (hasSecretKey && hasPublishableKey) {
    console.log('   ✅ Stripe credentials found');
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    console.log('   Mode:', isTestMode ? 'TEST' : 'LIVE');
    console.log('   → Payment processing will work\n');
    return true;
  } else {
    console.log('   ❌ Stripe credentials not found');
    console.log('   → Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env\n');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting integration tests...\n');

  const results = {
    twilio: false,
    sendgrid: false,
    googleCalendar: false,
    outlook: false,
    openai: false,
    stripe: false
  };

  // Run tests
  results.twilio = await testTwilio();
  results.sendgrid = await testSendGrid();
  results.googleCalendar = testGoogleCalendar();
  results.outlook = testMicrosoftOutlook();
  results.openai = testOpenAI();
  results.stripe = testStripe();

  // Summary
  console.log('='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([service, passed]) => {
    const icon = passed ? '✅' : '❌';
    const name = service.charAt(0).toUpperCase() + service.slice(1);
    console.log(`   ${icon} ${name}`);
  });

  console.log(`\n   ${passed}/${total} integrations configured\n`);

  if (passed === total) {
    console.log('🎉 All integrations are ready!\n');
  } else {
    console.log('⚠️  Some integrations need setup. See THIRD-PARTY-SETUP.md for instructions.\n');
  }

  console.log('='.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('   1. Execute HIPAA BAAs with Twilio and SendGrid');
  console.log('   2. Test calendar sync by connecting your Google/Outlook account');
  console.log('   3. Review HIPAA-COMPLIANCE.md for production checklist\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
