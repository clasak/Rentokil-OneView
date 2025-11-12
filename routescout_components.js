/**
 * Route Scout UI Components
 * src/modules/route_scout/components/components.js
 * 
 * All reusable UI components for Route Scout
 */

// ===== TOP BAR =====
export function TopBar() {
  return `
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">Route Scout</h1>
        <svg class="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
      </div>
    </div>
  `;
}

// ===== BOTTOM NAV BAR =====
export const NavBarAPI = {
  render() {
    return `
      <nav class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-around py-2">
          <a href="#home" class="rs-nav-item" data-route="home">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="text-xs mt-1">Home</span>
          </a>
          <a href="#map" class="rs-nav-item" data-route="map">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
            <span class="text-xs mt-1">Map</span>
          </a>
          <a href="#route" class="rs-nav-item" data-route="route">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <span class="text-xs mt-1">Route</span>
          </a>
          <a href="#more" class="rs-nav-item" data-route="more">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
            <span class="text-xs mt-1">More</span>
          </a>
        </div>
      </nav>
    `;
  },

  setActiveFromHash() {
    const hash = window.location.hash.slice(1).split('/')[0] || 'home';
    document.querySelectorAll('.rs-nav-item').forEach(item => {
      const route = item.getAttribute('data-route');
      if (route === hash) {
        item.classList.add('rs-nav-active');
      } else {
        item.classList.remove('rs-nav-active');
      }
    });
  }
};

// ===== TOAST NOTIFICATIONS =====
export function Toast(container) {
  function show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `rs-toast rs-toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('rs-toast-show'), 10);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('rs-toast-show');
      setTimeout(() => container.removeChild(toast), 300);
    }, duration);
  }

  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    warning: (msg) => show(msg, 'warning'),
    info: (msg) => show(msg, 'info')
  };
}

// ===== BOTTOM SHEET =====
export function BottomSheet() {
  let isOpen = false;
  let onApply = null;
  let onClear = null;

  function render() {
    return `
      <div class="rs-bottom-sheet" id="rsBottomSheet">
        <div class="rs-bottom-sheet-backdrop"></div>
        <div class="rs-bottom-sheet-content">
          <div class="rs-bottom-sheet-header">
            <h3 class="text-lg font-semibold">Filter by Vertical</h3>
            <button class="rs-bottom-sheet-close" onclick="window.rsCloseBottomSheet()">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="rs-bottom-sheet-body" id="rsBottomSheetBody">
            <!-- Content injected dynamically -->
          </div>
          <div class="rs-bottom-sheet-footer">
            <button class="btn-secondary" onclick="window.rsClearFilters()">Clear</button>
            <button class="btn-primary" onclick="window.rsApplyFilters()">Apply</button>
          </div>
        </div>
      </div>
    `;
  }

  function open(options = {}) {
    isOpen = true;
    onApply = options.onApply || null;
    onClear = options.onClear || null;

    const sheet = document.getElementById('rsBottomSheet');
    if (sheet) {
      sheet.classList.add('rs-bottom-sheet-open');
    }

    // Render vertical chips if provided
    if (options.verticals) {
      renderVerticalChips(options.verticals, options.selected || []);
    }
  }

  function close() {
    isOpen = false;
    const sheet = document.getElementById('rsBottomSheet');
    if (sheet) {
      sheet.classList.remove('rs-bottom-sheet-open');
    }
  }

  function renderVerticalChips(verticals, selected) {
    const body = document.getElementById('rsBottomSheetBody');
    if (!body) return;

    const selectedSet = new Set(selected);

    body.innerHTML = `
      <div class="space-y-2">
        ${verticals.map(v => `
          <label class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
            <input type="checkbox" 
                   class="rs-vertical-checkbox" 
                   value="${v}" 
                   ${selectedSet.has(v) ? 'checked' : ''}>
            <span class="text-sm font-medium text-gray-900 dark:text-white">${v}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  function getSelectedVerticals() {
    const checkboxes = document.querySelectorAll('.rs-vertical-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  // Global functions for onclick handlers
  window.rsCloseBottomSheet = close;
  window.rsApplyFilters = () => {
    if (onApply) {
      const selected = getSelectedVerticals();
      onApply(selected);
    }
    close();
  };
  window.rsClearFilters = () => {
    document.querySelectorAll('.rs-vertical-checkbox').forEach(cb => cb.checked = false);
    if (onClear) {
      onClear();
    }
  };

  // Listen for global event
  document.addEventListener('rs:openFilterSheet', (e) => {
    open(e.detail || {});
  });

  return {
    render,
    open,
    close
  };
}

// ===== DATE PILLS =====
export function DatePills(currentDate, onDateChange) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = (d) => d.toISOString().split('T')[0];
  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(tomorrow);

  const isToday = currentDate === todayStr;
  const isTomorrow = currentDate === tomorrowStr;

  return `
    <div class="flex space-x-2 mb-4">
      <button 
        class="px-4 py-2 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        onclick="window.rsSetDate('${todayStr}')">
        Today
      </button>
      <button 
        class="px-4 py-2 rounded-full ${isTomorrow ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        onclick="window.rsSetDate('${tomorrowStr}')">
        Tomorrow
      </button>
      <button 
        class="px-4 py-2 rounded-full ${!isToday && !isTomorrow ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
        onclick="window.rsOpenDatePicker()">
        Pick Date
      </button>
    </div>
  `;
}

// ===== EMPTY STATE =====
export function EmptyState(icon, title, message) {
  return `
    <div class="rs-empty-state">
      ${icon}
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${title}</h3>
      <p class="text-gray-600 dark:text-gray-400">${message}</p>
    </div>
  `;
}
