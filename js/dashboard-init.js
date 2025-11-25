/**
 * ===============================================================================
 * DASHBOARD INITIALIZATION SCRIPT
 * ===============================================================================
 * Integrates all enhanced components and initializes the dashboard system
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
  } else {
    initializeDashboard();
  }

  /**
   * Main dashboard initialization
   */
  async function initializeDashboard() {
    console.log('[Dashboard] Starting initialization...');

    try {
      // Step 1: Initialize core systems
      await initializeCoreSystems();

      // Step 2: Load user data
      await loadUserData();

      // Step 3: Initialize widgets
      initializeWidgets();

      // Step 4: Load dashboard layout
      await loadDashboardLayout();

      // Step 5: Initialize event listeners
      initializeEventListeners();

      // Step 6: Load dashboard data
      await loadDashboardData();

      // Step 7: Setup auto-refresh
      setupAutoRefresh();

      console.log('[Dashboard] Initialization complete!');
      showInitializationComplete();

    } catch (error) {
      console.error('[Dashboard] Initialization failed:', error);
      showInitializationError(error);
    }
  }

  /**
   * Initialize core systems
   */
  async function initializeCoreSystems() {
    console.log('[Dashboard] Initializing core systems...');

    // Initialize cache layer (already auto-initialized)
    if (window.CacheLayer) {
      console.log('[Dashboard] Cache layer ready');
    }

    // Initialize data validation
    if (window.DataValidation) {
      console.log('[Dashboard] Data validation ready');
    }

    // Initialize AppState if not already initialized
    if (window.AppState && !window.AppState.initialized) {
      window.AppState.initialize();
      console.log('[Dashboard] AppState initialized');
    }

    // Load Google Charts
    await loadGoogleCharts();
  }

  /**
   * Load Google Charts API
   */
  function loadGoogleCharts() {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.charts) {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(resolve);
        return;
      }

      // Load Google Charts script
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/charts/loader.js';
      script.onload = () => {
        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Load user data
   */
  async function loadUserData() {
    console.log('[Dashboard] Loading user data...');

    try {
      // Try to get from cache first
      let userData = window.CacheLayer?.get('current_user');

      if (!userData) {
        // Fetch from backend
        if (typeof google !== 'undefined' && google.script?.run) {
          userData = await new Promise((resolve, reject) => {
            google.script.run
              .withSuccessHandler(resolve)
              .withFailureHandler(reject)
              .getCurrentUser();
          });

          // Cache user data
          if (window.CacheLayer) {
            window.CacheLayer.set('current_user', userData, {
              ttl: window.CacheLayer.config.TTL.userData,
              persistent: true
            });
          }
        } else {
          // Mock user for development
          userData = {
            name: 'Demo User',
            email: 'demo@rentokil.com',
            role: 'Sales',
            branch: 'Omaha',
            branchId: 'BR001'
          };
        }
      }

      // Set global user object
      window.currentUser = userData;

      // Update UI
      updateUserInfo(userData);

      console.log('[Dashboard] User data loaded:', userData.name);
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);

      // Set fallback user
      window.currentUser = {
        name: 'Guest User',
        email: 'guest@rentokil.com',
        role: 'Sales',
        branch: 'Demo',
        branchId: 'BR000'
      };
    }
  }

  /**
   * Update user info in UI
   */
  function updateUserInfo(userData) {
    // Update user info displays
    const nameElements = document.querySelectorAll('[data-user-name]');
    nameElements.forEach(el => el.textContent = userData.name);

    const emailElements = document.querySelectorAll('[data-user-email]');
    emailElements.forEach(el => el.textContent = userData.email);

    const roleElements = document.querySelectorAll('[data-user-role]');
    roleElements.forEach(el => el.textContent = userData.role);

    const branchElements = document.querySelectorAll('[data-user-branch]');
    branchElements.forEach(el => el.textContent = userData.branch);

    // Update settings panel if it exists
    const currentUserInfo = document.getElementById('currentUserInfo');
    if (currentUserInfo) currentUserInfo.textContent = userData.email;

    const currentUserRole = document.getElementById('currentUserRole');
    if (currentUserRole) currentUserRole.textContent = userData.role;

    const currentUserBranch = document.getElementById('currentUserBranch');
    if (currentUserBranch) currentUserBranch.textContent = userData.branch;
  }

  /**
   * Initialize widgets system
   */
  function initializeWidgets() {
    console.log('[Dashboard] Initializing widgets...');

    if (!window.Widgets) {
      console.error('[Dashboard] Widgets system not found!');
      return;
    }

    const widgetCount = window.Widgets.list().length;
    console.log(`[Dashboard] ${widgetCount} widgets registered`);

    // Initialize widget library modal
    initializeWidgetLibrary();
  }

  /**
   * Initialize widget library modal
   */
  function initializeWidgetLibrary() {
    const widgetLibraryBtn = document.getElementById('widgetLibraryBtn');
    if (!widgetLibraryBtn) return;

    widgetLibraryBtn.addEventListener('click', showWidgetLibrary);
  }

  /**
   * Show widget library modal
   */
  function showWidgetLibrary() {
    if (!window.Widgets || !window.DashboardConfigs) return;

    const role = window.currentUser?.role || 'Sales';
    const allowedWidgets = window.DashboardConfigs.getAllowedWidgets(role);
    const categories = window.DashboardConfigs.getCategories();

    // Get current layout to determine which widgets are already added
    const currentWidgets = window.layoutEngine?.getLayout().map(w => w.id) || [];

    let modalHTML = `
      <div id="widgetLibraryModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-2xl font-bold text-gray-800">Widget Library</h2>
            <button onclick="document.getElementById('widgetLibraryModal').remove()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6">
    `;

    // Render widgets by category
    for (const [category, widgetIds] of Object.entries(categories)) {
      const categoryWidgets = widgetIds.filter(id => allowedWidgets.includes(id));
      if (categoryWidgets.length === 0) continue;

      modalHTML += `
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-3">${category}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      `;

      categoryWidgets.forEach(widgetId => {
        const widget = window.Widgets.get(widgetId);
        if (!widget) return;

        const isAdded = currentWidgets.includes(widgetId);

        modalHTML += `
          <div class="border-2 ${isAdded ? 'border-green-500 bg-green-50' : 'border-gray-200'} rounded-lg p-4 hover:border-brand hover:shadow-md transition-all cursor-pointer"
               onclick="${isAdded ? '' : `window.addWidgetToLayout('${widgetId}')`}">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-semibold text-gray-800">${widget.title}</h4>
              ${isAdded ? '<span class="text-xs text-green-600">✓ Added</span>' : '<span class="text-xs text-blue-600">+ Add</span>'}
            </div>
            <div class="text-xs text-gray-500 mb-2">${widget.defaultW}x${widget.defaultH} grid</div>
            <div class="text-sm text-gray-600">View as: Number, Chart</div>
          </div>
        `;
      });

      modalHTML += `
          </div>
        </div>
      `;
    }

    modalHTML += `
          </div>
          <div class="p-6 border-t bg-gray-50">
            <button onclick="document.getElementById('widgetLibraryModal').remove()"
                    class="w-full px-6 py-3 bg-brand text-white rounded-md hover:bg-brand-color-light">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('widgetLibraryModal');
    if (existingModal) existingModal.remove();

    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * Load dashboard layout
   */
  async function loadDashboardLayout() {
    console.log('[Dashboard] Loading dashboard layout...');

    try {
      const role = window.currentUser?.role || 'Sales';

      // Try to load user's custom layout
      let layout = await window.CacheLayer?.fetchGASWithCache(
        'loadUserWidgetLayout',
        [role],
        { ttl: window.CacheLayer.config.TTL.userData }
      );

      // If no custom layout, use defaults
      if (!layout || layout.length === 0) {
        layout = window.DashboardConfigs?.getDefaultLayout(role);
        console.log(`[Dashboard] Using default layout for ${role}`);
      } else {
        console.log(`[Dashboard] Loaded custom layout for ${role}`);
      }

      // Initialize layout engine if available
      if (window.layoutEngine && layout) {
        window.layoutEngine.loadLayout(layout);
      }

    } catch (error) {
      console.error('[Dashboard] Failed to load layout:', error);

      // Use default layout
      const role = window.currentUser?.role || 'Sales';
      const defaultLayout = window.DashboardConfigs?.getDefaultLayout(role);
      if (window.layoutEngine && defaultLayout) {
        window.layoutEngine.loadLayout(defaultLayout);
      }
    }
  }

  /**
   * Load dashboard data
   */
  async function loadDashboardData() {
    console.log('[Dashboard] Loading dashboard data...');

    try {
      const role = window.currentUser?.role || 'Sales';

      // Fetch dashboard data with caching
      const data = await window.CacheLayer?.fetchGASWithCache(
        'getDashboardData',
        [role],
        { ttl: window.CacheLayer.config.TTL.dashboardData }
      );

      // Update dashboard with data
      if (data && window.AppState) {
        window.AppState.setState('dashboardData', data);
      }

      console.log('[Dashboard] Dashboard data loaded');

      // Prefetch widget data
      const layout = window.layoutEngine?.getLayout() || [];
      const widgetIds = layout.map(w => w.id);
      if (widgetIds.length > 0 && window.CacheLayer) {
        window.CacheLayer.prefetchWidgetData(widgetIds);
      }

    } catch (error) {
      console.error('[Dashboard] Failed to load dashboard data:', error);
    }
  }

  /**
   * Initialize event listeners
   */
  function initializeEventListeners() {
    console.log('[Dashboard] Initializing event listeners...');

    // Unified quote entry button
    const quoteEntryBtn = document.getElementById('unifiedQuoteEntryBtn');
    if (quoteEntryBtn) {
      quoteEntryBtn.addEventListener('click', () => {
        if (window.openUnifiedQuoteForm) {
          window.openUnifiedQuoteForm();
        }
      });
    }

    // Legacy sales entry button - redirect to unified form
    const salesEntryBtn = document.getElementById('salesEntryBtn');
    if (salesEntryBtn) {
      salesEntryBtn.addEventListener('click', () => {
        if (window.openUnifiedQuoteForm) {
          window.openUnifiedQuoteForm();
        }
      });
    }

    // Refresh dashboard button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshDashboard);
    }

    // Toggle view buttons (chart vs number)
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-toggle-view]')) {
        const widgetId = e.target.dataset.widgetId;
        toggleWidgetView(widgetId);
      }
    });

    // Listen for cache clear requests
    window.addEventListener('clearCache', () => {
      if (window.CacheLayer) {
        window.CacheLayer.clear();
        console.log('[Dashboard] Cache cleared');
        refreshDashboard();
      }
    });
  }

  /**
   * Toggle widget view (number vs chart)
   */
  function toggleWidgetView(widgetId) {
    // Implementation depends on layout engine
    if (window.layoutEngine && window.layoutEngine.toggleWidgetView) {
      window.layoutEngine.toggleWidgetView(widgetId);
    }
  }

  /**
   * Refresh dashboard data
   */
  async function refreshDashboard(forceRefresh = false) {
    console.log('[Dashboard] Refreshing dashboard...');

    try {
      if (forceRefresh && window.CacheLayer) {
        // Clear dashboard-related caches
        window.CacheLayer.invalidate(/^(dashboard_|widget_)/);
      }

      // Reload dashboard data
      await loadDashboardData();

      // Refresh widgets
      if (window.layoutEngine && window.layoutEngine.refreshAllWidgets) {
        window.layoutEngine.refreshAllWidgets();
      }

      // Show success message
      if (window.DataValidation) {
        window.DataValidation.showToast('Dashboard refreshed', 'success');
      }

    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error);

      if (window.DataValidation) {
        window.DataValidation.showToast('Failed to refresh dashboard', 'error');
      }
    }
  }

  /**
   * Setup auto-refresh
   */
  function setupAutoRefresh() {
    // Refresh dashboard data every 5 minutes
    setInterval(() => {
      console.log('[Dashboard] Auto-refresh triggered');
      refreshDashboard();
    }, 5 * 60 * 1000);

    console.log('[Dashboard] Auto-refresh scheduled (5 minutes)');
  }

  /**
   * Show initialization complete message
   */
  function showInitializationComplete() {
    // Hide loading spinner if present
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }

    // Show dashboard content
    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
      dashboardContent.classList.remove('hidden');
    }

    // Show welcome message
    if (window.DataValidation && window.currentUser) {
      window.DataValidation.showToast(
        `Welcome back, ${window.currentUser.name}!`,
        'success'
      );
    }
  }

  /**
   * Show initialization error
   */
  function showInitializationError(error) {
    console.error('[Dashboard] Initialization error:', error);

    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="max-w-2xl mx-auto mt-12 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
          <div class="flex items-start gap-4">
            <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
            </svg>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-red-800 mb-2">Dashboard Initialization Failed</h3>
              <p class="text-sm text-red-700 mb-4">${error.message}</p>
              <button onclick="location.reload()" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      `;
      errorContainer.classList.remove('hidden');
    }
  }

  /**
   * Add widget to layout
   */
  window.addWidgetToLayout = function(widgetId) {
    if (!window.layoutEngine) {
      console.error('[Dashboard] Layout engine not available');
      return;
    }

    const widget = window.Widgets?.get(widgetId);
    if (!widget) {
      console.error('[Dashboard] Widget not found:', widgetId);
      return;
    }

    // Add widget with default size
    window.layoutEngine.addWidget({
      id: widgetId,
      w: widget.defaultW,
      h: widget.defaultH
    });

    // Close modal
    const modal = document.getElementById('widgetLibraryModal');
    if (modal) modal.remove();

    // Show success message
    if (window.DataValidation) {
      window.DataValidation.showToast(`${widget.title} added to dashboard`, 'success');
    }
  };

  /**
   * Refresh dashboard function (exposed globally)
   */
  window.refreshDashboard = refreshDashboard;

  /**
   * Show widget library (exposed globally)
   */
  window.showWidgetLibrary = showWidgetLibrary;

})();
