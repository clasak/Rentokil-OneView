import { api } from '../api.js';

export const RouteDetailView = ({ state, navigate, toast }) => {
  const wrap = document.createElement('div');

  const summary = document.createElement('div');
  summary.className = 'rs-summary-card';
  summary.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div>Route for: Today</div>
        <div>Stops: ${state.state.route.stops.length}</div>
      </div>
      <button class="rs-btn" id="rs-optimize">Optimize Order</button>
    </div>
  `;

  const list = document.createElement('div');
  state.state.route.stops.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'rs-stop';
    row.innerHTML = `
      <div class="rs-stop-num">${idx + 1}</div>
      <div>
        <div class="rs-card-title">${s.name}</div>
        <div class="rs-card-sub">${s.type === 'appointment' ? `Appointment • ${s.time}` : 'Prospect'}</div>
        <div class="rs-chiprow"><span class="rs-chip">${s.type}</span></div>
      </div>
      <div class="rs-stop-actions">
        <button class="rs-btn outline" data-map="${s.id}">Open in Map</button>
        <button class="rs-btn outline" data-remove="${s.id}">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });

  const sticky = document.createElement('div');
  sticky.className = 'rs-bottom-actions';
  sticky.innerHTML = `
    <button class="rs-btn outline" id="rs-preview">Preview on Map</button>
    <button class="rs-btn primary" id="rs-save">Save & Sync to Dashboard</button>
  `;

  wrap.append(summary, list, sticky);

  summary.querySelector('#rs-optimize').onclick = async () => {
    toast.show('Optimizing route...');
    const res = await api.optimizeRoute(state.state.route.stops);
    const result = Array.isArray(res) ? res : (res.route || []);
    state.state.route.stops = result;
    toast.show(`Route optimized with ${result.length} stops`);
    navigate('route');
  };

  list.addEventListener('click', (e) => {
    const mapId = e.target.closest('button')?.dataset.map;
    const rmId = e.target.closest('button')?.dataset.remove;
    if (mapId) navigate('map');
    if (rmId) {
      const stop = state.state.route.stops.find(s => s.id === rmId);
      state.removeFromRoute(rmId);
      toast.show(`Removed ${stop?.name || 'stop'} from route`);
      navigate('route');
    }
  });

  sticky.querySelector('#rs-preview').onclick = () => navigate('map');
  sticky.querySelector('#rs-save').onclick = async () => {
    if (state.state.route.stops.length === 0) {
      toast.show('Add stops to your route before saving');
      return;
    }
    toast.show('Saving route...');
    const routeData = {
      date: state.state.date,
      name: `Route ${new Date().toLocaleDateString()}`,
      stops: state.state.route.stops
    };
    const res = await api.saveRoute(routeData, state.state.currentUser);
    if (res?.success) {
      toast.show(`Route saved successfully! ID: ${res.routeId}`);
    } else {
      toast.show('Failed to save route');
    }
  };

  return wrap;
};
