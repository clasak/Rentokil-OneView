/**
 * Route & Prospect Scout - Main Entry Point
 * src/modules/route_scout/app.js
 */

import { createRouter } from './router.js';
import { createState } from './state.js';
import { NavBarAPI } from './components/NavBar.js';
import { TopBar } from './components/TopBar.js';
import { Toast } from './components/Toast.js';
import { HomeView } from './views/HomeView.js';
import { MapView } from './views/MapView.js';
import { AppointmentDetailView } from './views/AppointmentDetailView.js';
import { RouteDetailView } from './views/RouteDetailView.js';

/**
 * Mount Route Scout into a container element
 * @param {HTMLElement} el - Container element
 * @param {object} options - { currentUser: { id, email, name } }
 */
function mount(el, options = {}) {
  if (!el) {
    console.error('[RouteScout] No container element provided');
    return;
  }

  if (!options.currentUser || !options.currentUser.email) {
    console.error('[RouteScout] currentUser with email is required');
    return;
  }

  // Create app shell
  el.innerHTML = `
    <div class="rs-app">
      <div class="rs-topbar"></div>
      <div class="rs-content"></div>
      <div class="rs-bottomnav"></div>
      <div class="rs-toast"></div>
    </div>
  `;

  // Initialize state
  const state = createState({ currentUser: options.currentUser });

  // Initialize components
  const topBarEl = el.querySelector('.rs-topbar');
  const contentEl = el.querySelector('.rs-content');
  const navEl = el.querySelector('.rs-bottomnav');
  const toastEl = el.querySelector('.rs-toast');

  // Mount TopBar
  topBarEl.innerHTML = TopBar();

  // Mount NavBar
  navEl.innerHTML = NavBarAPI.render();

  // Toast instance
  const toastAPI = Toast(toastEl);

  // Navigate function
  const navigate = (hash) => {
    if (!hash.startsWith('#')) hash = '#' + hash;
    window.location.hash = hash;
  };

  // Define routes
  const routes = {
    home: () => {
      contentEl.innerHTML = '';
      state.load().then(() => {
        contentEl.innerHTML = HomeView({ state, navigate, toast: toastAPI });
        NavBarAPI.setActiveFromHash();
      });
    },
    
    map: () => {
      contentEl.innerHTML = '';
      state.load().then(() => {
        contentEl.innerHTML = MapView({ state, navigate, toast: toastAPI });
        NavBarAPI.setActiveFromHash();
      });
    },
    
    appointment: (id) => {
      contentEl.innerHTML = '';
      state.load().then(() => {
        contentEl.innerHTML = AppointmentDetailView({ state, navigate, toast: toastAPI, id });
        NavBarAPI.setActiveFromHash();
      });
    },
    
    route: () => {
      contentEl.innerHTML = '';
      contentEl.innerHTML = RouteDetailView({ state, navigate, toast: toastAPI });
      NavBarAPI.setActiveFromHash();
    },
    
    more: () => {
      contentEl.innerHTML = `
        <div class="rs-view rs-more-view">
          <div class="rs-empty-state">
            <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">More Features Coming Soon</h3>
            <p class="text-gray-600">Settings, Reports, and Analytics will be available here.</p>
          </div>
        </div>
      `;
      NavBarAPI.setActiveFromHash();
    }
  };

  // Initialize router
  createRouter(routes);

  // Initial route
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#home';
  }

  console.log('[RouteScout] Mounted successfully for user:', options.currentUser.email);
}

// Export as global for dashboard integration
if (typeof window !== 'undefined') {
  window.RouteScout = { mount };
}

export { mount };
