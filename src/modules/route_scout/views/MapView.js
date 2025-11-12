import { BottomSheet } from '../components/BottomSheet.js';
import { Toast } from '../components/Toast.js';

export const MapView = ({ state, navigate }) => {
  const wrap = document.createElement('div');
  wrap.className = 'rs-map-wrap';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';

  // ===== Demo Map Canvas =====
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 520;
  canvas.style.width = '100%';
  canvas.style.maxHeight = '60vh';
  canvas.style.borderRadius = '12px';
  canvas.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
  canvas.style.background = '#0b1221';
  const ctx = canvas.getContext('2d');

  // Controls
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.alignItems = 'center';
  const modeBtnPins = document.createElement('button');
  modeBtnPins.className = 'rs-btn';
  modeBtnPins.textContent = 'Pins';
  const modeBtnHeat = document.createElement('button');
  modeBtnHeat.className = 'rs-btn outline';
  modeBtnHeat.textContent = 'Heatmap';
  const zoomIn = document.createElement('button');
  zoomIn.className = 'rs-btn';
  zoomIn.textContent = 'Zoom +';
  const zoomOut = document.createElement('button');
  zoomOut.className = 'rs-btn';
  zoomOut.textContent = 'Zoom −';
  const centerMe = document.createElement('button');
  centerMe.className = 'rs-btn';
  centerMe.textContent = 'Center on Me';
  controls.append(modeBtnPins, modeBtnHeat, zoomIn, zoomOut, centerMe);

  let mode = 'pins';
  let scale = 1.0;

  const rand = (seed) => {
    let x = seed;
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };

  // Normalize lat/lng to canvas space or generate deterministic pseudo positions
  function normalizePoints(items) {
    const haveCoords = items.every(i => typeof i.lat === 'number' && typeof i.lng === 'number');
    if (!items.length) return [];
    if (haveCoords) {
      const lats = items.map(i => i.lat);
      const lngs = items.map(i => i.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const pad = 20;
      return items.map(i => ({
        x: pad + ((i.lng - minLng) / Math.max(0.0001, (maxLng - minLng))) * (canvas.width - pad * 2),
        y: pad + ((i.lat - minLat) / Math.max(0.0001, (maxLat - minLat))) * (canvas.height - pad * 2),
        item: i
      }));
    }
    // Pseudo positions if no coords
    return items.map((i, idx) => ({
      x: 60 + rand(idx + i.name.length) * (canvas.width - 120),
      y: 60 + rand(idx * 2 + i.kind.length) * (canvas.height - 120),
      item: i
    }));
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark gradient
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#0b1221');
    g.addColorStop(1, '#0e1a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const step = 40 * scale;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function drawPins(points, color = '#38bdf8') {
    points.forEach(p => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawHeat(points) {
    points.forEach(p => {
      const radius = 40 * scale;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, 'rgba(255,99,71,0.85)');
      grad.addColorStop(0.4, 'rgba(255,140,0,0.45)');
      grad.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderMap() {
    drawBackground();
    const appts = normalizePoints(state.state.appointments || []);
    const prospects = normalizePoints(state.state.prospects || []);
    if (mode === 'pins') {
      drawPins(appts, '#60a5fa');
      drawPins(prospects, '#34d399');
    } else {
      drawHeat(appts);
      drawHeat(prospects);
    }
  }

  zoomIn.addEventListener('click', () => { scale = Math.min(2.5, scale + 0.1); renderMap(); });
  zoomOut.addEventListener('click', () => { scale = Math.max(0.6, scale - 0.1); renderMap(); });
  modeBtnPins.addEventListener('click', () => { mode = 'pins'; modeBtnPins.className = 'rs-btn'; modeBtnHeat.className = 'rs-btn outline'; renderMap(); });
  modeBtnHeat.addEventListener('click', () => { mode = 'heat'; modeBtnHeat.className = 'rs-btn'; modeBtnPins.className = 'rs-btn outline'; renderMap(); });
  centerMe.addEventListener('click', () => {
    Toast.show('Centered near your location (demo)', 'info');
    // In demo, simply re-render
    renderMap();
  });

  wrap.appendChild(canvas);
  wrap.appendChild(controls);

  // Existing helpers area can remain for future integration
  const helpers = {
    haversineMiles(aLat, aLng, bLat, bLng){
      const toRad = (x) => x * Math.PI / 180;
      const R = 3958.8; // miles
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const sa = Math.sin(dLat/2) * Math.sin(dLat/2);
      const sb = Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb), Math.sqrt(1 - (sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb)));
      return R * c;
    },
    inRadius(item, anchor){
      if (!anchor || typeof anchor.radius !== 'number') return true;
      const a = anchor.type === 'appointment' ? state.state.appointments.find(x => x.id === anchor.id) : null;
      const aLat = a?.lat ?? state.state.appointments[0]?.lat;
      const aLng = a?.lng ?? state.state.appointments[0]?.lng;
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number' || typeof aLat !== 'number' || typeof aLng !== 'number') return true;
      const d = helpers.haversineMiles(aLat, aLng, item.lat, item.lng);
      return d <= anchor.radius;
    },
    filterLists(){
      const anchor = state.state.anchor;
      const verts = state.state.verticals;
      const apps = state.state.appointments.filter(a => helpers.inRadius(a, anchor));
      const pros = state.state.prospects.filter(p => helpers.inRadius(p, anchor)).filter(p => (!verts || verts.length === 0) ? true : verts.includes(p.vertical));
      return { apps, pros };
    }
  };

  const searchbar = document.createElement('div');
  searchbar.className = 'rs-searchbar';
  searchbar.innerHTML = `
    <input id="rs-search" placeholder="Search ZIP, city, or address" />
    <button class="rs-btn outline" id="rs-filter">Filter</button>
    <button class="rs-btn" id="rs-heat-toggle">Heat Map</button>
  `;

  const anchor = document.createElement('div');
  anchor.className = 'rs-anchor';
  const anchorLabel = state.state.anchor ? `Anchor: ${state.state.appointments.find(a => a.id === state.state.anchor.id)?.name || 'Current location'} • ${state.state.anchor.radius} mi radius` : 'Anchor: None';
  anchor.textContent = anchorLabel;

  const map = document.createElement('div');
  map.className = 'rs-map-area';
  map.innerHTML = `<div class="rs-map-placeholder">Map placeholder (pins, zoom, me)</div>`;
  // Simple Service Ticket Heat Map overlay (demo)
  const heat = document.createElement('div');
  heat.id = 'rs-heat-overlay';
  heat.style.position = 'absolute';
  heat.style.inset = '0';
  heat.style.pointerEvents = 'none';
  heat.style.display = 'none';
  // generate a few static density blobs
  const blobs = [
    { top: 40, left: 60, size: 80, color: 'rgba(255, 99, 71, 0.35)' },
    { top: 120, left: 180, size: 120, color: 'rgba(255, 165, 0, 0.30)' },
    { top: 200, left: 90, size: 100, color: 'rgba(220, 38, 38, 0.25)' }
  ];
  blobs.forEach(b => {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.top = `${b.top}px`;
    dot.style.left = `${b.left}px`;
    dot.style.width = `${b.size}px`;
    dot.style.height = `${b.size}px`;
    dot.style.borderRadius = '50%';
    dot.style.background = b.color;
    dot.style.filter = 'blur(12px)';
    heat.appendChild(dot);
  });
  map.style.position = 'relative';
  map.appendChild(heat);

  const drawer = document.createElement('div');
  drawer.className = 'rs-drawer';
  const filtered = helpers.filterLists();
  drawer.innerHTML = `
    <div class="rs-drawer-header">
      <div>${filtered.apps.length + filtered.pros.length} results in view</div>
      <div class="rs-drawer-sort">Sort: Distance ▼</div>
    </div>
    <div id="rs-results"></div>
  `;

  const results = drawer.querySelector('#rs-results');
  // appointment rows (filtered by anchor radius)
  filtered.apps.forEach(a => {
    const row = document.createElement('div');
    row.className = 'rs-card';
    row.innerHTML = `
      <div class="rs-card-title">${a.name} – ${a.time}</div>
      <div class="rs-card-sub">Existing Customer • ${a.vertical}</div>
      <div class="rs-card-sub">${state.state.anchor ? `${helpers.haversineMiles((state.state.appointments.find(x => x.id === state.state.anchor.id)?.lat) ?? a.lat, (state.state.appointments.find(x => x.id === state.state.anchor.id)?.lng) ?? a.lng, a.lat, a.lng).toFixed(1)} mi from anchor` : '—'}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="rs-btn outline" data-details="${a.id}">Details</button>
        <button class="rs-btn" data-add="${a.id}">Add to Route</button>
      </div>
    `;
    results.appendChild(row);
  });
  // prospect rows (filtered by anchor radius and vertical chips)
  filtered.pros.forEach(p => {
    const row = document.createElement('div');
    row.className = 'rs-card';
    row.innerHTML = `
      <div class="rs-card-title">${p.name}</div>
      <div class="rs-card-sub">Prospect • ${p.vertical}</div>
      <div class="rs-card-sub">${state.state.anchor ? `${helpers.haversineMiles((state.state.appointments.find(x => x.id === state.state.anchor.id)?.lat) ?? p.lat, (state.state.appointments.find(x => x.id === state.state.anchor.id)?.lng) ?? p.lng, p.lat, p.lng).toFixed(1)} mi from anchor` : '—'}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="rs-btn" data-add-prospect="${p.id}">Add to Route</button>
      </div>
    `;
    results.appendChild(row);
  });

  const sheet = BottomSheet();
  const verticals = ['Restaurants', 'Property Management', 'Medical / MedSpa', 'Industrial', 'Hospitality', 'Other'];
  const chipsHost = sheet.sheet.querySelector('#rs-verticals');
  chipsHost.innerHTML = '';
  verticals.forEach(v => {
    const chip = document.createElement('span');
    chip.className = 'rs-chip';
    chip.textContent = v;
    chip.dataset.val = v;
    chip.onclick = () => chip.classList.toggle('active');
    chipsHost.appendChild(chip);
  });
  sheet.sheet.querySelector('#rs-clear').onclick = () => {
    chipsHost.querySelectorAll('.rs-chip').forEach(c => c.classList.remove('active'));
  };
  sheet.sheet.querySelector('#rs-apply').onclick = async () => {
    const selected = Array.from(chipsHost.querySelectorAll('.rs-chip.active')).map(c => c.dataset.val);
    state.setVerticals(selected);
    await state.load();
    sheet.close();
    Toast.show('Filters applied');
    navigate('map');
  };

  window.addEventListener('rs:openFilterSheet', () => sheet.open(), { once: false });

  wrap.append(searchbar, map, anchor, drawer);

  // Actions
  searchbar.querySelector('#rs-filter').addEventListener('click', () => sheet.open());
  // Toggle heat map overlay
  searchbar.querySelector('#rs-heat-toggle').addEventListener('click', () => {
    const on = heat.style.display === 'none';
    heat.style.display = on ? 'block' : 'none';
    Toast.show(on ? 'Service Ticket Heat Map: On' : 'Service Ticket Heat Map: Off');
  });
  results.addEventListener('click', (e) => {
    const det = e.target.closest('button')?.dataset.details;
    const addA = e.target.closest('button')?.dataset.add;
    const addP = e.target.closest('button')?.dataset.addProspect;
    if (det) navigate('appointment', { id: det });
    if (addA) {
      const a = state.state.appointments.find(x => x.id === addA);
      state.addToRoute({ id: a.id, name: a.name, type: 'appointment', time: a.time });
      Toast.show(`Added ${a.name} to route`);
    }
    if (addP) {
      const p = state.state.prospects.find(x => x.id === addP);
      state.addToRoute({ id: p.id, name: p.name, type: 'prospect' });
      Toast.show(`Added ${p.name} to route`);
    }
  });

  return wrap;
};
