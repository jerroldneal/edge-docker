// edge-tts-service.js - MCP Client for persistent Edge TTS container
// Connects to persistent 'edge-tts' container, gets MP3, plays audio

const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_VOICE = process.env.EDGE_TTS_VOICE || 'en-US-AriaNeural';
const CONTAINER_NAME = 'edge-tts';
const TEMP_DIR = process.env.TEMP_DIR || 'C:\\temp';
const IN_DOCKER = process.env.IN_DOCKER || fsSync.existsSync('/.dockerenv');

// Statistics
let stats = {
  started: new Date().toISOString(),
  totalRequests: 0,
  totalSpoken: 0,
  lastSpoken: null,
  lastMessage: null,
  errors: 0
};

/**
 * Check if edge-tts container exists and is running
 */
async function checkContainer() {
  try {
    const { stdout } = await execAsync(`docker ps -a --filter "name=^${CONTAINER_NAME}$" --format "{{.Names}}|{{.Status}}"`);

    if (!stdout.trim()) {
      return { exists: false, running: false };
    }

    const [name, status] = stdout.trim().split('|');
    return {
      exists: name === CONTAINER_NAME,
      running: status.toLowerCase().includes('up')
    };
  } catch (err) {
    return { exists: false, running: false };
  }
}

/**
 * Ensure container exists and is running
 */
async function ensureContainer() {
  const status = await checkContainer();

  if (status.exists && status.running) {
    return true;
  }

  if (status.exists && !status.running) {
    console.log('🔄 Starting container...');
    try {
      await execAsync(`docker start ${CONTAINER_NAME}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (err) {
      console.error('[Container Start Error]:', err.message);
      return false;
    }
  }

  // Create persistent container
  console.log('🚀 Creating persistent container...');
  try {
    await execAsync(`docker run -d --name ${CONTAINER_NAME} --restart always -i edge-tts-mcp python server.py`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (err) {
    console.error('[Container Create Error]:', err.message);
    return false;
  }
}

/**
 * Play MP3 audio file using PowerShell
 */
async function playAudio(filePath) {
  return new Promise((resolve) => {
    // Use MediaPlayer from PresentationCore assembly - built-in Windows component
    const escapedPath = filePath.replace(/\\/g, '\\\\');
    const psCommand = `powershell -Command "Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Play(); Start-Sleep -Milliseconds 500; while($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; $duration = [math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds); Start-Sleep -Seconds $duration"`;

    exec(psCommand, (error) => {
      if (error) {
        console.warn(`[Audio Playback Warning]: ${error.message}`);
      }
      // Resolve after playback completes
      resolve();
    });
  });
}/**
 * Call Edge TTS MCP server in persistent container
 * @param {string} toolName - Tool name to call
 * @param {object} toolArgs - Tool arguments
 * @returns {Promise<object>} Tool response
 */
async function callEdgeTts(toolName, toolArgs) {
  // Ensure container is running
  const ready = await ensureContainer();
  if (!ready) {
    throw new Error('Container not available');
  }

  return new Promise((resolve, reject) => {
    const dockerProcess = spawn('docker', ['exec', '-i', CONTAINER_NAME, 'python', 'server.py']);

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

// Safe RPC methods that container can invoke
const safeMethods = {
  /**
   * Speak text using Edge TTS
   * @param {string} text - Text to vocalize
   * @param {object} options - Speech options (voice, output_file)
   * @returns {object} Success status
   */
  speak: async (text, options = {}) => {
    try {
      const timestamp = new Date().toISOString();
      const preview = text.substring(0, 60) + (text.length > 60 ? '...' : '');
      console.log(`[${timestamp}] 🔊 Speaking: "${preview}"`);

      const voice = options.voice || DEFAULT_VOICE;
      const containerOutputFile = '/tmp/output.mp3';

      // Generate unique filename for host
      const hostFilename = `edge-tts-${Date.now()}.mp3`;
      const hostOutputPath = path.join(TEMP_DIR, hostFilename);

      // Call Edge TTS MCP server to generate audio
      const result = await callEdgeTts('speak', { text, voice, output_file: containerOutputFile });

      // Copy MP3 from persistent container to host
      await execAsync(`docker cp ${CONTAINER_NAME}:${containerOutputFile} "${hostOutputPath}"`);
      console.log(`📁 Copied to: ${hostOutputPath}`);

      // Play the audio file
      console.log('🔊 Playing audio...');
      await playAudio(hostOutputPath);
      console.log('✅ Playback complete');

      stats.totalSpoken++;
      stats.lastSpoken = timestamp;
      stats.lastMessage = text;

      // Extract text content from MCP response
      let resultText = 'Speech completed and played';
      if (result.content && result.content.length > 0 && result.content[0].text) {
        resultText = result.content[0].text;
      }

      return {
        success: true,
        message: resultText,
        length: text.length,
        voice: voice,
        timestamp: timestamp,
        audioFile: hostOutputPath,
        played: true
      };
    } catch (error) {
      stats.errors++;
      console.error('[✗] Speak error:', error.message);
      throw error;
    }
  },

  /**
   * Speak text using Edge TTS and copy output to host
   * Uses persistent container and MCP protocol (supports any text length)
   * @param {string} text - Text to vocalize
   * @param {object} options - Speech options (voice, output_file)
   * @returns {object} Success status with local file path
   */
  speakDebug: async (text, options = {}) => {
    try {
      const timestamp = new Date().toISOString();
      const preview = text.substring(0, 60) + (text.length > 60 ? '...' : '');
      console.log(`[${timestamp}] 🔊 Speaking (DEBUG): "${preview}"`);

      const voice = options.voice || DEFAULT_VOICE;
      const containerOutputFile = '/tmp/output.mp3';

      // Generate unique filename for host
      const hostFilename = `edge-tts-${Date.now()}.mp3`;
      const hostOutputPath = path.join('C:', 'temp', hostFilename);

      // Call Edge TTS MCP server to generate audio (supports full text length)
      const result = await callEdgeTts('speak', { text, voice, output_file: containerOutputFile });

      // Copy MP3 from persistent container to host (C:/temp for debugging)
      await execAsync(`docker cp ${CONTAINER_NAME}:${containerOutputFile} "${hostOutputPath}"`);
      console.log(`📁 Copied to: ${hostOutputPath}`);

      stats.totalSpoken++;
      stats.lastSpoken = timestamp;
      stats.lastMessage = text;

      // Extract text content from MCP response
      let resultText = 'Speech completed and saved to C:/temp';
      if (result.content && result.content.length > 0 && result.content[0].text) {
        resultText = result.content[0].text;
      }

      return {
        success: true,
        message: resultText,
        length: text.length,
        voice: voice,
        timestamp: timestamp,
        hostFile: hostOutputPath,
        copied: true
      };
    } catch (error) {
      stats.errors++;
      console.error('[✗] Speak debug error:', error.message);
      throw error;
    }
  },

  /**
   * List available voices
   * @param {object} options - Filter options (language)
   * @returns {object} Available voices
   */
  listVoices: async (options = {}) => {
    try {
      const result = await callEdgeTts('list_voices', options);

      // Extract text content from MCP response
      if (result.content && result.content.length > 0 && result.content[0].text) {
        return {
          success: true,
          voices: result.content[0].text
        };
      }

      return { success: true, result };
    } catch (error) {
      stats.errors++;
      console.error('[✗] List voices error:', error.message);
      throw error;
    }
  },

  /**
   * Get service statistics
   * @returns {object} Service stats
   */
  getStats: () => {
    return {
      ...stats,
      uptime: Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000)
    };
  },

  /**
   * Health check
   * @returns {object} Health status
   */
  ping: () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'edge-tts-service',
      version: '1.0.0',
      backend: 'edge-tts-mcp-docker'
    };
  },

  /**
   * Play an existing MP3 file
   * @param {string} filePath - Path to MP3 file (host or container path)
   * @param {object} options - Playback options
   * @returns {object} Playback status
   */
  playMp3: async (filePath, options = {}) => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🎵 Playing MP3: ${filePath}`);

      let localPath = filePath;

      // Check if file exists on host
      try {
        await fs.access(filePath);
        console.log('📁 File found on host');
      } catch (err) {
        // File not on host, try to copy from container
        if (filePath.startsWith('/')) {
          console.log('📦 Attempting to copy from container...');
          const hostFilename = `playback-${Date.now()}.mp3`;
          localPath = path.join(TEMP_DIR, hostFilename);

          try {
            await execAsync(`docker cp ${CONTAINER_NAME}:${filePath} "${localPath}"`);
            console.log(`📁 Copied from container to: ${localPath}`);
          } catch (copyErr) {
            throw new Error(`File not found on host or in container: ${filePath}`);
          }
        } else {
          throw new Error(`File not found: ${filePath}`);
        }
      }

      // Play the audio file
      console.log('🔊 Playing audio...');
      await playAudio(localPath);
      console.log('✅ Playback complete');

      // Get file info
      const fileStats = await fs.stat(localPath);

      return {
        success: true,
        message: 'MP3 playback completed',
        filePath: localPath,
        fileSize: fileStats.size,
        timestamp: timestamp,
        played: true
      };
    } catch (error) {
      stats.errors++;
      console.error('[✗] Play MP3 error:', error.message);
      throw error;
    }
  },

  /**
   * Test echo - returns input
   * @param {any} data - Data to echo back
   * @returns {object} Echo response
   */
  echo: (data) => {
    return { echoed: data, timestamp: new Date().toISOString() };
  }
};

// RPC endpoint - accepts method calls from container
app.post('/rpc', async (req, res) => {
  stats.totalRequests++;

  const { method, args = [] } = req.body;

  const argsPreview = JSON.stringify(args).substring(0, 100);
  console.log(`[RPC] Method: ${method}, Args: ${argsPreview}${args.length > 100 ? '...' : ''}`);

  if (!method) {
    return res.status(400).json({ error: 'Method name required' });
  }

  if (safeMethods[method]) {
    try {
      const result = await safeMethods[method](...args);
      res.json({ result });
    } catch (err) {
      stats.errors++;
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  } else {
    res.status(404).json({
      error: 'Method not found',
      requested: method,
      available: Object.keys(safeMethods)
    });
  }
});

// Convenience endpoint for direct speak requests
app.post('/speak', async (req, res) => {
  stats.totalRequests++;

  const { text, options } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  try {
    const result = await safeMethods.speak(text, options);
    res.json(result);
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// GET endpoint for Copilot - reads text from file and copies output to host
app.get('/speak-debug-output', async (req, res) => {
  stats.totalRequests++;

  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath query parameter required' });
  }

  try {
    // Read text from file
    const text = await fs.readFile(filePath, 'utf-8');

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'File is empty or contains no text' });
    }

    // Speak the text and copy output
    const result = await safeMethods.speakDebug(text.trim());

    // Optionally delete the temp file after speaking
    try {
      await fs.unlink(filePath);
    } catch (unlinkErr) {
      // Ignore errors deleting temp file
    }

    res.json({
      ...result,
      fileRead: filePath,
      fileDeleted: true
    });
  } catch (err) {
    stats.errors++;

    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found', filePath });
    }

    res.status(500).json({ error: err.message });
  }
});

// GET endpoint for playing MP3 files
app.get('/play-mp3', async (req, res) => {
  stats.totalRequests++;

  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath query parameter required' });
  }

  try {
    const result = await safeMethods.playMp3(filePath);
    res.json(result);
  } catch (err) {
    stats.errors++;

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message, filePath });
    }

    res.status(500).json({ error: err.message });
  }
});

// POST endpoint for playing MP3 files
app.post('/play-mp3', async (req, res) => {
  stats.totalRequests++;

  const { filePath, options } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath required' });
  }

  try {
    const result = await safeMethods.playMp3(filePath, options);
    res.json(result);
  } catch (err) {
    stats.errors++;

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message, filePath });
    }

    res.status(500).json({ error: err.message });
  }
});

// GET endpoint for Copilot - reads text from file
app.get('/speak-from-file', async (req, res) => {
  stats.totalRequests++;

  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath query parameter required' });
  }

  try {
    // Read text from file
    const text = await fs.readFile(filePath, 'utf-8');

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'File is empty or contains no text' });
    }

    // Speak the text
    const result = await safeMethods.speak(text.trim());

    // Optionally delete the temp file after speaking
    try {
      await fs.unlink(filePath);
    } catch (unlinkErr) {
      // Ignore errors deleting temp file
    }

    res.json({
      ...result,
      fileRead: filePath,
      fileDeleted: true
    });
  } catch (err) {
    stats.errors++;

    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found', filePath });
    }

    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(safeMethods.getStats());
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json(safeMethods.getStats());
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Edge TTS Service - MCP Proxy',
    version: '1.0.0',
    description: 'HTTP proxy for Edge TTS MCP server in Docker',
    endpoints: {
      'POST /rpc': 'RPC method invocation { method: string, args: array }',
      'POST /speak': 'Direct speech synthesis { text: string, options?: object }',
      'GET /speak-from-file?filePath=<path>': 'Speak text from file (for Copilot)',
      'GET /speak-debug-output?filePath=<path>': 'Speak and copy MP3 to C:/temp (for debugging)',
      'GET /play-mp3?filePath=<path>': 'Play an existing MP3 file from host or container',
      'POST /play-mp3': 'Play MP3 file { filePath: string, options?: object }',
      'GET /health': 'Health check and statistics',
      'GET /stats': 'Service statistics',
      'GET /': 'This documentation'
    },
    availableMethods: Object.keys(safeMethods).map(key => ({
      name: key,
      description: safeMethods[key].toString().split('\n')[0]
    })),
    stats: safeMethods.getStats()
  });
});

// Start server
app.listen(PORT, HOST, async () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎙️  Edge TTS Service - MCP Proxy');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Listening:     http://${HOST}:${PORT}`);
  console.log(`  From Docker:   http://host.docker.internal:${PORT}`);
  console.log(`  Backend:       edge-tts-mcp (Docker)`);
  console.log(`  Default Voice: ${DEFAULT_VOICE}`);
  console.log(`  Started:       ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Test MCP connection on startup
  try {
    console.log('🔍 Testing Edge TTS MCP server connection...');
    await callEdgeTts('speak', { text: 'Test', voice: DEFAULT_VOICE });
    console.log('✅ Edge TTS MCP server is accessible');
    console.log('🎧 Waiting for vocalization requests...');
    console.log('📊 Stats: http://localhost:3000/stats');
    console.log('❌ Stop: Ctrl+C');
    console.log('');

    // Test speech on startup
    try {
      await safeMethods.speak('Edge T T S service started');
      console.log('🔊 Startup speech test successful');
    } catch (err) {
      console.warn('[⚠️ ] Startup speech test failed:', err.message);
    }
  } catch (err) {
    console.error('[✗] Failed to connect to Edge TTS MCP server:', err.message);
    console.error('    Make sure edge-tts-mcp Docker image is built');
    console.error('    Service will continue, but speech requests will fail');
  }
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Edge TTS service...');
  console.log(`📊 Final stats: ${stats.totalSpoken} messages spoken, ${stats.errors} errors`);

  safeMethods.speak('Edge T T S service stopped').then(() => {
    console.log('✓ Shutdown complete');
    process.exit(0);
  }).catch(() => {
    console.log('✓ Shutdown complete (speech unavailable)');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Fatal Error]:', err);
  stats.errors++;
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Promise]:', err);
  stats.errors++;
});
