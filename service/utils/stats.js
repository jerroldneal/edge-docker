// stats.js - Service statistics tracking

/**
 * Create a new statistics tracker
 * @returns {object} Statistics object with methods
 */
function createStats() {
  const stats = {
    started: new Date().toISOString(),
    totalRequests: 0,
    totalSpoken: 0,
    lastSpoken: null,
    lastMessage: null,
    errors: 0
  };

  return {
    /**
     * Increment request counter
     */
    incrementRequests() {
      stats.totalRequests++;
    },

    /**
     * Increment spoken counter and update last spoken
     * @param {string} message - Message that was spoken
     */
    incrementSpoken(message) {
      stats.totalSpoken++;
      stats.lastSpoken = new Date().toISOString();
      stats.lastMessage = message;
    },

    /**
     * Increment error counter
     */
    incrementErrors() {
      stats.errors++;
    },

    /**
     * Get current statistics
     * @returns {object} Current stats with uptime
     */
    getStats() {
      return {
        ...stats,
        uptime: Math.floor((Date.now() - new Date(stats.started).getTime()) / 1000)
      };
    },

    /**
     * Get raw stats object (for direct access)
     * @returns {object} Raw stats
     */
    getRaw() {
      return stats;
    }
  };
}

module.exports = {
  createStats
};
