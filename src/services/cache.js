/**
 * Cache Service
 * Simple in-memory caching for API responses and session data
 */

const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    // Initialize cache with default settings
    this.cache = new NodeCache({
      stdTTL: 300, // Default 5 minutes TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false // Don't clone objects for better performance
    });

    // Setup event listeners for monitoring (only in development)
    if (process.env.NODE_ENV === 'development') {
      this.cache.on('set', (key, value) => {
        console.log(`Cache SET: ${key}`);
      });

      this.cache.on('del', (key, value) => {
        console.log(`Cache DEL: ${key}`);
      });

      this.cache.on('expired', (key, value) => {
        console.log(`Cache EXPIRED: ${key}`);
      });
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = 300) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete specific key from cache
   * @param {string} key - Cache key to delete
   * @returns {number} Number of deleted keys
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get multiple values from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {object} Object with key-value pairs
   */
  mget(keys) {
    return this.cache.mget(keys);
  }

  /**
   * Set multiple values in cache
   * @param {object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} Success status
   */
  mset(keyValuePairs, ttl = 300) {
    return this.cache.mset(keyValuePairs, ttl);
  }

  /**
   * Get all keys in cache
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * Clear all cache entries
   */
  flush() {
    this.cache.flushAll();
    console.log('Cache flushed');
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Get TTL for a specific key
   * @param {string} key - Cache key
   * @returns {number} TTL in seconds, or undefined if key doesn't exist
   */
  getTtl(key) {
    return this.cache.getTtl(key);
  }

  /**
   * Set TTL for a specific key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} Success status
   */
  setTtl(key, ttl) {
    return this.cache.ttl(key, ttl);
  }

  /**
   * Cache wrapper function for API calls
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise} Cached or fetched data
   */
  async cached(key, fetchFunction, ttl = 300) {
    // Check cache first
    const cached = this.get(key);
    if (cached !== undefined) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }

    // Fetch data and cache it
    console.log(`Cache MISS: ${key}`);
    try {
      const data = await fetchFunction();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Cache fetch error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache entries by pattern
   * @param {string} pattern - Pattern to match (simple string match)
   */
  clearByPattern(pattern) {
    const keys = this.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    if (matchingKeys.length > 0) {
      this.cache.del(matchingKeys);
      console.log(`Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
    }
  }

  /**
   * Get cache size info
   * @returns {object} Size information
   */
  getSizeInfo() {
    const stats = this.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0
    };
  }

  /**
   * Set up periodic cache cleanup
   * @param {number} interval - Cleanup interval in milliseconds
   */
  setupPeriodicCleanup(interval = 300000) { // 5 minutes default
    setInterval(() => {
      const stats = this.getStats();
      console.log(`Cache stats - Keys: ${stats.keys}, Hits: ${stats.hits}, Misses: ${stats.misses}`);
      
      // Optional: Clear old entries based on custom logic
      // This is already handled by NodeCache automatically
    }, interval);
  }
}

// Export singleton instance
const cacheService = new CacheService();

// Setup periodic cleanup in production
if (process.env.NODE_ENV === 'production') {
  cacheService.setupPeriodicCleanup();
}

module.exports = cacheService;