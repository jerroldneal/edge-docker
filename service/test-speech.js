// test-speech.js - Test speech capabilities in docker-service-2
// Tests speak, speak-interpret, and speak-summary

const axios = require('axios');

// Configuration
const DOCKER_SERVICE_URL = process.env.DOCKER_SERVICE_URL || 'http://localhost:3007';

// Gettysburg Address opening
const GETTYSBURG_ADDRESS = `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war.`;

/**
 * Test speech capabilities
 */
async function testSpeech() {
  console.log('🧪 Test: Speech Capabilities (speak, speak-interpret, speak-summary)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Verify service is running
    console.log('🔍 Checking docker-service availability...');
    try {
      const healthCheck = await axios.get(`${DOCKER_SERVICE_URL}/health`);
      console.log(`✅ Service is running (uptime: ${healthCheck.data.uptime}s)\n`);
    } catch (error) {
      console.error('❌ Docker service is not running!');
      console.error(`   Expected at: ${DOCKER_SERVICE_URL}`);
      console.error('\n💡 Start the service with:');
      console.error('   npm run start:docker2\n');
      process.exit(1);
    }

    // Test cases for speech
    const testCases = [
      {
        name: 'Speak Verbatim',
        type: 'speak',
        text: 'Hello! This is a test of text to speech functionality.'
      },
      {
        name: 'Speak with Interpretation',
        type: 'speak-interpret',
        text: GETTYSBURG_ADDRESS,
        aiOptions: { maxLength: 150, style: 'analytical' }
      },
      {
        name: 'Speak with Summary',
        type: 'speak-summary',
        content: GETTYSBURG_ADDRESS,
        aiOptions: { maxLength: 50, style: 'concise' }
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📝 Test ${i + 1}/${testCases.length}: ${testCase.name}`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`🎯 Type: ${testCase.type}`);

      const inputText = testCase.text || testCase.content;
      console.log(`📄 Input: "${inputText.substring(0, 80)}${inputText.length > 80 ? '...' : ''}"`);
      console.log('');

      try {
        const scriptPayload = {
          scripts: [testCase]
        };

        const startTime = Date.now();
        console.log('🤖 Processing...');
        const response = await axios.post(`${DOCKER_SERVICE_URL}/execute`, scriptPayload);
        const duration = Date.now() - startTime;

        const result = response.data.results[0];

        if (result.success) {
          console.log(`✅ Success (${duration}ms)`);

          // Display type-specific results
          if (result.type === 'speak') {
            console.log(`\n🔊 Spoken Text: "${result.spokenText}"`);
            console.log(`📏 Length: ${result.length} chars`);
          } else if (result.type === 'speak-interpret') {
            console.log(`\n📖 Interpretation:`);
            console.log('─'.repeat(60));
            console.log(result.interpretation);
            console.log('─'.repeat(60));
            console.log(`📏 Original: ${result.originalLength} chars → Interpretation: ${result.interpretationLength} chars`);
          } else if (result.type === 'speak-summary') {
            console.log(`\n📝 Summary:`);
            console.log('─'.repeat(60));
            console.log(result.summary);
            console.log('─'.repeat(60));
            console.log(`📏 Original: ${result.originalLength} chars → Summary: ${result.summaryLength} chars`);
            console.log(`📊 Compression: ${result.compression}%`);
          }

          if (result.audioFile) {
            console.log(`🎵 Audio File: ${result.audioFile}`);
          }

          if (result.voice) {
            console.log(`🎙️  Voice: ${result.voice}`);
          }

          successCount++;
        } else {
          console.error(`❌ Execution failed: ${result.error || 'Unknown error'}`);
          failCount++;
        }

      } catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        if (error.response && error.response.data) {
          console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        }
        failCount++;
      }
    }

    // Summary
    console.log('\n\n' + '━'.repeat(60));
    console.log('📊 Test Summary');
    console.log('━'.repeat(60));
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Success Rate: ${Math.round((successCount / testCases.length) * 100)}%`);
    console.log('━'.repeat(60));

    if (failCount === 0) {
      console.log('\n🎉 All speech tests passed!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Start docker-service-2:');
      console.error('      npm run start:docker2');
      console.error('   2. Ensure Edge TTS service is running:');
      console.error('      npm run start:2  (in service directory)');
      console.error('   3. Ensure Docker AI (Model Runner) is available');
    }

    process.exit(1);
  }
}

// Run the test
console.log('\n');
testSpeech();
