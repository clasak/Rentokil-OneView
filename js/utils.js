;(function bootstrapOneView(global){
  const root = global.OneView = global.OneView || {};
  const LOG_BUFFER_MAX = 25;

  /**
   * Creates a safe string representation for logging payloads.
   * @param {unknown} value
   * @returns {string}
   */
  function stringify(value) {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  /**
   * Attempt to detect Apps Script runtime.
   * @returns {boolean}
   */
  function hasAppsScript() {
    try {
      return Boolean(global.google && google.script && google.script.run);
    } catch (_) {
      return false;
    }
  }

  const loggerBuffer = [];

  /**
   * Unified client-side logger that forwards to Apps Script when possible.
   * @param {string} action
   * @param {string|object} details
   * @param {{level?: 'info'|'warn'|'error', flush?: boolean}} [options]
   * @returns {Promise<boolean>}
   */
  async function logUserAction(action, details = '', options = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      action,
      detail: stringify(details),
      level: options.level || 'info',
    };
    loggerBuffer.push(payload);
    if (loggerBuffer.length > LOG_BUFFER_MAX) {
      loggerBuffer.shift();
    }

    const message = `[OneView][${payload.level}] ${action} :: ${payload.detail}`;
    if (payload.level === 'error') {
      console.error(message);
    } else if (payload.level === 'warn') {
      console.warn(message);
    } else {
      console.info(message);
    }

    if (!hasAppsScript()) {
      return false;
    }

    return await new Promise((resolve) => {
      try {
        google.script.run
          .withSuccessHandler(() => resolve(true))
          .withFailureHandler((err) => {
            console.warn('logUserAction -> Apps Script rejected', err);
            resolve(false);
          })
          .logUserAction(action, payload.detail);
      } catch (error) {
        console.warn('logUserAction -> Apps Script invocation failed', error);
        resolve(false);
      }
    });
  }

  logUserAction.flush = function flushLogs() {
    return [...loggerBuffer];
  };

  root.logUserAction = logUserAction;
  root.logger = { log: logUserAction, flush: logUserAction.flush };
  global.logUserAction = logUserAction;

  /**
   * @typedef {Object} AppStateStore
   * @property {?Object} user
   * @property {Array<Object>} branches
   * @property {Array<Object>} routes
   * @property {Record<string, unknown>} kpis
   * @property {{activeModal: string|null, activeSlideout?: boolean|null, sidebarOpen: boolean, settings: Record<string, unknown>}} ui
   * @property {Record<string, unknown>} preferences
   * @property {string} theme
   */

  const AppState = (() => {
    const STORAGE_KEY = 'OneView.AppState';
    /** @type {Map<string, Set<Function>>} */
    const pathSubscribers = new Map();
    /** @type {Map<string, Set<Function>>} */
    const channelSubscribers = new Map();
    /** @type {AppStateStore} */
    let store = {
      user: null,
      branches: [],
      routes: [],
      kpis: {},
      ui: { activeModal: null, sidebarOpen: true, settings: {} },
      preferences: (() => {
        try {
          return JSON.parse(localStorage.getItem('preferences') || '{}');
        } catch (_) {
          return {};
        }
      })(),
      theme: localStorage.getItem('theme') || 'dark',
    };

    let persistQueued = false;

    /**
     * Remove sensitive keys prior to persistence.
     * @param {unknown} obj
     * @returns {unknown}
     */
    function sanitize(obj) {
      const blocked = new Set(['token', 'password', 'secret', 'apiKey']);

      /**
       * @param {unknown} input
       * @returns {unknown}
       */
      function walk(input) {
        if (Array.isArray(input)) {
          return input.map(walk);
        }
        if (!input || typeof input !== 'object') {
          return input;
        }
        const out = {};
        for (const key of Object.keys(input)) {
          if (blocked.has(key)) continue;
          out[key] = walk(input[key]);
        }
        return out;
      }

      return walk(obj);
    }

    /**
     * Debounced localStorage persistence.
     */
    function queuePersist() {
      if (persistQueued) return;
      persistQueued = true;
      setTimeout(() => {
        try {
          const payload = JSON.stringify(sanitize(store));
          localStorage.setItem(STORAGE_KEY, payload);
        } catch (error) {
          logUserAction('AppState.persist_error', error, { level: 'warn' });
        } finally {
          persistQueued = false;
        }
      }, 50);
    }

    /**
     * Resolves an object path for assignment.
     * @param {object} rootObj
     * @param {string} path
     * @param {boolean} allowCreate
     * @returns {{obj: object, key: string}|undefined}
     */
    function resolvePath(rootObj, path, allowCreate) {
      const parts = path.split('.');
      let pointer = rootObj;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in pointer)) {
          if (allowCreate) {
            pointer[part] = {};
          } else {
            return undefined;
          }
        }
        pointer = pointer[part];
        if (pointer == null || typeof pointer !== 'object') {
          if (allowCreate) {
            pointer = pointer[part] = {};
          } else {
            return undefined;
          }
        }
      }
      return { obj: pointer, key: parts[parts.length - 1] };
    }

    /**
     * Retrieves state at path.
     * @template T
     * @param {string} [path]
     * @param {T} [fallback]
     * @returns {T|unknown}
     */
    function getState(path, fallback) {
      if (!path) return store;
      const parts = path.split('.');
      let pointer = store;
      for (const part of parts) {
        if (pointer == null) return fallback;
        pointer = pointer[part];
      }
      return pointer === undefined ? fallback : pointer;
    }

    /**
     * Notifies direct path subscribers.
     * @param {string} path
     * @param {unknown} value
     */
    function notifyPath(path, value) {
      const set = pathSubscribers.get(path);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try {
          fn(value, path);
        } catch (error) {
          logUserAction('AppState.notify_error', { path, error: String(error) }, { level: 'warn' });
        }
      }
    }

    /**
     * Notifies channel subscribers.
     * @param {string} channel
     * @param {unknown} payload
     */
    function emitChannel(channel, payload) {
      const set = channelSubscribers.get(channel);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try {
          fn(payload, channel);
        } catch (error) {
          logUserAction('AppState.emit_error', { channel, error: String(error) }, { level: 'warn' });
        }
      }
    }

    /**
     * Subscribe to exact path updates.
     * @param {string} path
     * @param {(value: unknown, path: string) => void} callback
     * @returns {() => void}
     */
    function subscribe(path, callback) {
      if (!pathSubscribers.has(path)) {
        pathSubscribers.set(path, new Set());
      }
      const set = pathSubscribers.get(path);
      set.add(callback);
      const current = getState(path);
      if (current !== undefined) {
        try {
          callback(current, path);
        } catch (error) {
          logUserAction('AppState.subscribe_error', { path, error: String(error) }, { level: 'warn' });
        }
      }
      return () => {
        const collection = pathSubscribers.get(path);
        if (collection) {
          collection.delete(callback);
        }
      };
    }

    /**
     * Subscribe to broadcast channels such as `update:user`.
     * @param {string} channel
     * @param {(payload: unknown, channel: string) => void} callback
     * @returns {() => void}
     */
    function on(channel, callback) {
      if (!channelSubscribers.has(channel)) {
        channelSubscribers.set(channel, new Set());
      }
      const set = channelSubscribers.get(channel);
      set.add(callback);
      return () => {
        const collection = channelSubscribers.get(channel);
        if (collection) {
          collection.delete(callback);
        }
      };
    }

    /**
     * Set a deeply nested path value.
     * @param {string} path
     * @param {unknown} value
     */
    function setState(path, value) {
      const target = resolvePath(store, path, true);
      if (!target) return;
      target.obj[target.key] = value;
      queuePersist();
      notifyPath(path, value);
    }

    /**
     * Update root keys or delegate to setState for paths.
     * @param {string} keyOrPath
     * @param {unknown} value
     */
    function update(keyOrPath, value) {
      if (typeof keyOrPath === 'string' && keyOrPath.includes('.')) {
        setState(keyOrPath, value);
        return;
      }
      store[keyOrPath] = value;
      queuePersist();
      emitChannel(`update:${keyOrPath}`, value);
    }

    /**
     * Persist synchronously.
     */
    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(store)));
        localStorage.setItem('theme', String(store.theme || 'dark'));
        localStorage.setItem('preferences', JSON.stringify(store.preferences || {}));
      } catch (error) {
        logUserAction('AppState.save_error', error, { level: 'warn' });
      }
    }

    /**
     * Initialize from persisted snapshot and register teardown hook.
     */
    function init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const loaded = JSON.parse(raw);
          store = Object.assign({}, store, loaded);
        }
      } catch (error) {
        logUserAction('AppState.init_error', error, { level: 'warn' });
      }

      global.addEventListener('beforeunload', () => {
        try {
          save();
        } catch (error) {
          logUserAction('AppState.beforeunload_error', error, { level: 'warn' });
        }
        pathSubscribers.clear();
        channelSubscribers.clear();
      });
    }

    /**
     * Clears persisted store (useful for sign-out flows).
     */
    function clear() {
      store = {
        user: null,
        branches: [],
        routes: [],
        kpis: {},
        ui: { activeModal: null, sidebarOpen: true, settings: {} },
        preferences: {},
        theme: 'dark',
      };
      localStorage.removeItem(STORAGE_KEY);
      notifyPath('user', null);
    }

    return { init, getState, setState, subscribe, on, emit: emitChannel, update, save, clear };
  })();

  root.state = AppState;
  global.AppState = AppState;

  // =============================
  // Contextual Action Panel (P2.1)
  // =============================
  const ContextPanel = (function createContextPanel() {
    let host = null;

    function ensureHost() {
      if (host && document.body.contains(host)) return host;
      host = document.createElement('div');
      host.id = 'contextual-action-panel';
      host.style.position = 'fixed';
      host.style.right = '20px';
      host.style.bottom = '20px';
      host.style.zIndex = '9999';
      host.style.display = 'none';
      host.style.background = '#111827';
      host.style.border = '1px solid #374151';
      host.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
      host.style.borderRadius = '12px';
      host.style.padding = '10px';
      host.style.gap = '8px';
      host.style.alignItems = 'center';
      host.style.flexWrap = 'wrap';
      host.style.maxWidth = '360px';
      host.style.color = '#E5E7EB';
      host.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      host.setAttribute('role', 'toolbar');
      host.setAttribute('aria-label', 'Contextual Actions');
      host.className = 'contextual-actions flex';
      document.body.appendChild(host);
      return host;
    }

    /**
     * Render buttons into host.
     * @param {Array<{label: string, icon?: string, action?: () => void}>} actions
     */
    function render(actions) {
      const el = ensureHost();
      el.innerHTML = '';
      actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-2 rounded-lg text-sm';
        btn.style.background = '#1F2937';
        btn.style.border = '1px solid #374151';
        btn.style.color = '#E5E7EB';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.title = action.label;
        btn.innerHTML = `${action.icon ? `<span>${action.icon}</span>` : ''}<span>${action.label}</span>`;
        if (typeof action.action === 'function') {
          btn.addEventListener('click', () => {
            try {
              action.action();
              logUserAction('contextPanel.action', { label: action.label });
            } catch (error) {
              logUserAction('contextPanel.action_error', { label: action.label, error }, { level: 'warn' });
            }
          });
        }
        el.appendChild(btn);
      });
      el.style.display = actions.length ? 'flex' : 'none';
    }

    return {
      /**
       * Show context actions.
       * @param {Array<{label: string, icon?: string, action?: () => void}>} actions
       */
      show(actions) {
        render(Array.isArray(actions) ? actions : []);
      },
      /**
       * Hide panel without destroying DOM.
       */
      hide() {
        const el = ensureHost();
        el.style.display = 'none';
      },
    };
  })();

  root.UI = root.UI || {};
  root.UI.contextPanel = ContextPanel;
  global.contextPanel = ContextPanel;

  // =============================
  // Smart Insights (P2.2)
  // =============================

  /**
   * Derive insight cards from KPI payload.
   * @param {Record<string, number>} kpiData
   * @returns {Array<Object>}
   */
  function generateInsights(kpiData) {
    try {
      const k = kpiData || {};
      const out = [];
      if ((k.overtimePct || 0) > 20) {
        out.push({
          type: 'trend',
          severity: 'warning',
          title: 'Overtime Spike Detected',
          description: `Overtime up ${k.overtimePct}% vs last month`,
          action: 'Review Schedules',
          trend: `+${k.overtimePct}%`,
          compareMetric: 'Last 30 days',
        });
      }
      if ((k.highValueLeads || 0) >= 3) {
        out.push({
          type: 'opportunity',
          severity: 'success',
          title: 'High-Value Prospects Nearby',
          description: `${k.highValueLeads} commercial leads within 2mi of anchor`,
          action: 'Add to Route',
          value: `$${(k.potentialValue || 45000).toLocaleString()} potential`,
        });
      }
      if ((k.conversionRateDelta || 0) < -30) {
        out.push({
          type: 'alert',
          severity: 'error',
          title: 'Conversion Rate Drop',
          description: `Close rate down ${Math.abs(k.conversionRateDelta)}% this period`,
          action: 'Schedule Coaching',
          trend: `${k.conversionRateDelta}%`,
        });
      }
      return out.slice(0, 3);
    } catch (error) {
      logUserAction('insights.generate_error', error, { level: 'warn' });
      return [];
    }
  }

  /**
   * Render insight cards at top of dashboard content.
   * @param {Record<string, number>} kpiData
   */
  function renderInsightsForDashboard(kpiData) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;
    const top = document.createElement('div');
    top.id = 'insightsContainer';
    top.style.display = 'grid';
    top.style.gridTemplateColumns = 'repeat(auto-fit,minmax(260px,1fr))';
    top.style.gap = '12px';
    top.style.marginBottom = '12px';
    const insights = generateInsights(kpiData || {});
    if (!insights.length) return;
    insights.forEach((ins) => {
      const card = document.createElement('div');
      card.className = 'bg-white p-4 rounded-lg shadow-md';
      const color =
        ins.severity === 'error'
          ? '#ef4444'
          : ins.severity === 'warning'
          ? '#f59e0b'
          : '#10b981';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:600;color:#111827">${ins.title}</div>
          <span style="font-size:12px;color:${color}">${ins.type}</span>
        </div>
        <div style="color:#374151;margin-top:6px">${ins.description}</div>
        <div style="color:#6b7280;margin-top:6px">${ins.trend || ins.value || ''}</div>
        <div style="margin-top:8px"><button class="px-3 py-2 text-sm rounded" style="background:${color};color:#fff">${ins.action}</button></div>
      `;
      top.appendChild(card);
    });
    container.prepend(top);
  }

  root.analytics = root.analytics || {};
  root.analytics.generateInsights = generateInsights;
  root.analytics.renderInsightsForDashboard = renderInsightsForDashboard;
  global.generateInsights = generateInsights;
  global.renderInsightsForDashboard = renderInsightsForDashboard;

  // =============================
  // Bulk Actions Utilities (P2.3)
  // =============================
  /**
   * Enable bulk selection checkboxes for list items.
   * @param {string|Element} containerSelector
   */
  function enableBulkSelect(containerSelector) {
    const container =
      typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;
    if (!container) return;
    const items = container.querySelectorAll('.list-item, .rs-card');
    items.forEach((item) => {
      if (item.querySelector('input[type="checkbox"].bulk-select')) return;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-select';
      checkbox.style.marginRight = '8px';
      if (!item.style.display) item.style.display = 'flex';
      if (!item.style.alignItems) item.style.alignItems = 'center';
      item.insertBefore(checkbox, item.firstChild);
      checkbox.addEventListener('change', (e) => {
        item.classList.toggle('selected', e.target.checked);
        updateBulkActionBar();
      });
    });
  }

  /**
   * Render or update floating bulk action bar.
   */
  function updateBulkActionBar() {
    const selected = document.querySelectorAll('.list-item.selected, .rs-card.selected');
    let bar = document.getElementById('bulk-action-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'bulk-action-bar';
      bar.style.position = 'fixed';
      bar.style.left = '20px';
      bar.style.bottom = '20px';
      bar.style.zIndex = '9999';
      bar.style.display = 'none';
      bar.style.background = '#111827';
      bar.style.border = '1px solid #374151';
      bar.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
      bar.style.borderRadius = '12px';
      bar.style.padding = '10px';
      bar.style.gap = '8px';
      bar.style.alignItems = 'center';
      bar.style.color = '#E5E7EB';
      document.body.appendChild(bar);
    }
    if (selected.length > 0) {
      bar.innerHTML = `
        <span style="margin-right:8px">${selected.length} selected</span>
        <button class="px-3 py-2 rounded" data-action="assign" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Assign To...</button>
        <button class="px-3 py-2 rounded" data-action="status" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Update Status</button>
        <button class="px-3 py-2 rounded" data-action="export" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Export</button>
        <button class="px-3 py-2 rounded" data-action="delete" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Delete</button>
      `;
      bar.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          logUserAction('bulk.action', { action, count: selected.length });
          if (action === 'assign') bulkAssignTo();
          if (action === 'status') bulkUpdateStatus();
          if (action === 'export') bulkExport();
          if (action === 'delete') bulkDelete();
        });
      });
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none';
    }
  }

  function bulkAssignTo() {
    alert('Assign To... (bulk)');
  }
  function bulkUpdateStatus() {
    alert('Update Status (bulk)');
  }
  function bulkExport() {
    alert('Export (bulk)');
  }
  function bulkDelete() {
    const selected = document.querySelectorAll('.list-item.selected, .rs-card.selected');
    selected.forEach((el) => el.remove());
    updateBulkActionBar();
  }

  root.bulk = Object.assign(root.bulk || {}, {
    enableBulkSelect,
    updateBulkActionBar,
    bulkAssignTo,
    bulkUpdateStatus,
    bulkExport,
    bulkDelete,
  });
  global.enableBulkSelect = enableBulkSelect;
  global.updateBulkActionBar = updateBulkActionBar;
  global.bulkAssignTo = bulkAssignTo;
  global.bulkUpdateStatus = bulkUpdateStatus;
  global.bulkExport = bulkExport;
  global.bulkDelete = bulkDelete;

  // =============================
  // Offline Queue (P4.1)
  // =============================
  const OfflineQueue = {
    queue: (() => {
      try {
        return JSON.parse(localStorage.getItem('offline_queue') || '[]');
      } catch (_) {
        return [];
      }
    })(),
    /**
     * @param {Record<string, unknown>} operation
     */
    async add(operation) {
      try {
        this.queue.push(operation);
        localStorage.setItem('offline_queue', JSON.stringify(this.queue));
        logUserAction('offlineQueue.add', { size: this.queue.length });
        if (navigator.onLine) await this.sync();
      } catch (error) {
        logUserAction('offlineQueue.add_error', error, { level: 'warn' });
      }
    },
    async sync() {
      let changed = false;
      while (this.queue.length > 0) {
        const op = this.queue[0];
        try {
          if (typeof global.executeOperation === 'function') {
            await global.executeOperation(op);
          }
          this.queue.shift();
          changed = true;
        } catch (error) {
          if (error && error.status === 409 && typeof global.resolveConflict === 'function') {
            await global.resolveConflict(op);
            this.queue.shift();
            changed = true;
          } else {
            logUserAction('offlineQueue.sync_error', error, { level: 'warn' });
            break;
          }
        }
      }
      if (changed) {
        localStorage.setItem('offline_queue', JSON.stringify(this.queue));
      }
    },
  };
  global.addEventListener('online', () => {
    try {
      OfflineQueue.sync();
    } catch (error) {
      logUserAction('offlineQueue.online_sync_error', error, { level: 'warn' });
    }
  });

  root.offlineQueue = OfflineQueue;
  global.OfflineQueue = OfflineQueue;

  // =============================
  // Virtual Scrolling (P4.2)
  // =============================
  class VirtualList {
    /**
     * @param {string|Element} container
     * @param {Array<unknown>} items
     * @param {(item: unknown) => string} renderItem
     */
    constructor(container, items, renderItem) {
      this.container =
        typeof container === 'string' ? document.querySelector(container) : container;
      this.items = items || [];
      this.renderItem = renderItem || ((x) => `<div>${JSON.stringify(x)}</div>`);
      this.itemHeight = 60;
      const height = this.container?.clientHeight || 0;
      this.visibleCount = Math.max(1, Math.ceil(height / this.itemHeight));
      this.scrollTop = 0;
      this.render();
      if (this.container) {
        this.container.addEventListener('scroll', () => this.handleScroll());
      }
    }

    handleScroll() {
      if (!this.container) return;
      this.scrollTop = this.container.scrollTop;
      this.render();
    }

    render() {
      if (!this.container) return;
      const startIndex = Math.floor(this.scrollTop / this.itemHeight);
      const endIndex = startIndex + this.visibleCount;
      const visibleItems = this.items.slice(startIndex, endIndex);
      this.container.innerHTML = `
        <div style="height: ${this.items.length * this.itemHeight}px; position: relative;">
          <div style="position: absolute; top: ${startIndex * this.itemHeight}px; left:0; right:0;">
            ${visibleItems.map((item) => this.renderItem(item)).join('')}
          </div>
        </div>
      `;
    }
  }

  root.VirtualList = VirtualList;
  global.VirtualList = VirtualList;

  // =============================
  // Natural Language Commands (P3.3)
  // =============================

  /**
   * Parse simple natural language commands and execute mapped actions.
   * @param {string} userInput
   */
  async function processNaturalCommand(userInput) {
    try {
      const txt = String(userInput || '').toLowerCase();
      let query = null;
      if (txt.includes('ae') && txt.includes('close')) {
        query = { query: 'listAEs', filters: { closeRate: '<50', branch: 'HOU' } };
      } else if (txt.includes('prospects') || txt.includes('nearby')) {
        query = { query: 'findProspects', filters: { distance: 2, vertical: 'Restaurant' } };
      } else if (txt.includes('kpi') || txt.includes('performance')) {
        query = {
          query: 'getKPIs',
          filters: { branch: 'HOU', metric: 'sales', period: 'last_week' },
        };
      }
      if (!query) {
        alert('Could not parse command. Try e.g. "Show nearby prospects"');
        return;
      }
      logUserAction('nlc.command', query);
      if (typeof global.executeQuery === 'function') {
        return global.executeQuery(query);
      }
      console.log('NL Command parsed →', query);
      alert('Command parsed: ' + JSON.stringify(query));
    } catch (error) {
      logUserAction('nlc.error', error, { level: 'warn' });
    }
  }

  root.commands = Object.assign(root.commands || {}, {
    processNaturalCommand,
  });
  global.processNaturalCommand = processNaturalCommand;
})(window);

