export const TopBar = () => {
  const el = document.createElement('div');
  el.className = 'rs-topbar';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'space-between';
  el.style.padding = '8px 12px';
  el.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
  el.style.background = '#0f172a0d';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <button id="rs-back-btn" aria-label="Back" title="Back" style="
        display:inline-flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:6px;border:1px solid rgba(0,0,0,0.15);
        background:#ffffff; color:#334155; cursor:pointer;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
      </button>
      <span style="width:20px;height:20px;border-radius:4px;background:#17315f;display:inline-block"></span>
      <span class="rs-topbar-title" style="font-weight:600;color:#0f172a">Route & Prospect Scout</span>
    </div>
    <div class="rs-avatar" style="width:28px;height:28px;border-radius:50%;background:#17315f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px">DU</div>
  `;

  const backBtn = el.querySelector('#rs-back-btn');

  const setBackVisibility = () => {
    const hash = window.location.hash || '#home';
    const onHome = hash === '#home' || hash === '';
    backBtn.style.visibility = onHome ? 'hidden' : 'visible';
  };

  const goBack = () => {
    if (window.RouteScout && typeof window.RouteScout.back === 'function') {
      window.RouteScout.back();
      return;
    }
    // Fallback to home if API not present
    window.location.hash = 'home';
  };

  backBtn.addEventListener('click', goBack);
  window.addEventListener('hashchange', setBackVisibility);
  setBackVisibility();

  return el;
};
