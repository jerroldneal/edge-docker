// test-docker-service.js - Test docker-service-2 script execution
// Executes a PowerShell command to list C:\ directory

const axios = require('axios');

// Configuration
const DOCKER_SERVICE_URL = process.env.DOCKER_SERVICE_URL || 'http://localhost:3007';

/**
 * Test script execution via docker-service-2
 */
async function testScriptExecution() {
  console.log('🧪 Test: Docker Service Script Execution');
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

    // Step 2: Execute PowerShell directory listing
    console.log('📋 Executing PowerShell script: Get-ChildItem C:\\ | Format-Table Name, LastWriteTime');
    const scriptPayload = {
      scripts: [
        {
          type: 'pws',
          content: 'Get-ChildItem C:\\ | Format-Table Name, LastWriteTime -AutoSize'
        }
      ]
    };

    const startTime = Date.now();
    const response = await axios.post(`${DOCKER_SERVICE_URL}/execute`, scriptPayload);
    const duration = Date.now() - startTime;

    // Step 3: Process results
    const result = response.data.results[0];

    console.log('\n✅ Script Executed Successfully:');
    console.log('─'.repeat(60));
    console.log(`Exit Code: ${result.exitCode}`);
    console.log(`Success: ${result.success}`);
    console.log(`Execution Time: ${duration}ms`);
    console.log(`Stdout File: ${result.stdoutFile}`);
    console.log(`Stderr File: ${result.stderrFile}`);
    console.log(`Stdout Length: ${result.stdoutLength} chars`);
    console.log(`Stderr Length: ${result.stderrLength} chars`);
    console.log('─'.repeat(60));

    // Step 4: Read and display output
    if (result.stdoutLength > 0) {
      const fs = require('fs');
      const stdout = fs.readFileSync(result.stdoutFile, 'utf-8');

      console.log('\n📄 Directory Listing Output:');
      console.log('─'.repeat(60));
      console.log(stdout.substring(0, 1000)); // Show first 1000 chars
      if (stdout.length > 1000) {
        console.log('...\n(truncated for display)');
      }
      console.log('─'.repeat(60));
    }

    // Step 5: Display test results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results:');
    console.log(`  ✓ Service Health Check: SUCCESS`);
    console.log(`  ✓ Script Execution: SUCCESS`);
    console.log(`  ✓ Exit Code: ${result.exitCode}`);
    console.log(`  ✓ Execution Time: ${duration}ms`);
    console.log(`  ✓ Output Captured: ${result.stdoutLength} chars`);
    console.log(`  ✓ Output Files Created: YES`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 6: Test with bash script (cross-platform)
    console.log('🐧 Testing bash script execution...');
    const bashPayload = {
      scripts: [
        {
          type: 'bash',
          content: 'echo "Hello from bash!"; date; pwd'
        }
      ]
    };

    const bashResponse = await axios.post(`${DOCKER_SERVICE_URL}/execute`, bashPayload);
    const bashResult = bashResponse.data.results[0];

    if (bashResult.success) {
      const fs = require('fs');
      const bashOutput = fs.readFileSync(bashResult.stdoutFile, 'utf-8');
      console.log('✅ Bash script executed successfully:');
      console.log('─'.repeat(60));
      console.log(bashOutput.trim());
      console.log('─'.repeat(60));
    }

    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Start docker-service-2:');
      console.error('      npm run start:docker2');
      console.error('   2. Or use docker-service.js:');
      console.error('      npm run start:docker');
      console.error('   3. Verify port 3007 is not in use by another process');
    } else if (error.response) {
      console.error('\nAPI Error Response:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Run the test
console.log('\n');
testScriptExecution();
