// routes.js - Express route handlers

const { readAndOptionallyDelete } = require('./file-ops');

/**
 * Setup Express routes
 * @param {object} app - Express application
 * @param {object} methods - Service methods
 * @param {object} stats - Statistics tracker
 */
function setupRoutes(app, methods, stats) {
  // RPC endpoint - accepts method calls
  app.post('/rpc', async (req, res) => {
    stats.incrementRequests();

    const { method, args = [] } = req.body;

    const argsPreview = JSON.stringify(args).substring(0, 100);
    console.log(`[RPC] Method: ${method}, Args: ${argsPreview}${args.length > 100 ? '...' : ''}`);

    if (!method) {
      return res.status(400).json({ error: 'Method name required' });
    }

    if (methods[method]) {
      try {
        const result = await methods[method](...args);
        res.json({ result });
      } catch (err) {
        stats.incrementErrors();
        res.status(500).json({ error: err.message, stack: err.stack });
      }
    } else {
      res.status(404).json({
        error: 'Method not found',
        requested: method,
        available: Object.keys(methods)
      });
    }
  });

  // Convenience endpoint for direct speak requests
  app.post('/speak', async (req, res) => {
    stats.incrementRequests();

    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    try {
      const result = await methods.speak(text, options);
      res.json(result);
    } catch (err) {
      stats.incrementErrors();
      res.status(500).json({ error: err.message });
    }
  });

  // Convenience endpoint for summarize requests
  app.post('/summarize', async (req, res) => {
    stats.incrementRequests();

    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    try {
      const result = await methods.summarize(text, options);
      res.json(result);
    } catch (err) {
      stats.incrementErrors();
      res.status(500).json({ error: err.message });
    }
  });

  // GET endpoint - reads text from file and speaks it
  app.get('/speak-from-file', async (req, res) => {
    stats.incrementRequests();

    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath query parameter required' });
    }

    try {
      const text = await readAndOptionallyDelete(filePath, true);

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'File is empty or contains no text' });
      }

      const result = await methods.speak(text.trim());

      res.json({
        ...result,
        fileRead: filePath,
        fileDeleted: true
      });
    } catch (err) {
      stats.incrementErrors();

      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found', filePath });
      }

      res.status(500).json({ error: err.message });
    }
  });

  // GET endpoint - speaks and copies output to host
  app.get('/speak-debug-output', async (req, res) => {
    stats.incrementRequests();

    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath query parameter required' });
    }

    try {
      const text = await readAndOptionallyDelete(filePath, true);

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'File is empty or contains no text' });
      }

      const result = await methods.speakDebug(text.trim());

      res.json({
        ...result,
        fileRead: filePath,
        fileDeleted: true
      });
    } catch (err) {
      stats.incrementErrors();

      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found', filePath });
      }

      res.status(500).json({ error: err.message });
    }
  });

  // GET endpoint for playing MP3 files
  app.get('/play-mp3', async (req, res) => {
    stats.incrementRequests();

    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath query parameter required' });
    }

    try {
      const result = await methods.playMp3(filePath);
      res.json(result);
    } catch (err) {
      stats.incrementErrors();

      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message, filePath });
      }

      res.status(500).json({ error: err.message });
    }
  });

  // POST endpoint for playing MP3 files
  app.post('/play-mp3', async (req, res) => {
    stats.incrementRequests();

    const { filePath, options } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }

    try {
      const result = await methods.playMp3(filePath, options);
      res.json(result);
    } catch (err) {
      stats.incrementErrors();

      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message, filePath });
      }

      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json(methods.getStats());
  });

  // Stats endpoint
  app.get('/stats', (req, res) => {
    res.json(methods.getStats());
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Edge TTS Service - MCP Proxy',
      version: '2.0.0',
      description: 'HTTP proxy for Edge TTS MCP server in Docker with AI summarization',
      endpoints: {
        'POST /rpc': 'RPC method invocation { method: string, args: array }',
        'POST /speak': 'Direct speech synthesis { text: string, options?: object }',
        'POST /summarize': 'Summarize text using Docker AI { text: string, options?: object }',
        'GET /speak-from-file?filePath=<path>': 'Speak text from file (for Copilot)',
        'GET /speak-debug-output?filePath=<path>': 'Speak and copy MP3 to C:/temp (for debugging)',
        'GET /play-mp3?filePath=<path>': 'Play an existing MP3 file from host or container',
        'POST /play-mp3': 'Play MP3 file { filePath: string, options?: object }',
        'GET /health': 'Health check and statistics',
        'GET /stats': 'Service statistics',
        'GET /': 'This documentation'
      },
      availableMethods: Object.keys(methods),
      stats: methods.getStats()
    });
  });
}

module.exports = {
  setupRoutes
};
