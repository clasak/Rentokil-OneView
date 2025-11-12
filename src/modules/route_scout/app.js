import { initRouter, navigate, back } from './router.js';
import { createState } from './state.js';
import { HomeView } from './views/HomeView.js';
import { MapView } from './views/MapView.js';
import { AppointmentDetailView } from './views/AppointmentDetailView.js';
import { RouteDetailView } from './views/RouteDetailView.js';
import { NavBar, NavBarAPI } from './components/NavBar.js';
import { TopBar } from './components/TopBar.js';
import { Toast } from './components/Toast.js';
import { registerSW } from './pwa.js';

const mount = (el, options = {}) => {
  const { currentUser = null } = options;
  const root = el || document.getElementById('route-scout-root');
  root.innerHTML = '';

  const app = document.createElement('div');
  app.className = 'rs-app';

  const topbar = TopBar();
  const content = document.createElement('div');
  content.className = 'rs-content';
  const navbar = NavBar({
    onNav: (tab) => {
      if (tab === 'home') navigate('home');
      if (tab === 'map') navigate('map');
      if (tab === 'route') navigate('route');
      if (tab === 'more') alert('Coming soon');
    },
  });

  app.appendChild(topbar);
  app.appendChild(content);
  app.appendChild(navbar);
  app.appendChild(Toast.el);
  root.appendChild(app);

  const state = createState({ currentUser });

  const routes = {
    home: () => HomeView({ state, navigate }),
    map: () => MapView({ state, navigate }),
    appointment: (params) => AppointmentDetailView({ state, navigate, id: params.id }),
    route: () => RouteDetailView({ state, navigate }),
  };

  // Ensure state is loaded before first render to satisfy view requirements
  state.load().then(() => {
    initRouter({
      mount: (comp) => {
        content.innerHTML = '';
        content.appendChild(comp);
        NavBarAPI.setActiveFromHash();
      },
      routes,
    });
  });

  registerSW();
};

// Expose a mount function and back control for embedding into dashboard shells
window.RouteScout = { mount, back };

// Auto-mount when standalone page is loaded
if (document.getElementById('route-scout-root')) {
  mount();
}
