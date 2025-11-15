// edge-tts-service-2.js - Refactored MCP Client for persistent Edge TTS container
// Modular version using utility functions

const express = require('express');
const fsSync = require('fs');

// Import utilities
const { createStats } = require('./utils/stats');
const { createMethods } = require('./utils/methods');
const { setupRoutes } = require('./utils/routes');
const { callEdgeTts } = require('./utils/mcp');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_VOICE = process.env.EDGE_TTS_VOICE || 'en-US-AriaNeural';
const CONTAINER_NAME = 'edge-tts';
const TEMP_DIR = process.env.TEMP_DIR || 'C:\\temp';
const IN_DOCKER = process.env.IN_DOCKER || fsSync.existsSync('/.dockerenv');

// Initialize Express app
const app = express();
app.use(express.json());

// Create statistics tracker
const stats = createStats();

// Create service configuration
const config = {
  containerName: CONTAINER_NAME,
  defaultVoice: DEFAULT_VOICE,
  tempDir: TEMP_DIR,
  inDocker: IN_DOCKER
};

// Create service methods
const methods = createMethods(config, stats);

// Setup routes
setupRoutes(app, methods, stats);

// Start server
app.listen(PORT, HOST, async () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎙️  Edge TTS Service - MCP Proxy v2.0');
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
    await callEdgeTts(CONTAINER_NAME, 'speak', { text: 'Test', voice: DEFAULT_VOICE });
    console.log('✅ Edge TTS MCP server is accessible');
    console.log('🎧 Waiting for vocalization requests...');
    console.log('📊 Stats: http://localhost:' + PORT + '/stats');
    console.log('❌ Stop: Ctrl+C');
    console.log('');

    // Test speech on startup
    try {
      await methods.speak('Edge T T S service version 2 started');
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
  const currentStats = stats.getStats();
  console.log(`📊 Final stats: ${currentStats.totalSpoken} messages spoken, ${currentStats.errors} errors`);

  methods.speak('Edge T T S service version 2 stopped').then(() => {
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
  stats.incrementErrors();
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Promise]:', err);
  stats.incrementErrors();
});
