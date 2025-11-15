// test-docker-logs.js - Test Docker logs summarization and speech
// Gets last 1 hour of Docker logs, summarizes them, and speaks the summary

const { createStats } = require('./utils/stats');
const { createMethods } = require('./utils/methods');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
  containerName: 'edge-tts',  // TTS container for speech synthesis
  defaultVoice: 'en-US-AriaNeural',
  tempDir: 'C:\\temp',
  inDocker: false
};

// Create statistics tracker
const stats = createStats();

// Create service methods
const methods = createMethods(config, stats);

// Target container for log analysis
const LOG_CONTAINER = 'vocalize-monitor';

/**
 * Get Docker logs from the last hour
 * @param {string} containerName - Name of container to get logs from
 * @returns {Promise<string>} Docker logs
 */
async function getDockerLogsLastHour(containerName = 'vocalize-monitor') {
  try {
    // Get logs from last 1 hour using --since flag
    const { stdout } = await execAsync(`docker logs ${containerName} --since 1h 2>&1`);
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get Docker logs: ${error.message}`);
  }
}

async function testDockerLogsSummary() {
  console.log('🧪 Test: Summarize and Speak Docker Logs (Last 1 Hour)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Get Docker logs
    console.log(`📋 Retrieving Docker logs from container: ${LOG_CONTAINER}`);
    const logs = await getDockerLogsLastHour(LOG_CONTAINER);

    if (!logs || logs.trim().length === 0) {
      console.log('⚠️  No logs found in the last hour');
      console.log('💡 Make sure the container has been running and generating logs');
      process.exit(0);
    }

    const logLines = logs.trim().split('\n').length;
    console.log(`✅ Retrieved ${logLines} lines of logs (${logs.length} chars)\n`);

    // Display sample of logs
    const logPreview = logs.substring(0, 300);
    console.log('📄 Log Preview:');
    console.log('─'.repeat(60));
    console.log(logPreview + (logs.length > 300 ? '\n...' : ''));
    console.log('─'.repeat(60));
    console.log('');

    // Limit logs if too large (keep last 2000 chars for better context)
    let logsToSummarize = logs;
    if (logs.length > 5000) {
      console.log(`⚠️  Logs are large (${logs.length} chars), using last 5000 chars for summary\n`);
      logsToSummarize = logs.substring(logs.length - 5000);
    }

    // Step 2: Summarize the logs
    console.log('🤖 Summarizing Docker logs with AI...');
    const summarizeResult = await methods.summarize(logsToSummarize, {
      maxLength: 100,
      style: 'concise',
      prompt: 'Summarize the key activities and events from these Docker container logs'
    });

    console.log('\n✅ Summary Generated:');
    console.log('─'.repeat(60));
    console.log(summarizeResult.summary);
    console.log('─'.repeat(60));
    console.log(`Original: ${summarizeResult.originalLength} chars → Summary: ${summarizeResult.summaryLength} chars\n`);

    // Step 3: Speak the summary
    console.log('🔊 Speaking the summary...');
    const speakResult = await methods.speak(summarizeResult.summary);

    console.log('\n✅ Speech Complete:');
    console.log(`Audio file: ${speakResult.audioFile}`);
    console.log(`Voice: ${speakResult.voice}`);

    // Step 4: Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results:');
    console.log(`  ✓ Log Retrieval: SUCCESS`);
    console.log(`  ✓ Log Lines: ${logLines}`);
    console.log(`  ✓ Summarization: SUCCESS`);
    console.log(`  ✓ Speech Synthesis: SUCCESS`);
    console.log(`  ✓ Original Length: ${summarizeResult.originalLength} chars`);
    console.log(`  ✓ Summary Length: ${summarizeResult.summaryLength} chars`);
    console.log(`  ✓ Compression: ${Math.round((1 - summarizeResult.summaryLength / summarizeResult.originalLength) * 100)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.message.includes('Failed to get Docker logs')) {
      console.error('\n💡 Troubleshooting:');
      console.error(`   1. Ensure container '${LOG_CONTAINER}' exists`);
      console.error('   2. Check that Docker Desktop is running');
      console.error('   3. Verify you have permissions to access Docker');
      console.error('\nAvailable containers:');
      try {
        const { stdout } = await execAsync('docker ps -a --format "{{.Names}}"');
        console.error(stdout);
      } catch (e) {
        console.error('   Could not list containers');
      }
    } else if (error.message.includes('Docker AI not available')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Ensure Docker Desktop is running');
      console.error('   2. Enable Docker Model Runner in Docker Desktop settings');
      console.error('   3. Enable "host-side TCP support for Model Runner"');
      console.error('   4. Verify port 12434 is accessible');
    }

    process.exit(1);
  }
}

// Run the test
console.log('\n');
testDockerLogsSummary();
