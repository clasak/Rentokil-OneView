/**
 * Route Scout Router
 * src/modules/route_scout/router.js
 * 
 * Simple hash-based router for SPA navigation
 */

export function createRouter(routes) {
  if (!routes || typeof routes !== 'object') {
    throw new Error('[RouteScout Router] Routes object is required');
  }

  function parseHash() {
    const hash = window.location.hash.slice(1) || 'home'; // Remove '#'
    const parts = hash.split('/');
    const routeName = parts[0];
    const params = parts.slice(1);
    
    return { routeName, params };
  }

  function handleRoute() {
    const { routeName, params } = parseHash();
    
    if (routes[routeName]) {
      // Route with parameters (e.g., appointment/A001)
      routes[routeName](...params);
    } else {
      // Fallback to home
      console.warn('[RouteScout Router] Unknown route:', routeName);
      window.location.hash = '#home';
    }
  }

  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);

  // Handle initial route
  handleRoute();

  // Return cleanup function
  return () => {
    window.removeEventListener('hashchange', handleRoute);
  };
}
