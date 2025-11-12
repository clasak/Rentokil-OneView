/**
 * Route Scout API Layer
 * src/modules/route_scout/api.js
 * 
 * Currently uses stub data. Replace with real backend calls when ready.
 */

// Sample data for demo/development
const SAMPLE_APPOINTMENTS = [
  {
    id: 'A001',
    date: new Date().toISOString().split('T')[0],
    time: '9:00 AM',
    name: 'ACME Foods',
    address: '123 Main St, Houston, TX 77002',
    city: 'Houston',
    state: 'TX',
    zip: '77002',
    lat: 29.7604,
    lng: -95.3698,
    vertical: 'Restaurant',
    type: 'Initial',
    status: 'Scheduled',
    notes: 'Rodent issue in kitchen area'
  },
  {
    id: 'A002',
    date: new Date().toISOString().split('T')[0],
    time: '11:00 AM',
    name: 'Sunset Apartments',
    address: '456 Oak Ave, Houston, TX 77004',
    city: 'Houston',
    state: 'TX',
    zip: '77004',
    lat: 29.7304,
    lng: -95.3498,
    vertical: 'Property Management',
    type: 'Follow-up',
    status: 'Scheduled',
    notes: 'Monthly service - pool area'
  },
  {
    id: 'A003',
    date: new Date().toISOString().split('T')[0],
    time: '2:00 PM',
    name: 'Downtown Clinic',
    address: '789 Medical Center Dr, Houston, TX 77030',
    city: 'Houston',
    state: 'TX',
    zip: '77030',
    lat: 29.7054,
    lng: -95.3998,
    vertical: 'Medical/MedSpa',
    type: 'Initial',
    status: 'Scheduled',
    notes: 'Cockroach sighting near reception'
  }
];

const SAMPLE_PROSPECTS = [
  {
    id: 'P001',
    name: 'Green Valley Restaurant',
    address: '234 Green St, Houston, TX 77002',
    city: 'Houston',
    state: 'TX',
    zip: '77002',
    lat: 29.7614,
    lng: -95.3688,
    vertical: 'Restaurant',
    phone: '(713) 555-0101',
    email: 'manager@greenvalley.com',
    source: 'Cold Call',
    score: 85,
    status: 'New',
    notes: 'High-end dining, 200 seats'
  },
  {
    id: 'P002',
    name: 'Riverside Apartments',
    address: '567 River Rd, Houston, TX 77004',
    city: 'Houston',
    state: 'TX',
    zip: '77004',
    lat: 29.7324,
    lng: -95.3478,
    vertical: 'Property Management',
    phone: '(713) 555-0102',
    email: 'mgmt@riverside.com',
    source: 'Referral',
    score: 92,
    status: 'Contacted',
    notes: '150 units, current contract expires Q2'
  },
  {
    id: 'P003',
    name: 'Houston Wellness Center',
    address: '890 Health Plaza, Houston, TX 77030',
    city: 'Houston',
    state: 'TX',
    zip: '77030',
    lat: 29.7074,
    lng: -95.3978,
    vertical: 'Medical/MedSpa',
    phone: '(713) 555-0103',
    email: 'admin@houstonclinic.com',
    source: 'Website',
    score: 78,
    status: 'Qualified',
    notes: 'Interested in quarterly service'
  },
  {
    id: 'P004',
    name: 'Bayou Bistro',
    address: '345 Bayou Blvd, Houston, TX 77002',
    city: 'Houston',
    state: 'TX',
    zip: '77002',
    lat: 29.7594,
    lng: -95.3708,
    vertical: 'Restaurant',
    phone: '(713) 555-0104',
    email: 'owner@bayoubistro.com',
    source: 'Cold Call',
    score: 70,
    status: 'New',
    notes: 'Casual dining, outdoor seating'
  },
  {
    id: 'P005',
    name: 'Parkside Condos',
    address: '678 Park Lane, Houston, TX 77004',
    city: 'Houston',
    state: 'TX',
    zip: '77004',
    lat: 29.7284,
    lng: -95.3518,
    vertical: 'Property Management',
    phone: '(713) 555-0105',
    email: 'hoa@parkside.com',
    source: 'Referral',
    score: 88,
    status: 'Proposal Sent',
    notes: '75 units, pest issues reported'
  }
];

/**
 * List appointments for a user on a specific date
 * @param {string} date - YYYY-MM-DD format
 * @param {object} currentUser - { email, name, id }
 * @returns {Promise<Array>} appointments
 */
async function listAppointments(date, currentUser) {
  // TODO: Replace with real API call
  // return fetch(`/api/route_scout/appointments?date=${date}&user=${currentUser.email}`)
  //   .then(res => res.json());
  
  // Stub: Return sample data filtered by date
  return new Promise((resolve) => {
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const appointments = SAMPLE_APPOINTMENTS.filter(a => a.date === date || date === today);
      resolve(appointments);
    }, 300); // Simulate network delay
  });
}

/**
 * List prospects for a user, optionally filtered by verticals
 * @param {Array<string>} verticals - Optional filter ['Restaurant', 'Medical/MedSpa', etc.]
 * @param {object} currentUser - { email, name, id }
 * @returns {Promise<Array>} prospects
 */
async function listProspects(verticals, currentUser) {
  // TODO: Replace with real API call
  // const params = new URLSearchParams({ owner: currentUser.email });
  // if (verticals && verticals.length) {
  //   params.append('verticals', verticals.join(','));
  // }
  // return fetch(`/api/route_scout/prospects?${params}`)
  //   .then(res => res.json());
  
  // Stub: Return sample data filtered by verticals
  return new Promise((resolve) => {
    setTimeout(() => {
      let prospects = [...SAMPLE_PROSPECTS];
      
      if (verticals && verticals.length > 0) {
        const verticalSet = new Set(verticals.map(v => v.toLowerCase()));
        prospects = prospects.filter(p => verticalSet.has(p.vertical.toLowerCase()));
      }
      
      resolve(prospects);
    }, 300);
  });
}

/**
 * Optimize route order (currently returns stops unchanged)
 * @param {Array} stops - Array of { id, kind, name, address, lat, lng, time }
 * @returns {Promise<Array>} optimized stops
 */
async function optimizeRoute(stops) {
  // TODO: Implement real optimization using Google Maps Directions API or similar
  // POST /api/route_scout/optimize
  // Body: { stops: [...] }
  // Response: { optimized: [...], totalMiles, totalMinutes }
  
  // Stub: Simple nearest-neighbor optimization
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!stops || stops.length <= 2) {
        resolve(stops.map((s, i) => ({ ...s, order: i })));
        return;
      }

      // Separate appointments (must keep time order) from prospects
      const appointments = stops.filter(s => s.kind === 'appointment').sort((a, b) => {
        const timeA = (a.time || '').replace(/[^0-9]/g, '');
        const timeB = (b.time || '').replace(/[^0-9]/g, '');
        return timeA.localeCompare(timeB);
      });

      const prospects = stops.filter(s => s.kind === 'prospect');

      // Simple interleaving for demo
      const optimized = [];
      let aIdx = 0, pIdx = 0;
      
      while (aIdx < appointments.length || pIdx < prospects.length) {
        if (aIdx < appointments.length) {
          optimized.push({ ...appointments[aIdx], order: optimized.length });
          aIdx++;
        }
        if (pIdx < prospects.length && prospects.length > 0) {
          optimized.push({ ...prospects[pIdx], order: optimized.length });
          pIdx++;
        }
      }

      resolve(optimized);
    }, 500);
  });
}

/**
 * Save route to backend
 * @param {object} route - { date, name, stops }
 * @param {object} currentUser - { email, name, id }
 * @returns {Promise<object>} { success: true, id: 'r-123' }
 */
async function saveRoute(route, currentUser) {
  // TODO: Replace with real API call
  // return fetch('/api/route_scout/routes', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ route, currentUser })
  // }).then(res => res.json());
  
  // Stub: Return success with fake ID
  return new Promise((resolve) => {
    setTimeout(() => {
      const routeId = 'R-' + Date.now();
      console.log('[RouteScout API] Saved route:', { routeId, route, currentUser });
      resolve({ 
        success: true, 
        routeId: routeId,
        stopCount: route.stops.length,
        message: 'Route saved successfully' 
      });
    }, 500);
  });
}

/**
 * Search prospects near a location
 * @param {object} anchor - { lat, lng, name }
 * @param {number} radiusMiles - Search radius
 * @param {Array<string>} verticals - Optional vertical filter
 * @param {object} currentUser
 * @returns {Promise<Array>} prospects within radius
 */
async function searchProspectsNear(anchor, radiusMiles, verticals, currentUser) {
  // TODO: Replace with real API call with geospatial query
  // return fetch(`/api/route_scout/prospects/nearby?lat=${anchor.lat}&lng=${anchor.lng}&radius=${radiusMiles}`)
  //   .then(res => res.json());
  
  // Stub: Filter prospects by distance
  return new Promise((resolve) => {
    setTimeout(async () => {
      const allProspects = await listProspects(verticals, currentUser);
      
      const results = allProspects
        .map(p => {
          const distance = calculateDistance(anchor.lat, anchor.lng, p.lat, p.lng);
          return { ...p, distanceMiles: distance };
        })
        .filter(p => p.distanceMiles <= radiusMiles)
        .sort((a, b) => a.distanceMiles - b.distanceMiles);
      
      resolve(results);
    }, 400);
  });
}

/**
 * Calculate distance between two lat/lng points (Haversine formula)
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

export const api = {
  listAppointments,
  listProspects,
  optimizeRoute,
  saveRoute,
  searchProspectsNear
};
