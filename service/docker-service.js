// docker-service.js - General-purpose script execution service
// Executes bash/PowerShell scripts with parameter passing and output capture

const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3007;
const HOST = process.env.HOST || '0.0.0.0';
const TEMP_DIR = process.env.TEMP_DIR || 'C:\\temp';

// Statistics
let stats = {
  started: new Date().toISOString(),
  totalRequests: 0,
  totalExecuted: 0,
  lastExecuted: null,
  errors: 0
};

/**
 * Execute a script (bash or PowerShell) and capture output
 * @param {object} scriptObj - Script object with type, path/content, params
 * @returns {object} Execution result with stdout/stderr file paths
 */
async function executeScript(scriptObj) {
  const { type, path: scriptPath, content, params = [] } = scriptObj;
  const timestamp = Date.now();

  // Determine shell and command
  let shellCommand;
  let shellArgs = [];
  let scriptToExecute;

  if (type === 'bash') {
    shellCommand = 'bash';

    if (scriptPath) {
      // Check if file exists
      try {
        await fs.access(scriptPath);
        scriptToExecute = scriptPath;
      } catch (err) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
    } else if (content) {
      // Write content to temp file
      const tempScript = path.join(TEMP_DIR, `script-${timestamp}.sh`);
      await fs.writeFile(tempScript, content, 'utf8');
      scriptToExecute = tempScript;
    } else {
      throw new Error('Either path or content must be provided');
    }

    shellArgs = [scriptToExecute, ...params];
  } else if (type === 'pws' || type === 'powershell') {
    shellCommand = 'powershell';
    shellArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass'];

    if (scriptPath) {
      // Check if file exists
      try {
        await fs.access(scriptPath);
        scriptToExecute = scriptPath;
      } catch (err) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
      shellArgs.push('-File', scriptToExecute, ...params);
    } else if (content) {
      // Execute content directly via -Command
      shellArgs.push('-Command', content);
    } else {
      throw new Error('Either path or content must be provided');
    }
  } else {
    throw new Error(`Unsupported script type: ${type}. Use 'bash' or 'pws'`);
  }

  // Create output file paths
  const stdoutFile = path.join(TEMP_DIR, `stdout-${timestamp}.txt`);
  const stderrFile = path.join(TEMP_DIR, `stderr-${timestamp}.txt`);

  // Execute script and capture output
  return new Promise((resolve, reject) => {
    const process = spawn(shellCommand, shellArgs);

    let stdoutData = '';
    let stderrData = '';

    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    process.on('close', async (exitCode) => {
      try {
        // Write output files
        await fs.writeFile(stdoutFile, stdoutData, 'utf8');
        await fs.writeFile(stderrFile, stderrData, 'utf8');

        // Clean up temp script if it was created
        if (content && type === 'bash') {
          try {
            await fs.unlink(scriptToExecute);
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        resolve({
          success: exitCode === 0,
          exitCode: exitCode,
          stdoutFile: stdoutFile,
          stderrFile: stderrFile,
          stdoutLength: stdoutData.length,
          stderrLength: stderrData.length,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        reject(new Error(`Failed to write output files: ${err.message}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to execute script: ${err.message}`));
    });
  });
}

/**
 * Execute multiple scripts in sequence
 * @param {array} scripts - Array of script objects
 * @returns {array} Array of execution results
 */
async function executeScripts(scripts) {
  const results = [];

  for (const script of scripts) {
    try {
      const result = await executeScript(script);
      results.push(result);
      stats.totalExecuted++;
    } catch (err) {
      stats.errors++;
      results.push({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  stats.lastExecuted = new Date().toISOString();
  return results;
}

// POST endpoint for executing scripts
app.post('/execute', async (req, res) => {
  stats.totalRequests++;

  const { scripts } = req.body;

  if (!scripts || !Array.isArray(scripts)) {
    return res.status(400).json({
      error: 'scripts array required',
      example: {
        scripts: [
          { type: 'bash', path: '/path/to/script.sh', params: ['arg1', 'arg2'] },
          { type: 'pws', content: 'Write-Host "Hello World"' }
        ]
      }
    });
  }

  if (scripts.length === 0) {
    return res.status(400).json({ error: 'scripts array cannot be empty' });
  }

  try {
    console.log(`[Execute] Processing ${scripts.length} script(s)...`);
    const results = await executeScripts(scripts);

    res.json({
      success: true,
      count: scripts.length,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// GET endpoint for executing from file (Copilot integration)
app.get('/execute-from-file', async (req, res) => {
  stats.totalRequests++;

  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath query parameter required' });
  }

  try {
    // Read JSON from file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.scripts || !Array.isArray(data.scripts)) {
      return res.status(400).json({ error: 'File must contain a "scripts" array' });
    }

    console.log(`[Execute] Processing ${data.scripts.length} script(s) from ${filePath}...`);
    const results = await executeScripts(data.scripts);

    // Optionally delete the input file
    try {
      await fs.unlink(filePath);
    } catch (unlinkErr) {
      // Ignore errors deleting temp file
    }

    res.json({
      success: true,
      count: data.scripts.length,
      results: results,
      timestamp: new Date().toISOString(),
      fileRead: filePath,
      fileDeleted: true
    });
  } catch (err) {
    stats.errors++;

    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found', filePath });
    }

    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON in file', filePath });
    }

    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ...stats,
    uptime: Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000)
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    ...stats,
    uptime: Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000)
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Docker Script Execution Service',
    version: '1.0.0',
    description: 'General-purpose script execution service for bash and PowerShell',
    endpoints: {
      'POST /execute': 'Execute scripts { scripts: [{type, path?, content?, params?}] }',
      'GET /execute-from-file?filePath=<path>': 'Execute scripts from JSON file',
      'GET /health': 'Health check and statistics',
      'GET /stats': 'Service statistics',
      'GET /': 'This documentation'
    },
    scriptTypes: {
      bash: 'Execute bash scripts (.sh files or inline content)',
      pws: 'Execute PowerShell scripts (.ps1 files or inline content)',
      powershell: 'Alias for pws'
    },
    examples: {
      bash_file: {
        type: 'bash',
        path: '/path/to/script.sh',
        params: ['arg1', 'arg2']
      },
      bash_content: {
        type: 'bash',
        content: 'echo "Hello from bash"'
      },
      powershell_file: {
        type: 'pws',
        path: 'C:/scripts/test.ps1',
        params: ['-Name', 'value']
      },
      powershell_content: {
        type: 'pws',
        content: 'Write-Host "Hello from PowerShell"'
      }
    },
    stats: {
      ...stats,
      uptime: Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000)
    }
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⚙️  Docker Script Execution Service');
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
  console.log(`📊 Final stats: ${stats.totalExecuted} scripts executed, ${stats.errors} errors`);
  console.log('✓ Shutdown complete');
  process.exit(0);
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
