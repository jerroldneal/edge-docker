// docker-routes.js - Express route handlers for docker-service
const fs = require('fs').promises;

/**
 * Setup Express routes for docker-service
 * @param {object} app - Express app instance
 * @param {object} methods - Service methods
 * @param {object} stats - Statistics tracker
 */
function setupDockerRoutes(app, methods, stats) {
  // POST endpoint for executing scripts
  app.post('/execute', async (req, res) => {
    stats.incrementRequests();

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
      const results = await methods.executeScripts(scripts);

      res.json({
        success: true,
        count: scripts.length,
        results: results,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      stats.incrementErrors();
      res.status(500).json({ error: err.message });
    }
  });

  // GET endpoint for executing from file (Copilot integration)
  app.get('/execute-from-file', async (req, res) => {
    stats.incrementRequests();

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
      const results = await methods.executeScripts(data.scripts);

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
      stats.incrementErrors();

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
    const currentStats = stats.getStats();
    res.json({
      status: 'ok',
      ...currentStats,
      uptime: stats.getUptime()
    });
  });

  // Stats endpoint
  app.get('/stats', (req, res) => {
    const currentStats = stats.getStats();
    res.json({
      ...currentStats,
      uptime: stats.getUptime()
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    const currentStats = stats.getStats();
    res.json({
      service: 'Docker Script Execution Service',
      version: '2.0.0',
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
        powershell: 'Alias for pws',
        code: 'AI-generated code from natural language (requires expectation or content field, optional targetType: bash|pws)'
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
        },
        code_generation: {
          type: 'code',
          expectation: 'List all files in C:\\ with their sizes',
          targetType: 'pws'
        },
        code_generation_bash: {
          type: 'code',
          content: 'Show disk usage for all mounted drives',
          targetType: 'bash'
        }
      },
      stats: {
        ...currentStats,
        uptime: stats.getUptime()
      }
    });
  });
}

module.exports = {
  setupDockerRoutes
};
