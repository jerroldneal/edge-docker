// test-code-generation.js - Test AI-powered code generation and execution
// Generates code from natural language and executes it

const axios = require('axios');

// Configuration
const DOCKER_SERVICE_URL = process.env.DOCKER_SERVICE_URL || 'http://localhost:3007';

/**
 * Test code generation and execution
 */
async function testCodeGeneration() {
  console.log('🧪 Test: AI-Powered Code Generation and Execution');
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
      console.error('   npm run start:docker2');
      console.error('   or: PORT=3007 node docker-service-2.js\n');
      process.exit(1);
    }

    // Test cases for code generation
    const testCases = [
      {
        name: 'PowerShell - Create Hello World App',
        type: 'code',
        expectation: 'Create a hello world PowerShell script file named hello.ps1 in C:\\temp that prints "Hello World from PowerShell!"',
        targetType: 'pws'
      },
      {
        name: 'PowerShell - Run Hello World App',
        type: 'code',
        expectation: 'Run the PowerShell script C:\\temp\\hello.ps1',
        targetType: 'pws'
      },
      {
        name: 'Bash - Create and Run Hello World',
        type: 'code',
        expectation: 'Create a hello.sh script in /tmp that prints "Hello World from Bash!" then execute it',
        targetType: 'bash'
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📝 Test ${i + 1}/${testCases.length}: ${testCase.name}`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`💭 Expectation: "${testCase.expectation}"`);
      console.log(`🎯 Target Type: ${testCase.targetType}`);
      console.log('');

      try {
        const scriptPayload = {
          scripts: [testCase]
        };

        const startTime = Date.now();
        console.log('🤖 Generating code with AI...');
        const response = await axios.post(`${DOCKER_SERVICE_URL}/execute`, scriptPayload);
        const duration = Date.now() - startTime;

        const result = response.data.results[0];

        if (result.success) {
          console.log(`✅ Code generated and executed successfully (${duration}ms)`);

          if (result.generatedCode) {
            console.log('\n📄 Generated Code:');
            console.log('─'.repeat(60));
            console.log(result.generatedCode);
            console.log('─'.repeat(60));
          }

          if (result.codeFile) {
            console.log(`💾 Code saved to: ${result.codeFile}`);
          }

          if (result.stdoutLength > 0) {
            const fs = require('fs');
            const stdout = fs.readFileSync(result.stdoutFile, 'utf-8');

            console.log('\n📊 Execution Output:');
            console.log('─'.repeat(60));
            console.log(stdout.substring(0, 500)); // Show first 500 chars
            if (stdout.length > 500) {
              console.log('...\n(truncated for display)');
            }
            console.log('─'.repeat(60));
          }

          console.log(`\n✓ Exit Code: ${result.exitCode}`);
          console.log(`✓ Output Size: ${result.stdoutLength} chars`);

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
      console.log('\n🎉 All code generation tests passed!\n');
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
      console.error('   2. Ensure Docker AI (Model Runner) is available:');
      console.error('      - Docker Desktop running');
      console.error('      - Model Runner enabled');
      console.error('      - Host TCP support enabled');
      console.error('      - Port 12434 accessible');
    }

    process.exit(1);
  }
}

// Run the test
console.log('\n');
testCodeGeneration();
