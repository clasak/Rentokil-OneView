;(function initEventRegistry(global) {
  const root = global.OneView = global.OneView || {};
  const log = root.logUserAction || (() => Promise.resolve(false));

  /**
   * @typedef {Object} ListenerEntry
   * @property {EventTarget} target
   * @property {string} type
   * @property {EventListenerOrEventListenerObject} handler
   * @property {boolean|AddEventListenerOptions} [options]
   */

  /**
   * @typedef {Object} Scope
   * @property {string} name
   * @property {Array<ListenerEntry>} listeners
   * @property {Array<number>} intervals
   * @property {Array<number>} timeouts
   * @property {Array<{observer: MutationObserver, target: Node}>} observers
   * @property {Array<Function>} cleanups
   * @property {(target: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean|AddEventListenerOptions) => () => void} addEvent
   * @property {(fn: Function, ms: number) => number} setInterval
   * @property {(fn: Function, ms: number) => number} setTimeout
   * @property {(target: Node, options: MutationObserverInit, callback: MutationCallback) => MutationObserver} observe
   * @property {(fn: Function) => void} onCleanup
   * @property {() => void} cleanup
   */

  const globalRegistry = {
    /** @type {Array<ListenerEntry>} */
    listeners: [],
    /** @type {Array<number>} */
    intervals: [],
    /** @type {Array<number>} */
    timeouts: [],
    /** @type {Array<{observer: MutationObserver, target: Node}>} */
    observers: [],
    /** @type {Array<Function>} */
    cleanups: [],
  };

  /**
   * Register a listener at the global scope.
   * @param {EventTarget} target
    * @param {string} type
    * @param {EventListenerOrEventListenerObject} handler
    * @param {boolean|AddEventListenerOptions} [options]
   * @returns {() => void}
   */
  function addEventListener(target, type, handler, options) {
    if (!target || !type || !handler) return () => {};
    target.addEventListener(type, handler, options);
    globalRegistry.listeners.push({ target, type, handler, options });
    return () => {
      try {
        target.removeEventListener(type, handler, options);
      } catch (error) {
        log('EventRegistry.remove_listener_error', { type, error }, { level: 'warn' });
      }
    };
  }

  function removeAllListeners() {
    for (const entry of globalRegistry.listeners) {
      try {
        entry.target.removeEventListener(entry.type, entry.handler, entry.options);
      } catch (error) {
        log('EventRegistry.remove_listener_error', { type: entry.type, error }, { level: 'warn' });
      }
    }
    globalRegistry.listeners = [];
  }

  function setIntervalTracked(fn, ms) {
    const id = global.setInterval(fn, ms);
    globalRegistry.intervals.push(id);
    return id;
  }

  function clearAllIntervals() {
    for (const id of globalRegistry.intervals) {
      try {
        global.clearInterval(id);
      } catch (error) {
        log('EventRegistry.clear_interval_error', { id, error }, { level: 'warn' });
      }
    }
    globalRegistry.intervals = [];
  }

  function setTimeoutTracked(fn, ms) {
    const id = global.setTimeout(fn, ms);
    globalRegistry.timeouts.push(id);
    return id;
  }

  function clearAllTimeouts() {
    for (const id of globalRegistry.timeouts) {
      try {
        global.clearTimeout(id);
      } catch (error) {
        log('EventRegistry.clear_timeout_error', { id, error }, { level: 'warn' });
      }
    }
    globalRegistry.timeouts = [];
  }

  function observeMutations(target, options, callback) {
    const obs = new MutationObserver(callback);
    obs.observe(target, options);
    globalRegistry.observers.push({ observer: obs, target });
    return obs;
  }

  function disconnectAllObservers() {
    for (const entry of globalRegistry.observers) {
      try {
        entry.observer.disconnect();
      } catch (error) {
        log('EventRegistry.disconnect_observer_error', { error }, { level: 'warn' });
      }
    }
    globalRegistry.observers = [];
  }

  function registerCleanup(fn) {
    if (typeof fn === 'function') {
      globalRegistry.cleanups.push(fn);
    }
  }

  function runAllCleanups() {
    for (const fn of globalRegistry.cleanups) {
      try {
        fn();
      } catch (error) {
        log('EventRegistry.cleanup_error', { error }, { level: 'warn' });
      }
    }
    globalRegistry.cleanups = [];
  }

  function cleanupAll() {
    removeAllListeners();
    clearAllIntervals();
    clearAllTimeouts();
    disconnectAllObservers();
    runAllCleanups();
    log('EventRegistry.cleanupAll', { listeners: 0 });
  }

  /**
   * Creates a scoped registry that can be disposed independently.
   * @param {string} [name]
   * @returns {Scope}
   */
  function createScope(name = 'scope') {
    const scope = {
      name,
      listeners: [],
      intervals: [],
      timeouts: [],
      observers: [],
      cleanups: [],
      addEvent(target, type, handler, options) {
        if (!target || !type || !handler) return () => {};
        target.addEventListener(type, handler, options);
        this.listeners.push({ target, type, handler, options });
        return () => {
          try {
            target.removeEventListener(type, handler, options);
          } catch (error) {
            log('EventRegistry.scope_remove_listener_error', { name, type, error }, { level: 'warn' });
          }
        };
      },
      setInterval(fn, ms) {
        const id = global.setInterval(fn, ms);
        this.intervals.push(id);
        return id;
      },
      setTimeout(fn, ms) {
        const id = global.setTimeout(fn, ms);
        this.timeouts.push(id);
        return id;
      },
      observe(target, options, callback) {
        const obs = new MutationObserver(callback);
        obs.observe(target, options);
        this.observers.push({ observer: obs, target });
        return obs;
      },
      onCleanup(fn) {
        if (typeof fn === 'function') {
          this.cleanups.push(fn);
        }
      },
      cleanup() {
        for (const entry of this.listeners) {
          try {
            entry.target.removeEventListener(entry.type, entry.handler, entry.options);
          } catch (error) {
            log('EventRegistry.scope_cleanup_listener_error', { name, type: entry.type, error }, { level: 'warn' });
          }
        }
        this.listeners = [];
        for (const id of this.intervals) {
          try {
            global.clearInterval(id);
          } catch (error) {
            log('EventRegistry.scope_clear_interval_error', { name, id, error }, { level: 'warn' });
          }
        }
        this.intervals = [];
        for (const id of this.timeouts) {
          try {
            global.clearTimeout(id);
          } catch (error) {
            log('EventRegistry.scope_clear_timeout_error', { name, id, error }, { level: 'warn' });
          }
        }
        this.timeouts = [];
        for (const entry of this.observers) {
          try {
            entry.observer.disconnect();
          } catch (error) {
            log('EventRegistry.scope_disconnect_observer_error', { name, error }, { level: 'warn' });
          }
        }
        this.observers = [];
        for (const fn of this.cleanups) {
          try {
            fn();
          } catch (error) {
            log('EventRegistry.scope_cleanup_fn_error', { name, error }, { level: 'warn' });
          }
        }
        this.cleanups = [];
        log('EventRegistry.scope_cleaned', { name });
      },
    };
    return scope;
  }

  const EventRegistry = {
    addEventListener,
    setInterval: setIntervalTracked,
    setTimeout: setTimeoutTracked,
    observeMutations,
    registerCleanup,
    cleanupAll,
    createScope,
  };

  root.events = EventRegistry;
  global.EventRegistry = EventRegistry;

  global.addEventListener('beforeunload', cleanupAll);
})(window);
