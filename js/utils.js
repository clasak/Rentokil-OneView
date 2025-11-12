const AppState = (() => {
  const STORAGE_KEY = "OneView.AppState";
  const subscribers = new Map();
  const eventSubscribers = new Map();
  let store = {
    user: null,
    branches: [],
    routes: [],
    kpis: {},
    ui: { activeModal: null, sidebarOpen: true, settings: {} },
    preferences: (() => { try { return JSON.parse(localStorage.getItem('preferences') || '{}'); } catch(_) { return {}; } })(),
    theme: localStorage.getItem('theme') || 'dark',
  };

  let persistQueued = false;

  function sanitize(obj) {
    function isPlainObject(v) {
      return v && typeof v === "object" && !Array.isArray(v);
    }
    const blocked = new Set(["token", "password", "secret", "apiKey"]);
    function walk(input) {
      if (Array.isArray(input)) return input.map(walk);
      if (!isPlainObject(input)) return input;
      const out = {};
      for (const k of Object.keys(input)) {
        if (blocked.has(k)) continue;
        out[k] = walk(input[k]);
      }
      return out;
    }
    return walk(obj);
  }

  function queuePersist() {
    if (persistQueued) return;
    persistQueued = true;
    setTimeout(() => {
      try {
        const payload = JSON.stringify(sanitize(store));
        localStorage.setItem(STORAGE_KEY, payload);
      } catch (e) {
        // swallow
      } finally {
        persistQueued = false;
      }
    }, 50);
  }

  function resolvePath(root, path, create) {
    const parts = path.split(".");
    let obj = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in obj)) {
        if (create) obj[p] = {};
        else return undefined;
      }
      obj = obj[p];
      if (obj == null || typeof obj !== "object") {
        if (create) obj = obj[p] = {};
        else return undefined;
      }
    }
    const last = parts[parts.length - 1];
    return { obj, key: last };
  }

  function getState(path, fallback) {
    if (!path) return store;
    const parts = path.split(".");
    let obj = store;
    for (const p of parts) {
      if (obj == null) return fallback;
      obj = obj[p];
    }
    return obj === undefined ? fallback : obj;
  }

  function notify(path, value) {
    const set = subscribers.get(path);
    if (set) {
      for (const fn of Array.from(set)) {
        try { fn(value, path); } catch (_) {}
      }
    }
  }

  function emit(evt, payload) {
    const set = eventSubscribers.get(evt);
    if (set) {
      for (const fn of Array.from(set)) {
        try { fn(payload, evt); } catch (_) {}
      }
    }
  }

  function subscribe(path, callback) {
    if (!subscribers.has(path)) subscribers.set(path, new Set());
    const set = subscribers.get(path);
    set.add(callback);
    const current = getState(path);
    if (current !== undefined) {
      try { callback(current, path); } catch (_) {}
    }
    return () => {
      const s = subscribers.get(path);
      if (s) s.delete(callback);
    };
  }

  function on(evt, callback) {
    if (!eventSubscribers.has(evt)) eventSubscribers.set(evt, new Set());
    const set = eventSubscribers.get(evt);
    set.add(callback);
    return () => {
      const s = eventSubscribers.get(evt);
      if (s) s.delete(callback);
    };
  }

  function setState(path, value) {
    const target = resolvePath(store, path, true);
    if (!target) return;
    target.obj[target.key] = value;
    queuePersist();
    notify(path, value);
  }

  function update(keyOrPath, value) {
    if (typeof keyOrPath === 'string' && keyOrPath.includes('.')) {
      setState(keyOrPath, value);
    } else {
      store[keyOrPath] = value;
      queuePersist();
      emit('update:' + keyOrPath, value);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(store)));
      localStorage.setItem('theme', String(store.theme || 'dark'));
      localStorage.setItem('preferences', JSON.stringify(store.preferences || {}));
    } catch (_) {}
  }

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        store = Object.assign({}, store, loaded);
      }
    } catch (_) {}
    window.addEventListener("beforeunload", () => {
      try { save(); } catch (_) {}
      subscribers.clear();
      eventSubscribers.clear();
    });
  }

  return { init, getState, setState, subscribe, on, emit, update, save };
})();

window.AppState = AppState;

// =============================
// Contextual Action Panel (P2.1)
// =============================
window.contextPanel = (function(){
  let host = null;
  function ensureHost(){
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
    host.setAttribute('role','toolbar');
    host.setAttribute('aria-label','Contextual Actions');
    host.className = 'contextual-actions flex';
    document.body.appendChild(host);
    return host;
  }
  function render(actions){
    const el = ensureHost();
    el.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'px-3 py-2 rounded-lg text-sm';
      btn.style.background = '#1F2937';
      btn.style.border = '1px solid #374151';
      btn.style.color = '#E5E7EB';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
      btn.title = a.label;
      btn.innerHTML = `${a.icon ? `<span>${a.icon}</span>` : ''}<span>${a.label}</span>`;
      if (typeof a.action === 'function') btn.addEventListener('click', a.action);
      el.appendChild(btn);
    });
    el.style.display = actions && actions.length ? 'flex' : 'none';
  }
  return {
    show(actions){ render(Array.isArray(actions) ? actions : []); },
    hide(){ const el = ensureHost(); el.style.display = 'none'; },
  };
})();

// =============================
// Smart Insights (P2.2)
// =============================
window.generateInsights = function(kpiData){
  try {
    const k = kpiData || {};
    const out = [];
    // Simple heuristic examples; replace with real logic when data available
    if ((k.overtimePct || 0) > 20) {
      out.push({ type:'trend', severity:'warning', title:'Overtime Spike Detected', description:`Overtime up ${k.overtimePct}% vs last month`, action:'Review Schedules', trend:`+${k.overtimePct}%`, compareMetric:'Last 30 days' });
    }
    if ((k.highValueLeads || 0) >= 3) {
      out.push({ type:'opportunity', severity:'success', title:'High-Value Prospects Nearby', description:`${k.highValueLeads} commercial leads within 2mi of anchor`, action:'Add to Route', value:`$${(k.potentialValue||45000).toLocaleString()} potential` });
    }
    if ((k.conversionRateDelta || 0) < -30) {
      out.push({ type:'alert', severity:'error', title:'Conversion Rate Drop', description:`Close rate down ${Math.abs(k.conversionRateDelta)}% this period`, action:'Schedule Coaching', trend:`${k.conversionRateDelta}%` });
    }
    return out.slice(0, 3);
  } catch(_) { return []; }
};

window.renderInsightsForDashboard = function(kpiData){
  const container = document.getElementById('dashboardContent');
  if (!container) return;
  const top = document.createElement('div');
  top.id = 'insightsContainer';
  top.style.display = 'grid';
  top.style.gridTemplateColumns = 'repeat(auto-fit,minmax(260px,1fr))';
  top.style.gap = '12px';
  top.style.marginBottom = '12px';
  const insights = window.generateInsights(kpiData || {});
  if (!insights.length) return;
  insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg shadow-md';
    const color = ins.severity === 'error' ? '#ef4444' : ins.severity === 'warning' ? '#f59e0b' : '#10b981';
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
};

// =============================
// Bulk Actions Utilities (P2.3)
// =============================
window.enableBulkSelect = function(containerSelector){
  const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
  if (!container) return;
  const items = container.querySelectorAll('.list-item, .rs-card');
  items.forEach(item => {
    if (item.querySelector('input[type="checkbox"].bulk-select')) return;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'bulk-select';
    checkbox.style.marginRight = '8px';
    item.style.display = item.style.display || 'flex';
    item.style.alignItems = item.style.alignItems || 'center';
    item.insertBefore(checkbox, item.firstChild);
    checkbox.addEventListener('change', (e) => {
      item.classList.toggle('selected', e.target.checked);
      window.updateBulkActionBar();
    });
  });
};

window.updateBulkActionBar = function(){
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
      <button class="px-3 py-2 rounded" onclick="bulkAssignTo()" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Assign To...</button>
      <button class="px-3 py-2 rounded" onclick="bulkUpdateStatus()" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Update Status</button>
      <button class="px-3 py-2 rounded" onclick="bulkExport()" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Export</button>
      <button class="px-3 py-2 rounded" onclick="bulkDelete()" style="background:#1F2937;color:#E5E7EB;border:1px solid #374151">Delete</button>
    `;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
};

// Basic bulk action handlers (stubs)
window.bulkAssignTo = function(){ alert('Assign To... (bulk)'); };
window.bulkUpdateStatus = function(){ alert('Update Status (bulk)'); };
window.bulkExport = function(){ alert('Export (bulk)'); };
window.bulkDelete = function(){
  const selected = document.querySelectorAll('.list-item.selected, .rs-card.selected');
  selected.forEach(el => el.remove());
  window.updateBulkActionBar();
};

// =============================
// Offline Queue (P4.1)
// =============================
window.OfflineQueue = {
  queue: JSON.parse(localStorage.getItem('offline_queue') || '[]'),
  async add(operation){
    try {
      this.queue.push(operation);
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
      if (navigator.onLine) await this.sync();
    } catch(_){}
  },
  async sync(){
    let changed = false;
    while (this.queue.length > 0) {
      const op = this.queue[0];
      try {
        await (window.executeOperation ? window.executeOperation(op) : Promise.resolve());
        this.queue.shift();
        changed = true;
      } catch (error) {
        if (error && error.status === 409 && window.resolveConflict) {
          await window.resolveConflict(op);
          this.queue.shift();
          changed = true;
        } else {
          break;
        }
      }
    }
    if (changed) localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
};
window.addEventListener('online', () => { try { window.OfflineQueue.sync(); } catch(_){} });

// =============================
// Virtual Scrolling (P4.2)
// =============================
window.VirtualList = class VirtualList {
  constructor(container, items, renderItem){
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.items = items || [];
    this.renderItem = renderItem || ((x) => `<div>${JSON.stringify(x)}</div>`);
    this.itemHeight = 60;
    this.visibleCount = Math.ceil(this.container.clientHeight / this.itemHeight);
    this.scrollTop = 0;
    this.render();
    this.container.addEventListener('scroll', () => this.handleScroll());
  }
  handleScroll(){ this.scrollTop = this.container.scrollTop; this.render(); }
  render(){
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = startIndex + this.visibleCount;
    const visibleItems = this.items.slice(startIndex, endIndex);
    this.container.innerHTML = `
      <div style="height: ${this.items.length * this.itemHeight}px; position: relative;">
        <div style="position: absolute; top: ${startIndex * this.itemHeight}px; left:0; right:0;">
          ${visibleItems.map(item => this.renderItem(item)).join('')}
        </div>
      </div>
    `;
  }
};

// =============================
// Natural Language Commands (P3.3)
// =============================
window.processNaturalCommand = async function(userInput){
  try {
    // Fallback: map simple phrases to demo queries
    const txt = String(userInput || '').toLowerCase();
    let query = null;
    if (txt.includes('ae') && txt.includes('close')) {
      query = { query: 'listAEs', filters: { closeRate: '<50', branch: 'HOU' } };
    } else if (txt.includes('prospects') || txt.includes('nearby')) {
      query = { query: 'findProspects', filters: { distance: 2, vertical: 'Restaurant' } };
    } else if (txt.includes('kpi') || txt.includes('performance')) {
      query = { query: 'getKPIs', filters: { branch: 'HOU', metric: 'sales', period: 'last_week' } };
    }
    if (!query) { alert('Could not parse command. Try e.g. "Show nearby prospects"'); return; }
    if (typeof window.executeQuery === 'function') return window.executeQuery(query);
    console.log('NL Command parsed →', query);
    alert('Command parsed: ' + JSON.stringify(query));
  } catch(e) { console.warn('processNaturalCommand error', e); }
};
