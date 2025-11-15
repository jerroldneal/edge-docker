// windows-service.js - Host-based vocalization service (P2P Peer B)
// Listens for RPC calls from Docker container and speaks using blofin-utilities

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// Dynamic import for ESM module and speaker instance
let Speak;
let speaker;

(async () => {
  try {
    const utilities = await import('blofin-utilities');
    Speak = utilities.Speak;
    // Create speaker instance using AsyncNew pattern
    speaker = await Speak.new();
    console.log('[✓] Speak module loaded and initialized');
  } catch (error) {
    console.error('[✗] Failed to load Speak module:', error.message);
  }
})();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Statistics
let stats = {
  started: new Date().toISOString(),
  totalRequests: 0,
  totalSpoken: 0,
  lastSpoken: null,
  lastMessage: null,
  errors: 0
};

// Safe RPC methods that container can invoke
const safeMethods = {
  /**
   * Speak text using Windows TTS
   * @param {string} text - Text to vocalize
   * @param {object} options - Speech options (voice, rate, volume)
   * @returns {object} Success status
   */
  speak: async (text, options = {}) => {
    try {
      if (!speaker) {
        throw new Error('Speak module not yet initialized');
      }

      const timestamp = new Date().toISOString();
      const preview = text.substring(0, 60) + (text.length > 60 ? '...' : '');
      console.log(`[${timestamp}] 🔊 Speaking: "${preview}"`);

      // Use speaker instance
      await speaker.speak(text, options);

      stats.totalSpoken++;
      stats.lastSpoken = timestamp;
      stats.lastMessage = text;

      return {
        success: true,
        message: 'Speech completed',
        length: text.length,
        timestamp: timestamp
      };
    } catch (error) {
      stats.errors++;
      console.error('[✗] Speak error:', error.message);
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
      service: 'windows-vocalization-service',
      version: '1.0.0'
    };
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
    service: 'Docker Vocalize Framework - Windows Service',
    version: '1.0.0',
    description: 'P2P vocalization service for Docker containers',
    endpoints: {
      'POST /rpc': 'RPC method invocation { method: string, args: array }',
      'POST /speak': 'Direct speech synthesis { text: string, options?: object }',
      'GET /speak-from-file?filePath=<path>': 'Speak text from file (for Copilot)',
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
  console.log('  🎙️  Docker Vocalize Framework - Windows Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Listening:     http://${HOST}:${PORT}`);
  console.log(`  From Docker:   http://host.docker.internal:${PORT}`);
  console.log(`  Started:       ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Wait for speaker to initialize
  let attempts = 0;
  while (!speaker && attempts < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (speaker) {
    console.log('🎧 Waiting for vocalization requests from Docker containers...');
    console.log('📊 Stats: http://localhost:3000/stats');
    console.log('❌ Stop: Ctrl+C');
    console.log('');

    // Test speech on startup
    speaker.speak('Docker vocalization service started').catch(err => {
      console.warn('[⚠️ ] Initial speech test failed:', err.message);
      console.warn('     Audio may not be available, but service will continue');
    });
  } else {
    console.warn('[⚠️ ] Speaker not initialized, service running in degraded mode');
    console.warn('     RPC requests will fail until module loads');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Windows service...');
  console.log(`📊 Final stats: ${stats.totalSpoken} messages spoken, ${stats.errors} errors`);

  if (speaker) {
    speaker.speak('Docker vocalization service stopped').then(() => {
      console.log('✓ Shutdown complete');
      process.exit(0);
    }).catch(() => {
      console.log('✓ Shutdown complete (speech unavailable)');
      process.exit(0);
    });
  } else {
    console.log('✓ Shutdown complete');
    process.exit(0);
  }
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
