/**
 * ===============================================================================
 * CROSS-DASHBOARD DATA SYNCHRONIZATION SYSTEM
 * ===============================================================================
 * Real-time data sync between Sales, Operations, Branch, Area, Region, Market
 * Enables workflow coordination and hierarchical data views
 */

(function() {
  'use strict';

  //=============================================================================
  // WORKFLOW STATES
  //=============================================================================

  const WorkflowStates = {
    // Sales stages
    LEAD: 'lead',
    QUALIFIED: 'qualified',
    PROPOSAL: 'proposal',
    NEGOTIATION: 'negotiation',
    SOLD: 'sold',
    LOST: 'lost',

    // Operations stages
    PENDING_SCHEDULE: 'pending_schedule',
    SCHEDULED: 'scheduled',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',

    // Special states
    ON_HOLD: 'on_hold',
    CANCELLED: 'cancelled',
    NEEDS_ATTENTION: 'needs_attention'
  };

  const StateTransitions = {
    [WorkflowStates.LEAD]: [WorkflowStates.QUALIFIED, WorkflowStates.LOST],
    [WorkflowStates.QUALIFIED]: [WorkflowStates.PROPOSAL, WorkflowStates.LOST],
    [WorkflowStates.PROPOSAL]: [WorkflowStates.NEGOTIATION, WorkflowStates.LOST],
    [WorkflowStates.NEGOTIATION]: [WorkflowStates.SOLD, WorkflowStates.LOST],
    [WorkflowStates.SOLD]: [WorkflowStates.PENDING_SCHEDULE, WorkflowStates.CANCELLED],
    [WorkflowStates.PENDING_SCHEDULE]: [WorkflowStates.SCHEDULED, WorkflowStates.ON_HOLD],
    [WorkflowStates.SCHEDULED]: [WorkflowStates.ASSIGNED, WorkflowStates.ON_HOLD],
    [WorkflowStates.ASSIGNED]: [WorkflowStates.IN_PROGRESS, WorkflowStates.ON_HOLD],
    [WorkflowStates.IN_PROGRESS]: [WorkflowStates.COMPLETED, WorkflowStates.NEEDS_ATTENTION],
    [WorkflowStates.ON_HOLD]: [WorkflowStates.SCHEDULED, WorkflowStates.CANCELLED],
    [WorkflowStates.NEEDS_ATTENTION]: [WorkflowStates.IN_PROGRESS, WorkflowStates.ON_HOLD]
  };

  //=============================================================================
  // DATA SERVICE - Unified data access layer
  //=============================================================================

  class DataService {
    constructor() {
      this.subscribers = new Map();
      this.cache = new Map();
      this.pendingSync = new Set();
      this.syncInterval = null;
      this.isOnline = true;

      // Start sync monitoring
      this.startSyncMonitoring();
    }

    /**
     * Subscribe to data changes
     * @param {string} dataType - Type of data to subscribe to
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(dataType, callback) {
      if (!this.subscribers.has(dataType)) {
        this.subscribers.set(dataType, new Set());
      }

      this.subscribers.get(dataType).add(callback);

      // Return unsubscribe function
      return () => {
        const subs = this.subscribers.get(dataType);
        if (subs) subs.delete(callback);
      };
    }

    /**
     * Notify subscribers of data changes
     * @param {string} dataType - Type of data that changed
     * @param {any} data - New data
     */
    notify(dataType, data) {
      const subs = this.subscribers.get(dataType);
      if (subs) {
        subs.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[DataService] Subscriber error for ${dataType}:`, error);
          }
        });
      }
    }

    /**
     * Get deals that need operations attention
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Deals pending operations
     */
    async getDealsForOperations(filters = {}) {
      const cacheKey = `ops_deals_${JSON.stringify(filters)}`;

      return window.CacheLayer?.fetchWithCache(
        cacheKey,
        async () => {
          // Fetch deals in sold state that need scheduling
          const deals = await this.fetchData('getDealsForOperations', filters);

          // Enrich with additional data
          return deals.map(deal => ({
            ...deal,
            daysOld: this.calculateDaysOld(deal.soldDate),
            priority: this.calculatePriority(deal),
            isOverdue: this.isOverdue(deal)
          }));
        },
        { ttl: 60 * 1000 } // 1 minute cache for operations data
      );
    }

    /**
     * Get hierarchical data for managers
     * @param {string} level - Hierarchy level (branch, area, region, market)
     * @param {string} id - ID of the entity
     * @returns {Promise<Object>} Hierarchical data
     */
    async getHierarchicalData(level, id) {
      const cacheKey = `hierarchy_${level}_${id}`;

      return window.CacheLayer?.fetchWithCache(
        cacheKey,
        async () => {
          const data = await this.fetchData('getHierarchicalData', { level, id });

          return {
            summary: this.calculateHierarchySummary(data),
            children: data.children || [],
            metrics: this.calculateMetrics(data),
            alerts: this.generateAlerts(data),
            trends: this.calculateTrends(data)
          };
        },
        { ttl: 2 * 60 * 1000 } // 2 minutes cache
      );
    }

    /**
     * Get available technicians for scheduling
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Available technicians
     */
    async getAvailableTechnicians(filters = {}) {
      const { date, branchId, skills } = filters;

      return window.CacheLayer?.fetchWithCache(
        `techs_available_${branchId}_${date}`,
        async () => {
          const techs = await this.fetchData('getAvailableTechnicians', filters);

          return techs.map(tech => ({
            ...tech,
            currentLoad: this.calculateTechLoad(tech),
            availability: this.calculateAvailability(tech, date),
            skillMatch: skills ? this.calculateSkillMatch(tech, skills) : 100
          }));
        },
        { ttl: 30 * 1000 } // 30 seconds cache for real-time scheduling
      );
    }

    /**
     * Assign job to technician
     * @param {string} jobId - Job ID
     * @param {string} techId - Technician ID
     * @param {Object} details - Assignment details
     * @returns {Promise<Object>} Assignment result
     */
    async assignJobToTech(jobId, techId, details) {
      const assignment = {
        jobId,
        techId,
        assignedBy: window.currentUser?.email,
        assignedAt: new Date().toISOString(),
        ...details
      };

      try {
        // Update local state immediately (optimistic update)
        this.updateLocalState('job_assignments', jobId, assignment);

        // Sync to backend
        const result = await this.syncData('assignJobToTech', assignment);

        // Notify subscribers
        this.notify('job_assigned', { jobId, techId, assignment });

        // Invalidate related caches
        this.invalidateCaches(['techs_available', 'jobs_pending', 'tech_schedule']);

        return result;
      } catch (error) {
        // Rollback optimistic update
        this.revertLocalState('job_assignments', jobId);
        throw error;
      }
    }

    /**
     * Move deal through workflow
     * @param {string} dealId - Deal ID
     * @param {string} newState - New workflow state
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Update result
     */
    async updateDealState(dealId, newState, metadata = {}) {
      // Validate state transition
      const deal = await this.getDeal(dealId);
      if (!this.canTransitionTo(deal.state, newState)) {
        throw new Error(`Cannot transition from ${deal.state} to ${newState}`);
      }

      const update = {
        dealId,
        previousState: deal.state,
        newState,
        updatedBy: window.currentUser?.email,
        updatedAt: new Date().toISOString(),
        metadata
      };

      try {
        // Optimistic update
        this.updateLocalState('deals', dealId, { ...deal, state: newState });

        // Sync to backend
        const result = await this.syncData('updateDealState', update);

        // Notify all relevant dashboards
        this.notify('deal_state_changed', update);

        // If moved to operations, notify ops dashboard
        if (newState === WorkflowStates.SOLD || newState === WorkflowStates.PENDING_SCHEDULE) {
          this.notify('new_ops_item', deal);
        }

        // Invalidate caches
        this.invalidateCaches(['deals', 'pipeline', 'ops_queue']);

        return result;
      } catch (error) {
        this.revertLocalState('deals', dealId);
        throw error;
      }
    }

    /**
     * Get deal by ID
     * @param {string} dealId - Deal ID
     * @returns {Promise<Object>} Deal data
     */
    async getDeal(dealId) {
      return window.CacheLayer?.fetchWithCache(
        `deal_${dealId}`,
        () => this.fetchData('getDeal', { dealId }),
        { ttl: 2 * 60 * 1000 }
      );
    }

    /**
     * Check if state transition is valid
     * @param {string} currentState - Current state
     * @param {string} newState - Desired new state
     * @returns {boolean} True if transition is valid
     */
    canTransitionTo(currentState, newState) {
      const allowedTransitions = StateTransitions[currentState];
      return allowedTransitions && allowedTransitions.includes(newState);
    }

    /**
     * Fetch data from backend
     * @param {string} functionName - Backend function name
     * @param {Object} params - Parameters
     * @returns {Promise<any>} Fetched data
     */
    async fetchData(functionName, params) {
      if (typeof google !== 'undefined' && google.script?.run) {
        return new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [functionName](params);
        });
      } else {
        // Mock data for demo
        return this.getMockData(functionName, params);
      }
    }

    /**
     * Sync data to backend
     * @param {string} functionName - Backend function name
     * @param {Object} data - Data to sync
     * @returns {Promise<any>} Sync result
     */
    async syncData(functionName, data) {
      if (!this.isOnline) {
        // Queue for later sync
        this.pendingSync.add({ functionName, data, timestamp: Date.now() });
        return { queued: true };
      }

      if (typeof google !== 'undefined' && google.script?.run) {
        return new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            [functionName](data);
        });
      } else {
        // Mock success for demo
        console.log(`[DataService] Mock sync: ${functionName}`, data);
        return { success: true, mock: true };
      }
    }

    /**
     * Update local state (optimistic update)
     */
    updateLocalState(type, id, data) {
      const key = `${type}_${id}`;
      const previous = this.cache.get(key);

      this.cache.set(key, data);
      this.cache.set(`${key}_previous`, previous);
    }

    /**
     * Revert local state (rollback optimistic update)
     */
    revertLocalState(type, id) {
      const key = `${type}_${id}`;
      const previous = this.cache.get(`${key}_previous`);

      if (previous) {
        this.cache.set(key, previous);
        this.cache.delete(`${key}_previous`);
      }
    }

    /**
     * Invalidate caches matching patterns
     */
    invalidateCaches(patterns) {
      if (!window.CacheLayer) return;

      patterns.forEach(pattern => {
        window.CacheLayer.invalidate(new RegExp(pattern));
      });
    }

    /**
     * Start sync monitoring
     */
    startSyncMonitoring() {
      // Check online status
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processPendingSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // Periodic sync of pending items
      this.syncInterval = setInterval(() => {
        if (this.isOnline && this.pendingSync.size > 0) {
          this.processPendingSync();
        }
      }, 30 * 1000); // Every 30 seconds
    }

    /**
     * Process pending sync queue
     */
    async processPendingSync() {
      const items = Array.from(this.pendingSync);
      this.pendingSync.clear();

      for (const item of items) {
        try {
          await this.syncData(item.functionName, item.data);
          console.log('[DataService] Synced queued item:', item.functionName);
        } catch (error) {
          console.error('[DataService] Failed to sync queued item:', error);
          // Re-queue if failed
          this.pendingSync.add(item);
        }
      }
    }

    /**
     * Calculate helper functions
     */
    calculateDaysOld(date) {
      if (!date) return 0;
      const now = new Date();
      const soldDate = new Date(date);
      return Math.floor((now - soldDate) / (1000 * 60 * 60 * 24));
    }

    calculatePriority(deal) {
      const daysOld = this.calculateDaysOld(deal.soldDate);
      const value = deal.totalValue || 0;

      // High priority: high value or old
      if (value > 20000 || daysOld > 7) return 'high';
      if (value > 10000 || daysOld > 3) return 'medium';
      return 'low';
    }

    isOverdue(deal) {
      return this.calculateDaysOld(deal.soldDate) > 5;
    }

    calculateTechLoad(tech) {
      return tech.assignedJobs?.length || 0;
    }

    calculateAvailability(tech, date) {
      // Simplified - would check actual schedule
      return tech.maxJobsPerDay - this.calculateTechLoad(tech);
    }

    calculateSkillMatch(tech, requiredSkills) {
      if (!requiredSkills || !tech.skills) return 100;
      const matches = requiredSkills.filter(skill => tech.skills.includes(skill));
      return (matches.length / requiredSkills.length) * 100;
    }

    calculateHierarchySummary(data) {
      return {
        totalRevenue: data.revenue || 0,
        totalDeals: data.deals?.length || 0,
        activeCustomers: data.customers?.length || 0,
        teamSize: data.employees?.length || 0
      };
    }

    calculateMetrics(data) {
      return {
        revenueToGoal: data.revenue / (data.goal || 1) * 100,
        customerRetention: 95.5, // Mock
        avgDealSize: data.revenue / (data.deals?.length || 1),
        closeRate: 68.5 // Mock
      };
    }

    generateAlerts(data) {
      const alerts = [];

      if (data.revenue < data.goal * 0.8) {
        alerts.push({
          type: 'warning',
          message: 'Revenue below 80% of goal',
          priority: 'high'
        });
      }

      return alerts;
    }

    calculateTrends(data) {
      return {
        revenue: 'up',
        deals: 'up',
        efficiency: 'stable'
      };
    }

    /**
     * Get mock data for demo
     */
    getMockData(functionName, params) {
      const mockData = {
        getDealsForOperations: [
          {
            id: 'DEAL001',
            customerName: 'ACME Corp',
            soldDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            totalValue: 12000,
            services: ['IPM', 'Rodent Control'],
            ae: 'John Smith',
            branch: 'Omaha',
            state: WorkflowStates.PENDING_SCHEDULE
          },
          {
            id: 'DEAL002',
            customerName: 'Tech Solutions Inc',
            soldDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            totalValue: 18400,
            services: ['Termite Treatment'],
            ae: 'Sarah Johnson',
            branch: 'Omaha',
            state: WorkflowStates.PENDING_SCHEDULE
          }
        ],

        getHierarchicalData: {
          id: params.id,
          level: params.level,
          name: 'Omaha Branch',
          revenue: 285000,
          goal: 250000,
          deals: Array(24).fill(null).map((_, i) => ({ id: `D${i}` })),
          customers: Array(156).fill(null).map((_, i) => ({ id: `C${i}` })),
          employees: Array(18).fill(null).map((_, i) => ({ id: `E${i}` })),
          children: params.level === 'area' ? [
            { id: 'BR001', name: 'Omaha', revenue: 285000 },
            { id: 'BR002', name: 'Lincoln', revenue: 198000 }
          ] : []
        },

        getAvailableTechnicians: [
          {
            id: 'TECH001',
            name: 'Mike Rodriguez',
            skills: ['IPM', 'Rodent', 'General'],
            maxJobsPerDay: 8,
            assignedJobs: ['J001', 'J002']
          },
          {
            id: 'TECH002',
            name: 'Lisa Chen',
            skills: ['Termite', 'Bed Bug', 'General'],
            maxJobsPerDay: 6,
            assignedJobs: ['J003']
          }
        ]
      };

      return mockData[functionName] || [];
    }
  }

  //=============================================================================
  // CROSS-DASHBOARD COMMUNICATION
  //=============================================================================

  class DashboardCommunication {
    constructor(dataService) {
      this.dataService = dataService;
      this.messageHandlers = new Map();
      this.setupCommunication();
    }

    /**
     * Setup cross-dashboard communication
     */
    setupCommunication() {
      // Listen for sales → operations handoff
      this.dataService.subscribe('deal_state_changed', (update) => {
        if (update.newState === WorkflowStates.SOLD) {
          this.notifyOperations('new_deal_sold', update);
        }
      });

      // Listen for operations updates
      this.dataService.subscribe('job_assigned', (assignment) => {
        this.notifyBranchManager('job_assigned', assignment);
        this.notifyTechnician('job_assigned', assignment);
      });

      // Listen for hierarchy changes
      this.dataService.subscribe('metrics_updated', (metrics) => {
        this.propagateToHierarchy(metrics);
      });
    }

    /**
     * Notify operations dashboard of new deal
     */
    notifyOperations(type, data) {
      console.log('[DashboardComm] → Operations:', type, data);

      // Show notification if operations dashboard is active
      if (this.isDashboardActive('operations')) {
        this.showNotification({
          title: 'New Deal Ready for Scheduling',
          message: `${data.dealId} - ${data.metadata?.customerName}`,
          action: () => this.openOperationsView(data.dealId)
        });
      }

      // Update operations queue
      this.dataService.notify('ops_queue_update', data);
    }

    /**
     * Notify branch manager
     */
    notifyBranchManager(type, data) {
      console.log('[DashboardComm] → Branch Manager:', type, data);

      if (this.isDashboardActive('branch')) {
        this.showNotification({
          title: 'Job Assigned',
          message: `Job ${data.jobId} assigned to ${data.techId}`,
          type: 'success'
        });
      }
    }

    /**
     * Notify technician
     */
    notifyTechnician(type, data) {
      console.log('[DashboardComm] → Technician:', type, data);

      // Would integrate with mobile app or tech dashboard
      // For now, just log
    }

    /**
     * Propagate metrics up the hierarchy
     */
    propagateToHierarchy(metrics) {
      const level = window.currentUser?.hierarchyLevel;

      // Branch → Area → Region → Market
      if (level === 'branch') {
        this.dataService.notify('area_metrics_update', metrics);
      } else if (level === 'area') {
        this.dataService.notify('region_metrics_update', metrics);
      } else if (level === 'region') {
        this.dataService.notify('market_metrics_update', metrics);
      }
    }

    /**
     * Check if dashboard is currently active
     */
    isDashboardActive(dashboardType) {
      const role = window.currentUser?.role;
      const roleMap = {
        'Sales': 'sales',
        'Ops': 'operations',
        'Manager': 'branch',
        'Executive': 'area' // or region/market
      };

      return roleMap[role] === dashboardType;
    }

    /**
     * Show notification
     */
    showNotification(options) {
      const { title, message, type = 'info', action } = options;

      // Use existing toast system
      if (window.DataValidation) {
        window.DataValidation.showToast(`${title}: ${message}`, type);
      }

      // If action provided, show action button
      if (action) {
        // Could enhance toast to include action button
        console.log('[DashboardComm] Action available:', action);
      }
    }

    /**
     * Open specific view
     */
    openOperationsView(dealId) {
      // Navigate to operations dashboard and highlight deal
      console.log('[DashboardComm] Opening operations view for:', dealId);

      // Store in session for operations dashboard to pick up
      sessionStorage.setItem('openDeal', dealId);

      // If on different dashboard, navigate
      // Otherwise, just highlight
    }
  }

  //=============================================================================
  // HIERARCHICAL DATA VIEWS
  //=============================================================================

  class HierarchyManager {
    constructor(dataService) {
      this.dataService = dataService;
      this.currentLevel = null;
      this.currentId = null;
    }

    /**
     * Get data for current user's hierarchy level
     */
    async getCurrentHierarchyData() {
      const user = window.currentUser;
      if (!user) return null;

      let level, id;

      if (user.role === 'Manager') {
        level = 'branch';
        id = user.branchId;
      } else if (user.hierarchyLevel === 'area') {
        level = 'area';
        id = user.areaId;
      } else if (user.hierarchyLevel === 'region') {
        level = 'region';
        id = user.regionId;
      } else if (user.hierarchyLevel === 'market') {
        level = 'market';
        id = user.marketId;
      }

      if (!level || !id) return null;

      this.currentLevel = level;
      this.currentId = id;

      return this.dataService.getHierarchicalData(level, id);
    }

    /**
     * Drill down into child entity
     */
    async drillDown(childId) {
      const childLevel = this.getChildLevel(this.currentLevel);
      if (!childLevel) return null;

      return this.dataService.getHierarchicalData(childLevel, childId);
    }

    /**
     * Get child level for hierarchy
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
     * Format hierarchy data for display
     */
    formatHierarchyData(data) {
      return {
        header: {
          title: data.name,
          level: data.level,
          metrics: data.metrics
        },
        summary: data.summary,
        children: data.children.map(child => ({
          id: child.id,
          name: child.name,
          metrics: this.calculateChildMetrics(child),
          status: this.getChildStatus(child)
        })),
        alerts: data.alerts,
        trends: data.trends
      };
    }

    /**
     * Calculate child metrics
     */
    calculateChildMetrics(child) {
      return {
        revenue: child.revenue,
        revenueToGoal: (child.revenue / (child.goal || 1)) * 100,
        deals: child.deals?.length || 0,
        performance: this.getPerformanceRating(child)
      };
    }

    /**
     * Get child status
     */
    getChildStatus(child) {
      const pct = (child.revenue / (child.goal || 1)) * 100;

      if (pct >= 100) return 'excellent';
      if (pct >= 90) return 'good';
      if (pct >= 80) return 'fair';
      return 'needs_attention';
    }

    /**
     * Get performance rating
     */
    getPerformanceRating(child) {
      const pct = (child.revenue / (child.goal || 1)) * 100;

      if (pct >= 110) return 'A+';
      if (pct >= 100) return 'A';
      if (pct >= 90) return 'B';
      if (pct >= 80) return 'C';
      return 'D';
    }
  }

  //=============================================================================
  // INITIALIZE & EXPORT
  //=============================================================================

  // Create singleton instances
  const dataService = new DataService();
  const dashboardComm = new DashboardCommunication(dataService);
  const hierarchyManager = new HierarchyManager(dataService);

  // Export global API
  window.DataSync = {
    // Core service
    service: dataService,
    communication: dashboardComm,
    hierarchy: hierarchyManager,

    // Workflow states
    WorkflowStates,
    StateTransitions,

    // Quick access functions
    getDealsForOps: (filters) => dataService.getDealsForOperations(filters),
    getAvailableTechs: (filters) => dataService.getAvailableTechnicians(filters),
    assignJob: (jobId, techId, details) => dataService.assignJobToTech(jobId, techId, details),
    updateDealState: (dealId, newState, metadata) => dataService.updateDealState(dealId, newState, metadata),

    // Hierarchy
    getHierarchyData: () => hierarchyManager.getCurrentHierarchyData(),
    drillDown: (childId) => hierarchyManager.drillDown(childId),

    // Subscribe to changes
    subscribe: (dataType, callback) => dataService.subscribe(dataType, callback),

    // Manual sync trigger
    sync: () => dataService.processPendingSync()
  };

  console.log('[DataSync] Cross-dashboard synchronization initialized');

})();
