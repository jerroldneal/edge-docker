// docker-ai.js - Docker Model Runner / Docker AI utilities

const axios = require('axios');

/**
 * Call Docker AI (Model Runner) API
 * @param {string} prompt - Prompt to send to the AI
 * @param {object} options - AI request options
 * @returns {Promise<string>} AI response text
 */
async function callDockerAI(prompt, options = {}) {
  const {
    model = 'llama3.2:latest',
    apiUrl = 'http://localhost:12434/engines/v1/chat/completions',
    maxTokens = 500,
    temperature = 0.7
  } = options;

  try {
    const response = await axios.post(apiUrl, {
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
      timeout: 30000 // 30 second timeout
    });

    // Extract response text from Docker AI response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    }

    throw new Error('Invalid response from Docker AI');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Docker AI not available - ensure Docker Desktop Model Runner is running and host TCP support is enabled');
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

module.exports = {
  callDockerAI,
  summarizeText
};
