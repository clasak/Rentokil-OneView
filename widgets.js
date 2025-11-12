// Widgets registry with expansion states
(function(){
  const registry = new Map();

  function register(def){ registry.set(def.id, def); }
  function get(id){ return registry.get(id); }
  function list(){ return Array.from(registry.values()); }
  function render(id, state, view){
    const def = registry.get(id);
    if (!def) return `<div class="text-sm text-gray-500">Unknown widget: ${id}</div>`;
    try { return def.component(state, view || 'number'); } catch(e){ return `<div class="text-sm text-gray-500">${def.title}</div>`; }
  }

  // Basic helpers for demo content
  const fmtPct = (n) => `${Number(n).toFixed(1)}%`;
  const trend = (label, val, delta) => `
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-700">${label}</span>
      <span class="text-sm font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}">${val} ${delta>=0?'↑':'↓'} ${Math.abs(delta)}%</span>
    </div>`;

  // Simple chart placeholder for chart view
  const chartPlaceholder = (label) => `<div class="w-full h-24 sm:h-32 md:h-40 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500">${label} chart</div>`;

  // Components return HTML based on state: small | medium | large and view: number | chart
  register({
    id: 'proposalVolume', title: 'Proposal Volume', defaultW: 3, defaultH: 2, role: ['Sales','Manager'], category: 'Sales',
    component: (state, view)=>{
      if (view==='chart') return chartPlaceholder('Proposal Volume');
      if (state==='small') return `<div class="text-3xl font-bold text-brand">1,248</div>`;
      if (state==='medium') return `<div>
        <div class="text-2xl font-bold text-brand">1,248</div>
        <div class="text-sm text-green-600">↑ 12% from last month</div>
      </div>`;
      return `<div>
        <div class="text-2xl font-bold text-brand mb-2">1,248</div>
        ${trend('Top Branch', 'Omaha', 18)}
        ${trend('Top AE', 'J. Smith', 22)}
        <div class="mt-2 text-xs text-gray-500">Monthly trend chart placeholder</div>
      </div>`;
    }
  });

  register({ id:'closeRate', title:'Close Rate', defaultW:3, defaultH:2, role: ['Sales','Manager'], category: 'Sales',
    component:(state, view)=>{
      if (view==='chart') return chartPlaceholder('Close Rate');
      if (state==='small') return `<div class="text-3xl font-bold text-green-600">68.5%</div>`;
      if (state==='medium') return `<div>
        <div class="text-2xl font-bold text-green-600">68.5%</div>
        <div class="text-sm text-green-600">↑ 3% from last month</div>
      </div>`;
      return `<div>
        <div class="text-2xl font-bold text-green-600 mb-2">68.5%</div>
        <div class="text-sm font-semibold mb-2">By AE</div>
        ${trend('A. Lee', fmtPct(72), 4)}
        ${trend('J. Smith', fmtPct(66), 2)}
        <div class="mt-2 text-xs text-gray-500">Trend chart placeholder</div>
      </div>`;
    }
  });

  register({ id:'avgDealSize', title:'Avg Deal Size', defaultW:3, defaultH:2, role: ['Sales','Manager'], category: 'Sales',
    component:(state, view)=>{
      const headline = `<div class="text-3xl font-bold text-rentokil-blue">$12,800</div>`;
      if (view==='chart') return chartPlaceholder('Avg Deal Size');
      if (state==='small') return headline;
      if (state==='medium') return `<div>${headline}<div class="text-sm text-green-600">↑ 8% from last month</div></div>`;
      return `<div>
        ${headline}
        ${trend('Top Service Type', '$IPM', 12)}
        <div class="mt-2 text-xs text-gray-500">Distribution chart placeholder</div>
      </div>`;
    }
  });

  register({ id:'timeSaved', title:'Time Saved', defaultW:3, defaultH:2, role: ['Sales','Manager'], category: 'Sales',
    component:(state, view)=>{
      const headline = `<div class="text-3xl font-bold text-green-600">42h</div>`;
      if (view==='chart') return chartPlaceholder('Time Saved');
      if (state==='small') return headline;
      if (state==='medium') return `<div>${headline}<div class="text-sm text-green-600">↑ 15% from last month</div></div>`;
      return `<div>${headline}<div class="text-sm">Automation breakdown placeholder</div></div>`;
    }
  });

  // List/summary style widgets
  register({ id:'recentActivity', title:'Recent Activity', defaultW:4, defaultH:3, role: ['Sales','Ops','Manager'], category: 'Universal',
    component:(state, view)=>{
      if (view==='chart') return chartPlaceholder('Recent Activity');
      const rows = [
        {c:'ACME', amt:'$12,000', status:'Proposed'},
        {c:'TCH', amt:'$18,400', status:'Sold'}
      ];
      if (state==='small') return `<ul class="text-sm">${rows.slice(0,3).map(r=>`<li>${r.c} — ${r.status}</li>`).join('')}</ul>`;
      if (state==='medium') return `<ul class="text-sm">${rows.slice(0,6).map(r=>`<li>${r.c} — ${r.amt} — ${r.status}</li>`).join('')}</ul>`;
      return `<div class="space-y-2 text-sm">${rows.map(r=>`<div class="flex justify-between"><span>${r.c}</span><span class="font-semibold">${r.amt}</span><span>${r.status}</span></div>`).join('')}</div>`;
    }
  });

  register({ id:'openProposals', title:'Open Proposals', defaultW:4, defaultH:3, role: ['Sales','Manager'], category: 'Sales',
    component:(state, view)=>{
      if (view==='chart') return chartPlaceholder('Open Proposals');
      const rows = ['ACME – $12k','TCH – $18k','Nebraska Foods – $9k'];
      return `<ul class="text-sm">${rows.slice(0, state==='small'?4:rows.length).map(r=>`<li>${r}</li>`).join('')}</ul>`;
    }
  });

  // Example Ops/Manager widgets
  register({ id:'pendingInstalls', title:'Pending Installs', defaultW:3, defaultH:2, role: ['Ops','Manager'], category: 'Ops',
    component:(state, view)=>{
      if (view==='chart') return chartPlaceholder('Pending Installs');
      const headline = `<div class="text-3xl font-bold text-brand">12</div>`;
      return state==='small'? headline : `<div>${headline}<div class="text-sm text-red-600">↑ 2 from yesterday</div></div>`;
    }
  });

  register({ id:'overduePackets', title:'Overdue Packets', defaultW:3, defaultH:2, role: ['Ops','Manager'], category: 'Ops',
    component:(state, view)=>{
      if (view==='chart') return chartPlaceholder('Overdue Packets');
      const headline = `<div class="text-3xl font-bold text-red-600">4</div>`;
      return state==='small'? headline : `<div>${headline}<div class="text-sm text-red-600">Needs attention</div></div>`;
    }
  });

  // Utility widgets — removed any unrequested widgets

  // Export
  window.Widgets = { register, get, list, render };
})();
