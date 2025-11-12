/**
 * Performance Utility Functions
 * Collection of optimized helpers for common operations
 */

/**
 * Debounce function calls (e.g., for scroll, resize events)
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 250, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Throttle function calls (e.g., for scroll, mousemove events)
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 250) {
  let inThrottle;
  return function executedFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request animation frame wrapper for batched DOM updates
 * @param {Function} callback - Function to execute in next frame
 * @returns {number} Request ID
 */
function rafBatch(callback) {
  return requestAnimationFrame(callback);
}

/**
 * Batch multiple DOM reads to avoid layout thrashing
 * @param {Function[]} reads - Array of read functions
 * @returns {Array} Results from read functions
 */
function batchDOMReads(reads) {
  return rafBatch(() => reads.map(fn => fn()));
}

/**
 * Batch multiple DOM writes to avoid layout thrashing
 * @param {Function[]} writes - Array of write functions
 */
function batchDOMWrites(writes) {
  rafBatch(() => writes.forEach(fn => fn()));
}

/**
 * Optimized localStorage with quota handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
function safeLocalStorageSet(key, value) {
  try {
    const payload = JSON.stringify(value);
    localStorage.setItem(key, payload);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('[Storage] Quota exceeded, clearing old entries...');
      cleanOldStorageEntries();
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e2) {
        console.error('[Storage] Failed to save after cleanup:', e2);
        return false;
      }
    }
    console.error('[Storage] Error saving to localStorage:', e);
    return false;
  }
}

/**
 * Clean old localStorage entries to free up space
 * Removes entries older than 30 days
 */
function cleanOldStorageEntries() {
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const value = localStorage.getItem(key);
      const data = JSON.parse(value);

      // Check for timestamp field
      if (data && typeof data === 'object' && data.timestamp) {
        const age = now - data.timestamp;
        if (age > maxAge) {
          keysToRemove.push(key);
        }
      }
    } catch (e) {
      // Not JSON or no timestamp, skip
    }
  }

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log('[Storage] Removed old entry:', key);
    } catch (e) {
      console.warn('[Storage] Failed to remove entry:', key);
    }
  });

  console.log('[Storage] Cleaned', keysToRemove.length, 'old entries');
}

/**
 * Memoize expensive function results
 * @param {Function} func - Function to memoize
 * @param {number} maxAge - Max cache age in milliseconds (default: 60s)
 * @param {number} maxSize - Max cache size (default: 100)
 * @returns {Function} Memoized function
 */
function memoize(func, maxAge = 60000, maxSize = 100) {
  const cache = new Map();

  return function memoized(...args) {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < maxAge) {
        return cached.value;
      }
    }

    const value = func.apply(this, args);
    cache.set(key, { value, timestamp: Date.now() });

    // Trim cache if too large
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return value;
  };
}

/**
 * Create a document fragment from HTML string (faster than innerHTML)
 * @param {string} html - HTML string
 * @returns {DocumentFragment}
 */
function createFragment(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Efficiently update element with new content (avoids full innerHTML repaint)
 * @param {HTMLElement} element - Target element
 * @param {string|DocumentFragment} content - New content
 */
function updateElement(element, content) {
  if (typeof content === 'string') {
    const fragment = createFragment(content);
    element.replaceChildren(fragment);
  } else {
    element.replaceChildren(content);
  }
}

/**
 * Lazy load images with Intersection Observer
 * @param {string} selector - CSS selector for images (default: img[data-src])
 */
function lazyLoadImages(selector = 'img[data-src]') {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    document.querySelectorAll(selector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Event delegation helper
 * @param {HTMLElement} parent - Parent element
 * @param {string} eventType - Event type (e.g., 'click')
 * @param {string} selector - Child selector
 * @param {Function} handler - Event handler
 */
function delegate(parent, eventType, selector, handler) {
  parent.addEventListener(eventType, event => {
    const target = event.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, event);
    }
  });
}

/**
 * Measure function execution time
 * @param {Function} func - Function to measure
 * @param {string} label - Label for console output
 * @returns {Function} Wrapped function
 */
function measurePerformance(func, label) {
  return function measured(...args) {
    const start = performance.now();
    const result = func.apply(this, args);
    const end = performance.now();
    console.log(`[Perf] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

// Expose utilities globally
if (typeof window !== 'undefined') {
  window.PerfUtils = {
    debounce,
    throttle,
    rafBatch,
    batchDOMReads,
    batchDOMWrites,
    safeLocalStorageSet,
    cleanOldStorageEntries,
    memoize,
    createFragment,
    updateElement,
    lazyLoadImages,
    delegate,
    measurePerformance
  };
}
