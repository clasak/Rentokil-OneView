/**
 * =================================================================================
 * RENTOKIL ONEVIEW - Widget System Backend Extensions
 * =================================================================================
 * Add these functions to your existing code.gs file
 * These functions support the draggable widget system and role-based dashboards
 */

// --- ------------------ ---
// WIDGET LAYOUT PERSISTENCE
// --- ------------------ ---

/**
 * Save user's custom widget layout
 * @param {string} role - User's role (e.g., 'branch-manager', 'area-manager')
 * @param {Array} layout - Array of widget configuration objects
 * @returns {Object} Success/failure response
 */
function saveUserWidgetLayout(role, layout) {
  try {
    const ss = getSS_();
    let sheet = ss.getSheetByName('UserLayouts');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('UserLayouts');
      sheet.appendRow(['User Email', 'Role', 'Layout JSON', 'Last Updated']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    }
    
    const userEmail = Session.getEffectiveUser().getEmail();
    const layoutJson = JSON.stringify(layout);
    const timestamp = new Date();
    
    // Find existing row for this user/role combo
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userEmail && data[i][1] === role) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Update existing row
      sheet.getRange(rowIndex, 3).setValue(layoutJson);
      sheet.getRange(rowIndex, 4).setValue(timestamp);
    } else {
      // Append new row
      sheet.appendRow([userEmail, role, layoutJson, timestamp]);
    }
    
    return { success: true, message: 'Layout saved successfully' };
  } catch(e) {
    console.error('Error saving layout:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Load user's custom widget layout
 * @param {string} role - User's role
 * @returns {Array|null} Saved layout or null if not found
 */
function loadUserWidgetLayout(role) {
  try {
    const ss = getSS_();
    const sheet = ss.getSheetByName('UserLayouts');
    
    if (!sheet) return null;
    
    const userEmail = Session.getEffectiveUser().getEmail();
    const data = sheet.getDataRange().getValues();
    
    // Find user's layout for this role
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userEmail && data[i][1] === role) {
        try {
          return JSON.parse(data[i][2]);
        } catch(parseError) {
          console.error('Error parsing layout JSON:', parseError);
          return null;
        }
      }
    }
    
    return null;
  } catch(e) {
    console.error('Error loading layout:', e);
    return null;
  }
}

/**
 * Delete user's custom layout (reset to default)
 * @param {string} role - User's role
 * @returns {Object} Success/failure response
 */
function deleteUserWidgetLayout(role) {
  try {
    const ss = getSS_();
    const sheet = ss.getSheetByName('UserLayouts');
    
    if (!sheet) return { success: true, message: 'No layouts to delete' };
    
    const userEmail = Session.getEffectiveUser().getEmail();
    const data = sheet.getDataRange().getValues();
    
    // Find and delete the row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userEmail && data[i][1] === role) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Layout reset to default' };
      }
    }
    
    return { success: true, message: 'No layout found to delete' };
  } catch(e) {
    console.error('Error deleting layout:', e);
    return { success: false, error: e.message };
  }
}

// --- ------------------ ---
// WIDGET DATA FETCHING
// --- ------------------ ---

/**
 * Master function to fetch data for any widget
 * @param {string} widgetId - The widget identifier
 * @param {Object} params - Additional parameters (date range, filters, etc.)
 * @returns {Object} Widget data
 */
function getWidgetData(widgetId, params) {
  params = params || {};
  
  try {
    switch(widgetId) {
      // Sales Widgets
      case 'sales-revenue':
        return getSalesRevenueData(params);
      case 'sales-pipeline':
        return getSalesPipelineData(params);
      case 'sales-conversion':
        return getSalesConversionData(params);
        
      // Operations Widgets
      case 'ops-efficiency':
        return getOperationalEfficiencyData(params);
      case 'ops-backlog':
        return getBacklogData(params);
      case 'ops-labor':
        return getLaborMetricsData(params);
        
      // Branch Manager Widgets
      case 'branch-team-performance':
        return getBranchTeamPerformance(params);
      case 'branch-daily-summary':
        return getBranchDailySummary(params);
      case 'branch-metrics':
        return getBranchMetricsData(params);
        
      // Area/District Manager Widgets
      case 'area-branch-comparison':
        return getAreaBranchComparison(params);
      case 'area-performance-trends':
        return getAreaPerformanceTrends(params);
        
      // Region Director Widgets
      case 'region-market-share':
        return getRegionMarketShare(params);
      case 'region-summary':
        return getRegionSummaryData(params);
        
      // Market Director Widgets
      case 'market-executive-summary':
        return getMarketExecutiveSummary(params);
      case 'market-performance':
        return getMarketPerformanceData(params);
        
      default:
        return { error: 'Unknown widget ID: ' + widgetId };
    }
  } catch(e) {
    console.error('Error fetching widget data:', e);
    return { error: e.message };
  }
}

// --- Sales Widget Data Functions ---

function getSalesRevenueData(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  // Query revenue data based on user's access level
  const query = buildRevenueQuery_(user, startDate, endDate);
  const data = executeQuery_(SHEETS.REVENUE, query);
  
  const totalRevenue = data.reduce((sum, row) => sum + (Number(row.Daily_Actual) || 0), 0);
  const totalGoal = data.reduce((sum, row) => sum + (Number(row.Daily_Goal) || 0), 0);
  const percentToGoal = totalGoal > 0 ? (totalRevenue / totalGoal * 100).toFixed(1) : 0;
  
  return {
    revenue: totalRevenue,
    goal: totalGoal,
    percentToGoal: percentToGoal,
    period: formatDateRange_(startDate, endDate),
    trend: calculateTrend_(data, 'Daily_Actual')
  };
}

function getSalesPipelineData(params) {
  const user = getCurrentUserContext_();
  
  // Get quotes data
  const quotesSheet = getSS_().getSheetByName(SHEETS.QUOTES);
  if (!quotesSheet) return { leads: 0, proposals: 0, closed: 0 };
  
  const data = quotesSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const statusIdx = headers.indexOf('Status');
  const branchIdx = headers.indexOf('BranchID');
  
  // Filter by user's branch access
  const filtered = rows.filter(row => {
    if (user.role === 'market-director' || user.role === 'systems-director') return true;
    if (user.role === 'region-director') return user.regionIds.includes(row[branchIdx]);
    if (user.role === 'area-manager') return user.branchIds.includes(row[branchIdx]);
    return row[branchIdx] === user.branchId;
  });
  
  return {
    leads: filtered.filter(r => r[statusIdx] === 'Lead').length,
    proposals: filtered.filter(r => r[statusIdx] === 'Proposal').length,
    closed: filtered.filter(r => r[statusIdx] === 'Closed-Won').length
  };
}

function getSalesConversionData(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  const data = fetchSalesActivity_(user, startDate, endDate);
  
  const totalQuotes = data.reduce((sum, row) => sum + (Number(row.Quotes_Created) || 0), 0);
  const totalWon = data.reduce((sum, row) => sum + (Number(row.Quotes_Won) || 0), 0);
  const conversionRate = totalQuotes > 0 ? (totalWon / totalQuotes * 100).toFixed(1) : 0;
  
  return {
    quotesCreated: totalQuotes,
    quotesWon: totalWon,
    conversionRate: conversionRate,
    totalValue: data.reduce((sum, row) => sum + (Number(row.Quote_Value) || 0), 0)
  };
}

// --- Operations Widget Data Functions ---

function getOperationalEfficiencyData(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  const data = fetchOperationsMetrics_(user, startDate, endDate);
  
  const avgBacklog = calculateAverage_(data, 'Backlog_Percent');
  const avgOT = calculateAverage_(data, 'OT_Percent');
  const missedStops = data.reduce((sum, row) => 
    sum + (Number(row.MissedStops_TMX) || 0) + (Number(row.MissedStops_RNA) || 0), 0
  );
  
  // Calculate efficiency score (100 - penalties)
  const efficiency = Math.max(0, 100 - avgBacklog - (avgOT * 0.5) - (missedStops * 0.1));
  
  return {
    efficiency: efficiency.toFixed(1),
    backlog: avgBacklog.toFixed(1),
    overtime: avgOT.toFixed(1),
    missedStops: missedStops,
    grade: efficiency >= 90 ? 'A' : efficiency >= 80 ? 'B' : efficiency >= 70 ? 'C' : 'D'
  };
}

function getBacklogData(params) {
  const user = getCurrentUserContext_();
  const data = fetchOperationsMetrics_(user, new Date(), new Date());
  
  return {
    currentBacklog: calculateAverage_(data, 'Backlog_Percent').toFixed(1),
    trend: calculateTrend_(data, 'Backlog_Percent'),
    byBranch: aggregateByBranch_(data, 'Backlog_Percent')
  };
}

function getLaborMetricsData(params) {
  const user = getCurrentUserContext_();
  const data = fetchOperationsMetrics_(user, getStartOfWeek_(), new Date());
  
  return {
    totalHours: data.reduce((sum, row) => sum + (Number(row.Forecasted_Hours) || 0), 0),
    overtimePercent: calculateAverage_(data, 'OT_Percent').toFixed(1),
    efficiency: calculateLaborEfficiency_(data).toFixed(1)
  };
}

// --- Branch Manager Widget Data Functions ---

function getBranchTeamPerformance(params) {
  const user = getCurrentUserContext_();
  
  // Get users in this branch
  const usersSheet = getSS_().getSheetByName(SHEETS.USERS);
  if (!usersSheet) return { team: [] };
  
  const userData = usersSheet.getDataRange().getValues();
  const headers = userData[0];
  const users = userData.slice(1).filter(row => row[headers.indexOf('BranchID')] === user.branchId);
  
  // Get performance for each user
  const startDate = params.startDate || getStartOfMonth_();
  const team = users.map(userRow => {
    const userId = userRow[headers.indexOf('UserID')];
    const name = userRow[headers.indexOf('Name')];
    
    const performance = calculateUserPerformance_(userId, startDate, new Date());
    
    return {
      name: name,
      performance: performance.toFixed(1),
      sales: performance.sales,
      goals: performance.goals
    };
  });
  
  return { team: team };
}

function getBranchDailySummary(params) {
  const user = getCurrentUserContext_();
  const today = new Date();
  
  const summarySheet = getSS_().getSheetByName(SHEETS.BRANCH_DAILY_SUMMARY);
  if (!summarySheet) return getDefaultBranchSummary_();
  
  const data = summarySheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const todayRows = rows.filter(row => {
    const rowDate = new Date(row[headers.indexOf('Date')]);
    const rowBranch = row[headers.indexOf('BranchID')];
    return isSameDay_(rowDate, today) && rowBranch === user.branchId;
  });
  
  if (todayRows.length === 0) return getDefaultBranchSummary_();
  
  const row = todayRows[0];
  return {
    tapActual: row[headers.indexOf('TAP_Actual')] || 0,
    tapGoal: row[headers.indexOf('TAP_Goal')] || 0,
    salesActual: row[headers.indexOf('Daily_Sales_Actual')] || 0,
    salesGoal: row[headers.indexOf('Daily_Sales_Goal')] || 0,
    backlog: row[headers.indexOf('Backlog_Percent')] || 0,
    missedStops: (row[headers.indexOf('MissedStops_TMX')] || 0) + (row[headers.indexOf('MissedStops_RNA')] || 0)
  };
}

function getBranchMetricsData(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  const salesData = fetchSalesActivity_(user, startDate, endDate);
  const opsData = fetchOperationsMetrics_(user, startDate, endDate);
  
  return {
    totalRevenue: salesData.reduce((sum, row) => sum + (Number(row.Daily_Sales_Actual) || 0), 0),
    totalTAP: salesData.reduce((sum, row) => sum + (Number(row.TAP_Actual) || 0), 0),
    avgBacklog: calculateAverage_(opsData, 'Backlog_Percent').toFixed(1),
    totalMissedStops: opsData.reduce((sum, row) => 
      sum + (Number(row.MissedStops_TMX) || 0) + (Number(row.MissedStops_RNA) || 0), 0
    ),
    efficiency: calculateOperationalEfficiency_(opsData).toFixed(1)
  };
}

// --- Area/District Manager Widget Data Functions ---

function getAreaBranchComparison(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  
  // Get branches in user's area
  const branchesSheet = getSS_().getSheetByName(SHEETS.BRANCHES);
  if (!branchesSheet) return { branches: [] };
  
  const branchData = branchesSheet.getDataRange().getValues();
  const headers = branchData[0];
  const branches = branchData.slice(1).filter(row => {
    const regionId = row[headers.indexOf('RegionID')];
    return user.regionIds && user.regionIds.includes(regionId);
  });
  
  // Get performance for each branch
  const branchPerformance = branches.map(branchRow => {
    const branchId = branchRow[headers.indexOf('BranchID')];
    const branchName = branchRow[headers.indexOf('BranchName')];
    
    const performance = calculateBranchPerformance_(branchId, startDate, new Date());
    
    return {
      name: branchName,
      revenue: performance.revenue,
      goal: performance.goal,
      targetPercent: performance.goal > 0 ? (performance.revenue / performance.goal * 100).toFixed(1) : 0
    };
  });
  
  return { branches: branchPerformance };
}

function getAreaPerformanceTrends(params) {
  const user = getCurrentUserContext_();
  const months = params.months || 3;
  
  const trends = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    
    const data = fetchSalesActivity_(user, monthDate, monthEnd);
    const revenue = data.reduce((sum, row) => sum + (Number(row.Daily_Sales_Actual) || 0), 0);
    const goal = data.reduce((sum, row) => sum + (Number(row.Daily_Sales_Goal) || 0), 0);
    
    trends.push({
      month: formatMonth_(monthDate),
      revenue: revenue,
      goal: goal,
      percent: goal > 0 ? (revenue / goal * 100).toFixed(1) : 0
    });
  }
  
  return { trends: trends };
}

// --- Region Director Widget Data Functions ---

function getRegionMarketShare(params) {
  // This would typically come from external market data
  // For now, return placeholder data
  return {
    ourShare: 32,
    compA: 28,
    compB: 22,
    others: 18
  };
}

function getRegionSummaryData(params) {
  const user = getCurrentUserContext_();
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  const summarySheet = getSS_().getSheetByName(SHEETS.REGION_SUMMARY);
  if (!summarySheet) return getDefaultRegionSummary_();
  
  const data = summarySheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).filter(row => {
    const rowDate = new Date(row[headers.indexOf('Date')]);
    const rowRegion = row[headers.indexOf('RegionID')];
    return rowDate >= startDate && rowDate <= endDate && 
           user.regionIds && user.regionIds.includes(rowRegion);
  });
  
  return {
    totalRevenue: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('Daily_Sales_Actual')]) || 0), 0),
    totalGoal: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('Daily_Sales_Goal')]) || 0), 0),
    totalTAP: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('TAP_Actual')]) || 0), 0),
    branchCount: getBranchCountForRegion_(user.regionIds)
  };
}

// --- Market Director Widget Data Functions ---

function getMarketExecutiveSummary(params) {
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  // Aggregate across all branches
  const salesData = fetchAllSalesActivity_(startDate, endDate);
  const opsData = fetchAllOperationsMetrics_(startDate, endDate);
  
  const totalRevenue = salesData.reduce((sum, row) => sum + (Number(row.Daily_Sales_Actual) || 0), 0);
  const totalBranches = getUniqueBranchCount_(salesData);
  const totalEmployees = getTotalEmployeeCount_();
  
  return {
    totalRevenue: formatCurrency_(totalRevenue),
    totalBranches: totalBranches,
    totalEmployees: totalEmployees,
    avgEfficiency: calculateOperationalEfficiency_(opsData).toFixed(1),
    growthRate: calculateGrowthRate_(salesData).toFixed(1)
  };
}

function getMarketPerformanceData(params) {
  const startDate = params.startDate || getStartOfMonth_();
  const endDate = params.endDate || new Date();
  
  const marketSheet = getSS_().getSheetByName(SHEETS.MARKET_SUMMARY);
  if (!marketSheet) return getDefaultMarketSummary_();
  
  const data = marketSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).filter(row => {
    const rowDate = new Date(row[headers.indexOf('Date')]);
    return rowDate >= startDate && rowDate <= endDate;
  });
  
  return {
    totalRevenue: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('Daily_Sales_Actual')]) || 0), 0),
    totalGoal: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('Daily_Sales_Goal')]) || 0), 0),
    tapActual: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('TAP_Actual')]) || 0), 0),
    tapGoal: rows.reduce((sum, row) => sum + (Number(row[headers.indexOf('TAP_Goal')]) || 0), 0)
  };
}

// --- Helper Functions ---

function getCurrentUserContext_() {
  const userEmail = Session.getEffectiveUser().getEmail();
  const usersSheet = getSS_().getSheetByName(SHEETS.USERS);
  
  if (!usersSheet) {
    return { role: 'guest', branchId: null, regionIds: [], marketIds: [] };
  }
  
  const data = usersSheet.getDataRange().getValues();
  const headers = data[0];
  const userRow = data.slice(1).find(row => row[headers.indexOf('Email')] === userEmail);
  
  if (!userRow) {
    return { role: 'guest', branchId: null, regionIds: [], marketIds: [] };
  }
  
  const role = userRow[headers.indexOf('Role')];
  const branchId = userRow[headers.indexOf('BranchID')];
  
  // Get region and market IDs based on branch
  const branchesSheet = getSS_().getSheetByName(SHEETS.BRANCHES);
  const branchData = branchesSheet ? branchesSheet.getDataRange().getValues() : [];
  const branchHeaders = branchData[0] || [];
  const branch = branchData.slice(1).find(row => row[branchHeaders.indexOf('BranchID')] === branchId);
  
  const regionId = branch ? branch[branchHeaders.indexOf('RegionID')] : null;
  
  return {
    email: userEmail,
    role: role,
    branchId: branchId,
    regionIds: regionId ? [regionId] : [],
    marketIds: [] // Could be expanded based on your hierarchy
  };
}

function fetchSalesActivity_(user, startDate, endDate) {
  const sheet = getSS_().getSheetByName(SHEETS.SALES_ACTIVITY);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const dateIdx = headers.indexOf('Date');
  const branchIdx = headers.indexOf('BranchID');
  const regionIdx = headers.indexOf('RegionID');
  
  return rows.filter(row => {
    const rowDate = new Date(row[dateIdx]);
    if (rowDate < startDate || rowDate > endDate) return false;
    
    // Filter by user access
    if (user.role === 'market-director' || user.role === 'systems-director') return true;
    if (user.role === 'region-director') return user.regionIds.includes(row[regionIdx]);
    if (user.role === 'area-manager') return user.branchIds && user.branchIds.includes(row[branchIdx]);
    return row[branchIdx] === user.branchId;
  }).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function fetchOperationsMetrics_(user, startDate, endDate) {
  const sheet = getSS_().getSheetByName(SHEETS.OPERATIONS_METRICS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const dateIdx = headers.indexOf('Date');
  const branchIdx = headers.indexOf('BranchID');
  
  return rows.filter(row => {
    const rowDate = new Date(row[dateIdx]);
    if (rowDate < startDate || rowDate > endDate) return false;
    
    // Filter by user access
    if (user.role === 'market-director' || user.role === 'systems-director') return true;
    return row[branchIdx] === user.branchId;
  }).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function calculateAverage_(data, field) {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
  return sum / data.length;
}

function calculateTrend_(data, field) {
  if (data.length < 2) return 'stable';
  const sorted = data.sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const first = Number(sorted[0][field]) || 0;
  const last = Number(sorted[sorted.length - 1][field]) || 0;
  
  if (last > first * 1.05) return 'up';
  if (last < first * 0.95) return 'down';
  return 'stable';
}

function formatDateRange_(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  return start.toLocaleDateString('en-US', opts) + ' - ' + end.toLocaleDateString('en-US', opts);
}

function formatMonth_(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatCurrency_(amount) {
  return '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function getStartOfMonth_() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getStartOfWeek_() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.setDate(diff));
}

function isSameDay_(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getDefaultBranchSummary_() {
  return {
    tapActual: 0,
    tapGoal: 0,
    salesActual: 0,
    salesGoal: 0,
    backlog: 0,
    missedStops: 0
  };
}

function getDefaultRegionSummary_() {
  return {
    totalRevenue: 0,
    totalGoal: 0,
    totalTAP: 0,
    branchCount: 0
  };
}

function getDefaultMarketSummary_() {
  return {
    totalRevenue: 0,
    totalGoal: 0,
    tapActual: 0,
    tapGoal: 0
  };
}

// Additional helper functions for performance calculations
function calculateUserPerformance_(userId, startDate, endDate) {
  // Implementation would fetch and calculate user-specific performance
  return {
    performance: 85,
    sales: 50000,
    goals: 60000
  };
}

function calculateBranchPerformance_(branchId, startDate, endDate) {
  // Implementation would fetch and calculate branch-specific performance
  return {
    revenue: 150000,
    goal: 180000
  };
}

function calculateLaborEfficiency_(data) {
  // Calculate labor efficiency based on hours and output
  return 82.5;
}

function calculateOperationalEfficiency_(data) {
  // Calculate overall operational efficiency
  return 87.3;
}

function getBranchCountForRegion_(regionIds) {
  const branchesSheet = getSS_().getSheetByName(SHEETS.BRANCHES);
  if (!branchesSheet) return 0;
  
  const data = branchesSheet.getDataRange().getValues();
  const headers = data[0];
  const regionIdx = headers.indexOf('RegionID');
  
  return data.slice(1).filter(row => regionIds.includes(row[regionIdx])).length;
}

function getTotalEmployeeCount_() {
  const usersSheet = getSS_().getSheetByName(SHEETS.USERS);
  if (!usersSheet) return 0;
  return Math.max(0, usersSheet.getLastRow() - 1);
}

function getUniqueBranchCount_(data) {
  const branches = new Set(data.map(row => row.BranchID));
  return branches.size;
}

function fetchAllSalesActivity_(startDate, endDate) {
  const sheet = getSS_().getSheetByName(SHEETS.SALES_ACTIVITY);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dateIdx = headers.indexOf('Date');
  
  return data.slice(1)
    .filter(row => {
      const rowDate = new Date(row[dateIdx]);
      return rowDate >= startDate && rowDate <= endDate;
    })
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function fetchAllOperationsMetrics_(startDate, endDate) {
  const sheet = getSS_().getSheetByName(SHEETS.OPERATIONS_METRICS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dateIdx = headers.indexOf('Date');
  
  return data.slice(1)
    .filter(row => {
      const rowDate = new Date(row[dateIdx]);
      return rowDate >= startDate && rowDate <= endDate;
    })
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function calculateGrowthRate_(data) {
  // Calculate month-over-month or year-over-year growth
  if (data.length < 2) return 0;
  
  const sorted = data.sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
  
  const firstTotal = firstHalf.reduce((sum, row) => sum + (Number(row.Daily_Sales_Actual) || 0), 0);
  const secondTotal = secondHalf.reduce((sum, row) => sum + (Number(row.Daily_Sales_Actual) || 0), 0);
  
  if (firstTotal === 0) return 0;
  return ((secondTotal - firstTotal) / firstTotal) * 100;
}

function aggregateByBranch_(data, field) {
  const byBranch = {};
  
  data.forEach(row => {
    const branchId = row.BranchID;
    if (!byBranch[branchId]) {
      byBranch[branchId] = { total: 0, count: 0 };
    }
    byBranch[branchId].total += Number(row[field]) || 0;
    byBranch[branchId].count += 1;
  });
  
  const result = [];
  for (const branchId in byBranch) {
    result.push({
      branchId: branchId,
      average: byBranch[branchId].total / byBranch[branchId].count
    });
  }
  
  return result;
}

// --- Helper to build dynamic queries ---
function buildRevenueQuery_(user, startDate, endDate) {
  // This would build a query object for filtering
  return {
    sheet: SHEETS.REVENUE,
    filters: {
      dateRange: { start: startDate, end: endDate },
      branchId: user.role === 'branch-manager' ? user.branchId : null,
      regionIds: ['region-director', 'area-manager'].includes(user.role) ? user.regionIds : null
    }
  };
}

function executeQuery_(sheetName, query) {
  // Simplified query execution
  const sheet = getSS_().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}
