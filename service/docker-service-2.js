// docker-service-2.js - General-purpose script execution service (Refactored)
// Modular version using utility functions

const express = require('express');

// Import utilities
const { createDockerStats } = require('./utils/docker-stats');
const { createDockerMethods } = require('./utils/docker-methods');
const { setupDockerRoutes } = require('./utils/docker-routes');

// Configuration
const PORT = process.env.PORT || 3007;
const HOST = process.env.HOST || '0.0.0.0';
const TEMP_DIR = process.env.TEMP_DIR || 'C:\\temp';

// Initialize Express app
const app = express();
app.use(express.json());

// Create statistics tracker
const stats = createDockerStats();

// Create service configuration
const config = {
  tempDir: TEMP_DIR
};

// Create service methods
const methods = createDockerMethods(config, stats);

// Setup routes
setupDockerRoutes(app, methods, stats);

// Start server
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⚙️  Docker Script Execution Service v2.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Listening:     http://${HOST}:${PORT}`);
  console.log(`  From Docker:   http://host.docker.internal:${PORT}`);
  console.log(`  Temp Dir:      ${TEMP_DIR}`);
  console.log(`  Started:       ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📜 Script Types:');
  console.log('   • bash - Execute bash scripts');
  console.log('   • pws/powershell - Execute PowerShell scripts');
  console.log('');
  console.log('🎯 Ready to execute scripts...');
  console.log('📊 Stats: http://localhost:' + PORT + '/stats');
  console.log('❌ Stop: Ctrl+C');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Docker Script Execution Service...');
  const currentStats = stats.getStats();
  console.log(`📊 Final stats: ${currentStats.totalExecuted} scripts executed, ${currentStats.errors} errors`);
  console.log('✓ Shutdown complete');
  process.exit(0);
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
