// mcp.js - MCP protocol communication utilities

const { spawn } = require('child_process');
const { ensureContainer } = require('./container');

/**
 * Call Edge TTS MCP server in persistent container
 * @param {string} containerName - Name of the container
 * @param {string} toolName - Tool name to call
 * @param {object} toolArgs - Tool arguments
 * @returns {Promise<object>} Tool response
 */
async function callEdgeTts(containerName, toolName, toolArgs) {
  // Ensure container is running
  const ready = await ensureContainer(containerName);
  if (!ready) {
    throw new Error('Container not available');
  }

  return new Promise((resolve, reject) => {
    const dockerProcess = spawn('docker', ['exec', '-i', containerName, 'python', 'server.py']);

    let stdout = '';
    let stderr = '';
    let resolved = false;

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        dockerProcess.kill();
        reject(new Error('MCP server timeout'));
      }
    }, 10000);

    dockerProcess.stdout.on('data', (data) => {
      stdout += data.toString();

      // Try to parse responses line by line
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);

          // Look for the tool call response (id: 2)
          if (response.id === 2 && !resolved) {
            resolved = true;
            clearTimeout(timeout);

            if (response.error) {
              dockerProcess.kill();
              return reject(new Error(response.error.message || JSON.stringify(response.error)));
            } else if (response.result) {
              // Don't kill immediately, give it a moment to clean up
              setTimeout(() => dockerProcess.kill(), 100);
              return resolve(response.result);
            }
          }
        } catch (err) {
          // Not a complete JSON line yet, continue
        }
      }
    });

    dockerProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    dockerProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (resolved) {
        // Already handled
        return;
      }

      if (code !== 0 && !resolved) {
        resolved = true;
        return reject(new Error(`Docker process exited with code ${code}: ${stderr.substring(0, 500)}`));
      }
    });

    dockerProcess.on('error', (err) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to spawn Docker: ${err.message}`));
      }
    });

    // Send initialization and tool call
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'edge-tts-service', version: '1.0.0' }
      }
    };

    const toolMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    };

    // Write messages
    dockerProcess.stdin.write(JSON.stringify(initMessage) + '\n');
    dockerProcess.stdin.write(JSON.stringify(toolMessage) + '\n');
    // Don't close stdin immediately - let the server process
  });
}

module.exports = {
  callEdgeTts
};
