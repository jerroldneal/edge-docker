// methods.js - Service method implementations

const path = require('path');
const fs = require('fs').promises;
const { callEdgeTts } = require('./mcp');
const { playAudio } = require('./audio');
const { copyFromContainer, generateUniqueFilename } = require('./file-ops');
const { summarizeText } = require('./docker-ai');

/**
 * Create service methods
 * @param {object} config - Configuration object
 * @param {object} stats - Statistics tracker
 * @returns {object} Service methods
 */
function createMethods(config, stats) {
  const { containerName, defaultVoice, tempDir } = config;

  return {
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

        const voice = options.voice || defaultVoice;
        const containerOutputFile = '/tmp/output.mp3';

        // Generate unique filename for host
        const hostFilename = generateUniqueFilename('edge-tts', '.mp3');
        const hostOutputPath = path.join(tempDir, hostFilename);

        // Call Edge TTS MCP server to generate audio
        const result = await callEdgeTts(containerName, 'speak', { text, voice, output_file: containerOutputFile });

        // Copy MP3 from persistent container to host
        await copyFromContainer(containerName, containerOutputFile, hostOutputPath);
        console.log(`📁 Copied to: ${hostOutputPath}`);

        // Play the audio file
        console.log('🔊 Playing audio...');
        await playAudio(hostOutputPath);
        console.log('✅ Playback complete');

        stats.incrementSpoken(text);

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
        stats.incrementErrors();
        console.error('[✗] Speak error:', error.message);
        throw error;
      }
    },

    /**
     * Speak text using Edge TTS and copy output to host
     * @param {string} text - Text to vocalize
     * @param {object} options - Speech options (voice, output_file)
     * @returns {object} Success status with local file path
     */
    speakDebug: async (text, options = {}) => {
      try {
        const timestamp = new Date().toISOString();
        const preview = text.substring(0, 60) + (text.length > 60 ? '...' : '');
        console.log(`[${timestamp}] 🔊 Speaking (DEBUG): "${preview}"`);

        const voice = options.voice || defaultVoice;
        const containerOutputFile = '/tmp/output.mp3';

        // Generate unique filename for host
        const hostFilename = generateUniqueFilename('edge-tts', '.mp3');
        const hostOutputPath = path.join('C:', 'temp', hostFilename);

        // Call Edge TTS MCP server to generate audio
        const result = await callEdgeTts(containerName, 'speak', { text, voice, output_file: containerOutputFile });

        // Copy MP3 from persistent container to host
        await copyFromContainer(containerName, containerOutputFile, hostOutputPath);
        console.log(`📁 Copied to: ${hostOutputPath}`);

        stats.incrementSpoken(text);

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
        stats.incrementErrors();
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
        const result = await callEdgeTts(containerName, 'list_voices', options);

        // Extract text content from MCP response
        if (result.content && result.content.length > 0 && result.content[0].text) {
          return {
            success: true,
            voices: result.content[0].text
          };
        }

        return { success: true, result };
      } catch (error) {
        stats.incrementErrors();
        console.error('[✗] List voices error:', error.message);
        throw error;
      }
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
            const hostFilename = generateUniqueFilename('playback', '.mp3');
            localPath = path.join(tempDir, hostFilename);

            try {
              await copyFromContainer(containerName, filePath, localPath);
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
        stats.incrementErrors();
        console.error('[✗] Play MP3 error:', error.message);
        throw error;
      }
    },

    /**
     * Get service statistics
     * @returns {object} Service stats
     */
    getStats: () => {
      return stats.getStats();
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
        version: '2.0.0',
        backend: 'edge-tts-mcp-docker'
      };
    },

    /**
     * Summarize text using Docker AI
     * @param {string} text - Text to summarize
     * @param {object} options - Summarization options (maxLength, style, model)
     * @returns {object} Summarization result
     */
    summarize: async (text, options = {}) => {
      try {
        const timestamp = new Date().toISOString();
        const preview = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        console.log(`[${timestamp}] 🤖 Summarizing (${text.length} chars): "${preview}"`);

        const summary = await summarizeText(text, options);

        console.log(`✅ Summary generated (${summary.length} chars)`);

        return {
          success: true,
          originalLength: text.length,
          summaryLength: summary.length,
          summary: summary,
          timestamp: timestamp,
          options: options
        };
      } catch (error) {
        stats.incrementErrors();
        console.error('[✗] Summarize error:', error.message);
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
}

module.exports = {
  createMethods
};
