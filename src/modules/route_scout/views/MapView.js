import { BottomSheet } from '../components/BottomSheet.js';

export const MapView = ({ state, navigate, toast }) => {
  const wrap = document.createElement('div');
  wrap.className = 'rs-map-view';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.height = '100%';
  wrap.style.padding = '0';

  // ===== Search and Controls =====
  const searchbar = document.createElement('div');
  searchbar.className = 'rs-searchbar';
  searchbar.innerHTML = `
    <input id="rs-search" placeholder="Search ZIP, city, or address" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--rs-border);background:var(--rs-surface-2);color:var(--rs-text);" />
    <button class="rs-btn outline" id="rs-filter">Filter</button>
    <button class="rs-btn" id="rs-heat-toggle">Heat Map</button>
  `;

  // ===== Map Canvas =====
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = 'flex: 1; min-height: 300px; position: relative; background: #0b1221; border-top: 1px solid var(--rs-border); border-bottom: 1px solid var(--rs-border);';

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 520;
  canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
  const ctx = canvas.getContext('2d');

  const controls = document.createElement('div');
  controls.style.cssText = 'position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px;';
  controls.innerHTML = `
    <button class="rs-btn" id="rs-mode-pins" style="font-size:12px;padding:8px 12px;">Pins</button>
    <button class="rs-btn outline" id="rs-mode-heat" style="font-size:12px;padding:8px 12px;">Heatmap</button>
    <button class="rs-btn" id="rs-zoom-in" style="font-size:12px;padding:8px 12px;">Zoom +</button>
    <button class="rs-btn" id="rs-zoom-out" style="font-size:12px;padding:8px 12px;">Zoom −</button>
    <button class="rs-btn" id="rs-center-me" style="font-size:12px;padding:8px 12px;">Center</button>
  `;

  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(controls);

  let mode = 'pins';
  let scale = 1.0;

  const rand = (seed) => {
    let x = seed;
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };

  // Normalize lat/lng to canvas space
  function normalizePoints(items) {
    const haveCoords = items.every(i => typeof i.lat === 'number' && typeof i.lng === 'number');
    if (!items.length) return [];
    if (haveCoords) {
      const lats = items.map(i => i.lat);
      const lngs = items.map(i => i.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const pad = 40;
      return items.map(i => ({
        x: pad + ((i.lng - minLng) / Math.max(0.0001, (maxLng - minLng))) * (canvas.width - pad * 2),
        y: canvas.height - (pad + ((i.lat - minLat) / Math.max(0.0001, (maxLat - minLat))) * (canvas.height - pad * 2)),
        item: i
      }));
    }
    // Pseudo positions if no coords
    return items.map((i, idx) => ({
      x: 60 + rand(idx + (i.name?.length || 0)) * (canvas.width - 120),
      y: 60 + rand(idx * 2 + (i.kind?.length || 0)) * (canvas.height - 120),
      item: i
    }));
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      ctx.arc(p.x, p.y, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawHeat(points) {
    points.forEach(p => {
      const radius = 50 * scale;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, 'rgba(255,99,71,0.7)');
      grad.addColorStop(0.4, 'rgba(255,140,0,0.4)');
      grad.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderMap() {
    drawBackground();
    const appts = normalizePoints(filteredAppointments);
    const prospects = normalizePoints(filteredProspects);
    if (mode === 'pins') {
      drawPins(appts, '#60a5fa');
      drawPins(prospects, '#34d399');
    } else {
      drawHeat([...appts, ...prospects]);
    }
  }

  // ===== Helpers =====
  const helpers = {
    haversineMiles(aLat, aLng, bLat, bLng) {
      const toRad = (x) => x * Math.PI / 180;
      const R = 3958.8;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const sa = Math.sin(dLat / 2) * Math.sin(dLat / 2);
      const sb = Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb), Math.sqrt(1 - (sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb)));
      return R * c;
    },
    inRadius(item, anchor) {
      if (!anchor || typeof anchor.radius !== 'number') return true;
      const a = anchor.type === 'appointment' ? state.state.appointments.find(x => x.id === anchor.id) : null;
      const aLat = a?.lat ?? state.state.appointments[0]?.lat;
      const aLng = a?.lng ?? state.state.appointments[0]?.lng;
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number' || typeof aLat !== 'number' || typeof aLng !== 'number') return true;
      const d = helpers.haversineMiles(aLat, aLng, item.lat, item.lng);
      return d <= anchor.radius;
    },
    filterBySearch(items, searchText) {
      if (!searchText) return items;
      const lower = searchText.toLowerCase();
      return items.filter(item =>
        (item.name?.toLowerCase().includes(lower)) ||
        (item.address?.toLowerCase().includes(lower)) ||
        (item.city?.toLowerCase().includes(lower)) ||
        (item.zip?.includes(lower))
      );
    }
  };

  let searchText = '';
  let filteredAppointments = state.state.appointments.filter(a => helpers.inRadius(a, state.state.anchor));
  let filteredProspects = state.state.prospects
    .filter(p => helpers.inRadius(p, state.state.anchor))
    .filter(p => (!state.state.verticals || state.state.verticals.length === 0) ? true : state.state.verticals.includes(p.vertical));

  const updateFilters = () => {
    filteredAppointments = helpers.filterBySearch(
      state.state.appointments.filter(a => helpers.inRadius(a, state.state.anchor)),
      searchText
    );
    filteredProspects = helpers.filterBySearch(
      state.state.prospects
        .filter(p => helpers.inRadius(p, state.state.anchor))
        .filter(p => (!state.state.verticals || state.state.verticals.length === 0) ? true : state.state.verticals.includes(p.vertical)),
      searchText
    );
    renderMap();
    renderResults();
  };

  // ===== Anchor Display =====
  const anchor = document.createElement('div');
  anchor.className = 'rs-anchor';
  const anchorLabel = state.state.anchor ? `Anchor: ${state.state.appointments.find(a => a.id === state.state.anchor.id)?.name || 'Current location'} • ${state.state.anchor.radius} mi radius` : 'Showing all locations';
  anchor.textContent = anchorLabel;

  // ===== Results Drawer =====
  const drawer = document.createElement('div');
  drawer.className = 'rs-drawer';
  drawer.style.cssText = 'background: var(--rs-surface); border-top: 1px solid var(--rs-border); max-height: 300px; overflow-y: auto;';
  drawer.innerHTML = `
    <div class="rs-drawer-header">
      <div id="rs-result-count">${filteredAppointments.length + filteredProspects.length} results in view</div>
      <div class="rs-drawer-sort" style="color: var(--rs-muted);">Sort: Distance ▼</div>
    </div>
    <div id="rs-results"></div>
  `;

  const resultsContainer = drawer.querySelector('#rs-results');
  const resultCount = drawer.querySelector('#rs-result-count');

  const renderResults = () => {
    resultsContainer.innerHTML = '';
    resultCount.textContent = `${filteredAppointments.length + filteredProspects.length} results in view`;

    if (filteredAppointments.length === 0 && filteredProspects.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
          <svg style="width: 48px; height: 48px; color: #9ca3af; margin: 0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
          <h3 style="font-size: 16px; font-weight: 600; color: #e5e7eb; margin-bottom: 8px;">No Results</h3>
          <p style="color: #9ca3af; font-size: 14px;">Try adjusting your filters or search criteria.</p>
        </div>
      `;
      return;
    }

    filteredAppointments.forEach(a => {
      const row = document.createElement('div');
      row.className = 'rs-card';
      row.innerHTML = `
        <div class="rs-card-title">${a.name} – ${a.time}</div>
        <div class="rs-card-sub">Existing Customer • ${a.vertical}</div>
        <div class="rs-card-sub">${state.state.anchor && a.lat && a.lng ? `${helpers.haversineMiles(state.state.appointments.find(x => x.id === state.state.anchor.id)?.lat || a.lat, state.state.appointments.find(x => x.id === state.state.anchor.id)?.lng || a.lng, a.lat, a.lng).toFixed(1)} mi from anchor` : a.address}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="rs-btn outline" data-details="${a.id}">Details</button>
          <button class="rs-btn" data-add="${a.id}">Add to Route</button>
        </div>
      `;
      resultsContainer.appendChild(row);
    });

    filteredProspects.forEach(p => {
      const row = document.createElement('div');
      row.className = 'rs-card';
      row.innerHTML = `
        <div class="rs-card-title">${p.name}</div>
        <div class="rs-card-sub">Prospect • ${p.vertical} • Score: ${p.score}</div>
        <div class="rs-card-sub">${state.state.anchor && p.lat && p.lng ? `${helpers.haversineMiles(state.state.appointments.find(x => x.id === state.state.anchor.id)?.lat || p.lat, state.state.appointments.find(x => x.id === state.state.anchor.id)?.lng || p.lng, p.lat, p.lng).toFixed(1)} mi from anchor` : p.address}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="rs-btn" data-add-prospect="${p.id}">Add to Route</button>
        </div>
      `;
      resultsContainer.appendChild(row);
    });
  };

  // ===== Bottom Sheet for Filters =====
  const sheet = BottomSheet();
  const verticals = ['Restaurant', 'Property Management', 'Medical/MedSpa', 'Industrial', 'Hospitality', 'Other'];
  const chipsHost = sheet.sheet.querySelector('#rs-verticals');
  chipsHost.innerHTML = '';
  verticals.forEach(v => {
    const chip = document.createElement('span');
    chip.className = 'rs-chip';
    chip.textContent = v;
    chip.dataset.val = v;
    chip.style.cursor = 'pointer';
    if (state.state.verticals.includes(v)) {
      chip.style.background = 'var(--rs-primary)';
      chip.style.color = 'white';
      chip.classList.add('active');
    }
    chip.onclick = () => {
      chip.classList.toggle('active');
      if (chip.classList.contains('active')) {
        chip.style.background = 'var(--rs-primary)';
        chip.style.color = 'white';
      } else {
        chip.style.background = '';
        chip.style.color = '';
      }
    };
    chipsHost.appendChild(chip);
  });

  sheet.sheet.querySelector('#rs-clear').onclick = () => {
    chipsHost.querySelectorAll('.rs-chip').forEach(c => {
      c.classList.remove('active');
      c.style.background = '';
      c.style.color = '';
    });
  };

  sheet.sheet.querySelector('#rs-apply').onclick = async () => {
    const selected = Array.from(chipsHost.querySelectorAll('.rs-chip.active')).map(c => c.dataset.val);
    state.setVerticals(selected);
    await state.load();
    sheet.close();
    toast.show('Filters applied');
    navigate('map');
  };

  window.addEventListener('rs:openFilterSheet', () => sheet.open(), { once: false });

  // ===== Event Handlers =====
  searchbar.querySelector('#rs-search').addEventListener('input', (e) => {
    searchText = e.target.value;
    updateFilters();
  });

  searchbar.querySelector('#rs-filter').addEventListener('click', () => sheet.open());

  searchbar.querySelector('#rs-heat-toggle').addEventListener('click', () => {
    mode = mode === 'pins' ? 'heat' : 'pins';
    renderMap();
    toast.show(mode === 'heat' ? 'Heat Map Mode' : 'Pins Mode');
  });

  controls.querySelector('#rs-mode-pins').addEventListener('click', () => {
    mode = 'pins';
    controls.querySelector('#rs-mode-pins').className = 'rs-btn';
    controls.querySelector('#rs-mode-heat').className = 'rs-btn outline';
    renderMap();
  });

  controls.querySelector('#rs-mode-heat').addEventListener('click', () => {
    mode = 'heat';
    controls.querySelector('#rs-mode-heat').className = 'rs-btn';
    controls.querySelector('#rs-mode-pins').className = 'rs-btn outline';
    renderMap();
  });

  controls.querySelector('#rs-zoom-in').addEventListener('click', () => {
    scale = Math.min(2.5, scale + 0.2);
    renderMap();
  });

  controls.querySelector('#rs-zoom-out').addEventListener('click', () => {
    scale = Math.max(0.5, scale - 0.2);
    renderMap();
  });

  controls.querySelector('#rs-center-me').addEventListener('click', () => {
    scale = 1.0;
    renderMap();
    toast.show('Map centered');
  });

  resultsContainer.addEventListener('click', (e) => {
    const det = e.target.closest('button')?.dataset.details;
    const addA = e.target.closest('button')?.dataset.add;
    const addP = e.target.closest('button')?.dataset.addProspect;

    if (det) {
      window.location.hash = `appointment/${det}`;
    }
    if (addA) {
      const a = state.state.appointments.find(x => x.id === addA);
      state.addToRoute({ id: a.id, name: a.name, kind: 'appointment', type: 'appointment', time: a.time, address: a.address, lat: a.lat, lng: a.lng });
      toast.show(`Added ${a.name} to route`);
    }
    if (addP) {
      const p = state.state.prospects.find(x => x.id === addP);
      state.addToRoute({ id: p.id, name: p.name, kind: 'prospect', type: 'prospect', address: p.address, lat: p.lat, lng: p.lng });
      toast.show(`Added ${p.name} to route`);
    }
  });

  // ===== Assemble View =====
  wrap.appendChild(searchbar);
  wrap.appendChild(canvasContainer);
  wrap.appendChild(anchor);
  wrap.appendChild(drawer);

  // Initial render
  renderMap();
  renderResults();

  return wrap;
};
