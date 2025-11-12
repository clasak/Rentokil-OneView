// Universal grid-based layout engine (12 columns)
// Supports drag, resize, snapping, collision avoidance, add/remove widgets, and per-user persistence

(function(){
  const COLS = 12;
  const MIN_W = 2; // min width in columns
  const MIN_H = 2; // min height in rows
  const MAX_W = 12; // max width in columns
  const MAX_H = 6; // max height in rows
  const GAP_PX = 8; // grid gap per spec
  const SNAP_PX = 16; // snap granularity for pointer calc

  function throttle(fn, ms) {
    let t = 0;
    return function(...args){
      const now = Date.now();
      if (now - t > ms) { t = now; fn.apply(this, args); }
    };
  }
  function debounce(fn, ms) {
    let id = null;
    return function(...args){
      if (id) clearTimeout(id);
      id = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function getUserKey() {
    try {
      const email = (window.currentUser && window.currentUser.email) ? String(window.currentUser.email).toLowerCase() : 'guest@local';
      return email;
    } catch(_) { return 'guest@local'; }
  }

  function keyFor(dashboard){ return `userLayout:${getUserKey()}:${dashboard}`; }

  function rectsCollide(a,b){
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function computeSizeState(w,h){
    const area = w*h;
    if (area <= 6) return 'small';
    if (area <= 12) return 'medium';
    return 'large';
  }

  class LayoutEngine {
    constructor(container, dashboard, options={}){
      this.container = container;
      this.dashboard = dashboard || 'sales';
      this.cols = COLS;
      this.rowHeight = options.rowHeight || 20; // px per row
      this.widgets = []; // {id, x,y,w,h, type}
      this.snapSave = debounce(() => this.persist(), options.saveDebounceMs || 500);
      this.animEnabled = options.anim !== false;
      this.gridInit();
      this.attachResizeObserver();
    }

    gridInit(){
      const c = this.container;
      c.classList.add('universal-grid');
      c.style.display = 'grid';
      c.style.gridTemplateColumns = `repeat(${this.cols}, minmax(0, 1fr))`;
      c.style.gridAutoRows = `${this.rowHeight}px`;
      c.style.gap = `${GAP_PX}px`;
      c.style.position = 'relative';
      if (this.animEnabled) c.classList.add('grid-animate');
    }

    attachResizeObserver(){
      const onResize = throttle(() => this.reflow(), 120);
      window.addEventListener('resize', onResize);
    }

    setWidgets(widgets){
      // Ensure uniqueness by type and stable ids
      const byType = new Map();
      widgets.forEach(w => { if (!byType.has(w.type)) byType.set(w.type, w); });
      // Track defaults for reset behavior
      this.defaults = Array.from(byType.values()).map(w => ({ id: w.id || w.type, type: w.type, x: w.x || 0, y: w.y || 0, w: w.w || MIN_W, h: w.h || MIN_H }));
      this.widgets = this.defaults.map(w => ({...w, view: (w.view || 'number')}));
      this.render();
      this.loadPersisted();
      // Populate central registry from DOM
      if (!window.widgetRegistry) window.widgetRegistry = new Set();
      this.container.querySelectorAll('.widget-card').forEach(el => {
        const id = el.dataset.widgetId; if (id) window.widgetRegistry.add(id);
      });
    }

    render(){
      const c = this.container;
      c.innerHTML = '';
      this.widgets.forEach(w => {
        const card = document.createElement('div');
        card.className = 'widget-card rounded-xl shadow-lg';
        card.dataset.widgetId = w.id;
        card.dataset.type = w.type;
        // Accessibility: ARIA role/label and tabindex for focus ring
        card.setAttribute('role', 'region');
        const titleForAria = (window.Widgets && window.Widgets.get(w.type)?.title) || w.type;
        card.setAttribute('aria-label', titleForAria);
        card.setAttribute('tabindex', '0');
        card.style.gridColumn = `${w.x + 1} / span ${w.w}`;
        card.style.gridRow = `${w.y + 1} / span ${w.h}`;
        card.style.transition = 'transform 180ms ease, width 180ms ease, height 180ms ease, box-shadow 120ms ease';

        // Header
        const header = document.createElement('div');
        header.className = 'widget-header flex justify-between items-center px-3 py-2 border-b';
        const title = document.createElement('div');
        title.className = 'font-semibold text-gray-800 text-sm';
        title.textContent = titleForAria;
        // View toggle: Number ↔ Chart
        const toggle = document.createElement('button');
        toggle.className = 'view-toggle text-xs px-2 py-1 rounded hover:bg-gray-100';
        toggle.setAttribute('aria-label', 'Toggle number/chart view');
        toggle.textContent = (w.view === 'chart') ? 'Number' : 'Chart';
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          w.view = (w.view === 'chart') ? 'number' : 'chart';
          try {
            const state = computeSizeState(w.w, w.h);
            const html = window.Widgets.render(w.type, state, w.view);
            body.innerHTML = html;
            toggle.textContent = (w.view === 'chart') ? 'Number' : 'Chart';
            this.snapSave();
          } catch(_) {}
        });
        header.appendChild(title);
        header.appendChild(toggle);
        card.appendChild(header);

        // Body content
        const body = document.createElement('div');
        body.className = 'widget-body p-3';
        const state = computeSizeState(w.w, w.h);
        try {
          const html = window.Widgets.render(w.type, state, w.view || 'number');
          body.innerHTML = html;
        } catch(e) {
          body.innerHTML = `<div class="text-sm text-gray-500">Widget ${w.type}</div>`;
        }
        card.appendChild(body);

        // Resize handle
        // Resize handles: sides + corners
        const handles = [
          { key:'top',      cls:'handle-top',      cursor:'ns-resize' },
          { key:'bottom',   cls:'handle-bottom',   cursor:'ns-resize' },
          { key:'left',     cls:'handle-left',     cursor:'ew-resize' },
          { key:'right',    cls:'handle-right',    cursor:'ew-resize' },
          { key:'tl',       cls:'handle-tl',       cursor:'nwse-resize' },
          { key:'tr',       cls:'handle-tr',       cursor:'nesw-resize' },
          { key:'bl',       cls:'handle-bl',       cursor:'nesw-resize' },
          { key:'br',       cls:'handle-br',       cursor:'nwse-resize' }
        ];
        handles.forEach(h => {
          const el = document.createElement('div');
          el.className = `resize-handle ${h.cls}`;
          el.dataset.handle = h.key;
          el.style.cursor = h.cursor;
          card.appendChild(el);
        });

        this.attachInteractions(card, w);

        c.appendChild(card);
      });
    }

    reflow(){
      // Re-apply positions and content expansion state
      this.widgets.forEach(w => {
        const card = this.getCard(w.id);
        if (!card) return;
        card.style.gridColumn = `${w.x + 1} / span ${w.w}`;
        card.style.gridRow = `${w.y + 1} / span ${w.h}`;
        try {
          const state = computeSizeState(w.w, w.h);
          const body = card.querySelector('.widget-body');
          if (body) body.innerHTML = window.Widgets.render(w.type, state, w.view || 'number');
        } catch(_){}
      });
    }

    getCard(id){ return this.container.querySelector(`[data-widget-id="${id}"]`); }

    layoutMode(enabled){
      this.container.classList.toggle('layout-mode', !!enabled);
    }

    clearPersisted(){
      try { localStorage.removeItem(keyFor(this.dashboard)); } catch(_){}
    }

    resetToDefaults(){
      if (!Array.isArray(this.defaults)) return;
      const byId = new Map(this.defaults.map(d => [d.id, d]));
      this.widgets.forEach(w => {
        const d = byId.get(w.id) || byId.get(w.type);
        if (d){ w.x = d.x; w.y = d.y; w.w = d.w; w.h = d.h; }
      });
      this.reflow();
      this.clearPersisted();
    }

    addWidget(type){
      const def = window.Widgets.get(type);
      if (!def) return;
      // Prevent duplicates using central registry
      if (window.widgetRegistry && window.widgetRegistry.has(type)) {
        try { window.showToast ? showToast('Widget already exists', 'warning') : console.warn('Widget already exists'); } catch(_) {}
        return false;
      }
      // Prevent duplicates by type
      if (this.widgets.some(o => o.type === type)) {
        try { window.showToast ? showToast('Widget already exists', 'warning') : console.warn('Widget already exists'); } catch(_) {}
        return false;
      }
      // Place new widget at first free slot scanning rows
      const w = Math.min(def.defaultW || MIN_W, MAX_W);
      const h = Math.min(def.defaultH || MIN_H, MAX_H);
      let pos = {x:0,y:0};
      outer: for (let row=0; row<200; row++){
        for (let col=0; col<=this.cols - w; col++){
          const candidate = {x:col,y:row,w,h};
          if (!this.widgets.some(o => rectsCollide(candidate, o))) { pos = {x:col,y:row}; break outer; }
        }
      }
      const id = type; // use stable id per type to avoid duplicates
      this.widgets.push({ id, type, x:pos.x, y:pos.y, w, h, view: 'number' });
      this.render();
      this.snapSave();
      if (!window.widgetRegistry) window.widgetRegistry = new Set();
      window.widgetRegistry.add(id);
      return true;
    }

    removeWidget(id){
      this.widgets = this.widgets.filter(w => w.id !== id);
      const card = this.getCard(id); if (card) card.remove();
      this.snapSave();
      window.widgetRegistry?.delete(id);
    }

    // --- Animated rearrangement helpers ---
    estColWidth(){
      const rect = this.container.getBoundingClientRect();
      return (rect.width - GAP_PX*(this.cols-1)) / this.cols;
    }

    currentPositions(){
      const pos = new Map();
      this.widgets.forEach(w => pos.set(w.id, { x:w.x, y:w.y, w:w.w, h:w.h }));
      return pos;
    }

    collidesAny(id, rect, positions){
      for (const other of this.widgets){
        if (other.id === id) continue;
        const r = positions.get(other.id) || { x:other.x, y:other.y, w:other.w, h:other.h };
        if (rectsCollide(rect, r)) return true;
      }
      return false;
    }

    nearestOpen(rect, positions){
      const maxRows = 500;
      for (let d=0; d<maxRows; d++){
        for (let y = Math.max(0, rect.y - d); y <= rect.y + d; y++){
          for (let x = Math.max(0, rect.x - d); x <= rect.x + d; x++){
            const nx = Math.min(Math.max(0, x), COLS - rect.w);
            const ny = Math.max(0, y);
            const candidate = { x:nx, y:ny, w:rect.w, h:rect.h };
            if (!this.collidesAny('', candidate, positions)) return candidate;
          }
        }
      }
      for (let row=0; row<maxRows; row++){
        for (let col=0; col<=this.cols - rect.w; col++){
          const candidate = { x:col, y:row, w:rect.w, h:rect.h };
          if (!this.collidesAny('', candidate, positions)) return candidate;
        }
      }
      return { x:rect.x, y:rect.y, w:rect.w, h:rect.h };
    }

    shiftWidgets(draggedId, candidate){
      const positions = this.currentPositions();
      positions.set(draggedId, { x:candidate.x, y:candidate.y, w:candidate.w, h:candidate.h });
      const queue = [];
      for (const w of this.widgets){
        if (w.id === draggedId) continue;
        const r = positions.get(w.id);
        if (rectsCollide(candidate, r)) queue.push(w.id);
      }
      while (queue.length){
        const id = queue.shift();
        const curr = positions.get(id);
        const moved = this.nearestOpen(curr, positions);
        if (moved.x !== curr.x || moved.y !== curr.y){
          positions.set(id, moved);
          for (const w of this.widgets){
            if (w.id === id) continue;
            const r = positions.get(w.id);
            if (rectsCollide(moved, r) && !queue.includes(w.id)) queue.push(w.id);
          }
        }
      }
      return positions;
    }

    previewTransforms(positions, draggedId, dragDX=0, dragDY=0){
      const colW = this.estColWidth();
      const rowH = this.rowHeight;
      this.widgets.forEach(w => {
        const card = this.getCard(w.id); if (!card) return;
        if (w.id === draggedId){
          card.style.transform = `translate3d(${dragDX}px, ${dragDY}px, 0) scale(1.02)`;
          return;
        }
        const target = positions.get(w.id) || { x:w.x, y:w.y };
        const dxCols = (target.x - w.x);
        const dyRows = (target.y - w.y);
        if (dxCols || dyRows){
          const dx = dxCols * (colW + GAP_PX);
          const dy = dyRows * (rowH + GAP_PX);
          card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        } else {
          card.style.transform = '';
        }
      });
    }

    commitPositions(positions){
      this.widgets.forEach(w => {
        const p = positions.get(w.id);
        if (!p) return;
        w.x = p.x; w.y = p.y; w.w = p.w; w.h = p.h;
        const card = this.getCard(w.id);
        if (card){
          card.style.transform = '';
          card.style.gridColumn = `${w.x + 1} / span ${w.w}`;
          card.style.gridRow = `${w.y + 1} / span ${w.h}`;
        }
      });
    }

    attachInteractions(card, w){
      const body = card.querySelector('.widget-body');
      const estColWidth = () => (this.container.getBoundingClientRect().width - GAP_PX*(this.cols-1)) / this.cols;

      // Drag from body
      let dragStart = null;
      const dragPump = () => {};
      const onDragMove = (ev) => {
        if (!dragStart) return;
        const dx = ev.clientX - dragStart.x;
        const dy = ev.clientY - dragStart.y;
        const colDelta = Math.round(dx / (card.offsetWidth / w.w));
        const rowDelta = Math.round(dy / this.rowHeight);
        const nx = Math.max(0, Math.min(this.cols - w.w, dragStart.origX + colDelta));
        const ny = Math.max(0, Math.min(999, dragStart.origY + rowDelta));
        const cand = { x:nx, y:ny, w:w.w, h:w.h };
        const positions = this.shiftWidgets(w.id, cand);
        dragStart.candidate = cand;
        dragStart.positions = positions;
        this.previewTransforms(positions, w.id, dx, dy);
      };
      const onDragUp = (ev) => {
        if (!dragStart) return;
        card.releasePointerCapture(ev.pointerId);
        try {
          const positions = dragStart.positions || this.shiftWidgets(w.id, { x:w.x, y:w.y, w:w.w, h:w.h });
          this.commitPositions(positions);
        } catch(_){}
        this.container.classList.remove('dragging');
        card.classList.remove('drag-active');
        card.style.boxShadow = '';
        if (body) body.style.cursor = '';
        dragStart = null;
        this.snapSave();
      };
      const onDragDown = (ev) => {
        // Only drag in layout mode; ignore clicks on controls
        if (!this.container.classList.contains('layout-mode')) return;
        const isControl = ev.target.closest('.view-toggle, .drag-handle, .resize-handle');
        if (isControl) return;
        dragStart = { x: ev.clientX, y: ev.clientY, origX: w.x, origY: w.y };
        card.setPointerCapture(ev.pointerId);
        this.container.classList.add('dragging');
        card.classList.add('drag-active');
        card.style.boxShadow = '0 0 0 2px #ff2d55, 0 12px 28px rgba(0,0,0,0.45)';
        if (body) body.style.cursor = 'grabbing';
      };
      if (body) {
        body.style.cursor = 'grab';
        body.addEventListener('pointerdown', onDragDown);
        card.addEventListener('pointermove', onDragMove);
        card.addEventListener('pointerup', onDragUp);
      }

      // Size label helper
      const ensureSizeLabel = () => {
        let lbl = card.querySelector('.size-label');
        if (!lbl) {
          lbl = document.createElement('div');
          lbl.className = 'size-label';
          card.appendChild(lbl);
        }
        return lbl;
      };

      // Resize from handles
      let resizeStart = null;
      const onResizeMove = (ev) => {
        if (!resizeStart) return;
        const dx = ev.clientX - resizeStart.x;
        const dy = ev.clientY - resizeStart.y;
        const colW = estColWidth();
        const dw = Math.round(dx / colW);
        const dh = Math.round(dy / this.rowHeight);
        let nx = w.x, ny = w.y, nw = w.w, nh = w.h;
        switch (resizeStart.handle) {
          case 'right': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW + dw)); break;
          case 'left': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW - dw)); nx = Math.max(0, Math.min(resizeStart.origX + dw, COLS - nw)); break;
          case 'bottom': nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH + dh)); break;
          case 'top': nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH - dh)); ny = Math.max(0, resizeStart.origY + dh); break;
          case 'br': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW + dw)); nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH + dh)); break;
          case 'bl': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW - dw)); nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH + dh)); nx = Math.max(0, Math.min(resizeStart.origX + dw, COLS - nw)); break;
          case 'tr': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW + dw)); nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH - dh)); ny = Math.max(0, resizeStart.origY + dh); break;
          case 'tl': nw = Math.max(MIN_W, Math.min(MAX_W, resizeStart.origW - dw)); nh = Math.max(MIN_H, Math.min(MAX_H, resizeStart.origH - dh)); nx = Math.max(0, Math.min(resizeStart.origX + dw, COLS - nw)); ny = Math.max(0, resizeStart.origY + dh); break;
        }
        // clamp to container
        nw = Math.min(nw, COLS - nx);
        const candidate = { x:nx, y:ny, w:nw, h:nh };
        const positions = this.shiftWidgets(w.id, candidate);
        resizeStart.candidate = candidate;
        resizeStart.positions = positions;
        this.previewTransforms(positions, w.id, 0, 0);
        const lbl = ensureSizeLabel();
        lbl.textContent = `${nw}×${nh}`;
      };
      const onResizeUp = (ev) => {
        if (!resizeStart) return;
        card.releasePointerCapture(ev.pointerId);
        const positions = resizeStart.positions || this.shiftWidgets(w.id, { x:w.x, y:w.y, w:w.w, h:w.h });
        this.commitPositions(positions);
        const lbl = card.querySelector('.size-label'); if (lbl) lbl.remove();
        this.container.classList.remove('dragging');
        card.classList.remove('drag-active');
        card.style.boxShadow = '';
        this.snapSave();
        resizeStart = null;
      };
      const onResizeDown = (ev) => {
        if (!this.container.classList.contains('layout-mode')) return;
        const h = ev.target.closest('.resize-handle'); if (!h) return;
        const handle = h.dataset.handle;
        resizeStart = { x: ev.clientX, y: ev.clientY, origX: w.x, origY: w.y, origW: w.w, origH: w.h, handle, candidate: null };
        card.setPointerCapture(ev.pointerId);
        this.container.classList.add('dragging');
        card.classList.add('drag-active');
        card.style.boxShadow = '0 0 0 2px #ff2d55, 0 12px 28px rgba(0,0,0,0.45)';
      };
      card.addEventListener('pointerdown', onResizeDown);
      card.addEventListener('pointermove', onResizeMove);
      card.addEventListener('pointerup', onResizeUp);
    }

    persist(){
      const payload = this.widgets.map(({id,type,x,y,w,h,view}) => ({id,type,x,y,w,h,view}));
      try { localStorage.setItem(keyFor(this.dashboard), JSON.stringify(payload)); } catch(_){}
      try {
        if (window.google && google.script && google.script.run && typeof google.script.run.saveUserLayout === 'function') {
          google.script.run.saveUserLayout(getUserKey(), this.dashboard, JSON.stringify(payload));
        }
      } catch(_){}
    }

    loadPersisted(){
      try {
        const raw = localStorage.getItem(keyFor(this.dashboard));
        if (!raw) return;
        const arr = JSON.parse(raw);
        // Merge with current widgets keeping types; unknown ids are appended
        const byId = new Map(arr.map(x => [x.id, x]));
        this.widgets.forEach(w => {
          const s = byId.get(w.id);
          if (s && s.type === w.type) { w.x = s.x; w.y = s.y; w.w = s.w; w.h = s.h; w.view = s.view || w.view || 'number'; }
        });
        // Add any saved widgets not present
        arr.forEach(x => { if (!this.widgets.some(w => w.id === x.id)) this.widgets.push({...x, view: x.view || 'number'}); });
        this.reflow();
      } catch(_){}
    }
  }

  // Export
  window.LayoutEngine = LayoutEngine;
})();
