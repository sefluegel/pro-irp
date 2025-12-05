// Test script to debug Google Calendar API
require('dotenv').config();
const { google } = require('googleapis');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testGoogleCalendar() {
  try {
    console.log('🔍 Testing Google Calendar API...\n');

    // Get the integration from database
    const result = await pool.query(`
      SELECT * FROM calendar_integrations
      WHERE provider = 'google'
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Google Calendar integration found in database');
      return;
    }

    const integration = result.rows[0];
    console.log('✅ Found integration:');
    console.log('   User ID:', integration.user_id);
    console.log('   Calendar ID:', integration.calendar_id || 'primary (default)');
    console.log('   Scope:', integration.scope);
    console.log('   Token Expiry:', integration.token_expiry);
    console.log('');

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Test 1: List all calendars
    console.log('📅 Fetching calendar list...');
    const calendarList = await calendar.calendarList.list();
    console.log('✅ Found', calendarList.data.items.length, 'calendars:\n');

    calendarList.data.items.forEach((cal, i) => {
      console.log(`   ${i + 1}. ${cal.summary}`);
      console.log(`      ID: ${cal.id}`);
      console.log(`      Access: ${cal.accessRole}`);
      console.log('');
    });

    // Test 2: Fetch events from selected calendar
    const calendarId = integration.calendar_id || 'primary';
    console.log(`\n📆 Fetching events from: ${calendarId}`);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 90);

    console.log(`   Date range: ${startDate.toDateString()} to ${endDate.toDateString()}\n`);

    const events = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    console.log('✅ API Response:');
    console.log('   Calendar Summary:', events.data.summary);
    console.log('   Events found:', events.data.items?.length || 0);
    console.log('   Time Zone:', events.data.timeZone);
    console.log('');

    if (events.data.items?.length > 0) {
      console.log('📋 First 5 events:');
      events.data.items.slice(0, 5).forEach((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`   ${i + 1}. ${event.summary || '(No title)'}`);
        console.log(`      Start: ${start}`);
        console.log(`      Status: ${event.status}`);
        console.log('');
      });
    } else {
      console.log('❌ No events found in this calendar for the date range');
      console.log('\n🔍 Trying PRIMARY calendar instead...');

      const primaryEvents = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      console.log('   Primary calendar events:', primaryEvents.data.items?.length || 0);

      if (primaryEvents.data.items?.length > 0) {
        console.log('\n📋 Events on PRIMARY calendar:');
        primaryEvents.data.items.slice(0, 5).forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.summary || '(No title)'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await pool.end();
  }
}

testGoogleCalendar();
