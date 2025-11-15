// container.js - Docker container management utilities

const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

/**
 * Check if edge-tts container exists and is running
 * @param {string} containerName - Name of the container to check
 * @returns {Promise<{exists: boolean, running: boolean}>} Container status
 */
async function checkContainer(containerName) {
  try {
    const { stdout } = await execAsync(`docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}|{{.Status}}"`);

    if (!stdout.trim()) {
      return { exists: false, running: false };
    }

    const [name, status] = stdout.trim().split('|');
    return {
      exists: name === containerName,
      running: status.toLowerCase().includes('up')
    };
  } catch (err) {
    return { exists: false, running: false };
  }
}

/**
 * Ensure container exists and is running
 * @param {string} containerName - Name of the container
 * @param {string} imageName - Docker image name
 * @returns {Promise<boolean>} True if container is ready
 */
async function ensureContainer(containerName, imageName = 'edge-tts-mcp') {
  const status = await checkContainer(containerName);

  if (status.exists && status.running) {
    return true;
  }

  if (status.exists && !status.running) {
    console.log('🔄 Starting container...');
    try {
      await execAsync(`docker start ${containerName}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (err) {
      console.error('[Container Start Error]:', err.message);
      return false;
    }
  }

  // Create persistent container
  console.log('🚀 Creating persistent container...');
  try {
    await execAsync(`docker run -d --name ${containerName} --restart always -i ${imageName} python server.py`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (err) {
    console.error('[Container Create Error]:', err.message);
    return false;
  }
}

module.exports = {
  checkContainer,
  ensureContainer
};
