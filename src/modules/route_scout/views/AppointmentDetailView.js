import { Toast } from '../components/Toast.js';

export const AppointmentDetailView = ({ state, navigate, id }) => {
  const a = state.state.appointments.find(x => x.id === id) || state.state.appointments[0];
  const wrap = document.createElement('div');

  const distMiles = (aLat, aLng, bLat, bLng) => {
    const toRad = (x) => x * Math.PI / 180;
    const R = 3958.8;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const sa = Math.sin(dLat/2) * Math.sin(dLat/2);
    const sb = Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb), Math.sqrt(1 - (sa + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sb)));
    return R * c;
  };

  const card = document.createElement('div');
  card.className = 'rs-card';
  card.innerHTML = `
    <div class="rs-card-title" style="font-size:18px">${a.name}</div>
    <div class="rs-card-sub">${a.kind} • ${a.vertical}</div>
    <div class="rs-card-sub">Today • ${a.time}</div>
    <div class="rs-card-sub">📍 ${a.address}</div>
  `;

  const nearby = document.createElement('div');
  nearby.className = 'rs-card';
  nearby.innerHTML = `
    <div class="rs-card-title">Prospects within 3 miles <span style="float:right" id="rs-change">Change</span></div>
  `;
  const list = document.createElement('div');
  const candidates = state.state.prospects
    .map(p => ({ p, d: (typeof a.lat === 'number' && typeof a.lng === 'number' && typeof p.lat === 'number' && typeof p.lng === 'number') ? distMiles(a.lat, a.lng, p.lat, p.lng) : Infinity }))
    .filter(x => x.d <= 3)
    .sort((x,y) => x.d - y.d)
    .slice(0,3);
  candidates.forEach(({ p, d }) => {
    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0';
    row.innerHTML = `<div>${p.name} • ${p.vertical} • ${isFinite(d) ? d.toFixed(1) : '—'} mi</div><button class="rs-btn" data-add="${p.id}">Add to Route</button>`;
    list.appendChild(row);
  });
  nearby.appendChild(list);

  const sticky = document.createElement('div');
  sticky.className = 'rs-bottom-actions';
  sticky.innerHTML = `
    <button class="rs-btn outline" id="rs-add">Add to Today\'s Route</button>
    <button class="rs-btn primary" id="rs-build">Build Route From Here</button>
  `;

  wrap.append(card, nearby, sticky);

  nearby.querySelector('#rs-change').onclick = () => alert('Radius selector TBD');
  nearby.addEventListener('click', (e) => {
    const add = e.target.closest('button')?.dataset.add;
    if (!add) return;
    const p = state.state.prospects.find(x => x.id === add);
    state.addToRoute({ id: p.id, name: p.name, type: 'prospect' });
    Toast.show(`Added ${p.name} to route`);
  });

  sticky.querySelector('#rs-add').onclick = () => {
    state.addToRoute({ id: a.id, name: a.name, type: 'appointment', time: a.time });
    Toast.show(`Added ${a.name} to today\'s route`);
  };
  sticky.querySelector('#rs-build').onclick = () => {
    state.state.route.stops = [{ id: a.id, name: a.name, type: 'appointment', time: a.time }, ...state.state.route.stops];
    navigate('route');
  };

  return wrap;
};
