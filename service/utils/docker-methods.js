// docker-methods.js - Service methods for docker-service
const { executeScripts } = require('./script-executor');

/**
 * Create service methods for docker-service
 * @param {object} config - Service configuration
 * @param {object} stats - Statistics tracker
 * @returns {object} Service methods
 */
function createDockerMethods(config, stats) {
  return {
    /**
     * Execute multiple scripts in sequence
     * @param {array} scripts - Array of script objects
     * @returns {array} Array of execution results
     */
    executeScripts: async (scripts) => {
      return await executeScripts(scripts, config.tempDir, stats);
    }
  };
}

module.exports = {
  createDockerMethods
};
