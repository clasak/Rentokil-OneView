export const HomeView = ({ state, navigate, toast }) => {
  const wrap = document.createElement('div');
  wrap.className = 'rs-home-view';
  wrap.style.padding = '0';

  // Date picker dialog
  const datePickerDialog = document.createElement('input');
  datePickerDialog.type = 'date';
  datePickerDialog.style.display = 'none';
  wrap.appendChild(datePickerDialog);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const currentDate = state.state.date === 'today' ? today : state.state.date === 'tomorrow' ? tomorrow : state.state.date;

  const dateStrip = document.createElement('div');
  dateStrip.className = 'rs-date-strip';
  dateStrip.innerHTML = `
    <button class="rs-pill ${state.state.date === 'today' || currentDate === today ? 'active' : ''}" data-date="today">Today</button>
    <button class="rs-pill ${state.state.date === 'tomorrow' || currentDate === tomorrow ? 'active' : ''}" data-date="tomorrow">Tomorrow</button>
    <button class="rs-pill ${state.state.date !== 'today' && state.state.date !== 'tomorrow' && currentDate !== today && currentDate !== tomorrow ? 'active' : ''}" data-date="pick">Pick date</button>
  `;

  const summary = document.createElement('div');
  summary.className = 'rs-summary';
  summary.textContent = `${state.state.appointments.length} appointments • ${state.state.prospects.length} prospects near you`;

  const list = document.createElement('div');

  if (state.state.appointments.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.padding = '40px 20px';
    emptyState.style.textAlign = 'center';
    emptyState.innerHTML = `
      <svg style="width: 48px; height: 48px; color: #9ca3af; margin: 0 auto 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 style="font-size: 16px; font-weight: 600; color: #e5e7eb; margin-bottom: 8px;">No Appointments</h3>
      <p style="color: #9ca3af; font-size: 14px;">You don't have any appointments scheduled for this date.</p>
    `;
    list.appendChild(emptyState);
  } else {
    state.state.appointments.forEach(a => {
      const card = document.createElement('div');
      card.className = 'rs-card';
      card.innerHTML = `
        <div class="rs-card-title">${a.name} – ${a.time}</div>
        <div class="rs-card-sub">${a.address}</div>
        <div class="rs-chiprow">
          <span class="rs-chip">${a.type || 'Appointment'}</span>
          <span class="rs-chip">${a.vertical}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="rs-btn" data-map="${a.id}">View on Map</button>
          <button class="rs-btn outline" data-details="${a.id}">Details</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  const actions = document.createElement('div');
  actions.className = 'rs-actions';
  actions.innerHTML = `
    <button class="rs-btn primary" id="rs-build-route">📍 Build Route for Today</button>
    <button class="rs-btn" id="rs-prospect-area">🗺 Prospect by Area</button>
    <button class="rs-btn" id="rs-filter-vertical">🏷 Filter by Vertical</button>
  `;

  wrap.append(dateStrip, summary, list, actions);

  // Date picker handler
  datePickerDialog.addEventListener('change', async (e) => {
    const selectedDate = e.target.value;
    state.setDate(selectedDate);
    await state.load();
    navigate('home');
  });

  dateStrip.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const date = btn.dataset.date;

    if (date === 'pick') {
      datePickerDialog.value = currentDate;
      datePickerDialog.showPicker();
      return;
    }

    state.setDate(date);
    await state.load();
    navigate('home');
  });

  list.addEventListener('click', (e) => {
    const mapId = e.target.closest('button')?.dataset.map;
    const detailsId = e.target.closest('button')?.dataset.details;
    if (mapId) {
      state.setAnchor({ type: 'appointment', id: mapId, radius: 3 });
      navigate('map');
    }
    if (detailsId) {
      window.location.hash = `appointment/${detailsId}`;
    }
  });

  actions.querySelector('#rs-build-route').addEventListener('click', () => {
    // Pre-populate route with today's appointments
    state.state.route.stops = state.state.appointments.map(a => ({
      id: a.id,
      name: a.name,
      kind: 'appointment',
      type: 'appointment',
      time: a.time,
      address: a.address,
      lat: a.lat,
      lng: a.lng
    }));
    toast.show('Pre-populated route with appointments');
    navigate('route');
  });

  actions.querySelector('#rs-prospect-area').addEventListener('click', () => {
    navigate('map');
  });

  actions.querySelector('#rs-filter-vertical').addEventListener('click', () => {
    const evt = new CustomEvent('rs:openFilterSheet');
    window.dispatchEvent(evt);
  });

  return wrap;
};

