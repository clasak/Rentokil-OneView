export const AppointmentDetailView = ({ state, navigate, toast, id }) => {
  const a = state.state.appointments.find(x => x.id === id) || state.state.appointments[0];
  if (!a) {
    const wrap = document.createElement('div');
    wrap.innerHTML = '<div style="padding: 20px; text-align: center;">Appointment not found</div>';
    return wrap;
  }
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

  const currentRadius = state.state.anchor?.radius || 3;

  const card = document.createElement('div');
  card.className = 'rs-card';
  card.innerHTML = `
    <div class="rs-card-title" style="font-size:18px">${a.name}</div>
    <div class="rs-card-sub">${a.type || 'Appointment'} • ${a.vertical}</div>
    <div class="rs-card-sub">Today • ${a.time}</div>
    <div class="rs-card-sub">📍 ${a.address}</div>
  `;

  const nearby = document.createElement('div');
  nearby.className = 'rs-card';
  nearby.innerHTML = `
    <div class="rs-card-title">Prospects within ${currentRadius} miles <span style="float:right;cursor:pointer;color:var(--rs-primary);font-weight:600;" id="rs-change">Change</span></div>
  `;
  const list = document.createElement('div');
  const candidates = state.state.prospects
    .map(p => ({ p, d: (typeof a.lat === 'number' && typeof a.lng === 'number' && typeof p.lat === 'number' && typeof p.lng === 'number') ? distMiles(a.lat, a.lng, p.lat, p.lng) : Infinity }))
    .filter(x => x.d <= currentRadius)
    .sort((x,y) => x.d - y.d)
    .slice(0,10);

  if (candidates.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style = 'padding: 12px 0; color: var(--rs-muted); text-align: center;';
    emptyMsg.textContent = `No prospects found within ${currentRadius} miles`;
    list.appendChild(emptyMsg);
  } else {
    candidates.forEach(({ p, d }) => {
      const row = document.createElement('div');
      row.style = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--rs-border)';
      row.innerHTML = `<div style="flex:1"><div style="font-weight:500;color:var(--rs-text)">${p.name}</div><div style="font-size:12px;color:var(--rs-muted)">${p.vertical} • ${isFinite(d) ? d.toFixed(1) : '—'} mi</div></div><button class="rs-btn" data-add="${p.id}" style="padding:6px 12px;font-size:12px;">Add</button>`;
      list.appendChild(row);
    });
  }
  nearby.appendChild(list);

  const sticky = document.createElement('div');
  sticky.className = 'rs-bottom-actions';
  sticky.innerHTML = `
    <button class="rs-btn outline" id="rs-add">Add to Today\'s Route</button>
    <button class="rs-btn primary" id="rs-build">Build Route From Here</button>
  `;

  wrap.append(card, nearby, sticky);

  nearby.querySelector('#rs-change').onclick = () => {
    // Create radius selector dialog
    const radiusOptions = [1, 3, 5, 10, 15, 20];

    const radiusDialog = document.createElement('div');
    radiusDialog.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';

    const radiusContent = document.createElement('div');
    radiusContent.style.cssText = 'background: var(--rs-surface); border: 1px solid var(--rs-border); border-radius: 12px; padding: 20px; max-width: 320px; width: 90%;';
    radiusContent.innerHTML = `
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--rs-text);">Select Radius</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        ${radiusOptions.map(r => `
          <button class="radius-option" data-radius="${r}" style="
            padding: 12px;
            border: 2px solid ${r === currentRadius ? 'var(--rs-primary)' : 'var(--rs-border)'};
            background: ${r === currentRadius ? 'var(--rs-primary)' : 'var(--rs-surface-2)'};
            color: ${r === currentRadius ? 'white' : 'var(--rs-text)'};
            border-radius: 8px;
            cursor: pointer;
            font-weight: ${r === currentRadius ? '600' : '400'};
          ">${r} mi</button>
        `).join('')}
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="radius-cancel" class="rs-btn outline" style="flex: 1;">Cancel</button>
        <button id="radius-apply" class="rs-btn primary" style="flex: 1;">Apply</button>
      </div>
    `;

    radiusDialog.appendChild(radiusContent);
    document.body.appendChild(radiusDialog);

    let selectedRadius = currentRadius;

    radiusContent.querySelectorAll('.radius-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedRadius = parseInt(e.target.dataset.radius);
        radiusContent.querySelectorAll('.radius-option').forEach(b => {
          const r = parseInt(b.dataset.radius);
          if (r === selectedRadius) {
            b.style.border = '2px solid var(--rs-primary)';
            b.style.background = 'var(--rs-primary)';
            b.style.color = 'white';
            b.style.fontWeight = '600';
          } else {
            b.style.border = '2px solid var(--rs-border)';
            b.style.background = 'var(--rs-surface-2)';
            b.style.color = 'var(--rs-text)';
            b.style.fontWeight = '400';
          }
        });
      });
    });

    radiusContent.querySelector('#radius-cancel').onclick = () => {
      document.body.removeChild(radiusDialog);
    };

    radiusContent.querySelector('#radius-apply').onclick = async () => {
      state.setAnchor({ type: 'appointment', id: a.id, radius: selectedRadius });
      await state.load();
      document.body.removeChild(radiusDialog);
      window.location.hash = `appointment/${a.id}`;
    };

    radiusDialog.addEventListener('click', (e) => {
      if (e.target === radiusDialog) {
        document.body.removeChild(radiusDialog);
      }
    });
  };

  nearby.addEventListener('click', (e) => {
    const add = e.target.closest('button')?.dataset.add;
    if (!add) return;
    const p = state.state.prospects.find(x => x.id === add);
    state.addToRoute({ id: p.id, name: p.name, kind: 'prospect', type: 'prospect', address: p.address, lat: p.lat, lng: p.lng });
    toast.show(`Added ${p.name} to route`);
  });

  sticky.querySelector('#rs-add').onclick = () => {
    state.addToRoute({ id: a.id, name: a.name, kind: 'appointment', type: 'appointment', time: a.time, address: a.address, lat: a.lat, lng: a.lng });
    toast.show(`Added ${a.name} to today's route`);
  };
  sticky.querySelector('#rs-build').onclick = () => {
    state.state.route.stops = [{ id: a.id, name: a.name, kind: 'appointment', type: 'appointment', time: a.time, address: a.address, lat: a.lat, lng: a.lng }];
    navigate('route');
  };

  return wrap;
};
