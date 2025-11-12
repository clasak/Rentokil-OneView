/*
 EventRegistry (P1.3 Memory Leak Prevention)
 - Centralized registry to track and clean up event listeners, timers, observers, and custom callbacks.
 - Provides scoped registries for components (e.g., SlideOut panels) to ensure cleanup on close.
 - Follows naming conventions and design system guidelines in ARCHITECTURE.md and UI_DESIGN_SYSTEM.md.
*/

(function () {
  const globalRegistry = {
    listeners: [], // {target, type, handler, options}
    intervals: [], // interval ids
    timeouts: [], // timeout ids
    observers: [], // {observer, target}
    cleanups: [], // functions
  };

  function addEventListener(target, type, handler, options) {
    if (!target || !type || !handler) return;
    target.addEventListener(type, handler, options);
    globalRegistry.listeners.push({ target, type, handler, options });
    return () => {
      try { target.removeEventListener(type, handler, options); } catch (_) {}
    };
  }

  function removeAllListeners() {
    for (const l of globalRegistry.listeners) {
      try { l.target.removeEventListener(l.type, l.handler, l.options); } catch (_) {}
    }
    globalRegistry.listeners = [];
  }

  function setIntervalTracked(fn, ms) {
    const id = setInterval(fn, ms);
    globalRegistry.intervals.push(id);
    return id;
  }

  function clearAllIntervals() {
    for (const id of globalRegistry.intervals) {
      try { clearInterval(id); } catch (_) {}
    }
    globalRegistry.intervals = [];
  }

  function setTimeoutTracked(fn, ms) {
    const id = setTimeout(fn, ms);
    globalRegistry.timeouts.push(id);
    return id;
  }

  function clearAllTimeouts() {
    for (const id of globalRegistry.timeouts) {
      try { clearTimeout(id); } catch (_) {}
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
    for (const { observer } of globalRegistry.observers) {
      try { observer.disconnect(); } catch (_) {}
    }
    globalRegistry.observers = [];
  }

  function registerCleanup(fn) {
    if (typeof fn === 'function') globalRegistry.cleanups.push(fn);
  }

  function runAllCleanups() {
    for (const fn of globalRegistry.cleanups) {
      try { fn(); } catch (_) {}
    }
    globalRegistry.cleanups = [];
  }

  function cleanupAll() {
    removeAllListeners();
    clearAllIntervals();
    clearAllTimeouts();
    disconnectAllObservers();
    runAllCleanups();
  }

  function createScope(name = 'scope') {
    const scope = {
      name,
      listeners: [],
      intervals: [],
      timeouts: [],
      observers: [],
      cleanups: [],
      addEvent(target, type, handler, options) {
        if (!target || !type || !handler) return;
        target.addEventListener(type, handler, options);
        this.listeners.push({ target, type, handler, options });
        return () => {
          try { target.removeEventListener(type, handler, options); } catch (_) {}
        };
      },
      setInterval(fn, ms) {
        const id = setInterval(fn, ms);
        this.intervals.push(id);
        return id;
      },
      setTimeout(fn, ms) {
        const id = setTimeout(fn, ms);
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
        if (typeof fn === 'function') this.cleanups.push(fn);
      },
      cleanup() {
        for (const l of this.listeners) {
          try { l.target.removeEventListener(l.type, l.handler, l.options); } catch (_) {}
        }
        this.listeners = [];
        for (const id of this.intervals) {
          try { clearInterval(id); } catch (_) {}
        }
        this.intervals = [];
        for (const id of this.timeouts) {
          try { clearTimeout(id); } catch (_) {}
        }
        this.timeouts = [];
        for (const { observer } of this.observers) {
          try { observer.disconnect(); } catch (_) {}
        }
        this.observers = [];
        for (const fn of this.cleanups) {
          try { fn(); } catch (_) {}
        }
        this.cleanups = [];
      },
    };
    return scope;
  }

  // Attach to global namespace
  window.EventRegistry = {
    addEventListener,
    setInterval: setIntervalTracked,
    setTimeout: setTimeoutTracked,
    observeMutations,
    registerCleanup,
    cleanupAll,
    createScope,
  };

  // Ensure cleanup on page unload to prevent leaks in long sessions
  window.addEventListener('beforeunload', cleanupAll);
})();

