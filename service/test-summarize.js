// test-summarize.js - Test summarization and speech synthesis
// Summarizes Gettysburg Address first paragraph and speaks the result

const { createStats } = require('./utils/stats');
const { createMethods } = require('./utils/methods');

// Configuration
const config = {
  containerName: 'edge-tts',
  defaultVoice: 'en-US-AriaNeural',
  tempDir: 'C:\\temp',
  inDocker: false
};

// Create statistics tracker
const stats = createStats();

// Create service methods
const methods = createMethods(config, stats);

// First paragraph of Gettysburg Address
const gettysburgFirstParagraph = `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`;

async function testSummarizeAndSpeak() {
  console.log('🧪 Test: Summarize and Speak Gettysburg Address (First Paragraph)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Display original text
    console.log('📄 Original Text:');
    console.log(`"${gettysburgFirstParagraph}"`);
    console.log(`Length: ${gettysburgFirstParagraph.length} characters\n`);

    // Step 2: Summarize the text
    console.log('🤖 Summarizing with Docker AI...');
    const summarizeResult = await methods.summarize(gettysburgFirstParagraph, {
      maxLength: 50,
      style: 'concise'
    });

    console.log('\n✅ Summary Generated:');
    console.log(`"${summarizeResult.summary}"`);
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
    if (error.message.includes('Docker AI not available')) {
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
testSummarizeAndSpeak();
