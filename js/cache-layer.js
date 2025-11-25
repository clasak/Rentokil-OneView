/**
 * ===============================================================================
 * PERFORMANCE CACHING LAYER
 * ===============================================================================
 * Multi-level caching system for dashboard data and API responses
 */

(function() {
  'use strict';

  //=============================================================================
  // CACHE CONFIGURATION
  //=============================================================================

  const CacheConfig = {
    // Default TTL (time to live) in milliseconds
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes

    // Cache TTL by data type
    TTL: {
      dashboardData: 5 * 60 * 1000,      // 5 minutes
      widgetData: 3 * 60 * 1000,         // 3 minutes
      userData: 30 * 60 * 1000,          // 30 minutes
      staticData: 60 * 60 * 1000,        // 1 hour
      branchData: 15 * 60 * 1000,        // 15 minutes
      realTimeData: 30 * 1000             // 30 seconds
    },

    // Maximum cache size (number of entries)
    MAX_SIZE: 100,

    // Enable/disable caching
    ENABLED: true,

    // Enable debug logging
    DEBUG: false
  };

  //=============================================================================
  // IN-MEMORY CACHE
  //=============================================================================

  class MemoryCache {
    constructor() {
      this.cache = new Map();
      this.timestamps = new Map();
      this.hits = 0;
      this.misses = 0;
    }

    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null
     */
    get(key) {
      if (!CacheConfig.ENABLED) return null;

      const timestamp = this.timestamps.get(key);
      if (!timestamp) {
        this.misses++;
        return null;
      }

      // Check if expired
      if (Date.now() - timestamp.time > timestamp.ttl) {
        this.delete(key);
        this.misses++;
        return null;
      }

      this.hits++;
      const value = this.cache.get(key);

      if (CacheConfig.DEBUG) {
        console.log(`[Cache] HIT: ${key}`, value);
      }

      return value;
    }

    /**
     * Set item in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = CacheConfig.DEFAULT_TTL) {
      if (!CacheConfig.ENABLED) return;

      // Enforce max cache size
      if (this.cache.size >= CacheConfig.MAX_SIZE) {
        // Remove oldest entry
        const oldestKey = this.cache.keys().next().value;
        this.delete(oldestKey);
      }

      this.cache.set(key, value);
      this.timestamps.set(key, {
        time: Date.now(),
        ttl: ttl
      });

      if (CacheConfig.DEBUG) {
        console.log(`[Cache] SET: ${key}`, value, `TTL: ${ttl}ms`);
      }
    }

    /**
     * Delete item from cache
     * @param {string} key - Cache key
     */
    delete(key) {
      this.cache.delete(key);
      this.timestamps.delete(key);

      if (CacheConfig.DEBUG) {
        console.log(`[Cache] DELETE: ${key}`);
      }
    }

    /**
     * Clear entire cache
     */
    clear() {
      this.cache.clear();
      this.timestamps.clear();
      this.hits = 0;
      this.misses = 0;

      if (CacheConfig.DEBUG) {
        console.log('[Cache] CLEAR: All entries removed');
      }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
      const total = this.hits + this.misses;
      const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;

      return {
        size: this.cache.size,
        hits: this.hits,
        misses: this.misses,
        hitRate: `${hitRate}%`,
        total: total
      };
    }

    /**
     * Get all cache keys
     * @returns {Array} Array of cache keys
     */
    keys() {
      return Array.from(this.cache.keys());
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
      return this.get(key) !== null;
    }
  }

  //=============================================================================
  // LOCAL STORAGE CACHE
  //=============================================================================

  class LocalStorageCache {
    constructor(prefix = 'rentokil_cache_') {
      this.prefix = prefix;
    }

    /**
     * Get item from localStorage
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null
     */
    get(key) {
      if (!CacheConfig.ENABLED) return null;

      try {
        const item = localStorage.getItem(this.prefix + key);
        if (!item) return null;

        const { value, timestamp, ttl } = JSON.parse(item);

        // Check if expired
        if (Date.now() - timestamp > ttl) {
          this.delete(key);
          return null;
        }

        return value;
      } catch (error) {
        console.error('[LocalStorageCache] Error getting item:', error);
        return null;
      }
    }

    /**
     * Set item in localStorage
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = CacheConfig.DEFAULT_TTL) {
      if (!CacheConfig.ENABLED) return;

      try {
        const item = {
          value: value,
          timestamp: Date.now(),
          ttl: ttl
        };

        localStorage.setItem(this.prefix + key, JSON.stringify(item));
      } catch (error) {
        console.error('[LocalStorageCache] Error setting item:', error);

        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
          this.clearOldest();
          // Try again
          try {
            localStorage.setItem(this.prefix + key, JSON.stringify({
              value: value,
              timestamp: Date.now(),
              ttl: ttl
            }));
          } catch (retryError) {
            console.error('[LocalStorageCache] Retry failed:', retryError);
          }
        }
      }
    }

    /**
     * Delete item from localStorage
     * @param {string} key - Cache key
     */
    delete(key) {
      try {
        localStorage.removeItem(this.prefix + key);
      } catch (error) {
        console.error('[LocalStorageCache] Error deleting item:', error);
      }
    }

    /**
     * Clear all cache items from localStorage
     */
    clear() {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('[LocalStorageCache] Error clearing cache:', error);
      }
    }

    /**
     * Clear oldest cache entries
     */
    clearOldest() {
      try {
        const items = [];
        const keys = Object.keys(localStorage);

        // Collect all cache items with timestamps
        keys.forEach(key => {
          if (key.startsWith(this.prefix)) {
            try {
              const item = JSON.parse(localStorage.getItem(key));
              items.push({ key, timestamp: item.timestamp });
            } catch (e) {
              // Invalid item, remove it
              localStorage.removeItem(key);
            }
          }
        });

        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);

        // Remove oldest 25%
        const removeCount = Math.ceil(items.length * 0.25);
        for (let i = 0; i < removeCount; i++) {
          localStorage.removeItem(items[i].key);
        }
      } catch (error) {
        console.error('[LocalStorageCache] Error clearing oldest:', error);
      }
    }

    /**
     * Get cache size in bytes (approximate)
     * @returns {number} Size in bytes
     */
    getSize() {
      try {
        let size = 0;
        const keys = Object.keys(localStorage);

        keys.forEach(key => {
          if (key.startsWith(this.prefix)) {
            size += localStorage.getItem(key).length;
          }
        });

        return size;
      } catch (error) {
        console.error('[LocalStorageCache] Error getting size:', error);
        return 0;
      }
    }
  }

  //=============================================================================
  // CACHE MANAGER
  //=============================================================================

  class CacheManager {
    constructor() {
      this.memoryCache = new MemoryCache();
      this.storageCache = new LocalStorageCache();
    }

    /**
     * Get cached data (checks memory first, then localStorage)
     * @param {string} key - Cache key
     * @param {Object} options - Cache options
     * @returns {any|null} Cached value or null
     */
    get(key, options = {}) {
      const { useStorage = true } = options;

      // Try memory cache first
      let value = this.memoryCache.get(key);
      if (value !== null) {
        return value;
      }

      // Try localStorage if enabled
      if (useStorage) {
        value = this.storageCache.get(key);
        if (value !== null) {
          // Populate memory cache
          this.memoryCache.set(key, value, CacheConfig.DEFAULT_TTL);
          return value;
        }
      }

      return null;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {Object} options - Cache options
     */
    set(key, value, options = {}) {
      const {
        ttl = CacheConfig.DEFAULT_TTL,
        useStorage = true,
        persistent = false
      } = options;

      // Always set in memory cache
      this.memoryCache.set(key, value, ttl);

      // Set in localStorage if enabled or persistent
      if (useStorage || persistent) {
        this.storageCache.set(key, value, persistent ? CacheConfig.TTL.staticData : ttl);
      }
    }

    /**
     * Delete cached data
     * @param {string} key - Cache key
     */
    delete(key) {
      this.memoryCache.delete(key);
      this.storageCache.delete(key);
    }

    /**
     * Clear all caches
     */
    clearAll() {
      this.memoryCache.clear();
      this.storageCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Combined cache stats
     */
    getStats() {
      return {
        memory: this.memoryCache.getStats(),
        storage: {
          size: this.storageCache.getSize(),
          sizeKB: (this.storageCache.getSize() / 1024).toFixed(2)
        }
      };
    }
  }

  //=============================================================================
  // DATA FETCHER WITH CACHING
  //=============================================================================

  const cacheManager = new CacheManager();

  /**
   * Fetch data with caching
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Fetched or cached data
   */
  async function fetchWithCache(key, fetchFn, options = {}) {
    const {
      ttl = CacheConfig.DEFAULT_TTL,
      useStorage = true,
      forceRefresh = false
    } = options;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cacheManager.get(key, { useStorage });
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh data
    try {
      const data = await fetchFn();

      // Cache the result
      cacheManager.set(key, data, { ttl, useStorage });

      return data;
    } catch (error) {
      console.error(`[fetchWithCache] Error fetching ${key}:`, error);

      // Return stale cache if available
      const staleCache = cacheManager.get(key, { useStorage });
      if (staleCache !== null) {
        console.warn(`[fetchWithCache] Returning stale cache for ${key}`);
        return staleCache;
      }

      throw error;
    }
  }

  /**
   * Fetch Google Apps Script data with caching
   * @param {string} functionName - GAS function name
   * @param {Array} args - Function arguments
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Fetched or cached data
   */
  async function fetchGASWithCache(functionName, args = [], options = {}) {
    const cacheKey = `gas_${functionName}_${JSON.stringify(args)}`;

    return fetchWithCache(
      cacheKey,
      () => new Promise((resolve, reject) => {
        if (typeof google === 'undefined' || !google.script?.run) {
          reject(new Error('Google Apps Script not available'));
          return;
        }

        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          [functionName](...args);
      }),
      options
    );
  }

  /**
   * Prefetch data for multiple widgets
   * @param {Array} widgetIds - Array of widget IDs to prefetch
   * @param {Object} options - Cache options
   */
  async function prefetchWidgetData(widgetIds, options = {}) {
    const promises = widgetIds.map(widgetId => {
      const cacheKey = `widget_${widgetId}`;
      return fetchWithCache(
        cacheKey,
        () => fetchGASWithCache('getWidgetData', [widgetId], { useStorage: false }),
        { ...options, ttl: CacheConfig.TTL.widgetData }
      ).catch(error => {
        console.warn(`[prefetchWidgetData] Failed to prefetch ${widgetId}:`, error);
        return null;
      });
    });

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  function invalidateCache(pattern) {
    const keys = cacheManager.memoryCache.keys();
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

    keys.forEach(key => {
      if (regex.test(key)) {
        cacheManager.delete(key);
      }
    });
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async function warmupCache() {
    console.log('[Cache] Warming up cache...');

    try {
      // Prefetch dashboard data for current user
      const currentRole = window.currentUser?.role || 'Sales';

      await Promise.allSettled([
        fetchGASWithCache('getDashboardData', [currentRole], {
          ttl: CacheConfig.TTL.dashboardData,
          useStorage: true
        }),
        fetchGASWithCache('loadUserWidgetLayout', [currentRole], {
          ttl: CacheConfig.TTL.userData,
          useStorage: true
        })
      ]);

      console.log('[Cache] Warmup complete');
    } catch (error) {
      console.error('[Cache] Warmup failed:', error);
    }
  }

  //=============================================================================
  // CACHE MAINTENANCE
  //=============================================================================

  /**
   * Schedule periodic cache cleanup
   */
  function scheduleCacheCleanup() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const keys = cacheManager.memoryCache.keys();
      keys.forEach(key => {
        // This will automatically remove expired entries
        cacheManager.get(key);
      });

      if (CacheConfig.DEBUG) {
        console.log('[Cache] Cleanup complete:', cacheManager.getStats());
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Initialize cache layer
   */
  function initializeCache() {
    // Start cache cleanup scheduler
    scheduleCacheCleanup();

    // Warm up cache on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', warmupCache);
    } else {
      warmupCache();
    }

    // Clear cache on user logout
    window.addEventListener('logout', () => {
      cacheManager.clearAll();
    });

    console.log('[Cache] Cache layer initialized');
  }

  //=============================================================================
  // EXPORT PUBLIC API
  //=============================================================================

  window.CacheLayer = {
    // Cache manager instance
    manager: cacheManager,

    // Configuration
    config: CacheConfig,

    // Fetch with caching
    fetchWithCache,
    fetchGASWithCache,
    prefetchWidgetData,

    // Cache operations
    get: (key, options) => cacheManager.get(key, options),
    set: (key, value, options) => cacheManager.set(key, value, options),
    delete: (key) => cacheManager.delete(key),
    clear: () => cacheManager.clearAll(),
    invalidate: invalidateCache,

    // Cache management
    warmup: warmupCache,
    getStats: () => cacheManager.getStats(),
    initialize: initializeCache
  };

  // Auto-initialize
  initializeCache();

})();
