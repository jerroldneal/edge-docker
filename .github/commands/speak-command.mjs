#!/usr/bin/env node

/**
 * Copilot Speak Command Implementation
 *
 * This script allows Copilot (or command-line) to invoke the Windows TTS service.
 *
 * Usage:
 *   node speak-command.js "Your message here"
 *   npm run speak "Task completed"
 */

const WINDOWS_SERVICE_URL = process.env.WINDOWS_SERVICE_URL || 'http://localhost:3000';

async function speak(text) {
  if (!text || text.trim().length === 0) {
    console.error('❌ Error: No text provided');
    console.log('Usage: node speak-command.js "Your message here"');
    process.exit(1);
  }

  console.log(`🔊 Speaking: "${text}"`);
  console.log(`📡 Service: ${WINDOWS_SERVICE_URL}`);

  try {
    const response = await fetch(`${WINDOWS_SERVICE_URL}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Success: ${result.message}`);
    console.log(`   Length: ${result.length} characters`);
    console.log(`   Time: ${result.timestamp}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to speak: ${error.message}`);

    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Tip: Make sure Windows service is running:');
      console.error('   cd tryout-vocalize-framework');
      console.error('   npm start');
    }

    process.exit(1);
  }
}

// Get message from command-line arguments
const message = process.argv.slice(2).join(' ');
speak(message);
