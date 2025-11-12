import { Toast } from '../components/Toast.js';

export const HomeView = ({ state, navigate }) => {
  const wrap = document.createElement('div');

  const dateStrip = document.createElement('div');
  dateStrip.className = 'rs-date-strip';
  dateStrip.innerHTML = `
    <button class="rs-pill" data-date="today">Today</button>
    <button class="rs-pill" data-date="tomorrow">Tomorrow</button>
    <button class="rs-pill" data-date="pick">Pick date</button>
  `;

  const summary = document.createElement('div');
  summary.className = 'rs-summary';
  summary.textContent = `${state.state.appointments.length} appointments • ${state.state.prospects.length} prospects near you • ${state.state.route.stops.length} routes saved`;

  const list = document.createElement('div');
  state.state.appointments.forEach(a => {
    const card = document.createElement('div');
    card.className = 'rs-card';
    card.innerHTML = `
      <div class="rs-card-title">${a.name} – ${a.time}</div>
      <div class="rs-card-sub">${a.address}</div>
      <div class="rs-chiprow">
        <span class="rs-chip">${a.kind}</span>
        <span class="rs-chip">${a.vertical}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="rs-btn" data-map="${a.id}">View on Map</button>
        <button class="rs-btn outline" data-details="${a.id}">Details</button>
      </div>
    `;
    list.appendChild(card);
  });

  const actions = document.createElement('div');
  actions.className = 'rs-actions';
  actions.innerHTML = `
    <button class="rs-btn primary" id="rs-build-route">📍 Build Route for Today</button>
    <button class="rs-btn" id="rs-prospect-area">🗺 Prospect by Area</button>
    <button class="rs-btn" id="rs-filter-vertical">🏷 Filter by Vertical</button>
  `;

  wrap.append(dateStrip, summary, list, actions);

  dateStrip.addEventListener('click', async (e) => {
    const date = e.target.closest('button')?.dataset.date;
    if (!date) return;
    if (date === 'pick') return alert('Date picker TBD');
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
    if (detailsId) navigate('appointment', { id: detailsId });
  });

  actions.querySelector('#rs-build-route').addEventListener('click', () => {
    // Pre-populate route with today's appointments
    state.state.route.stops = state.state.appointments.map(a => ({ id: a.id, name: a.name, type: 'appointment', time: a.time }));
    Toast.show('Pre-populated route with today\'s appointments');
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

