// Test the actual /calendar/events endpoint
require('dotenv').config();
const jwt = require('jsonwebtoken');

const userId = 'd84ea78f-334b-4b52-ab6a-2b95bd5350bd';
const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
const token = jwt.sign({ id: userId }, secret);

console.log('Testing /calendar/events endpoint...\n');

fetch('http://localhost:8080/calendar/events', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log('Response OK:', data.ok);
  console.log('Events count:', data.events?.length || 0);

  if (data.events?.length > 0) {
    console.log('\nFirst 10 events:');
    data.events.slice(0, 10).forEach(e => {
      console.log(`  - ${e.start}: ${e.summary}`);
    });
  } else {
    console.log('\nNo events returned!');
    console.log('Full response:', JSON.stringify(data, null, 2));
  }
})
.catch(err => console.error('Error:', err.message));
