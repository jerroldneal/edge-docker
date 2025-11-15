// speech.js - Edge TTS speech integration for docker-service
// Calls Edge TTS MCP server directly (not via HTTP service)

const path = require('path');
const { callEdgeTts } = require('./mcp');
const { playAudio } = require('./audio');
const { copyFromContainer, generateUniqueFilename } = require('./file-ops');

/**
 * Speak text using Edge TTS MCP server
 * @param {string} text - Text to speak
 * @param {object} options - Speech options
 * @returns {Promise<object>} Speech result
 */
async function speak(text, options = {}) {
  const {
    containerName = 'edge-tts',
    voice = 'en-US-AriaNeural',
    tempDir = 'C:\\temp',
    playAudioFile = true
  } = options;

  try {
    const timestamp = new Date().toISOString();
    console.log(`[Speech] Speaking: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);

    const containerOutputFile = '/tmp/output.mp3';

    // Generate unique filename for host
    const hostFilename = generateUniqueFilename('edge-tts', '.mp3');
    const hostOutputPath = path.join(tempDir, hostFilename);

    // Call Edge TTS MCP server to generate audio
    const result = await callEdgeTts(containerName, 'speak', {
      text,
      voice,
      output_file: containerOutputFile
    });

    // Copy MP3 from persistent container to host
    await copyFromContainer(containerName, containerOutputFile, hostOutputPath);
    console.log(`[Speech] 📁 Copied to: ${hostOutputPath}`);

    // Play the audio file if requested
    if (playAudioFile) {
      console.log('[Speech] 🔊 Playing audio...');
      await playAudio(hostOutputPath);
      console.log('[Speech] ✅ Playback complete');
    }

    return {
      success: true,
      spoken: text,
      length: text.length,
      audioFile: hostOutputPath,
      voice: voice,
      timestamp: timestamp,
      played: playAudioFile
    };
  } catch (error) {
    throw new Error(`Speech failed: ${error.message}`);
  }
}

module.exports = {
  speak
};
