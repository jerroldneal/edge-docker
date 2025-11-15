// docker-ai.js - Docker Model Runner / Docker AI utilities

const axios = require('axios');
const http = require('http');
const https = require('https');

// Create a single axios instance with persistent connections
const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 5 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 5 })
});

/**
 * Call Docker AI (Model Runner) API
 * @param {string} prompt - Prompt to send to the AI
 * @param {object} options - AI request options
 * @returns {Promise<string>} AI response text
 */
async function callDockerAI(prompt, options = {}) {
  const {
    model = 'ai/phi4:latest',
    apiUrl = 'http://localhost:12434/engines/v1/chat/completions',
    maxTokens = 500,
    temperature = 0.7,
    timeout = 60000 // Default 60 second timeout
  } = options;

  try {
    console.log(`[Docker AI] Sending request to ${apiUrl} (model: ${model}, timeout: ${timeout}ms)`);
    const response = await axiosInstance.post(apiUrl, {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    }, {
      timeout: timeout
    });

    console.log('[Docker AI] Response received');
    // Debug: log the response
    console.log('AI Response:', JSON.stringify(response.data, null, 2));

    // Extract response text from Docker AI response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const choice = response.data.choices[0];
      // Try content first, fall back to reasoning_content if content is empty
      const text = choice.message.content || choice.message.reasoning_content || '';
      return text.trim();
    }

    throw new Error('Invalid response from Docker AI');
  } catch (error) {
    console.error('[Docker AI] Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Docker AI not available - ensure Docker Desktop Model Runner is running and host TCP support is enabled');
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Docker AI request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Summarize text using Docker AI
 * @param {string} text - Text to summarize
 * @param {object} options - Summarization options
 * @returns {Promise<string>} Summary text
 */
async function summarizeText(text, options = {}) {
  const {
    maxLength = 100,
    style = 'concise'
  } = options;

  const prompt = `Please provide a ${style} summary of the following text in no more than ${maxLength} words:\n\n${text}`;

  return await callDockerAI(prompt, {
    ...options,
    maxTokens: maxLength * 2 // Allow some buffer for tokens
  });
}

/**
 * Interpret/analyze text using Docker AI
 * @param {string} text - Text to interpret
 * @param {object} options - Interpretation options
 * @returns {Promise<string>} Interpretation text
 */
async function interpretText(text, options = {}) {
  const {
    maxLength = 200,
    style = 'analytical'
  } = options;

  const prompt = `Please provide a ${style} interpretation or analysis of the following text. Explain its meaning, significance, themes, or key points in no more than ${maxLength} words:\n\n${text}`;

  return await callDockerAI(prompt, {
    ...options,
    maxTokens: maxLength * 2
  });
}

module.exports = {
  callDockerAI,
  summarizeText,
  interpretText
};
