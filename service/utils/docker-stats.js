// docker-stats.js - Statistics tracking for docker-service

/**
 * Create a statistics tracker for docker-service
 * @returns {object} Statistics tracker with methods
 */
function createDockerStats() {
  const stats = {
    started: new Date().toISOString(),
    totalRequests: 0,
    totalExecuted: 0,
    lastExecuted: null,
    errors: 0
  };

  return {
    /**
     * Increment total requests counter
     */
    incrementRequests: () => {
      stats.totalRequests++;
    },

    /**
     * Increment total executed counter
     */
    incrementExecuted: () => {
      stats.totalExecuted++;
    },

    /**
     * Increment errors counter
     */
    incrementErrors: () => {
      stats.errors++;
    },

    /**
     * Update last executed timestamp
     */
    updateLastExecuted: () => {
      stats.lastExecuted = new Date().toISOString();
    },

    /**
     * Get current statistics
     * @returns {object} Current stats object
     */
    getStats: () => {
      return { ...stats };
    },

    /**
     * Get uptime in seconds
     * @returns {number} Uptime in seconds
     */
    getUptime: () => {
      return Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000);
    }
  };
}

module.exports = {
  createDockerStats
};
