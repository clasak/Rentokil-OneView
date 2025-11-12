const sampleAppointments = [
  { id: 'a1', name: 'ACME Foods', time: '9:00–10:00 AM', address: '123 Main St, Sugar Land, TX', kind: 'Existing Customer', vertical: 'Restaurant', lat: 29.62, lng: -95.63 },
  { id: 'a2', name: 'Bella’s Bistro', time: '11:00–11:30 AM', address: '45 Market St, Sugar Land, TX', kind: 'Prospect', vertical: 'Restaurant', lat: 29.61, lng: -95.65 },
  { id: 'a3', name: 'MedSpa Luxe', time: '2:00–3:00 PM', address: '88 Wellness Rd, Sugar Land, TX', kind: 'Existing Customer', vertical: 'MedSpa', lat: 29.60, lng: -95.61 }
];

const sampleProspects = [
  { id: 'p1', name: 'Cedar Grill', vertical: 'Restaurant', lat: 29.63, lng: -95.62 },
  { id: 'p2', name: 'Industrial Supply Co', vertical: 'Industrial', lat: 29.59, lng: -95.67 },
  { id: 'p3', name: 'Harmony MedSpa', vertical: 'Medical / MedSpa', lat: 29.58, lng: -95.64 }
];

export const api = {
  async listAppointments(date, currentUser) {
    // TODO (backend): GET /api/route_scout/appointments?date=YYYY-MM-DD&user=<email>
    // - Returns array of appointments for the given user/date
    // - Shape: { id, name, time, address, kind, vertical, lat, lng }
    await delay(100);
    return sampleAppointments;
  },
  async listProspects(verticals, currentUser) {
    // TODO (backend): GET /api/route_scout/prospects?owner=<email>&verticals=comma,separated,list
    // - Returns filtered prospects for the current owner
    // - Shape: { id, name, vertical, lat, lng }
    await delay(100);
    if (!verticals || verticals.length === 0) return sampleProspects;
    return sampleProspects.filter(p => verticals.includes(p.vertical));
  },
  async optimizeRoute(stops) {
    // TODO (backend): POST /api/route_scout/optimize { stops }
    // - Payload: [{ id, kind, name, lat, lng, time? }]
    // - Response: { route, suggestions, warnings, estimatedTime }
    await delay(200);
    const input = Array.isArray(stops) ? stops.slice() : [];
    // Simple scoring: appointments first by time, then prospects by proximity
    const traffic = getTrafficConditions();
    const weather = getWeatherImpact();
    const anchor = input.find(s => s.type === 'appointment') || input[0];
    const scored = input.map(s => ({
      s,
      score: scoreStop(s, anchor, traffic, weather)
    }));
    scored.sort((a,b) => a.score - b.score);
    const route = scored.map(x => x.s);
    const estimatedTime = estimateTravelTime(route, traffic, weather);
    const suggestions = [];
    if (weather.alert) suggestions.push('Weather may impact travel time. Leave buffer.');
    if (traffic.level === 'high') suggestions.push('Peak traffic detected. Consider reordering afternoon stops.');
    const warnings = [];
    return { route, suggestions, warnings, estimatedTime };
  },
  async saveRoute(route) {
    // TODO (backend): POST /api/route_scout/routes { route, user }
    // - Persists route for currentUser
    // - Response: { ok: true, id }
    await delay(150);
    return { ok: true, id: 'r-123' };
  }
};

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

// --- Optimization helpers (stubs) ---
function estimateTravelTime(route, traffic, weather){
  const basePerLegMin = 12; // stubbed average
  const legs = Math.max(0, (route?.length || 1) - 1);
  let factor = 1.0;
  if (traffic.level === 'high') factor += 0.35;
  if (weather.alert) factor += 0.2;
  return Math.round(legs * basePerLegMin * factor);
}
function getTrafficConditions(){
  // Stub: could consult current time window
  const hour = new Date().getHours();
  const level = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 'high' : 'normal';
  return { level };
}
function getWeatherImpact(){
  // Stub: random mild impact
  const code = Math.random() < 0.15 ? 'rain' : 'clear';
  return { code, alert: code !== 'clear' };
}
function scoreStop(stop, anchor, traffic, weather){
  // Lower score = earlier in route
  let score = 0;
  // Appointments earlier by scheduled time string heuristic
  if (stop.type === 'appointment') {
    // crude parse of HH:MM in stop.time (e.g., "9:00–10:00 AM")
    const m = String(stop.time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      let h = Number(m[1]); const min = Number(m[2]); const mer = m[3].toUpperCase();
      if (mer === 'PM' && h !== 12) h += 12; if (mer === 'AM' && h === 12) h = 0;
      score += h * 60 + min;
    } else {
      score += 600; // midday default
    }
  } else {
    score += 1200; // prospects later by default
  }
  // Proximity to anchor (if lat/lng available)
  if (anchor && typeof stop.lat === 'number' && typeof stop.lng === 'number' && typeof anchor.lat === 'number' && typeof anchor.lng === 'number'){
    const d2 = Math.pow(stop.lat - anchor.lat, 2) + Math.pow(stop.lng - anchor.lng, 2);
    score += d2 * 10000;
  }
  // Traffic/weather small bump
  if (traffic.level === 'high') score += 20;
  if (weather.alert) score += 10;
  return score;
}
