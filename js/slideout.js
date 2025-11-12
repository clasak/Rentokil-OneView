;(function(){
  const STYLE_ID = 'slideout-styles';
  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .slideout-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); opacity: 0; pointer-events: none; transition: opacity 180ms ease; z-index: 10000; }
      .slideout-overlay.active { opacity: 1; pointer-events: auto; }
      .slideout-panel { position: fixed; top: 0; right: 0; height: 100vh; width: min(480px, 100vw); max-width: 100vw; background: #111827; color: #fff; box-shadow: -8px 0 24px rgba(0,0,0,0.4); transform: translateX(100%); transition: transform 220ms ease; z-index: 10001; display: grid; grid-template-rows: auto 1fr auto; }
      .slideout-panel.active { transform: translateX(0); }
      .slideout-panel.left { left: 0; right: auto; box-shadow: 8px 0 24px rgba(0,0,0,0.4); transform: translateX(-100%); }
      .slideout-panel.left.active { transform: translateX(0); }
      .slideout-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #374151; background: #0f172a; }
      .slideout-title { font-weight: 600; }
      .slideout-close { appearance: none; border: none; background: #e4002b; color: #fff; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
      .slideout-content { overflow: auto; padding: 12px 16px; }
      .slideout-footer { padding: 10px 16px; border-top: 1px solid #374151; background: #0f172a; }
      @media (max-width: 640px) { .slideout-panel { width: 100vw; } }
    `;
    document.head.appendChild(s);
  }

  class SlideOut {
    constructor(){
      injectStyles();
      this.scope = (window.EventRegistry && EventRegistry.createScope('SlideOutPanel')) || null;
      this.overlay = document.createElement('div');
      this.overlay.className = 'slideout-overlay';
      this.panel = document.createElement('div');
      this.panel.className = 'slideout-panel';
      this.panel.setAttribute('role', 'dialog');
      this.panel.setAttribute('aria-modal', 'true');
      this.panel.setAttribute('aria-label', 'Slide-out Panel');

      this.header = document.createElement('div');
      this.header.className = 'slideout-header';
      this.titleEl = document.createElement('div');
      this.titleEl.className = 'slideout-title';
      this.closeBtn = document.createElement('button');
      this.closeBtn.className = 'slideout-close';
      this.closeBtn.textContent = 'Close';
      this.header.appendChild(this.titleEl);
      this.header.appendChild(this.closeBtn);

      this.content = document.createElement('div');
      this.content.className = 'slideout-content';
      this.footer = document.createElement('div');
      this.footer.className = 'slideout-footer';

      this.panel.appendChild(this.header);
      this.panel.appendChild(this.content);
      this.panel.appendChild(this.footer);
      document.body.appendChild(this.overlay);
      document.body.appendChild(this.panel);

      this.boundEsc = (e) => { if (e.key === 'Escape') this.close(); };
      this.boundOverlay = () => this.close();
      const onCloseClick = () => this.close();
      if (this.scope) this.scope.addEvent(this.closeBtn, 'click', onCloseClick); else this.closeBtn.addEventListener('click', onCloseClick);
      if (this.scope) this.scope.addEvent(this.overlay, 'click', this.boundOverlay); else this.overlay.addEventListener('click', this.boundOverlay);
    }

    setTitle(text){ this.titleEl.textContent = text || ''; }
    setFooter(node){ this.footer.innerHTML = ''; if (node) this.footer.appendChild(node); }
    setContent(nodeOrHtml){
      this.content.innerHTML = '';
      if (typeof nodeOrHtml === 'string') { this.content.innerHTML = nodeOrHtml; }
      else if (nodeOrHtml instanceof Node) { this.content.appendChild(nodeOrHtml); }
    }

    setPosition(pos){
      if (pos === 'left') {
        this.panel.classList.add('left');
      } else {
        this.panel.classList.remove('left');
      }
    }

    openFromElement(elOrId, opts={}){
      const el = (typeof elOrId === 'string') ? document.getElementById(elOrId) : elOrId;
      if (!el) return this.open('<p>Panel not available.</p>', opts);
      // Move the actual element into the slide-out and remember where it came from
      this.srcEl = el;
      this.srcElParent = el.parentNode;
      this.srcElNext = el.nextSibling;
      this.movedEl = true;
      this.open('', opts);
      try { this.content.appendChild(el); } catch(_) {}
      try { el.classList.remove('hidden'); el.style.display = ''; } catch(_) {}
    }

    open(content, opts={}){
      const { title, position } = opts;
      this.setTitle(title || '');
      this.setPosition(position || 'right');
      this.setContent(content);
      this.overlay.classList.add('active');
      this.panel.classList.add('active');
      if (this.scope) this.scope.addEvent(document, 'keydown', this.boundEsc); else document.addEventListener('keydown', this.boundEsc);
      try { document.body.style.overflow = 'hidden'; } catch(_) {}
      // Focus trap: focus first focusable element, else close button
      setTimeout(() => {
        const focusables = this.panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = focusables[0] || this.closeBtn;
        try { first.focus(); } catch(_) {}
      }, 0);
      if (window.AppState && typeof AppState.setState === 'function') {
        AppState.setState('ui.activeSlideout', true);
      }
    }

    close(){
      this.overlay.classList.remove('active');
      this.panel.classList.remove('active');
      // Restore moved element if we moved one in
      if (this.movedEl && this.srcEl && this.srcElParent) {
        try {
          if (this.srcElNext && this.srcElNext.parentNode === this.srcElParent) {
            this.srcElParent.insertBefore(this.srcEl, this.srcElNext);
          } else {
            this.srcElParent.appendChild(this.srcEl);
          }
          this.srcEl.classList.remove('hidden');
          this.srcEl.style.display = '';
        } catch(_) {}
      }
      this.srcEl = null;
      this.srcElParent = null;
      this.srcElNext = null;
      this.movedEl = false;
      this.content.innerHTML = '';
      if (this.scope) this.scope.cleanup(); else document.removeEventListener('keydown', this.boundEsc);
      try { document.body.style.overflow = ''; } catch(_) {}
      if (window.AppState && typeof AppState.setState === 'function') {
        AppState.setState('ui.activeSlideout', null);
      }
    }
  }

  // Singleton export
  window.SlideOutPanel = new SlideOut();
})();
