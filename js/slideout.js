;(function initSlideOut(global) {
  const root = global.OneView = global.OneView || {};
  const log = root.logUserAction || (() => Promise.resolve(false));
  const events = root.events || global.EventRegistry || null;

  const STYLE_ID = 'slideout-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
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
    document.head.appendChild(style);
  }

  /**
   * Slide-out presenter singleton.
   */
  class SlideOut {
    constructor() {
      injectStyles();
      this.baseScope = events ? events.createScope('SlideOutBase') : null;
      this.runtimeScope = null;

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

      this.boundEsc = (event) => {
        if (event.key === 'Escape') this.close();
      };
      this.boundOverlay = () => this.close();

      if (this.baseScope) {
        this.baseScope.addEvent(this.closeBtn, 'click', () => this.close());
        this.baseScope.addEvent(this.overlay, 'click', this.boundOverlay);
      } else {
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', this.boundOverlay);
      }
    }

    /**
     * Updates title region.
     * @param {string} text
     */
    setTitle(text) {
      this.titleEl.textContent = text || '';
    }

    /**
     * Replace footer node.
     * @param {Node|null} node
     */
    setFooter(node) {
      this.footer.innerHTML = '';
      if (node) this.footer.appendChild(node);
    }

    /**
     * Replace main content.
     * @param {Node|string} nodeOrHtml
     */
    setContent(nodeOrHtml) {
      this.content.innerHTML = '';
      if (typeof nodeOrHtml === 'string') {
        this.content.innerHTML = nodeOrHtml;
      } else if (nodeOrHtml instanceof Node) {
        this.content.appendChild(nodeOrHtml);
      }
    }

    /**
     * Update drawer position.
     * @param {'left'|'right'} pos
     */
    setPosition(pos) {
      if (pos === 'left') {
        this.panel.classList.add('left');
      } else {
        this.panel.classList.remove('left');
      }
    }

    /**
     * Mounts an existing DOM node into the panel.
     * @param {Element|string} elOrId
     * @param {{title?: string, position?: 'left'|'right'}} [opts]
     */
    openFromElement(elOrId, opts = {}) {
      const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
      if (!el) {
        log('SlideOut.open_missing_element', { id: elOrId }, { level: 'warn' });
        this.open('<p>Panel not available.</p>', opts);
        return;
      }
      this.srcEl = el;
      this.srcElParent = el.parentNode;
      this.srcElNext = el.nextSibling;
      this.movedEl = true;
      this.open('', opts);
      try {
        this.content.appendChild(el);
        el.classList.remove('hidden');
        el.style.display = '';
      } catch (error) {
        log('SlideOut.mount_error', { error }, { level: 'warn' });
      }
    }

    /**
     * Open panel with provided content.
     * @param {Node|string} content
     * @param {{title?: string, position?: 'left'|'right'}} [opts]
     */
    open(content, opts = {}) {
      const { title, position } = opts;
      this.setTitle(title || '');
      this.setPosition(position || 'right');
      this.setContent(content);

      if (this.runtimeScope) {
        this.runtimeScope.cleanup();
      }
      this.runtimeScope = events ? events.createScope('SlideOutRuntime') : null;

      this.overlay.classList.add('active');
      this.panel.classList.add('active');

      if (this.runtimeScope) {
        this.runtimeScope.addEvent(document, 'keydown', this.boundEsc);
      } else {
        document.addEventListener('keydown', this.boundEsc);
      }

      try {
        document.body.style.overflow = 'hidden';
      } catch (_) {}

      setTimeout(() => {
        const focusables = this.panel.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0] || this.closeBtn;
        try {
          first.focus();
        } catch (_) {}
      }, 0);

      if (global.AppState && typeof global.AppState.setState === 'function') {
        global.AppState.setState('ui.activeSlideout', true);
      }

      log('SlideOut.open', { title: title || '', position: position || 'right' });
    }

    /**
     * Close panel and restore previous DOM location.
     */
    close() {
      this.overlay.classList.remove('active');
      this.panel.classList.remove('active');

      if (this.movedEl && this.srcEl && this.srcElParent) {
        try {
          if (this.srcElNext && this.srcElNext.parentNode === this.srcElParent) {
            this.srcElParent.insertBefore(this.srcEl, this.srcElNext);
          } else {
            this.srcElParent.appendChild(this.srcEl);
          }
          this.srcEl.classList.remove('hidden');
          this.srcEl.style.display = '';
        } catch (error) {
          log('SlideOut.restore_error', { error }, { level: 'warn' });
        }
      }

      this.srcEl = null;
      this.srcElParent = null;
      this.srcElNext = null;
      this.movedEl = false;
      this.content.innerHTML = '';

      if (this.runtimeScope) {
        this.runtimeScope.cleanup();
        this.runtimeScope = null;
      } else {
        document.removeEventListener('keydown', this.boundEsc);
      }

      try {
        document.body.style.overflow = '';
      } catch (_) {}

      if (global.AppState && typeof global.AppState.setState === 'function') {
        global.AppState.setState('ui.activeSlideout', null);
      }

      log('SlideOut.close');
    }
  }

  const slideOut = new SlideOut();

  root.UI = root.UI || {};
  root.UI.slideOut = slideOut;
  global.SlideOutPanel = slideOut;
})(window);
