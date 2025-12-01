import { createRouter, back } from './router.js';
import { createState } from './state.js';
import { HomeView } from './views/HomeView.js';
import { MapView } from './views/MapView.js';
import { AppointmentDetailView } from './views/AppointmentDetailView.js';
import { RouteDetailView } from './views/RouteDetailView.js';
import { NavBarAPI } from './components/NavBar.js';
import { TopBar } from './components/TopBar.js';
import { Toast } from './components/Toast.js';

const mount = (el, options = {}) => {
  const { currentUser = null } = options;
  if (!currentUser || !currentUser.email) {
    console.error('[RouteScout] currentUser with email is required');
    return;
  }

  const root = el || document.getElementById('route-scout-root');
  if (!root) {
    console.error('[RouteScout] No container element found');
    return;
  }

  // Create app shell
  root.innerHTML = `
    <div class="rs-app">
      <div class="rs-topbar"></div>
      <div class="rs-content"></div>
      <div class="rs-bottomnav"></div>
    </div>
  `;

  // Mount Toast to DOM
  if (!document.querySelector('.rs-toast')) {
    document.body.appendChild(Toast.el);
  }

  const topBarEl = root.querySelector('.rs-topbar');
  const contentEl = root.querySelector('.rs-content');
  const navEl = root.querySelector('.rs-bottomnav');

  // Mount TopBar
  const topBar = TopBar();
  topBarEl.appendChild(topBar);

  // Mount NavBar - render as HTML string
  navEl.innerHTML = `
    <nav class="rs-bottomnav" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 8px;">
      <a href="#home" class="rs-nav-item" data-route="home" style="text-align: center; padding: 10px 6px; color: #9ca3af; text-decoration: none; display: flex; flex-direction: column; align-items: center;">
        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
        <span style="font-size: 12px; margin-top: 4px;">Home</span>
      </a>
      <a href="#map" class="rs-nav-item" data-route="map" style="text-align: center; padding: 10px 6px; color: #9ca3af; text-decoration: none; display: flex; flex-direction: column; align-items: center;">
        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <span style="font-size: 12px; margin-top: 4px;">Map</span>
      </a>
      <a href="#route" class="rs-nav-item" data-route="route" style="text-align: center; padding: 10px 6px; color: #9ca3af; text-decoration: none; display: flex; flex-direction: column; align-items: center;">
        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <span style="font-size: 12px; margin-top: 4px;">Route</span>
      </a>
      <a href="#more" class="rs-nav-item" data-route="more" style="text-align: center; padding: 10px 6px; color: #9ca3af; text-decoration: none; display: flex; flex-direction: column; align-items: center;">
        <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
        </svg>
        <span style="font-size: 12px; margin-top: 4px;">More</span>
      </a>
    </nav>
  `;

  // Initialize state
  const state = createState({ currentUser });

  // Navigate function
  const navigate = (hash) => {
    if (!hash.startsWith('#')) hash = '#' + hash;
    window.location.hash = hash;
  };

  // Define routes
  const routes = {
    home: () => {
      contentEl.innerHTML = '<div style="padding: 20px; text-align: center;">Loading...</div>';
      state.load().then(() => {
        const view = HomeView({ state, navigate, toast: Toast });
        contentEl.innerHTML = '';
        contentEl.appendChild(view);
        NavBarAPI.setActiveFromHash();
      });
    },

    map: () => {
      contentEl.innerHTML = '<div style="padding: 20px; text-align: center;">Loading...</div>';
      state.load().then(() => {
        const view = MapView({ state, navigate, toast: Toast });
        contentEl.innerHTML = '';
        contentEl.appendChild(view);
        NavBarAPI.setActiveFromHash();
      });
    },

    appointment: (id) => {
      contentEl.innerHTML = '<div style="padding: 20px; text-align: center;">Loading...</div>';
      state.load().then(() => {
        const view = AppointmentDetailView({ state, navigate, toast: Toast, id });
        contentEl.innerHTML = '';
        contentEl.appendChild(view);
        NavBarAPI.setActiveFromHash();
      });
    },

    route: () => {
      const view = RouteDetailView({ state, navigate, toast: Toast });
      contentEl.innerHTML = '';
      contentEl.appendChild(view);
      NavBarAPI.setActiveFromHash();
    },

    more: () => {
      contentEl.innerHTML = `
        <div class="rs-view rs-more-view" style="display: flex; align-items: center; justify-content: center; min-height: 400px; padding: 20px;">
          <div style="text-align: center;">
            <svg style="width: 64px; height: 64px; color: #9ca3af; margin: 0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 style="font-size: 18px; font-weight: 600; color: #e5e7eb; margin-bottom: 8px;">More Features Coming Soon</h3>
            <p style="color: #9ca3af;">Settings, Reports, and Analytics will be available here.</p>
          </div>
        </div>
      `;
      NavBarAPI.setActiveFromHash();
    }
  };

  // Initialize router
  const router = createRouter(routes);

  // Expose back navigation
  window.RouteScout = window.RouteScout || {};
  window.RouteScout.back = back;
  window.RouteScout.mount = mount;

  // Initial route
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#home';
  }

  console.log('[RouteScout] Mounted successfully for user:', options.currentUser.email);
};

// Export as global for dashboard integration
if (typeof window !== 'undefined') {
  window.RouteScout = window.RouteScout || {};
  window.RouteScout.mount = mount;
}

// Auto-mount when standalone page is loaded
if (document.getElementById('route-scout-root')) {
  // Get current user from session or default
  const currentUser = {
    id: 'demo-user',
    email: 'demo@rentokil.com',
    name: 'Demo User'
  };
  mount(document.getElementById('route-scout-root'), { currentUser });
}

export { mount };
