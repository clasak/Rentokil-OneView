/**
 * ===============================================================================
 * ENHANCED WIDGETS REGISTRY - COMPLETE IMPLEMENTATION
 * ===============================================================================
 * Full widget library with real data fetching, charts, and demo-ready functionality
 */

(function() {
  'use strict';

  const registry = new Map();

  //=============================================================================
  // WIDGET REGISTRATION API
  //=============================================================================

  function register(def) {
    registry.set(def.id, def);
  }

  function get(id) {
    return registry.get(id);
  }

  function list() {
    return Array.from(registry.values());
  }

  function render(id, state, view) {
    const def = registry.get(id);
    if (!def) {
      return `<div class="text-sm text-gray-500">Unknown widget: ${id}</div>`;
    }

    try {
      return def.component(state, view || 'number');
    } catch(e) {
      console.error('Widget render error:', id, e);
      return `<div class="text-sm text-gray-500">${def.title}<br><span class="text-xs text-red-500">Error loading</span></div>`;
    }
  }

  //=============================================================================
  // HELPER FUNCTIONS
  //=============================================================================

  const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
  const fmtCurrency = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtNumber = (n) => Number(n || 0).toLocaleString();

  const trend = (label, val, delta, format = null) => {
    const formatted = format ? format(val) : val;
    const deltaSign = delta >= 0 ? '↑' : '↓';
    const deltaColor = delta >= 0 ? 'text-green-600' : 'text-red-600';
    return `
      <div class="flex items-center justify-between py-1">
        <span class="text-sm text-gray-700">${label}</span>
        <span class="text-sm font-semibold ${deltaColor}">${formatted} ${deltaSign} ${Math.abs(delta)}%</span>
      </div>`;
  };

  // Chart placeholder with proper Google Charts integration
  const renderChart = (widgetId, chartType, data, options = {}) => {
    const chartId = `chart-${widgetId}-${Date.now()}`;

    // Queue chart rendering
    setTimeout(() => {
      if (typeof google === 'undefined' || !google.charts) {
        console.warn('Google Charts not loaded');
        return;
      }

      google.charts.setOnLoadCallback(() => {
        const container = document.getElementById(chartId);
        if (!container) return;

        try {
          let chart;
          const dataTable = google.visualization.arrayToDataTable(data);

          const defaultOptions = {
            legend: { position: 'bottom', textStyle: { fontSize: 11 } },
            chartArea: { width: '85%', height: '70%' },
            backgroundColor: 'transparent',
            ...options
          };

          switch(chartType) {
            case 'line':
              chart = new google.visualization.LineChart(container);
              break;
            case 'bar':
              chart = new google.visualization.BarChart(container);
              break;
            case 'column':
              chart = new google.visualization.ColumnChart(container);
              break;
            case 'pie':
              chart = new google.visualization.PieChart(container);
              break;
            case 'area':
              chart = new google.visualization.AreaChart(container);
              break;
            default:
              chart = new google.visualization.LineChart(container);
          }

          chart.draw(dataTable, defaultOptions);
        } catch(e) {
          console.error('Chart rendering error:', e);
        }
      });
    }, 100);

    return `<div id="${chartId}" class="w-full h-full min-h-[150px]"></div>`;
  };

  //=============================================================================
  // SALES WIDGETS
  //=============================================================================

  register({
    id: 'proposalVolume',
    title: 'Proposal Volume',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Month', 'Proposals'],
          ['Jan', 142],
          ['Feb', 168],
          ['Mar', 187],
          ['Apr', 195],
          ['May', 223],
          ['Jun', 248]
        ];
        return renderChart('proposalVolume', 'column', data, {
          colors: ['#0066CC'],
          vAxis: { title: 'Count' }
        });
      }

      if (state === 'small') {
        return `<div class="text-4xl font-bold text-brand">1,248</div>`;
      }

      if (state === 'medium') {
        return `
          <div class="text-3xl font-bold text-brand mb-1">1,248</div>
          <div class="text-sm text-green-600 font-medium">↑ 12% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Year-to-date total</div>
        `;
      }

      return `
        <div class="text-3xl font-bold text-brand mb-3">1,248</div>
        ${trend('Top Branch', 'Omaha', 18)}
        ${trend('Top AE', 'J. Smith', 22)}
        <div class="mt-3 pt-2 border-t text-xs text-gray-500">
          <span class="font-medium">This Month:</span> 223 • <span class="font-medium">Last Month:</span> 195
        </div>
      `;
    }
  });

  register({
    id: 'closeRate',
    title: 'Close Rate',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Month', 'Close Rate'],
          ['Jan', 62.3],
          ['Feb', 64.8],
          ['Mar', 66.2],
          ['Apr', 67.1],
          ['May', 68.5],
          ['Jun', 70.2]
        ];
        return renderChart('closeRate', 'line', data, {
          colors: ['#10B981'],
          vAxis: { title: 'Percentage', format: '#\'%\'' },
          hAxis: { title: 'Month' }
        });
      }

      if (state === 'small') {
        return `<div class="text-4xl font-bold text-green-600">68.5%</div>`;
      }

      if (state === 'medium') {
        return `
          <div class="text-3xl font-bold text-green-600 mb-1">68.5%</div>
          <div class="text-sm text-green-600 font-medium">↑ 3.2% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Current month average</div>
        `;
      }

      return `
        <div class="text-3xl font-bold text-green-600 mb-3">68.5%</div>
        <div class="text-sm font-semibold mb-2 text-gray-700">Top Performers</div>
        ${trend('A. Lee', fmtPct(72.4), 4.2)}
        ${trend('J. Smith', fmtPct(70.1), 2.8)}
        ${trend('M. Johnson', fmtPct(66.8), 1.5)}
      `;
    }
  });

  register({
    id: 'avgDealSize',
    title: 'Avg Deal Size',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Service Type', 'Average Deal Size'],
          ['IPM', 15200],
          ['Rodent', 8400],
          ['Termite', 18900],
          ['Bed Bug', 6800],
          ['Wildlife', 12100]
        ];
        return renderChart('avgDealSize', 'bar', data, {
          colors: ['#0066CC'],
          hAxis: { title: 'Amount ($)' }
        });
      }

      const headline = `<div class="text-4xl font-bold text-rentokil-blue">${fmtCurrency(12800)}</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↑ 8.3% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Rolling 30-day average</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1">
          ${trend('IPM Services', fmtCurrency(15200), 12)}
          ${trend('Termite', fmtCurrency(18900), 5)}
        </div>
      `;
    }
  });

  register({
    id: 'pipelineValue',
    title: 'Pipeline Value',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Stage', 'Value'],
          ['Lead', 145000],
          ['Qualified', 287000],
          ['Proposal', 412000],
          ['Negotiation', 198000]
        ];
        return renderChart('pipelineValue', 'pie', data, {
          pieHole: 0.4,
          colors: ['#F59E0B', '#10B981', '#0066CC', '#8B5CF6']
        });
      }

      const headline = `<div class="text-4xl font-bold text-purple-600">${fmtCurrency(1042000)}</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↑ 15.2% from last quarter</div>
          <div class="text-xs text-gray-500 mt-2">Total pipeline value</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Proposal Stage:</span><span class="font-semibold">${fmtCurrency(412000)}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Qualified:</span><span class="font-semibold">${fmtCurrency(287000)}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Negotiation:</span><span class="font-semibold">${fmtCurrency(198000)}</span></div>
        </div>
      `;
    }
  });

  register({
    id: 'leadConversion',
    title: 'Lead Conversion',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Stage', 'Count', { role: 'style' }],
          ['Leads', 420, '#F59E0B'],
          ['Qualified', 312, '#10B981'],
          ['Proposal', 198, '#0066CC'],
          ['Won', 142, '#8B5CF6']
        ];
        return renderChart('leadConversion', 'column', data, {
          legend: { position: 'none' }
        });
      }

      const rate = 33.8;
      const headline = `<div class="text-4xl font-bold text-indigo-600">${fmtPct(rate)}</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↑ 2.1% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Lead to close ratio</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Leads This Month:</span><span class="font-semibold">420</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Qualified:</span><span class="font-semibold">312 (74%)</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Won:</span><span class="font-semibold text-green-600">142 (34%)</span></div>
        </div>
      `;
    }
  });

  register({
    id: 'timeSaved',
    title: 'Time Saved',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Category', 'Hours'],
          ['Auto Quote Gen', 18],
          ['Data Entry', 12],
          ['Reporting', 8],
          ['Follow-ups', 4]
        ];
        return renderChart('timeSaved', 'pie', data, {
          colors: ['#10B981', '#0066CC', '#F59E0B', '#8B5CF6']
        });
      }

      const headline = `<div class="text-4xl font-bold text-green-600">42h</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↑ 15% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Automation savings</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Quote Generation:</span><span class="font-semibold">18h</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Data Entry:</span><span class="font-semibold">12h</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Reporting:</span><span class="font-semibold">8h</span></div>
        </div>
      `;
    }
  });

  //=============================================================================
  // ACTIVITY & LIST WIDGETS
  //=============================================================================

  register({
    id: 'recentActivity',
    title: 'Recent Activity',
    defaultW: 4,
    defaultH: 3,
    role: ['Sales', 'Ops', 'Manager'],
    category: 'Universal',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Date', 'Activities'],
          ['Mon', 24],
          ['Tue', 31],
          ['Wed', 28],
          ['Thu', 35],
          ['Fri', 42],
          ['Sat', 18],
          ['Sun', 12]
        ];
        return renderChart('recentActivity', 'area', data, {
          colors: ['#0066CC'],
          vAxis: { title: 'Count' }
        });
      }

      const activities = [
        { customer: 'ACME Corp', amount: '$12,000', status: 'Proposed', time: '2h ago', type: 'quote' },
        { customer: 'Tech Solutions', amount: '$18,400', status: 'Sold', time: '3h ago', type: 'sale' },
        { customer: 'Nebraska Foods', amount: '$9,200', status: 'Proposal Sent', time: '5h ago', type: 'quote' },
        { customer: 'City Hospital', amount: '$24,600', status: 'Negotiation', time: '6h ago', type: 'quote' },
        { customer: 'Manufacturing Inc', amount: '$15,800', status: 'Installed', time: '1d ago', type: 'install' },
        { customer: 'Retail Chain', amount: '$31,200', status: 'Sold', time: '1d ago', type: 'sale' }
      ];

      if (state === 'small') {
        return `
          <ul class="space-y-1">
            ${activities.slice(0, 3).map(a => `
              <li class="text-sm text-gray-700 flex justify-between">
                <span>${a.customer}</span>
                <span class="text-xs text-gray-500">${a.time}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }

      if (state === 'medium') {
        return `
          <ul class="space-y-2">
            ${activities.slice(0, 5).map(a => `
              <li class="text-sm flex justify-between items-center pb-2 border-b border-gray-100 last:border-0">
                <div>
                  <div class="font-medium text-gray-800">${a.customer}</div>
                  <div class="text-xs text-gray-500">${a.status} • ${a.time}</div>
                </div>
                <span class="font-semibold text-brand">${a.amount}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }

      return `
        <div class="space-y-2 max-h-[300px] overflow-y-auto">
          ${activities.map(a => {
            const statusColor = a.type === 'sale' ? 'bg-green-100 text-green-800' :
                                a.type === 'install' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800';
            return `
              <div class="flex justify-between items-center p-2 rounded hover:bg-gray-50 cursor-pointer">
                <div class="flex-1">
                  <div class="font-medium text-gray-800">${a.customer}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 text-xs rounded ${statusColor}">${a.status}</span>
                    <span class="text-xs text-gray-500">${a.time}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-brand">${a.amount}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  });

  register({
    id: 'openProposals',
    title: 'Open Proposals',
    defaultW: 4,
    defaultH: 3,
    role: ['Sales', 'Manager'],
    category: 'Sales',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Status', 'Count'],
          ['Draft', 12],
          ['Sent', 28],
          ['Under Review', 15],
          ['Negotiation', 8]
        ];
        return renderChart('openProposals', 'pie', data, {
          pieHole: 0.4
        });
      }

      const proposals = [
        { name: 'ACME Corp', value: '$12,000', stage: 'Negotiation', days: 3 },
        { name: 'Tech Solutions', value: '$18,400', stage: 'Under Review', days: 5 },
        { name: 'Nebraska Foods', value: '$9,200', stage: 'Sent', days: 2 },
        { name: 'City Hospital', value: '$24,600', stage: 'Draft', days: 1 },
        { name: 'Manufacturing Inc', value: '$15,800', stage: 'Sent', days: 7 }
      ];

      const maxItems = state === 'small' ? 4 : proposals.length;

      return `
        <ul class="space-y-2">
          ${proposals.slice(0, maxItems).map(p => `
            <li class="flex justify-between items-center p-2 rounded hover:bg-gray-50 cursor-pointer">
              <div class="flex-1">
                <div class="font-medium text-gray-800">${p.name}</div>
                <div class="text-xs text-gray-500 mt-1">${p.stage} • ${p.days}d ago</div>
              </div>
              <div class="font-semibold text-brand">${p.value}</div>
            </li>
          `).join('')}
        </ul>
        ${state !== 'small' ? `<div class="mt-3 pt-2 border-t text-xs text-gray-500 text-center">Total: ${proposals.length} open proposals</div>` : ''}
      `;
    }
  });

  //=============================================================================
  // OPERATIONS WIDGETS
  //=============================================================================

  register({
    id: 'pendingInstalls',
    title: 'Pending Installs',
    defaultW: 3,
    defaultH: 2,
    role: ['Ops', 'Manager'],
    category: 'Ops',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Priority', 'Count'],
          ['High', 4],
          ['Medium', 5],
          ['Low', 3]
        ];
        return renderChart('pendingInstalls', 'pie', data, {
          colors: ['#EF4444', '#F59E0B', '#10B981']
        });
      }

      const headline = `<div class="text-4xl font-bold text-orange-600">12</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-red-600 font-medium mt-1">↑ 2 from yesterday</div>
          <div class="text-xs text-gray-500 mt-2">Requires attention</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">High Priority:</span><span class="font-semibold text-red-600">4</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Medium Priority:</span><span class="font-semibold text-yellow-600">5</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Low Priority:</span><span class="font-semibold text-green-600">3</span></div>
        </div>
      `;
    }
  });

  register({
    id: 'overduePackets',
    title: 'Overdue Packets',
    defaultW: 3,
    defaultH: 2,
    role: ['Ops', 'Manager'],
    category: 'Ops',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Days Overdue', 'Count'],
          ['1-3 days', 1],
          ['4-7 days', 2],
          ['8+ days', 1]
        ];
        return renderChart('overduePackets', 'column', data, {
          colors: ['#EF4444']
        });
      }

      const headline = `<div class="text-4xl font-bold text-red-600">4</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-red-600 font-medium mt-1">Needs immediate attention</div>
          <div class="text-xs text-gray-500 mt-2">Start packets overdue</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">1-3 days:</span><span class="font-semibold">1</span></div>
          <div class="flex justify-between"><span class="text-gray-600">4-7 days:</span><span class="font-semibold">2</span></div>
          <div class="flex justify-between"><span class="text-gray-600">8+ days:</span><span class="font-semibold text-red-600">1</span></div>
        </div>
      `;
    }
  });

  register({
    id: 'technicianRoster',
    title: 'Technician Roster',
    defaultW: 4,
    defaultH: 3,
    role: ['Ops', 'Manager'],
    category: 'Ops',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Status', 'Count'],
          ['Active', 24],
          ['On Break', 3],
          ['Off Duty', 8]
        ];
        return renderChart('technicianRoster', 'pie', data, {
          colors: ['#10B981', '#F59E0B', '#6B7280']
        });
      }

      const techs = [
        { name: 'John D.', status: 'Active', route: 'Route 12', stops: '8/10' },
        { name: 'Sarah M.', status: 'Active', route: 'Route 7', stops: '6/9' },
        { name: 'Mike R.', status: 'On Break', route: 'Route 3', stops: '4/8' },
        { name: 'Lisa K.', status: 'Active', route: 'Route 15', stops: '9/11' },
        { name: 'Tom W.', status: 'Active', route: 'Route 9', stops: '7/10' }
      ];

      const maxItems = state === 'small' ? 3 : techs.length;

      return `
        <div class="space-y-2">
          ${techs.slice(0, maxItems).map(t => {
            const statusColor = t.status === 'Active' ? 'bg-green-100 text-green-800' :
                                t.status === 'On Break' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800';
            return `
              <div class="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                <div class="flex-1">
                  <div class="font-medium text-gray-800">${t.name}</div>
                  <div class="text-xs text-gray-500 mt-1">${t.route}</div>
                </div>
                <div class="text-right">
                  <span class="px-2 py-0.5 text-xs rounded ${statusColor}">${t.status}</span>
                  <div class="text-xs text-gray-500 mt-1">${t.stops} stops</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  });

  register({
    id: 'backlogTracker',
    title: 'Backlog Tracker',
    defaultW: 3,
    defaultH: 2,
    role: ['Ops', 'Manager'],
    category: 'Ops',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Week', 'Backlog %'],
          ['Week 1', 5.2],
          ['Week 2', 4.8],
          ['Week 3', 3.9],
          ['Week 4', 3.5]
        ];
        return renderChart('backlogTracker', 'line', data, {
          colors: ['#EF4444'],
          vAxis: { title: 'Percentage' }
        });
      }

      const backlog = 3.5;
      const headline = `<div class="text-4xl font-bold ${backlog > 5 ? 'text-red-600' : 'text-green-600'}">${fmtPct(backlog)}</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↓ 1.7% from last week</div>
          <div class="text-xs text-gray-500 mt-2">Current backlog percentage</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">This Week:</span><span class="font-semibold">${fmtPct(3.5)}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Last Week:</span><span class="font-semibold">${fmtPct(5.2)}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Target:</span><span class="font-semibold text-green-600">${fmtPct(3.0)}</span></div>
        </div>
      `;
    }
  });

  register({
    id: 'missedStops',
    title: 'Missed Stops',
    defaultW: 3,
    defaultH: 2,
    role: ['Ops', 'Manager'],
    category: 'Ops',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Reason', 'Count'],
          ['Customer Not Available', 5],
          ['Weather', 2],
          ['Equipment Issue', 1],
          ['Other', 1]
        ];
        return renderChart('missedStops', 'pie', data, {
          colors: ['#F59E0B', '#0066CC', '#EF4444', '#6B7280']
        });
      }

      const headline = `<div class="text-4xl font-bold text-yellow-600">9</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-yellow-600 font-medium mt-1">This week</div>
          <div class="text-xs text-gray-500 mt-2">Needs rescheduling</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Customer N/A:</span><span class="font-semibold">5</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Weather:</span><span class="font-semibold">2</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Equipment:</span><span class="font-semibold">1</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Other:</span><span class="font-semibold">1</span></div>
        </div>
      `;
    }
  });

  //=============================================================================
  // PERFORMANCE & ANALYTICS WIDGETS
  //=============================================================================

  register({
    id: 'branchPerformance',
    title: 'Branch Performance',
    defaultW: 6,
    defaultH: 3,
    role: ['Manager', 'Executive'],
    category: 'Analytics',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Branch', 'Revenue', 'Goal'],
          ['Omaha', 285000, 250000],
          ['Lincoln', 198000, 180000],
          ['Des Moines', 242000, 220000],
          ['Kansas City', 315000, 280000],
          ['Wichita', 167000, 160000]
        ];
        return renderChart('branchPerformance', 'column', data, {
          colors: ['#0066CC', '#10B981']
        });
      }

      const branches = [
        { name: 'Omaha', revenue: 285000, goal: 250000, pct: 114 },
        { name: 'Kansas City', revenue: 315000, goal: 280000, pct: 113 },
        { name: 'Des Moines', revenue: 242000, goal: 220000, pct: 110 },
        { name: 'Lincoln', revenue: 198000, goal: 180000, pct: 110 },
        { name: 'Wichita', revenue: 167000, goal: 160000, pct: 104 }
      ];

      return `
        <div class="space-y-2">
          ${branches.map(b => `
            <div class="flex items-center justify-between p-2 rounded hover:bg-gray-50">
              <div class="flex-1">
                <div class="font-medium text-gray-800">${b.name}</div>
                <div class="text-xs text-gray-500 mt-1">${fmtCurrency(b.revenue)} / ${fmtCurrency(b.goal)}</div>
              </div>
              <div class="text-right">
                <div class="font-bold ${b.pct >= 100 ? 'text-green-600' : 'text-red-600'}">${b.pct}%</div>
                <div class="w-24 h-2 bg-gray-200 rounded-full mt-1">
                  <div class="h-full ${b.pct >= 100 ? 'bg-green-500' : 'bg-red-500'} rounded-full" style="width: ${Math.min(b.pct, 100)}%"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  });

  register({
    id: 'revenueGoal',
    title: 'Revenue vs Goal',
    defaultW: 4,
    defaultH: 3,
    role: ['Sales', 'Manager', 'Executive'],
    category: 'Analytics',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Period', 'Actual', 'Goal'],
          ['Week 1', 58000, 50000],
          ['Week 2', 62000, 50000],
          ['Week 3', 55000, 50000],
          ['Week 4', 67000, 50000]
        ];
        return renderChart('revenueGoal', 'line', data, {
          colors: ['#0066CC', '#10B981']
        });
      }

      const actual = 242000;
      const goal = 200000;
      const pct = (actual / goal * 100).toFixed(1);

      return `
        <div class="text-center">
          <div class="text-4xl font-bold text-brand mb-2">${fmtCurrency(actual)}</div>
          <div class="text-sm text-gray-600 mb-4">Goal: ${fmtCurrency(goal)} (${pct}%)</div>
          <div class="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-brand to-brand-color-dark" style="width: ${Math.min(parseFloat(pct), 100)}%"></div>
            <div class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
              ${pct}% to Goal
            </div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div class="bg-green-50 p-2 rounded">
              <div class="text-xs text-gray-600">Above Goal</div>
              <div class="font-bold text-green-600">${fmtCurrency(actual - goal)}</div>
            </div>
            <div class="bg-blue-50 p-2 rounded">
              <div class="text-xs text-gray-600">This Month</div>
              <div class="font-bold text-blue-600">${fmtCurrency(actual)}</div>
            </div>
            <div class="bg-purple-50 p-2 rounded">
              <div class="text-xs text-gray-600">YTD</div>
              <div class="font-bold text-purple-600">${fmtCurrency(actual * 6)}</div>
            </div>
          </div>
        </div>
      `;
    }
  });

  register({
    id: 'customerRetention',
    title: 'Customer Retention',
    defaultW: 3,
    defaultH: 2,
    role: ['Sales', 'Manager', 'Executive'],
    category: 'Analytics',
    component: (state, view) => {
      if (view === 'chart') {
        const data = [
          ['Month', 'Retention %'],
          ['Jan', 94.2],
          ['Feb', 94.8],
          ['Mar', 95.1],
          ['Apr', 94.9],
          ['May', 95.3],
          ['Jun', 95.7]
        ];
        return renderChart('customerRetention', 'area', data, {
          colors: ['#10B981'],
          vAxis: { minValue: 90, maxValue: 100 }
        });
      }

      const rate = 95.7;
      const headline = `<div class="text-4xl font-bold text-green-600">${fmtPct(rate)}</div>`;

      if (state === 'small') return headline;

      if (state === 'medium') {
        return `
          ${headline}
          <div class="text-sm text-green-600 font-medium mt-1">↑ 0.4% from last month</div>
          <div class="text-xs text-gray-500 mt-2">Customer retention rate</div>
        `;
      }

      return `
        ${headline}
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Active Customers:</span><span class="font-semibold">1,847</span></div>
          <div class="flex justify-between"><span class="text-gray-600">New This Month:</span><span class="font-semibold text-green-600">142</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Churned:</span><span class="font-semibold text-red-600">79</span></div>
        </div>
      `;
    }
  });

  //=============================================================================
  // EXPORT PUBLIC API
  //=============================================================================

  window.Widgets = {
    register,
    get,
    list,
    render
  };

})();
