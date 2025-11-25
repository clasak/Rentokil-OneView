/**
 * ===============================================================================
 * HIERARCHICAL DASHBOARD
 * ===============================================================================
 * Multi-level dashboard for Branch, Area, Region, and Market managers
 * Provides overview + drill-down capabilities
 */

(function() {
  'use strict';

  //=============================================================================
  // HIERARCHY DASHBOARD MANAGER
  //=============================================================================

  class HierarchyDashboard {
    constructor() {
      this.currentLevel = null;
      this.currentId = null;
      this.currentData = null;
      this.breadcrumbs = [];
      this.viewMode = 'overview'; // overview | details

      this.init();
    }

    async init() {
      console.log('[HierarchyDashboard] Initializing hierarchy dashboard...');

      // Determine user's hierarchy level
      this.determineHierarchyLevel();

      // Load initial data
      await this.loadCurrentLevel();

      // Setup UI
      this.setupUI();

      // Subscribe to updates
      this.subscribeToUpdates();

      console.log('[HierarchyDashboard] Hierarchy dashboard ready');
    }

    /**
     * Determine user's hierarchy level
     */
    determineHierarchyLevel() {
      const user = window.currentUser;
      if (!user) return;

      if (user.role === 'Manager' || user.hierarchyLevel === 'branch') {
        this.currentLevel = 'branch';
        this.currentId = user.branchId;
      } else if (user.hierarchyLevel === 'area') {
        this.currentLevel = 'area';
        this.currentId = user.areaId;
      } else if (user.hierarchyLevel === 'region') {
        this.currentLevel = 'region';
        this.currentId = user.regionId;
      } else if (user.hierarchyLevel === 'market' || user.role === 'Executive') {
        this.currentLevel = 'market';
        this.currentId = user.marketId || 'MKT001';
      }

      console.log(`[HierarchyDashboard] Level: ${this.currentLevel}, ID: ${this.currentId}`);
    }

    /**
     * Load current hierarchy level data
     */
    async loadCurrentLevel() {
      try {
        this.currentData = await window.DataSync?.hierarchy.getCurrentHierarchyData();

        if (!this.currentData) {
          // Fallback to mock data
          this.currentData = this.getMockHierarchyData();
        }

        console.log('[HierarchyDashboard] Loaded data:', this.currentData);

        this.render();
      } catch (error) {
        console.error('[HierarchyDashboard] Failed to load data:', error);
        this.showError(error);
      }
    }

    /**
     * Drill down into child entity
     */
    async drillDown(childId, childName) {
      try {
        // Add to breadcrumbs
        this.breadcrumbs.push({
          level: this.currentLevel,
          id: this.currentId,
          name: this.currentData?.name || 'Back'
        });

        // Get child level
        const childLevel = this.getChildLevel(this.currentLevel);
        if (!childLevel) {
          console.warn('[HierarchyDashboard] Cannot drill down further');
          return;
        }

        // Load child data
        const childData = await window.DataSync?.service.getHierarchicalData(childLevel, childId);

        // Update current state
        this.currentLevel = childLevel;
        this.currentId = childId;
        this.currentData = childData;

        // Render
        this.render();

      } catch (error) {
        console.error('[HierarchyDashboard] Drill down failed:', error);
        this.showError(error);
      }
    }

    /**
     * Navigate back up the hierarchy
     */
    navigateBack() {
      if (this.breadcrumbs.length === 0) return;

      const previous = this.breadcrumbs.pop();

      this.currentLevel = previous.level;
      this.currentId = previous.id;

      // Reload data
      this.loadCurrentLevel();
    }

    /**
     * Get child level
     */
    getChildLevel(currentLevel) {
      const hierarchy = {
        market: 'region',
        region: 'area',
        area: 'branch',
        branch: null
      };

      return hierarchy[currentLevel];
    }

    /**
     * Setup UI
     */
    setupUI() {
      const container = document.getElementById('hierarchyDashboardContainer');
      if (!container) {
        console.warn('[HierarchyDashboard] Container not found');
        return;
      }

      this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Drill down
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-drill-down]')) {
          const childId = e.target.closest('[data-drill-down]').dataset.drillDown;
          const childName = e.target.closest('[data-drill-down]').dataset.childName;
          this.drillDown(childId, childName);
        }
      });

      // Navigate back
      document.addEventListener('click', (e) => {
        if (e.target.closest('#hierarchyBackBtn')) {
          this.navigateBack();
        }
      });

      // Toggle view mode
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-view-mode]')) {
          this.viewMode = e.target.closest('[data-view-mode]').dataset.viewMode;
          this.render();
        }
      });
    }

    /**
     * Subscribe to real-time updates
     */
    subscribeToUpdates() {
      // Subscribe to metrics updates
      window.DataSync?.subscribe(`${this.currentLevel}_metrics_update`, (metrics) => {
        console.log('[HierarchyDashboard] Metrics updated:', metrics);
        this.handleMetricsUpdate(metrics);
      });

      // Subscribe to deal state changes
      window.DataSync?.subscribe('deal_state_changed', (update) => {
        // Refresh if relevant to current view
        if (this.isDealRelevant(update)) {
          this.loadCurrentLevel();
        }
      });
    }

    /**
     * Handle metrics update
     */
    handleMetricsUpdate(metrics) {
      // Update current data
      if (this.currentData) {
        this.currentData.metrics = {
          ...this.currentData.metrics,
          ...metrics
        };
      }

      // Re-render metrics section
      this.renderMetrics();
    }

    /**
     * Check if deal is relevant to current view
     */
    isDealRelevant(update) {
      // Would check if deal belongs to current hierarchy level
      return true; // Simplified
    }

    /**
     * Render dashboard
     */
    render() {
      const container = document.getElementById('hierarchyDashboardContainer');
      if (!container) return;

      container.innerHTML = this.getTemplate();

      // Render components
      this.renderBreadcrumbs();
      this.renderHeader();
      this.renderMetrics();
      this.renderChildren();
      this.renderAlerts();

      if (this.viewMode === 'details') {
        this.renderDetailedView();
      }
    }

    /**
     * Render breadcrumbs
     */
    renderBreadcrumbs() {
      const container = document.getElementById('hierarchyBreadcrumbs');
      if (!container) return;

      if (this.breadcrumbs.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = `
        <button id="hierarchyBackBtn" class="flex items-center gap-2 text-brand hover:text-brand-color-dark">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span>Back to ${this.breadcrumbs[this.breadcrumbs.length - 1].name}</span>
        </button>
      `;
    }

    /**
     * Render header
     */
    renderHeader() {
      const container = document.getElementById('hierarchyHeader');
      if (!container) return;

      const levelLabels = {
        market: 'Market',
        region: 'Region',
        area: 'Area',
        branch: 'Branch'
      };

      container.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold text-gray-800">${this.currentData?.name || 'Loading...'}</h1>
              <span class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                ${levelLabels[this.currentLevel]}
              </span>
            </div>
            <p class="text-gray-600">
              ${this.currentData?.summary?.teamSize || 0} employees •
              ${this.currentData?.summary?.activeCustomers || 0} customers •
              ${this.currentData?.summary?.totalDeals || 0} deals
            </p>
          </div>

          <div class="flex gap-2">
            <button data-view-mode="overview"
                    class="px-4 py-2 ${this.viewMode === 'overview' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'} rounded-md hover:opacity-80">
              Overview
            </button>
            <button data-view-mode="details"
                    class="px-4 py-2 ${this.viewMode === 'details' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'} rounded-md hover:opacity-80">
              Details
            </button>
          </div>
        </div>
      `;
    }

    /**
     * Render metrics
     */
    renderMetrics() {
      const container = document.getElementById('hierarchyMetrics');
      if (!container) return;

      const metrics = this.currentData?.metrics || {};
      const summary = this.currentData?.summary || {};

      container.innerHTML = `
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div class="text-sm text-blue-700 font-medium mb-2">Total Revenue</div>
            <div class="text-3xl font-bold text-blue-900">${this.formatCurrency(summary.totalRevenue)}</div>
            <div class="text-sm ${metrics.revenueToGoal >= 100 ? 'text-green-600' : 'text-red-600'} mt-2">
              ${metrics.revenueToGoal?.toFixed(1)}% to goal
            </div>
          </div>

          <div class="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div class="text-sm text-green-700 font-medium mb-2">Close Rate</div>
            <div class="text-3xl font-bold text-green-900">${metrics.closeRate?.toFixed(1)}%</div>
            <div class="text-sm text-gray-600 mt-2">
              <span class="text-green-600">↑</span> vs last month
            </div>
          </div>

          <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <div class="text-sm text-purple-700 font-medium mb-2">Avg Deal Size</div>
            <div class="text-3xl font-bold text-purple-900">${this.formatCurrency(metrics.avgDealSize)}</div>
            <div class="text-sm text-gray-600 mt-2">Per closed deal</div>
          </div>

          <div class="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <div class="text-sm text-orange-700 font-medium mb-2">Customer Retention</div>
            <div class="text-3xl font-bold text-orange-900">${metrics.customerRetention?.toFixed(1)}%</div>
            <div class="text-sm text-gray-600 mt-2">Active customers</div>
          </div>
        </div>
      `;
    }

    /**
     * Render children (branches, areas, etc.)
     */
    renderChildren() {
      const container = document.getElementById('hierarchyChildren');
      if (!container) return;

      const children = this.currentData?.children || [];

      if (children.length === 0 || this.currentLevel === 'branch') {
        container.innerHTML = '';
        return;
      }

      const childLevel = this.getChildLevel(this.currentLevel);
      const childLabelPlural = {
        region: 'Regions',
        area: 'Areas',
        branch: 'Branches'
      };

      container.innerHTML = `
        <div class="bg-white rounded-lg shadow-md">
          <div class="p-6 border-b">
            <h2 class="text-xl font-bold text-gray-800">${childLabelPlural[childLevel] || 'Child Entities'}</h2>
            <p class="text-sm text-gray-600 mt-1">Click to drill down for detailed view</p>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${children.map(child => this.renderChildCard(child)).join('')}
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render child card
     */
    renderChildCard(child) {
      const formatted = window.DataSync?.hierarchy.formatHierarchyData({ children: [child] });
      const childData = formatted?.children?.[0] || child;

      const statusColors = {
        excellent: 'bg-green-100 border-green-300 text-green-800',
        good: 'bg-blue-100 border-blue-300 text-blue-800',
        fair: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        needs_attention: 'bg-red-100 border-red-300 text-red-800'
      };

      const statusColor = statusColors[childData.status] || statusColors.fair;

      return `
        <div data-drill-down="${child.id}" data-child-name="${child.name}"
             class="border-2 border-gray-200 rounded-lg p-4 hover:border-brand hover:shadow-lg cursor-pointer transition-all">
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-semibold text-gray-800">${child.name}</h3>
            <span class="px-2 py-1 text-xs rounded ${statusColor}">
              ${childData.performance || 'B'}
            </span>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Revenue:</span>
              <span class="font-semibold">${this.formatCurrency(child.revenue)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">To Goal:</span>
              <span class="font-semibold ${childData.metrics?.revenueToGoal >= 100 ? 'text-green-600' : 'text-red-600'}">
                ${childData.metrics?.revenueToGoal?.toFixed(1)}%
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Deals:</span>
              <span class="font-semibold">${childData.metrics?.deals || 0}</span>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t">
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-brand rounded-full" style="width: ${Math.min(childData.metrics?.revenueToGoal || 0, 100)}%"></div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render alerts
     */
    renderAlerts() {
      const container = document.getElementById('hierarchyAlerts');
      if (!container) return;

      const alerts = this.currentData?.alerts || [];

      if (alerts.length === 0) {
        container.innerHTML = '';
        return;
      }

      const alertColors = {
        critical: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
      };

      container.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Alerts & Attention Items</h2>
          <div class="space-y-3">
            ${alerts.map(alert => `
              <div class="flex items-start gap-3 p-3 border-2 rounded-lg ${alertColors[alert.type] || alertColors.info}">
                <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                </svg>
                <div class="flex-1">
                  <div class="font-medium">${alert.message}</div>
                  ${alert.details ? `<div class="text-sm mt-1">${alert.details}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    /**
     * Render detailed view
     */
    renderDetailedView() {
      const container = document.getElementById('hierarchyDetails');
      if (!container) return;

      container.innerHTML = `
        <div class="grid grid-cols-2 gap-6 mt-6">
          <!-- Sales Pipeline -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Sales Pipeline</h3>
            <div class="space-y-3">
              ${this.renderPipelineStage('Leads', 45, 'blue')}
              ${this.renderPipelineStage('Qualified', 32, 'indigo')}
              ${this.renderPipelineStage('Proposals', 18, 'purple')}
              ${this.renderPipelineStage('Won', 12, 'green')}
            </div>
          </div>

          <!-- Operations Status -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Operations Status</h3>
            <div class="space-y-3">
              ${this.renderOpsMetric('Pending Installs', 8, 'yellow')}
              ${this.renderOpsMetric('In Progress', 15, 'blue')}
              ${this.renderOpsMetric('Backlog %', '3.2%', 'green')}
              ${this.renderOpsMetric('Missed Stops', 2, 'red')}
            </div>
          </div>

          <!-- Team Performance -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Team Performance</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Top Performer:</span>
                <span class="font-semibold">Sarah Johnson (125% to goal)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Team Average:</span>
                <span class="font-semibold">98% to goal</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Needs Support:</span>
                <span class="font-semibold text-yellow-600">2 members</span>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">New sale: $12,400</span>
                <span class="text-gray-500">2h ago</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Install completed</span>
                <span class="text-gray-500">4h ago</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">New proposal sent</span>
                <span class="text-gray-500">6h ago</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render pipeline stage
     */
    renderPipelineStage(label, count, color) {
      return `
        <div class="flex items-center justify-between">
          <span class="text-gray-700">${label}</span>
          <span class="px-3 py-1 bg-${color}-100 text-${color}-800 rounded-full font-semibold">
            ${count}
          </span>
        </div>
      `;
    }

    /**
     * Render ops metric
     */
    renderOpsMetric(label, value, color) {
      return `
        <div class="flex items-center justify-between">
          <span class="text-gray-700">${label}</span>
          <span class="px-3 py-1 bg-${color}-100 text-${color}-800 rounded-full font-semibold">
            ${value}
          </span>
        </div>
      `;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
      if (!amount) return '$0';
      return '$' + Math.round(amount).toLocaleString();
    }

    /**
     * Show error
     */
    showError(error) {
      if (window.DataValidation) {
        window.DataValidation.showToast(
          `Error loading dashboard: ${error.message}`,
          'error'
        );
      }
    }

    /**
     * Get mock hierarchy data
     */
    getMockHierarchyData() {
      return {
        name: 'Omaha Branch',
        level: 'branch',
        summary: {
          totalRevenue: 285000,
          totalDeals: 24,
          activeCustomers: 156,
          teamSize: 18
        },
        metrics: {
          revenueToGoal: 114.0,
          closeRate: 68.5,
          avgDealSize: 11875,
          customerRetention: 95.5
        },
        children: [],
        alerts: [
          {
            type: 'warning',
            message: 'Revenue below 80% of goal',
            details: 'Focus needed on closing pipeline'
          }
        ],
        trends: {
          revenue: 'up',
          deals: 'up',
          efficiency: 'stable'
        }
      };
    }

    /**
     * Get dashboard template
     */
    getTemplate() {
      return `
        <div class="hierarchy-dashboard">
          <!-- Breadcrumbs -->
          <div id="hierarchyBreadcrumbs" class="mb-4"></div>

          <!-- Header -->
          <div id="hierarchyHeader" class="mb-6"></div>

          <!-- Metrics -->
          <div id="hierarchyMetrics" class="mb-6"></div>

          <!-- Alerts -->
          <div id="hierarchyAlerts" class="mb-6"></div>

          <!-- Children -->
          <div id="hierarchyChildren"></div>

          <!-- Detailed View -->
          <div id="hierarchyDetails"></div>
        </div>
      `;
    }
  }

  //=============================================================================
  // INITIALIZE
  //=============================================================================

  window.hierarchyDashboard = null;

  function initHierarchyDashboard() {
    if (window.DataSync && document.getElementById('hierarchyDashboardContainer')) {
      window.hierarchyDashboard = new HierarchyDashboard();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHierarchyDashboard);
  } else {
    initHierarchyDashboard();
  }

  window.addEventListener('DataSyncReady', initHierarchyDashboard);

})();
