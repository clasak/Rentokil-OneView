/**
 * =================================================================================
 * ROUTE SCOUT API - Add to Code.gs
 * =================================================================================
 * Backend APIs for Route & Prospect Scout module
 * Provides appointment management, prospect search, route optimization
 */

// --- Route Scout Sheet Names ---
const ROUTE_SCOUT_SHEETS = {
  APPOINTMENTS: "RouteScout_Appointments",
  PROSPECTS: "RouteScout_Prospects", 
  ROUTES: "RouteScout_Routes",
  ROUTE_STOPS: "RouteScout_RouteStops"
};

// --- Route Scout Database Schema ---
const ROUTE_SCOUT_SCHEMA = {
  [ROUTE_SCOUT_SHEETS.APPOINTMENTS]: [
    "AppointmentID","UserEmail","Date","Time","CustomerName","Address","City",
    "State","ZIP","Lat","Lng","Vertical","Type","Status","Notes","CreatedOn","UpdatedOn"
  ],
  [ROUTE_SCOUT_SHEETS.PROSPECTS]: [
    "ProspectID","UserEmail","Name","Address","City","State","ZIP","Lat","Lng",
    "Vertical","Phone","Email","Source","Score","Status","Notes","CreatedOn","UpdatedOn"
  ],
  [ROUTE_SCOUT_SHEETS.ROUTES]: [
    "RouteID","UserEmail","Date","Name","Status","StopCount","TotalMiles",
    "EstimatedMinutes","CreatedOn","UpdatedOn"
  ],
  [ROUTE_SCOUT_SHEETS.ROUTE_STOPS]: [
    "StopID","RouteID","StopOrder","Kind","ReferenceID","Name","Address",
    "Lat","Lng","TimeWindow","Notes","CreatedOn"
  ]
};

/**
 * Initialize Route Scout sheets with proper schema
 */
function initializeRouteScout() {
  Object.keys(ROUTE_SCOUT_SCHEMA).forEach(sheetName => {
    ensureSheet_(sheetName, ROUTE_SCOUT_SCHEMA[sheetName]);
  });
  logUserAction('initializeRouteScout', 'Route Scout database initialized');
  return { success: true, message: 'Route Scout initialized' };
}

/**
 * List appointments for a user on a specific date
 * @param {string} date - YYYY-MM-DD format
 * @param {object} currentUser - { email, name, id }
 * @returns {Array} appointments
 */
function listAppointments(date, currentUser) {
  try {
    const sh = ensureSheet_(ROUTE_SCOUT_SHEETS.APPOINTMENTS, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.APPOINTMENTS]);
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    const idx = name => headers.indexOf(name);
    
    const targetDate = new Date(date);
    const dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    return rows
      .filter(r => {
        const rowEmail = String(r[idx('UserEmail')] || '').toLowerCase();
        const rowDate = r[idx('Date')] ? Utilities.formatDate(new Date(r[idx('Date')]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
        return rowEmail === currentUser.email.toLowerCase() && rowDate === dateStr;
      })
      .map(r => ({
        id: String(r[idx('AppointmentID')] || ''),
        date: r[idx('Date')] ? Utilities.formatDate(new Date(r[idx('Date')]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        time: String(r[idx('Time')] || ''),
        name: String(r[idx('CustomerName')] || ''),
        address: String(r[idx('Address')] || ''),
        city: String(r[idx('City')] || ''),
        state: String(r[idx('State')] || ''),
        zip: String(r[idx('ZIP')] || ''),
        lat: Number(r[idx('Lat')] || 0),
        lng: Number(r[idx('Lng')] || 0),
        vertical: String(r[idx('Vertical')] || ''),
        type: String(r[idx('Type')] || 'Initial'),
        status: String(r[idx('Status')] || 'Scheduled'),
        notes: String(r[idx('Notes')] || '')
      }))
      .sort((a, b) => {
        const timeA = a.time.replace(/[^0-9]/g, '');
        const timeB = b.time.replace(/[^0-9]/g, '');
        return timeA.localeCompare(timeB);
      });
  } catch (error) {
    Logger.log('Error in listAppointments: ' + error.toString());
    return [];
  }
}

/**
 * List prospects for a user, optionally filtered by verticals
 * @param {Array<string>} verticals - Optional filter
 * @param {object} currentUser - { email, name, id }
 * @returns {Array} prospects
 */
function listProspects(verticals, currentUser) {
  try {
    const sh = ensureSheet_(ROUTE_SCOUT_SHEETS.PROSPECTS, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.PROSPECTS]);
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    const idx = name => headers.indexOf(name);
    
    let results = rows
      .filter(r => {
        const rowEmail = String(r[idx('UserEmail')] || '').toLowerCase();
        return rowEmail === currentUser.email.toLowerCase();
      })
      .map(r => ({
        id: String(r[idx('ProspectID')] || ''),
        name: String(r[idx('Name')] || ''),
        address: String(r[idx('Address')] || ''),
        city: String(r[idx('City')] || ''),
        state: String(r[idx('State')] || ''),
        zip: String(r[idx('ZIP')] || ''),
        lat: Number(r[idx('Lat')] || 0),
        lng: Number(r[idx('Lng')] || 0),
        vertical: String(r[idx('Vertical')] || ''),
        phone: String(r[idx('Phone')] || ''),
        email: String(r[idx('Email')] || ''),
        source: String(r[idx('Source')] || ''),
        score: Number(r[idx('Score')] || 0),
        status: String(r[idx('Status')] || 'New'),
        notes: String(r[idx('Notes')] || '')
      }));
    
    // Filter by verticals if provided
    if (verticals && verticals.length > 0) {
      const verticalSet = new Set(verticals.map(v => v.toLowerCase()));
      results = results.filter(p => verticalSet.has(p.vertical.toLowerCase()));
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results;
  } catch (error) {
    Logger.log('Error in listProspects: ' + error.toString());
    return [];
  }
}

/**
 * Search prospects near a location (anchor-based prospecting)
 * @param {object} anchor - { lat, lng, name }
 * @param {number} radiusMiles - Search radius
 * @param {Array<string>} verticals - Optional vertical filter
 * @param {object} currentUser - { email, name, id }
 * @returns {Array} prospects within radius
 */
function searchProspectsNear(anchor, radiusMiles, verticals, currentUser) {
  try {
    const allProspects = listProspects(verticals, currentUser);
    
    if (!anchor || !anchor.lat || !anchor.lng) {
      return allProspects;
    }
    
    // Calculate distance for each prospect
    const results = allProspects
      .map(p => {
        const distance = calculateDistance(anchor.lat, anchor.lng, p.lat, p.lng);
        return { ...p, distanceMiles: distance };
      })
      .filter(p => p.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
    
    return results;
  } catch (error) {
    Logger.log('Error in searchProspectsNear: ' + error.toString());
    return [];
  }
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

/**
 * Optimize route order using nearest-neighbor algorithm
 * @param {Array} stops - Array of { id, lat, lng, kind, name, address, time }
 * @returns {Array} optimized stops with updated order
 */
function optimizeRoute(stops) {
  try {
    if (!stops || stops.length <= 2) {
      return stops.map((s, i) => ({ ...s, order: i }));
    }
    
    // Separate appointments (must keep time order) from prospects
    const appointments = stops.filter(s => s.kind === 'appointment').sort((a, b) => {
      const timeA = (a.time || '').replace(/[^0-9]/g, '');
      const timeB = (b.time || '').replace(/[^0-9]/g, '');
      return timeA.localeCompare(timeB);
    });
    
    const prospects = stops.filter(s => s.kind === 'prospect');
    
    // If only appointments, return in time order
    if (prospects.length === 0) {
      return appointments.map((s, i) => ({ ...s, order: i }));
    }
    
    // Simple nearest-neighbor optimization
    const optimized = [];
    const remaining = [...prospects];
    
    // Start with first appointment or first prospect
    let current = appointments.length > 0 ? appointments[0] : prospects[0];
    if (appointments.length > 0) optimized.push(current);
    else remaining.splice(0, 1);
    
    // Add prospects between appointments using nearest-neighbor
    let apptIndex = appointments.length > 0 ? 1 : 0;
    
    while (remaining.length > 0) {
      // Find nearest prospect to current location
      let nearest = null;
      let minDist = Infinity;
      let nearestIdx = -1;
      
      remaining.forEach((p, idx) => {
        const dist = calculateDistance(current.lat, current.lng, p.lat, p.lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
          nearestIdx = idx;
        }
      });
      
      if (nearest) {
        optimized.push(nearest);
        remaining.splice(nearestIdx, 1);
        current = nearest;
      }
      
      // Insert next appointment if we have one
      if (apptIndex < appointments.length && remaining.length < prospects.length / 2) {
        optimized.push(appointments[apptIndex]);
        current = appointments[apptIndex];
        apptIndex++;
      }
    }
    
    // Add any remaining appointments
    while (apptIndex < appointments.length) {
      optimized.push(appointments[apptIndex]);
      apptIndex++;
    }
    
    return optimized.map((s, i) => ({ ...s, order: i }));
  } catch (error) {
    Logger.log('Error in optimizeRoute: ' + error.toString());
    return stops.map((s, i) => ({ ...s, order: i }));
  }
}

/**
 * Save a route to the database
 * @param {object} route - { date, name, stops }
 * @param {object} currentUser - { email, name, id }
 * @returns {object} { success, routeId }
 */
function saveRoute(route, currentUser) {
  try {
    const routeSh = ensureSheet_(ROUTE_SCOUT_SHEETS.ROUTES, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.ROUTES]);
    const stopsSh = ensureSheet_(ROUTE_SCOUT_SHEETS.ROUTE_STOPS, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.ROUTE_STOPS]);
    
    const routeId = 'R-' + Utilities.getUuid();
    const now = new Date();
    
    // Calculate totals
    const stopCount = route.stops.length;
    let totalMiles = 0;
    for (let i = 0; i < route.stops.length - 1; i++) {
      const s1 = route.stops[i];
      const s2 = route.stops[i + 1];
      totalMiles += calculateDistance(s1.lat, s1.lng, s2.lat, s2.lng);
    }
    
    const estimatedMinutes = Math.ceil(stopCount * 25 + totalMiles * 2); // 25 min per stop + 2 min per mile
    
    // Save route header
    const routeData = [
      routeId,
      currentUser.email,
      route.date,
      route.name || `Route for ${route.date}`,
      'Active',
      stopCount,
      totalMiles.toFixed(1),
      estimatedMinutes,
      now,
      now
    ];
    
    routeSh.appendRow(routeData);
    
    // Save route stops
    route.stops.forEach((stop, index) => {
      const stopData = [
        'S-' + Utilities.getUuid(),
        routeId,
        index,
        stop.kind,
        stop.id,
        stop.name,
        stop.address,
        stop.lat,
        stop.lng,
        stop.time || '',
        stop.notes || '',
        now
      ];
      stopsSh.appendRow(stopData);
    });
    
    logUserAction('saveRoute', `Saved route ${routeId} with ${stopCount} stops`);
    
    return {
      success: true,
      routeId: routeId,
      stopCount: stopCount,
      totalMiles: totalMiles.toFixed(1),
      estimatedMinutes: estimatedMinutes
    };
  } catch (error) {
    Logger.log('Error in saveRoute: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get route details by ID
 * @param {string} routeId
 * @param {object} currentUser
 * @returns {object} route with stops
 */
function getRoute(routeId, currentUser) {
  try {
    const routeSh = ensureSheet_(ROUTE_SCOUT_SHEETS.ROUTES, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.ROUTES]);
    const stopsSh = ensureSheet_(ROUTE_SCOUT_SHEETS.ROUTE_STOPS, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.ROUTE_STOPS]);
    
    // Get route header
    const routeData = routeSh.getDataRange().getValues();
    if (routeData.length <= 1) return null;
    
    const routeHeaders = routeData[0];
    const routeRows = routeData.slice(1);
    const rIdx = name => routeHeaders.indexOf(name);
    
    const routeRow = routeRows.find(r => 
      String(r[rIdx('RouteID')]) === routeId && 
      String(r[rIdx('UserEmail')]).toLowerCase() === currentUser.email.toLowerCase()
    );
    
    if (!routeRow) return null;
    
    // Get route stops
    const stopsData = stopsSh.getDataRange().getValues();
    const stopsHeaders = stopsData[0];
    const stopsRows = stopsData.slice(1);
    const sIdx = name => stopsHeaders.indexOf(name);
    
    const stops = stopsRows
      .filter(r => String(r[sIdx('RouteID')]) === routeId)
      .map(r => ({
        id: String(r[sIdx('StopID')] || ''),
        order: Number(r[sIdx('StopOrder')] || 0),
        kind: String(r[sIdx('Kind')] || ''),
        referenceId: String(r[sIdx('ReferenceID')] || ''),
        name: String(r[sIdx('Name')] || ''),
        address: String(r[sIdx('Address')] || ''),
        lat: Number(r[sIdx('Lat')] || 0),
        lng: Number(r[sIdx('Lng')] || 0),
        timeWindow: String(r[sIdx('TimeWindow')] || ''),
        notes: String(r[sIdx('Notes')] || '')
      }))
      .sort((a, b) => a.order - b.order);
    
    return {
      routeId: routeId,
      date: routeRow[rIdx('Date')] ? Utilities.formatDate(new Date(routeRow[rIdx('Date')]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      name: String(routeRow[rIdx('Name')] || ''),
      status: String(routeRow[rIdx('Status')] || ''),
      stopCount: Number(routeRow[rIdx('StopCount')] || 0),
      totalMiles: Number(routeRow[rIdx('TotalMiles')] || 0),
      estimatedMinutes: Number(routeRow[rIdx('EstimatedMinutes')] || 0),
      stops: stops
    };
  } catch (error) {
    Logger.log('Error in getRoute: ' + error.toString());
    return null;
  }
}

/**
 * Bulk import appointments from CSV or external source
 * @param {Array} appointments - Array of appointment objects
 * @param {object} currentUser
 * @returns {object} { success, imported, errors }
 */
function bulkImportAppointments(appointments, currentUser) {
  try {
    const sh = ensureSheet_(ROUTE_SCOUT_SHEETS.APPOINTMENTS, ROUTE_SCOUT_SCHEMA[ROUTE_SCOUT_SHEETS.APPOINTMENTS]);
    const now = new Date();
    let imported = 0;
    const errors = [];
    
    appointments.forEach((appt, index) => {
      try {
        const apptId = 'A-' + Utilities.getUuid();
        const row = [
          apptId,
          currentUser.email,
          appt.date,
          appt.time || '',
          appt.customerName || '',
          appt.address || '',
          appt.city || '',
          appt.state || '',
          appt.zip || '',
          appt.lat || 0,
          appt.lng || 0,
          appt.vertical || '',
          appt.type || 'Initial',
          appt.status || 'Scheduled',
          appt.notes || '',
          now,
          now
        ];
        sh.appendRow(row);
        imported++;
      } catch (err) {
        errors.push({ index: index, error: err.toString() });
      }
    });
    
    logUserAction('bulkImportAppointments', `Imported ${imported} appointments`);
    
    return {
      success: true,
      imported: imported,
      errors: errors
    };
  } catch (error) {
    Logger.log('Error in bulkImportAppointments: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}
