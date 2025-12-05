// Start ngrok tunnel and update .env with the URL
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

async function startNgrok() {
  try {
    console.log('🚀 Starting ngrok tunnel on port 8080...');

    const url = await ngrok.connect(8080);

    console.log('\n✅ Ngrok tunnel established!');
    console.log(`📡 Public URL: ${url}`);
    console.log('\n🔧 Updating backend/.env with APP_URL...');

    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update APP_URL
    if (envContent.includes('APP_URL=')) {
      envContent = envContent.replace(/APP_URL=.*$/m, `APP_URL=${url}`);
    } else {
      envContent += `\nAPP_URL=${url}\n`;
    }

    fs.writeFileSync(envPath, envContent);

    console.log('✅ .env updated successfully!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Ngrok is running! Keep this terminal open.');
    console.log(`📞 Twilio can now reach your local server at: ${url}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nPress Ctrl+C to stop ngrok');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping ngrok...');
      await ngrok.disconnect();
      await ngrok.kill();
      console.log('✅ Ngrok stopped');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting ngrok:', error.message);
    process.exit(1);
  }
}

startNgrok();
