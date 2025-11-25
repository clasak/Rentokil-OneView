/**
 * ===============================================================================
 * ENHANCED DASHBOARD CONFIGURATIONS
 * ===============================================================================
 * Default widget layouts and configurations for each role with optimal positioning
 */

(function() {
  'use strict';

  //=============================================================================
  // SALES DASHBOARD CONFIGURATION
  //=============================================================================

  const Sales = [
    // Row 1: Key metrics
    { id: 'proposalVolume', x: 0, y: 0, w: 3, h: 2 },
    { id: 'closeRate', x: 3, y: 0, w: 3, h: 2 },
    { id: 'avgDealSize', x: 6, y: 0, w: 3, h: 2 },
    { id: 'pipelineValue', x: 9, y: 0, w: 3, h: 2 },

    // Row 2: Performance and conversion
    { id: 'leadConversion', x: 0, y: 2, w: 3, h: 2 },
    { id: 'timeSaved', x: 3, y: 2, w: 3, h: 2 },
    { id: 'customerRetention', x: 6, y: 2, w: 3, h: 2 },
    { id: 'revenueGoal', x: 9, y: 2, w: 3, h: 2 },

    // Row 3: Activity and proposals
    { id: 'recentActivity', x: 0, y: 4, w: 6, h: 3 },
    { id: 'openProposals', x: 6, y: 4, w: 6, h: 3 }
  ];

  //=============================================================================
  // OPERATIONS DASHBOARD CONFIGURATION
  //=============================================================================

  const Operations = [
    // Row 1: Critical ops metrics
    { id: 'pendingInstalls', x: 0, y: 0, w: 3, h: 2 },
    { id: 'overduePackets', x: 3, y: 0, w: 3, h: 2 },
    { id: 'backlogTracker', x: 6, y: 0, w: 3, h: 2 },
    { id: 'missedStops', x: 9, y: 0, w: 3, h: 2 },

    // Row 2: Team and activity
    { id: 'technicianRoster', x: 0, y: 2, w: 6, h: 3 },
    { id: 'recentActivity', x: 6, y: 2, w: 6, h: 3 },

    // Row 3: Performance metrics
    { id: 'closeRate', x: 0, y: 5, w: 4, h: 2 },
    { id: 'customerRetention', x: 4, y: 5, w: 4, h: 2 },
    { id: 'revenueGoal', x: 8, y: 5, w: 4, h: 2 }
  ];

  //=============================================================================
  // BRANCH MANAGER DASHBOARD CONFIGURATION
  //=============================================================================

  const Branch = [
    // Row 1: Branch KPIs
    { id: 'revenueGoal', x: 0, y: 0, w: 4, h: 3 },
    { id: 'branchPerformance', x: 4, y: 0, w: 4, h: 3 },
    { id: 'customerRetention', x: 8, y: 0, w: 4, h: 3 },

    // Row 2: Sales metrics
    { id: 'proposalVolume', x: 0, y: 3, w: 3, h: 2 },
    { id: 'closeRate', x: 3, y: 3, w: 3, h: 2 },
    { id: 'pipelineValue', x: 6, y: 3, w: 3, h: 2 },
    { id: 'leadConversion', x: 9, y: 3, w: 3, h: 2 },

    // Row 3: Operations metrics
    { id: 'pendingInstalls', x: 0, y: 5, w: 3, h: 2 },
    { id: 'overduePackets', x: 3, y: 5, w: 3, h: 2 },
    { id: 'backlogTracker', x: 6, y: 5, w: 3, h: 2 },
    { id: 'missedStops', x: 9, y: 5, w: 3, h: 2 },

    // Row 4: Activity and team
    { id: 'recentActivity', x: 0, y: 7, w: 6, h: 3 },
    { id: 'technicianRoster', x: 6, y: 7, w: 6, h: 3 }
  ];

  //=============================================================================
  // EXECUTIVE DASHBOARD CONFIGURATION
  //=============================================================================

  const Executive = [
    // Row 1: High-level metrics
    { id: 'revenueGoal', x: 0, y: 0, w: 6, h: 3 },
    { id: 'branchPerformance', x: 6, y: 0, w: 6, h: 3 },

    // Row 2: Performance indicators
    { id: 'closeRate', x: 0, y: 3, w: 3, h: 2 },
    { id: 'customerRetention', x: 3, y: 3, w: 3, h: 2 },
    { id: 'pipelineValue', x: 6, y: 3, w: 3, h: 2 },
    { id: 'leadConversion', x: 9, y: 3, w: 3, h: 2 },

    // Row 3: Operational overview
    { id: 'backlogTracker', x: 0, y: 5, w: 3, h: 2 },
    { id: 'pendingInstalls', x: 3, y: 5, w: 3, h: 2 },
    { id: 'overduePackets', x: 6, y: 5, w: 3, h: 2 },
    { id: 'missedStops', x: 9, y: 5, w: 3, h: 2 },

    // Row 4: Activity summary
    { id: 'recentActivity', x: 0, y: 7, w: 12, h: 3 }
  ];

  //=============================================================================
  // WIDGET CATEGORIES FOR LIBRARY
  //=============================================================================

  const Categories = {
    Sales: [
      'proposalVolume',
      'closeRate',
      'avgDealSize',
      'pipelineValue',
      'leadConversion',
      'timeSaved',
      'openProposals',
      'revenueGoal'
    ],
    Ops: [
      'pendingInstalls',
      'overduePackets',
      'technicianRoster',
      'backlogTracker',
      'missedStops'
    ],
    Analytics: [
      'branchPerformance',
      'revenueGoal',
      'customerRetention'
    ],
    Universal: [
      'recentActivity'
    ]
  };

  //=============================================================================
  // ROLE-SPECIFIC WIDGET PERMISSIONS
  //=============================================================================

  const RolePermissions = {
    Sales: {
      allowed: [...Categories.Sales, ...Categories.Universal],
      default: Sales
    },
    Ops: {
      allowed: [...Categories.Ops, ...Categories.Universal, 'closeRate', 'customerRetention'],
      default: Operations
    },
    Manager: {
      allowed: [...Categories.Sales, ...Categories.Ops, ...Categories.Analytics, ...Categories.Universal],
      default: Branch
    },
    Executive: {
      allowed: [...Categories.Sales, ...Categories.Ops, ...Categories.Analytics, ...Categories.Universal],
      default: Executive
    }
  };

  //=============================================================================
  // UTILITY FUNCTIONS
  //=============================================================================

  /**
   * Get default layout for a specific role
   * @param {string} role - User role (Sales, Ops, Manager, Executive)
   * @returns {Array} Default widget layout configuration
   */
  function getDefaultLayout(role) {
    const permissions = RolePermissions[role];
    return permissions ? permissions.default : [];
  }

  /**
   * Get allowed widgets for a specific role
   * @param {string} role - User role
   * @returns {Array} List of allowed widget IDs
   */
  function getAllowedWidgets(role) {
    const permissions = RolePermissions[role];
    return permissions ? permissions.allowed : [];
  }

  /**
   * Check if a widget is allowed for a role
   * @param {string} widgetId - Widget ID to check
   * @param {string} role - User role
   * @returns {boolean} True if widget is allowed
   */
  function isWidgetAllowed(widgetId, role) {
    const allowed = getAllowedWidgets(role);
    return allowed.includes(widgetId);
  }

  /**
   * Get widgets by category
   * @param {string} category - Category name (Sales, Ops, Analytics, Universal)
   * @returns {Array} List of widget IDs in the category
   */
  function getWidgetsByCategory(category) {
    return Categories[category] || [];
  }

  /**
   * Get all categories
   * @returns {Object} Categories object
   */
  function getCategories() {
    return Categories;
  }

  /**
   * Merge user layout with defaults
   * Adds any missing default widgets that user hasn't customized
   * @param {Array} userLayout - User's custom layout
   * @param {string} role - User role
   * @returns {Array} Merged layout
   */
  function mergeWithDefaults(userLayout, role) {
    if (!userLayout || userLayout.length === 0) {
      return getDefaultLayout(role);
    }

    const userWidgetIds = userLayout.map(w => w.id);
    const defaultLayout = getDefaultLayout(role);
    const missingWidgets = defaultLayout.filter(w => !userWidgetIds.includes(w.id));

    return [...userLayout, ...missingWidgets];
  }

  /**
   * Validate layout configuration
   * Ensures all required properties are present
   * @param {Array} layout - Layout to validate
   * @returns {boolean} True if valid
   */
  function validateLayout(layout) {
    if (!Array.isArray(layout)) return false;

    return layout.every(widget => {
      return (
        widget.id &&
        typeof widget.x === 'number' &&
        typeof widget.y === 'number' &&
        typeof widget.w === 'number' &&
        typeof widget.h === 'number' &&
        widget.w >= 2 && widget.w <= 12 &&
        widget.h >= 1 && widget.h <= 6
      );
    });
  }

  /**
   * Auto-arrange widgets to prevent overlaps
   * @param {Array} layout - Layout to arrange
   * @returns {Array} Arranged layout
   */
  function autoArrange(layout) {
    const arranged = [];
    let currentY = 0;
    let currentX = 0;

    layout.forEach(widget => {
      // Check if widget fits in current row
      if (currentX + widget.w > 12) {
        // Move to next row
        currentX = 0;
        currentY += Math.max(...arranged.filter(w => w.y === currentY).map(w => w.h), 2);
      }

      arranged.push({
        ...widget,
        x: currentX,
        y: currentY
      });

      currentX += widget.w;
    });

    return arranged;
  }

  /**
   * Optimize layout for mobile view
   * Stacks widgets vertically with full width
   * @param {Array} layout - Layout to optimize
   * @returns {Array} Mobile-optimized layout
   */
  function optimizeForMobile(layout) {
    let currentY = 0;

    return layout.map(widget => {
      const optimized = {
        ...widget,
        x: 0,
        w: 12,
        y: currentY
      };

      currentY += widget.h;
      return optimized;
    });
  }

  /**
   * Get recommended widgets based on role and current layout
   * @param {string} role - User role
   * @param {Array} currentLayout - Current widget layout
   * @returns {Array} Recommended widget IDs
   */
  function getRecommendedWidgets(role, currentLayout = []) {
    const allowed = getAllowedWidgets(role);
    const current = currentLayout.map(w => w.id);
    const missing = allowed.filter(id => !current.includes(id));

    // Prioritize key metrics
    const priorities = {
      Sales: ['proposalVolume', 'closeRate', 'avgDealSize', 'pipelineValue'],
      Ops: ['pendingInstalls', 'overduePackets', 'backlogTracker', 'missedStops'],
      Manager: ['revenueGoal', 'branchPerformance', 'customerRetention'],
      Executive: ['revenueGoal', 'branchPerformance', 'customerRetention']
    };

    const priorityList = priorities[role] || [];
    const recommended = missing.filter(id => priorityList.includes(id));

    return recommended.length > 0 ? recommended : missing.slice(0, 4);
  }

  //=============================================================================
  // EXPORT PUBLIC API
  //=============================================================================

  window.DashboardConfigs = {
    // Legacy support
    sales: Sales,
    operations: Operations,
    branch: Branch,
    executive: Executive,

    // New enhanced API
    getDefaultLayout,
    getAllowedWidgets,
    isWidgetAllowed,
    getWidgetsByCategory,
    getCategories,
    mergeWithDefaults,
    validateLayout,
    autoArrange,
    optimizeForMobile,
    getRecommendedWidgets,
    RolePermissions,
    Categories
  };

})();
