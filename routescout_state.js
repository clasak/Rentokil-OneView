/**
 * Route Scout State Management
 * src/modules/route_scout/state.js
 */

import { api } from './api.js';

/**
 * Create state manager for Route Scout
 * @param {object} config - { currentUser }
 * @returns {object} state manager
 */
export function createState(config) {
  if (!config || !config.currentUser) {
    throw new Error('[RouteScout State] currentUser is required');
  }

  // Internal state
  const state = {
    currentUser: config.currentUser,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    verticals: loadVerticals(),
    anchor: null, // { lat, lng, name, radiusMiles }
    appointments: [],
    prospects: [],
    route: {
      date: new Date().toISOString().split('T')[0],
      name: '',
      stops: [] // { id, kind, name, address, lat, lng, time, notes, order }
    }
  };

  // Load verticals from sessionStorage
  function loadVerticals() {
    try {
      const stored = sessionStorage.getItem('rs.verticals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Save verticals to sessionStorage
  function saveVerticals(verticals) {
    try {
      sessionStorage.setItem('rs.verticals', JSON.stringify(verticals));
    } catch (e) {
      console.error('[RouteScout State] Failed to save verticals', e);
    }
  }

  /**
   * Load appointments and prospects
   */
  async function load() {
    try {
      // Load appointments for current date
      state.appointments = await api.listAppointments(state.date, state.currentUser);
      
      // Load prospects filtered by verticals
      state.prospects = await api.listProspects(state.verticals, state.currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('[RouteScout State] Error loading data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set active date
   * @param {string} date - YYYY-MM-DD
   */
  function setDate(date) {
    state.date = date;
    state.route.date = date;
  }

  /**
   * Set vertical filters
   * @param {Array<string>} verticals
   */
  function setVerticals(verticals) {
    state.verticals = verticals;
    saveVerticals(verticals);
  }

  /**
   * Set anchor for prospect search
   * @param {object} anchor - { lat, lng, name, radiusMiles }
   */
  function setAnchor(anchor) {
    state.anchor = anchor;
  }

  /**
   * Add a stop to the route
   * @param {object} stop - { id, kind, name, address, lat, lng, time?, notes? }
   */
  function addToRoute(stop) {
    // Check if already in route
    const exists = state.route.stops.find(s => s.id === stop.id && s.kind === stop.kind);
    if (exists) {
      console.warn('[RouteScout State] Stop already in route:', stop.id);
      return false;
    }

    // Add stop
    state.route.stops.push({
      id: stop.id,
      kind: stop.kind,
      name: stop.name,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      time: stop.time || '',
      notes: stop.notes || '',
      order: state.route.stops.length
    });

    return true;
  }

  /**
   * Remove a stop from the route
   * @param {string} id - Stop ID
   */
  function removeFromRoute(id) {
    const index = state.route.stops.findIndex(s => s.id === id);
    if (index !== -1) {
      state.route.stops.splice(index, 1);
      // Re-order remaining stops
      state.route.stops.forEach((s, i) => {
        s.order = i;
      });
      return true;
    }
    return false;
  }

  /**
   * Clear all stops from route
   */
  function clearRoute() {
    state.route.stops = [];
  }

  /**
   * Optimize route order
   */
  async function optimizeRoute() {
    try {
      const optimized = await api.optimizeRoute(state.route.stops);
      state.route.stops = optimized;
      return { success: true };
    } catch (error) {
      console.error('[RouteScout State] Error optimizing route:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save route to backend
   */
  async function saveRoute() {
    try {
      const result = await api.saveRoute(state.route, state.currentUser);
      if (result.success) {
        // Clear route after saving
        state.route.stops = [];
      }
      return result;
    } catch (error) {
      console.error('[RouteScout State] Error saving route:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get appointment by ID
   * @param {string} id
   * @returns {object|null}
   */
  function getAppointment(id) {
    return state.appointments.find(a => a.id === id) || null;
  }

  /**
   * Get prospect by ID
   * @param {string} id
   * @returns {object|null}
   */
  function getProspect(id) {
    return state.prospects.find(p => p.id === id) || null;
  }

  /**
   * Search prospects near a location
   * @param {object} location - { lat, lng }
   * @param {number} radiusMiles
   * @returns {Array}
   */
  function getProspectsNear(location, radiusMiles) {
    if (!location || !location.lat || !location.lng) {
      return state.prospects;
    }

    // Filter prospects within radius (simple distance calculation)
    return state.prospects.filter(p => {
      const distance = calculateDistance(location.lat, location.lng, p.lat, p.lng);
      return distance <= radiusMiles;
    }).sort((a, b) => {
      const distA = calculateDistance(location.lat, location.lng, a.lat, a.lng);
      const distB = calculateDistance(location.lat, location.lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @returns {number} distance in miles
   */
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Public API
  return {
    state,
    load,
    setDate,
    setVerticals,
    setAnchor,
    addToRoute,
    removeFromRoute,
    clearRoute,
    optimizeRoute,
    saveRoute,
    getAppointment,
    getProspect,
    getProspectsNear
  };
}
