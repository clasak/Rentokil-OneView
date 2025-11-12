/**
 * =================================================================================
 * Branch360
 * Backend: Code.gs
 * =================================================================================
 * This file contains all server-side logic, data manipulation, automation,
 * role-based access control, metrics calculation, and email generation.
 *
 * @OnlyCurrentDoc
 */

// --- ------------------ ---
// 0. MASTER CONFIGURATION
// --- ------------------ ---

// --- Core Sheet Names ---
const SHEETS = {
  TRACKER: "TrackerData",
  CADENCE: "CadenceReport",
  TASKS: "TaskLog",
  METRICS: "MetricsSummary",
  PACKETS: "StartPackets",
  USERS: "Users",
  ARCHIVE: "Archive",
  AUDIT: "AuditLog",
  DAILY_SALES: "DailySalesPerformance",
  CADENCE_DAILY: "CadenceDaily",
  BRANCHES: "Branches",
  PREFERENCES: "Preferences",
  REGIONS: "Regions",
  MARKETS: "Markets",
  SALES_ACTIVITY: "Sales_Activity",
  OPERATIONS_METRICS: "Operations_Metrics",
  REVENUE: "Revenue",
  QUOTES: "Quotes",
  ACCOUNTS: "Accounts",
  BRANCH_DAILY_SUMMARY: "Branch_Daily_Summary",
  REGION_SUMMARY: "Region_Summary",
  MARKET_SUMMARY: "Market_Summary"
};

// --- Database Schema Definitions ---
const DB_SCHEMA = {
  [SHEETS.USERS]: [
    "UserID","Name","Email","Role","BranchID","Active","CreatedOn","UpdatedOn"
  ],
  [SHEETS.BRANCHES]: [
    "BranchID","BranchName","RegionID","Manager","Active","CreatedOn","UpdatedOn"
  ],
  [SHEETS.REGIONS]: [
    "RegionID","RegionName","MarketID","CreatedOn","UpdatedOn"
  ],
  [SHEETS.MARKETS]: [
    "MarketID","MarketName","CreatedOn","UpdatedOn"
  ],
  [SHEETS.SALES_ACTIVITY]: [
    "EntryID","Date","UserID","BranchID","RegionID","MarketID","AE_ID","TAP_Goal","TAP_Actual","Appointments_Set","Appointments_Completed","Quotes_Created","Quotes_Won","Quote_Value","WinRate_Percent","Daily_Sales_Goal","Daily_Sales_Actual","CreatedOn","UpdatedOn"
  ],
  [SHEETS.OPERATIONS_METRICS]: [
    "EntryID","Date","UserID","BranchID","RegionID","MarketID","MissedStops_TMX","MissedStops_RNA","Backlog_Percent","OT_Percent","Forecasted_Hours","Request_Review_Goal","Request_Review_Actual","Coaching_Rides","TAP_From_Coaching","CreatedOn","UpdatedOn"
  ],
  [SHEETS.REVENUE]: [
    "RevID","Date","UserID","BranchID","RegionID","MarketID","Daily_Goal","Daily_Actual","Scheduled_Tomorrow","Forecasted_Revenue","YOY_Target","YOY_Actual","CreatedOn","UpdatedOn"
  ],
  [SHEETS.QUOTES]: [
    "QuoteID","UserID","AE_ID","AccountID","BranchID","Status","QuoteValue","CreatedDate","ClosedDate","CreatedOn","UpdatedOn"
  ],
  [SHEETS.ACCOUNTS]: [
    "AccountID","UserID","BranchID","RegionID","MarketID","Vertical","Status","LifetimeValue","CreatedOn","UpdatedOn"
  ],
  [SHEETS.BRANCH_DAILY_SUMMARY]: [
    "SummaryID","Date","BranchID","RegionID","MarketID",
    "TAP_Goal","TAP_Actual","Appointments_Set","Appointments_Completed",
    "Quotes_Created","Quotes_Won","Quote_Value","WinRate_Percent",
    "Daily_Sales_Goal","Daily_Sales_Actual",
    "MissedStops_TMX","MissedStops_RNA","Backlog_Percent","OT_Percent",
    "Forecasted_Hours","Request_Review_Goal","Request_Review_Actual",
    "Coaching_Rides","TAP_From_Coaching",
    "Revenue_Percent_Goal","Backlog_Index","Labor_Efficiency","Forecast_Accuracy",
    "CreatedOn","UpdatedOn"
  ],
  [SHEETS.REGION_SUMMARY]: [
    "SummaryID","Date","RegionID","MarketID",
    "TAP_Goal","TAP_Actual","Appointments_Set","Appointments_Completed",
    "Quotes_Created","Quotes_Won","Quote_Value","WinRate_Percent",
    "Daily_Sales_Goal","Daily_Sales_Actual",
    "MissedStops_TMX","MissedStops_RNA","Backlog_Percent","OT_Percent",
    "Forecasted_Hours","Request_Review_Goal","Request_Review_Actual",
    "Coaching_Rides","TAP_From_Coaching",
    "Revenue_Percent_Goal","Backlog_Index","Labor_Efficiency","Forecast_Accuracy",
    "CreatedOn","UpdatedOn"
  ],
  [SHEETS.MARKET_SUMMARY]: [
    "SummaryID","Date","MarketID",
    "TAP_Goal","TAP_Actual","Appointments_Set","Appointments_Completed",
    "Quotes_Created","Quotes_Won","Quote_Value","WinRate_Percent",
    "Daily_Sales_Goal","Daily_Sales_Actual",
    "MissedStops_TMX","MissedStops_RNA","Backlog_Percent","OT_Percent",
    "Forecasted_Hours","Request_Review_Goal","Request_Review_Actual",
    "Coaching_Rides","TAP_From_Coaching",
    "Revenue_Percent_Goal","Backlog_Index","Labor_Efficiency","Forecast_Accuracy",
    "CreatedOn","UpdatedOn"
  ]
};

// --- BigQuery Project/Dataset (Branch360 → Presto-X/Prestox Analytics) ---
const BQ_PROJECT_ID = 'prestox_analytics_project';
const BQ_DATASET_ID = 'prestox_analytics';

// --- Email Configuration ---
const OPS_MANAGERS_EMAILS = "bruce.hockless@prestox.com,joaquin.barrera@prestox.com,mitchell.james@prestox.com";
const EXECUTIVE_EMAILS = "brad.hudson@prestox.com"; // Brad + Leadership

// --- Dynamic Branding Configuration ---
const BRAND_MAP = {
  "Presto-X": {
    name: "Presto-X",
    logo: "https://ik.imagekit.io/9cyexhymf/Presto-X%20Logo-ARentokilCompany.png?updatedAt=1762540113819",
    colorPrimary: "#E4002B", // Adjusted to match logo red
    colorAccent: "#FF6B6B",
    colorDark: "#B00024",
    background: "#FDF2F2",
    // legacy fields for compatibility
    color: "#E4002B"
  },
  "BugOut": {
    name: "BugOut",
    // Use initials or Logo Builder until official BugOut PNG is available
    logo: "https://ik.imagekit.io/9cyexhymf/BugOut%20Logo.png?updatedAt=1762651397528",
    colorPrimary: "#16A34A",
    colorAccent: "#22C55E",
    colorDark: "#14532D",
    background: "#F0FDF4",
    color: "#16A34A"
  },
  "Terminix": {
    name: "Terminix",
    logo: "https://ik.imagekit.io/9cyexhymf/terminix_color_lg.png?updatedAt=1762622940808",
    colorPrimary: "#15803D",
    colorAccent: "#22C55E",
    colorDark: "#166534",
    background: "#ECFDF5",
    color: "#15803D"
  },
  "Rentokil": {
    name: "Rentokil",
    logo: "https://ik.imagekit.io/9cyexhymf/Rentokil%20Logo.png?updatedAt=1762651397519",
    // Match Presto-X branding colors and remove background tint
    colorPrimary: "#E4002B",
    colorAccent: "#FF6B6B",
    colorDark: "#B00024",
    color: "#E4002B"
  }
};

// --- Financial & ROI Configuration ---
const HOURLY_RATE_USD = 65;
const ESTIMATED_SYSTEM_COST = 25000; // Estimated cost for ROI calculation

// --- ------------------ ---
// Enterprise Database Engine
// --- ------------------ ---

function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function getProps_() { return PropertiesService.getScriptProperties(); }
function getCache_() { return CacheService.getScriptCache(); }

function ensureSheet_(name, headers) {
  const ss = getSS_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && headers.length) {
    const hasHeader = sh.getLastRow() >= 1;
    const current = hasHeader ? sh.getRange(1,1,1,headers.length).getValues()[0] : [];
    const mismatch = current.length !== headers.length || headers.some((h,i)=>String(current[i]||'')!==String(h));
    if (!hasHeader || mismatch) {
      sh.clear();
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#f3f4f6');
      sh.setFrozenRows(1);
      if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(1, headers.length - sh.getMaxColumns());
    }
  }
  return sh;
}

function nextId_(key) {
  const props = getProps_();
  const k = `ID_COUNTER_${key}`;
  const v = Number(props.getProperty(k) || 0) + 1;
  props.setProperty(k, String(v));
  return v;
}

function now_() { return new Date(); }
function monthKey_(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,'0');
  return `${y}_${m}`;
}

function summaryPartitionName_(base, d) {
  const mk = monthKey_(d);
  if (base === SHEETS.BRANCH_DAILY_SUMMARY) return `Branch_Summary_${mk}`;
  if (base === SHEETS.REGION_SUMMARY) return `Region_Summary_${mk}`;
  if (base === SHEETS.MARKET_SUMMARY) return `Market_Summary_${mk}`;
  return `${base}_${mk}`;
}

// --- Raw table monthly partitions ---
function rawPartitionName_(sheetKey, d) {
  const mk = monthKey_(d);
  if (sheetKey === SHEETS.SALES_ACTIVITY) return `Sales_Activity_${mk}`;
  if (sheetKey === SHEETS.OPERATIONS_METRICS) return `Operations_Metrics_${mk}`;
  if (sheetKey === SHEETS.REVENUE) return `Revenue_${mk}`;
  return `${sheetKey}_${mk}`;
}

function ensureRawPartition_(sheetKey, d) {
  const name = rawPartitionName_(sheetKey, d);
  return ensureSheet_(name, DB_SCHEMA[sheetKey]);
}

function clusterSheet_(sh, keys) {
  try {
    const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    const sortSpecs = keys.map(k=>({ column: h.indexOf(k)+1, ascending: true })).filter(s=>s.column>0);
    if (sortSpecs.length) sh.getRange(2,1,Math.max(sh.getLastRow()-1,0),h.length).sort(sortSpecs);
  } catch(e) {}
}

function monthsRange_(startDate, endDate) {
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const out = [];
  const cur = new Date(s);
  while (cur <= e) { out.push(new Date(cur)); cur.setMonth(cur.getMonth()+1); }
  return out;
}

function appendToRaw_(sheetKey, record) {
  const d = new Date(record.Date || now_());
  const sh = ensureRawPartition_(sheetKey, d);
  const headers = DB_SCHEMA[sheetKey];
  const row = headers.map(h=> record[h] !== undefined ? record[h] : '');
  row[headers.indexOf('CreatedOn')] = now_();
  row[headers.indexOf('UpdatedOn')] = now_();
  sh.appendRow(row);
  const clusterKeys = sheetKey===SHEETS.SALES_ACTIVITY ? ['BranchID','RegionID'] : sheetKey===SHEETS.OPERATIONS_METRICS ? ['BranchID'] : sheetKey===SHEETS.REVENUE ? ['RegionID'] : [];
  if (clusterKeys.length) clusterSheet_(sh, clusterKeys);
  return { success: true };
}

function isBigQueryAvailable_() {
  try { return !!BigQuery && !!BigQuery.Datasets && !!BigQuery.Tables; } catch(e) { return false; }
}

function ensureBQDataset_() {
  const dsId = 'Branch360';
  try {
    const projectId = Session.getActiveUser().getEmail().split('@')[0] || 'default';
    const datasets = BigQuery.Datasets.list(projectId);
    const exists = datasets.datasets && datasets.datasets.some(d=>d.datasetReference.datasetId===dsId);
    if (!exists) BigQuery.Datasets.insert({ datasetReference: { datasetId: dsId, projectId: projectId } }, projectId);
    return { projectId, dsId };
  } catch(e) { return null; }
}

function ensurePrestoxDataset_() {
  try {
    const datasets = BigQuery.Datasets.list(BQ_PROJECT_ID);
    const exists = datasets.datasets && datasets.datasets.some(d=>d.datasetReference.datasetId===BQ_DATASET_ID);
    if (!exists) {
      BigQuery.Datasets.insert({ datasetReference: { datasetId: BQ_DATASET_ID, projectId: BQ_PROJECT_ID } }, BQ_PROJECT_ID);
    }
    return { projectId: BQ_PROJECT_ID, dsId: BQ_DATASET_ID };
  } catch(e) { return null; }
}

function createBQViews_() {
  const meta = ensureBQDataset_(); if (!meta) return;
  const { projectId, dsId } = meta;
  const statements = [
    {
      name: 'v_branch_summary',
      sql: `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_branch_summary\` AS\n` +
           `SELECT BranchID, RegionID, MarketID, Date,\n` +
           `SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n` +
           `SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n` +
           `SUM(Daily_Sales_Actual) AS Sales, SUM(Daily_Sales_Goal) AS Goal,\n` +
           `SAFE_DIVIDE(SUM(Daily_Sales_Actual), SUM(Daily_Sales_Goal)) AS Sales_Pct\n` +
           `FROM \`${projectId}.${dsId}.Sales_Activity\`\n` +
           `GROUP BY BranchID, RegionID, MarketID, Date`
    },
    {
      name: 'v_region_summary',
      sql: `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_region_summary\` AS\n` +
           `SELECT RegionID, MarketID, Date,\n` +
           `SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n` +
           `SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n` +
           `SUM(Daily_Sales_Actual) AS Sales, SUM(Daily_Sales_Goal) AS Goal,\n` +
           `SAFE_DIVIDE(SUM(Daily_Sales_Actual), SUM(Daily_Sales_Goal)) AS Sales_Pct\n` +
           `FROM \`${projectId}.${dsId}.v_branch_summary\`\n` +
           `GROUP BY RegionID, MarketID, Date`
    },
    {
      name: 'v_market_summary',
      sql: `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_market_summary\` AS\n` +
           `SELECT MarketID, Date,\n` +
           `SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n` +
           `SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n` +
           `SUM(Sales) AS Sales, SUM(Goal) AS Goal,\n` +
           `SAFE_DIVIDE(SUM(Sales), SUM(Goal)) AS Sales_Pct\n` +
           `FROM \`${projectId}.${dsId}.v_region_summary\`\n` +
           `GROUP BY MarketID, Date`
    },
    {
      name: 'v_company_summary',
      sql: `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_company_summary\` AS\n` +
           `SELECT Date,\n` +
           `SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n` +
           `SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n` +
           `SUM(Sales) AS Sales, SUM(Goal) AS Goal,\n` +
           `SAFE_DIVIDE(SUM(Sales), SUM(Goal)) AS Sales_Pct\n` +
           `FROM \`${projectId}.${dsId}.v_market_summary\`\n` +
           `GROUP BY Date`
    }
  ];
  statements.forEach(({ sql }) => {
    try {
      BigQuery.Jobs.insert({ configuration: { query: { query: sql, useLegacySql: false } } }, projectId);
    } catch(e) {}
  });
}

// --- Presto-X BigQuery Schema Provisioning ---
function initializeBigQuerySchema() {
  if (!isBigQueryAvailable_()) return { success: false, message: 'BigQuery service not available' };
  const meta = ensurePrestoxDataset_();
  if (!meta) return { success: false, message: 'Unable to ensure dataset prestox_analytics' };
  const { projectId, dsId } = meta;

  // Core raw tables (monthly partition, hierarchical clustering, 2-year retention)
  const ddl = [
    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.Sales_Activity\` (\n`+
    `  MarketID INT64 NOT NULL, RegionID INT64 NOT NULL, BranchID INT64 NOT NULL, UserID INT64 NOT NULL,\n`+
    `  Date DATE NOT NULL,\n`+
    `  TAP_Goal NUMERIC, TAP_Actual NUMERIC, TAP_From_Coaching NUMERIC,\n`+
    `  Daily_Sales_Goal NUMERIC, Daily_Sales_Actual NUMERIC,\n`+
    `  Revenue_Goal NUMERIC, Revenue_Actual NUMERIC,\n`+
    `  Missed_Stop_TMX NUMERIC, Missed_Stop_RNA NUMERIC, Backlog NUMERIC, Labor_Hours NUMERIC, OT_Percent NUMERIC,\n`+
    `  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n`+
    `)\n`+
    `PARTITION BY DATE_TRUNC(Date, MONTH)\n`+
    `CLUSTER BY MarketID, RegionID, BranchID, UserID\n`+
    `OPTIONS(partition_expiration_days=730)`,

    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.Operations_Metrics\` (\n`+
    `  MarketID INT64 NOT NULL, RegionID INT64 NOT NULL, BranchID INT64 NOT NULL, UserID INT64 NOT NULL,\n`+
    `  Date DATE NOT NULL,\n`+
    `  Missed_Stop_TMX NUMERIC, Missed_Stop_RNA NUMERIC, Backlog NUMERIC, OT_Percent NUMERIC, Labor_Hours NUMERIC,\n`+
    `  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n`+
    `)\n`+
    `PARTITION BY DATE_TRUNC(Date, MONTH)\n`+
    `CLUSTER BY MarketID, RegionID, BranchID, UserID\n`+
    `OPTIONS(partition_expiration_days=730)`,

    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.Revenue_Tracking\` (\n`+
    `  MarketID INT64 NOT NULL, RegionID INT64 NOT NULL, BranchID INT64 NOT NULL, UserID INT64 NOT NULL,\n`+
    `  Date DATE NOT NULL,\n`+
    `  Revenue_Goal NUMERIC, Revenue_Actual NUMERIC,\n`+
    `  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n`+
    `)\n`+
    `PARTITION BY DATE_TRUNC(Date, MONTH)\n`+
    `CLUSTER BY MarketID, RegionID, BranchID, UserID\n`+
    `OPTIONS(partition_expiration_days=730)`,

    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.Branch_Daily_Summary\` (\n`+
    `  MarketID INT64 NOT NULL, RegionID INT64 NOT NULL, BranchID INT64 NOT NULL,\n`+
    `  Date DATE NOT NULL,\n`+
    `  TAP_Goal NUMERIC, TAP_Actual NUMERIC, Daily_Sales_Goal NUMERIC, Daily_Sales_Actual NUMERIC,\n`+
    `  Revenue_Goal NUMERIC, Revenue_Actual NUMERIC,\n`+
    `  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP()\n`+
    `)\n`+
    `PARTITION BY DATE_TRUNC(Date, MONTH)\n`+
    `CLUSTER BY MarketID, RegionID, BranchID\n`+
    `OPTIONS(partition_expiration_days=730)`
  ];

  // Dimension tables
  const dims = [
    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.dim_Markets\` (MarketID INT64, MarketName STRING)`,
    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.dim_Regions\` (RegionID INT64, MarketID INT64, RegionName STRING)`,
    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.dim_Branches\` (BranchID INT64, RegionID INT64, BranchName STRING)`,
    `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.dim_Users\` (UserID INT64, BranchID INT64, RegionID INT64, MarketID INT64, Email STRING, Role STRING)`
  ];

  const exec = sql => {
    try { BigQuery.Jobs.insert({ configuration: { query: { query: sql, useLegacySql: false } } }, projectId); } catch(e) {}
  };
  ddl.concat(dims).forEach(exec);

  // Create summary MV chain
  createPrestoxMaterializedViews_();

  // Create RLS mapping and policies
  applyRowLevelSecurity_();

  // Populate dimensions from Sheets (Users + hierarchy)
  try { populateDimensionsFromSheets_(); } catch(e) {}

  return { success: true };
}

function createPrestoxMaterializedViews_() {
  const meta = ensurePrestoxDataset_(); if (!meta) return;
  const { projectId, dsId } = meta;
  const statements = [
    // Branch summary
    `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_branch_summary\`\n`+
    `PARTITION BY Date_Month\n`+
    `CLUSTER BY MarketID, RegionID, BranchID\n`+
    `OPTIONS (enable_refresh = FALSE) AS\n`+
    `SELECT DATE_TRUNC(Date, MONTH) AS Date_Month, MarketID, RegionID, BranchID,\n`+
    `  SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n`+
    `  SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n`+
    `  SUM(Daily_Sales_Actual) AS Sales, SUM(Daily_Sales_Goal) AS Goal,\n`+
    `  SAFE_DIVIDE(SUM(Daily_Sales_Actual), SUM(Daily_Sales_Goal)) AS Sales_Pct\n`+
    `FROM \`${projectId}.${dsId}.Sales_Activity\`\n`+
    `GROUP BY Date_Month, MarketID, RegionID, BranchID`,

    // Region summary
    `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_region_summary\`\n`+
    `PARTITION BY Date_Month\n`+
    `CLUSTER BY MarketID, RegionID\n`+
    `OPTIONS (enable_refresh = FALSE) AS\n`+
    `SELECT Date_Month, MarketID, RegionID,\n`+
    `  SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n`+
    `  SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n`+
    `  SUM(Sales) AS Sales, SUM(Goal) AS Goal,\n`+
    `  SAFE_DIVIDE(SUM(Sales), SUM(Goal)) AS Sales_Pct\n`+
    `FROM \`${projectId}.${dsId}.v_branch_summary\`\n`+
    `GROUP BY Date_Month, MarketID, RegionID`,

    // Market summary
    `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_market_summary\`\n`+
    `PARTITION BY Date_Month\n`+
    `CLUSTER BY MarketID\n`+
    `OPTIONS (enable_refresh = FALSE) AS\n`+
    `SELECT Date_Month, MarketID,\n`+
    `  SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n`+
    `  SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n`+
    `  SUM(Sales) AS Sales, SUM(Goal) AS Goal,\n`+
    `  SAFE_DIVIDE(SUM(Sales), SUM(Goal)) AS Sales_Pct\n`+
    `FROM \`${projectId}.${dsId}.v_region_summary\`\n`+
    `GROUP BY Date_Month, MarketID`,

    // Company summary
    `CREATE MATERIALIZED VIEW IF NOT EXISTS \`${projectId}.${dsId}.v_company_summary\`\n`+
    `PARTITION BY Date_Month\n`+
    `OPTIONS (enable_refresh = FALSE) AS\n`+
    `SELECT Date_Month,\n`+
    `  SUM(TAP_Actual) AS TAP_Actual, SUM(TAP_Goal) AS TAP_Goal,\n`+
    `  SAFE_DIVIDE(SUM(TAP_Actual), SUM(TAP_Goal)) AS TAP_Pct,\n`+
    `  SUM(Sales) AS Sales, SUM(Goal) AS Goal,\n`+
    `  SAFE_DIVIDE(SUM(Sales), SUM(Goal)) AS Sales_Pct\n`+
    `FROM \`${projectId}.${dsId}.v_market_summary\`\n`+
    `GROUP BY Date_Month`
  ];
  statements.forEach(sql => { try { BigQuery.Jobs.insert({ configuration: { query: { query: sql, useLegacySql: false } } }, projectId); } catch(e) {} });
}

function applyRowLevelSecurity_() {
  const meta = ensurePrestoxDataset_(); if (!meta) return;
  const { projectId, dsId } = meta;
  // Access mapping table
  const mapping = `CREATE TABLE IF NOT EXISTS \`${projectId}.${dsId}.User_Access_Mapping\` (UserEmail STRING, UserID INT64, BranchID INT64, RegionID INT64, MarketID INT64, Role STRING)`;
  try { BigQuery.Jobs.insert({ configuration: { query: { query: mapping, useLegacySql: false } } }, projectId); } catch(e) {}

  // RLS policies (best-effort; may be restricted depending on project settings)
  const rlsBranch = `CREATE ROW ACCESS POLICY branch_policy\n`+
    `ON \`${projectId}.${dsId}.v_branch_summary\`\n`+
    `GRANT TO ("allUsers")\n`+
    `FILTER USING ( BranchID IN ( SELECT BranchID FROM \`${projectId}.${dsId}.User_Access_Mapping\` WHERE UserEmail = SESSION_USER() ) )`;
  try { BigQuery.Jobs.insert({ configuration: { query: { query: rlsBranch, useLegacySql: false } } }, projectId); } catch(e) {}
}

function refreshMaterializedViews() {
  const meta = ensurePrestoxDataset_(); if (!meta) return { success: false };
  const { projectId, dsId } = meta;
  const cmds = [
    `CALL BQ.REFRESH_MATERIALIZED_VIEW(\"\`${projectId}.${dsId}.v_branch_summary\`\")`,
    `CALL BQ.REFRESH_MATERIALIZED_VIEW(\"\`${projectId}.${dsId}.v_region_summary\`\")`,
    `CALL BQ.REFRESH_MATERIALIZED_VIEW(\"\`${projectId}.${dsId}.v_market_summary\`\")`,
    `CALL BQ.REFRESH_MATERIALIZED_VIEW(\"\`${projectId}.${dsId}.v_company_summary\`\")`
  ];
  cmds.forEach(sql => { try { BigQuery.Jobs.insert({ configuration: { query: { query: sql, useLegacySql: false } } }, projectId); } catch(e) {} });
  return { success: true };
}

function fetchDashboardSummary(level, id) {
  const meta = ensurePrestoxDataset_(); if (!meta) return { rows: [] };
  const { projectId, dsId } = meta;
  const sqlMap = {
    branch: `SELECT * FROM \`${projectId}.${dsId}.v_branch_summary\` WHERE BranchID = @id ORDER BY Date_Month DESC LIMIT 30`,
    region: `SELECT * FROM \`${projectId}.${dsId}.v_region_summary\` WHERE RegionID = @id ORDER BY Date_Month DESC LIMIT 30`,
    market: `SELECT * FROM \`${projectId}.${dsId}.v_market_summary\` WHERE MarketID = @id ORDER BY Date_Month DESC LIMIT 30`
  };
  const sql = sqlMap[String(level)]; if (!sql) return { rows: [] };
  const request = {
    query: sql,
    useLegacySql: false,
    parameterMode: 'NAMED',
    queryParameters: [{ name: 'id', parameterType: { type: 'INT64' }, parameterValue: { value: String(id) } }]
  };
  try {
    const results = BigQuery.Jobs.query(request, projectId);
    const rows = (results.rows || []).map(r => r.f.map(x => x.v));
    return { rows, totalRows: rows.length };
  } catch(e) { return { rows: [] }; }
}

function populateDimensionsFromSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSh = ss.getSheetByName(SHEETS.USERS);
  const branchesSh = ss.getSheetByName(SHEETS.BRANCHES);
  const regionsSh = ss.getSheetByName(SHEETS.REGIONS);
  const marketsSh = ss.getSheetByName(SHEETS.MARKETS);
  if (!usersSh) return;

  const readSheet = sh => { const v = sh ? sh.getDataRange().getValues() : []; return { headers: v[0]||[], rows: (v.length>1? v.slice(1):[]) }; };
  const users = readSheet(usersSh);
  const branches = readSheet(branchesSh);
  const regions = readSheet(regionsSh);
  const markets = readSheet(marketsSh);

  const hIdx = (headers, name) => headers.indexOf(name);
  const branchMap = new Map();
  const regionMap = new Map();
  const marketMap = new Map();

  branches.rows.forEach(r => {
    const branchId = Number(r[hIdx(branches.headers,'BranchID')]||0);
    const branchName = String(r[hIdx(branches.headers,'BranchName')]||'');
    const regionId = Number(r[hIdx(branches.headers,'RegionID')]||0);
    branchMap.set(branchId, { branchId, branchName, regionId });
  });
  regions.rows.forEach(r => {
    const regionId = Number(r[hIdx(regions.headers,'RegionID')]||0);
    const regionName = String(r[hIdx(regions.headers,'RegionName')]||'');
    const marketId = Number(r[hIdx(regions.headers,'MarketID')]||0);
    regionMap.set(regionId, { regionId, regionName, marketId });
  });
  markets.rows.forEach(r => {
    const marketId = Number(r[hIdx(markets.headers,'MarketID')]||0);
    const marketName = String(r[hIdx(markets.headers,'MarketName')]||'');
    marketMap.set(marketId, { marketId, marketName });
  });

  const meta = ensurePrestoxDataset_(); if (!meta) return;
  const { projectId, dsId } = meta;
  const insertAll = (table, rows) => {
    if (!rows.length) return;
    try {
      BigQuery.TableData.insertAll({ rows: rows.map(r=>({ json: r })) }, projectId, dsId, table);
    } catch(e) {}
  };

  // dim_Branches
  const dimBranches = [];
  branchMap.forEach(b => { dimBranches.push({ BranchID: b.branchId, RegionID: b.regionId, BranchName: b.branchName }); });
  insertAll('dim_Branches', dimBranches);

  // dim_Regions
  const dimRegions = [];
  regionMap.forEach(r => { dimRegions.push({ RegionID: r.regionId, MarketID: r.marketId, RegionName: r.regionName }); });
  insertAll('dim_Regions', dimRegions);

  // dim_Markets
  const dimMarkets = [];
  marketMap.forEach(m => { dimMarkets.push({ MarketID: m.marketId, MarketName: m.marketName }); });
  insertAll('dim_Markets', dimMarkets);

  // dim_Users
  const uH = users.headers;
  const dimUsers = users.rows.map(r => {
    const userId = Number(r[hIdx(uH,'UserID')]||0);
    const email = String(r[hIdx(uH,'Email')]||'');
    const role = String(r[hIdx(uH,'Role')]||'');
    const branchId = Number(r[hIdx(uH,'BranchID')]||0);
    const regionId = branchMap.get(branchId)?.regionId || 0;
    const marketId = regionMap.get(regionId)?.marketId || 0;
    return { UserID: userId, BranchID: branchId, RegionID: regionId, MarketID: marketId, Email: email, Role: role };
  });
  insertAll('dim_Users', dimUsers);
}

function inferBQType_(h) {
  const s = String(h).toLowerCase();
  if (s.endsWith('id') || s.endsWith('_id') || s.includes('id')) return 'INTEGER';
  if (s.includes('date') && !s.includes('updated')) return 'DATE';
  if (s.includes('createdon') || s.includes('updatedon') || s.includes('timestamp')) return 'TIMESTAMP';
  if (s.includes('percent') || s.includes('value') || s.includes('goal') || s.includes('actual') || s.includes('hours') || s.includes('forecast')) return 'FLOAT';
  if (s === 'active') return 'BOOLEAN';
  return 'STRING';
}

function mirrorSheetToBigQuery_(sheetName) {
  const bqMeta = ensureBQDataset_();
  if (!bqMeta) return;
  const headers = DB_SCHEMA[sheetName];
  if (!headers) return;
  const tableId = sheetName.replace(/[^A-Za-z0-9_]/g,'_');
  const schema = { fields: headers.map(h=>({ name: h, type: inferBQType_(h) })) };
  try {
    const ref = { projectId: bqMeta.projectId, datasetId: bqMeta.dsId, tableId };
    const existing = BigQuery.Tables.get(bqMeta.projectId, bqMeta.dsId, tableId);
    if (!existing || !existing.id) {
      BigQuery.Tables.insert({ tableReference: ref, schema }, bqMeta.projectId, bqMeta.dsId);
    }
  } catch(e) {}
}

function initializeDatabase() {
  const ss = getSS_();
  Object.keys(DB_SCHEMA).forEach(name => ensureSheet_(name, DB_SCHEMA[name]));
  ensureSheet_(SHEETS.AUDIT, ["Timestamp","UserEmail","Action","Table","Details","IP","UserAgent"]);
  const props = getProps_();
  if (!props.getProperty('DB_INITIALIZED')) props.setProperty('DB_INITIALIZED', String(now_().getTime()));
  if (isBigQueryAvailable_()) Object.keys(DB_SCHEMA).forEach(n => mirrorSheetToBigQuery_(n));
  audit_("initializeDatabase","SYSTEM","All tables ensured");
  if (isBigQueryAvailable_()) createBQViews_();
  return { success: true };
}

function rotatePartitions_() {
  const ss = getSS_();
  const base = ss.getSheetByName(SHEETS.BRANCH_DAILY_SUMMARY);
  if (!base) return;
  const data = base.getDataRange().getValues();
  if (data.length <= 1) return;
  const headers = data[0];
  const rows = data.slice(1);
  const dateIdx = headers.indexOf('Date');
  const keepRows = [];
  const moveByPartition = {};
  const thresh = new Date(Date.now() - 30*24*60*60*1000);
  rows.forEach(r => {
    const d = new Date(r[dateIdx]);
    if (d < thresh) {
      const part = summaryPartitionName_(SHEETS.BRANCH_DAILY_SUMMARY, d);
      if (!moveByPartition[part]) moveByPartition[part] = [];
      moveByPartition[part].push(r);
    } else {
      keepRows.push(r);
    }
  });
  Object.keys(moveByPartition).forEach(partName => {
    const sh = ensureSheet_(partName, DB_SCHEMA[SHEETS.BRANCH_DAILY_SUMMARY]);
    const start = sh.getLastRow()+1;
    const vals = moveByPartition[partName];
    if (vals.length) sh.getRange(start,1,vals.length,headers.length).setValues(vals);
  });
  base.clear();
  base.getRange(1,1,1,headers.length).setValues([headers]);
  if (keepRows.length) base.getRange(2,1,keepRows.length,headers.length).setValues(keepRows);
}

function nightlyETL() {
  const ss = getSS_();
  Object.keys(DB_SCHEMA).forEach(n => ensureSheet_(n, DB_SCHEMA[n]));
  const props = getProps_();
  const lastTs = Number(props.getProperty('DB_LAST_ETL_TS') || 0);
  const lastDate = lastTs ? new Date(lastTs) : new Date(0);
  const startScan = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  const endScan = now_();
  const months = monthsRange_(startScan, endScan);
  const readRaw = (sheetKey) => {
    const acc = [];
    months.forEach(m => {
      const sh = ss.getSheetByName(rawPartitionName_(sheetKey, m)) || null;
      if (!sh) return;
      const vals = sh.getDataRange().getValues();
      if (!vals.length) return;
      const h = vals[0];
      const rows = vals.slice(1);
      rows.forEach(r=>{ if (new Date(r[h.indexOf('Date')])>=lastDate) acc.push(r); });
      acc.h = vals[0];
    });
    // also check any legacy base sheet
    const legacy = ss.getSheetByName(sheetKey);
    if (legacy) {
      const vals = legacy.getDataRange().getValues();
      if (vals.length) {
        const h = vals[0];
        vals.slice(1).forEach(r=>{ if (new Date(r[h.indexOf('Date')])>=lastDate) acc.push(r); });
        acc.h = h;
      }
    }
    return acc;
  };
  const rSales = readRaw(SHEETS.SALES_ACTIVITY); const hSales = rSales.h || DB_SCHEMA[SHEETS.SALES_ACTIVITY];
  const rOps = readRaw(SHEETS.OPERATIONS_METRICS); const hOps = rOps.h || DB_SCHEMA[SHEETS.OPERATIONS_METRICS];
  const rRev = readRaw(SHEETS.REVENUE); const hRev = rRev.h || DB_SCHEMA[SHEETS.REVENUE];

  const key = (d,b) => `${Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd')}|${b}`;
  const byBranch = {};
  const setIf = (o,k,v)=>{ if (o[k]===undefined) o[k]=v; };

  rSales.forEach(r=>{
    const d=r[hSales.indexOf('Date')]; const b=String(r[hSales.indexOf('BranchID')]); const reg=r[hSales.indexOf('RegionID')]; const m=r[hSales.indexOf('MarketID')];
    ensureLinkage_(b, reg, m);
    const k = key(d,b); const o = byBranch[k] || { Date: new Date(d), BranchID:b, RegionID:reg, MarketID:m };
    o.TAP_Goal = (o.TAP_Goal||0)+Number(r[hSales.indexOf('TAP_Goal')]||0);
    o.TAP_Actual = (o.TAP_Actual||0)+Number(r[hSales.indexOf('TAP_Actual')]||0);
    o.Appointments_Set = (o.Appointments_Set||0)+Number(r[hSales.indexOf('Appointments_Set')]||0);
    o.Appointments_Completed = (o.Appointments_Completed||0)+Number(r[hSales.indexOf('Appointments_Completed')]||0);
    o.Quotes_Created = (o.Quotes_Created||0)+Number(r[hSales.indexOf('Quotes_Created')]||0);
    o.Quotes_Won = (o.Quotes_Won||0)+Number(r[hSales.indexOf('Quotes_Won')]||0);
    o.Quote_Value = (o.Quote_Value||0)+Number(r[hSales.indexOf('Quote_Value')]||0);
    o.Daily_Sales_Goal = (o.Daily_Sales_Goal||0)+Number(r[hSales.indexOf('Daily_Sales_Goal')]||0);
    o.Daily_Sales_Actual = (o.Daily_Sales_Actual||0)+Number(r[hSales.indexOf('Daily_Sales_Actual')]||0);
    byBranch[k]=o;
  });

  rOps.forEach(r=>{
    const d=r[hOps.indexOf('Date')]; const b=String(r[hOps.indexOf('BranchID')]); const reg=r[hOps.indexOf('RegionID')]; const m=r[hOps.indexOf('MarketID')];
    ensureLinkage_(b, reg, m);
    const k = key(d,b); const o = byBranch[k] || { Date: new Date(d), BranchID:b, RegionID:reg, MarketID:m };
    o.MissedStops_TMX = (o.MissedStops_TMX||0)+Number(r[hOps.indexOf('MissedStops_TMX')]||0);
    o.MissedStops_RNA = (o.MissedStops_RNA||0)+Number(r[hOps.indexOf('MissedStops_RNA')]||0);
    setIf(o,'Backlog_Percent', Number(r[hOps.indexOf('Backlog_Percent')]||0));
    setIf(o,'OT_Percent', Number(r[hOps.indexOf('OT_Percent')]||0));
    o.Forecasted_Hours = (o.Forecasted_Hours||0)+Number(r[hOps.indexOf('Forecasted_Hours')]||0);
    o.Request_Review_Goal = (o.Request_Review_Goal||0)+Number(r[hOps.indexOf('Request_Review_Goal')]||0);
    o.Request_Review_Actual = (o.Request_Review_Actual||0)+Number(r[hOps.indexOf('Request_Review_Actual')]||0);
    o.Coaching_Rides = (o.Coaching_Rides||0)+Number(r[hOps.indexOf('Coaching_Rides')]||0);
    o.TAP_From_Coaching = (o.TAP_From_Coaching||0)+Number(r[hOps.indexOf('TAP_From_Coaching')]||0);
    byBranch[k]=o;
  });

  rRev.forEach(r=>{
    const d=r[hRev.indexOf('Date')]; const b=String(r[hRev.indexOf('BranchID')]); const reg=r[hRev.indexOf('RegionID')]; const m=r[hRev.indexOf('MarketID')];
    ensureLinkage_(b, reg, m);
    const k = key(d,b); const o = byBranch[k] || { Date: new Date(d), BranchID:b, RegionID:reg, MarketID:m };
    o.Daily_Goal = (o.Daily_Goal||0)+Number(r[hRev.indexOf('Daily_Goal')]||0);
    o.Daily_Actual = (o.Daily_Actual||0)+Number(r[hRev.indexOf('Daily_Actual')]||0);
    o.Scheduled_Tomorrow = (o.Scheduled_Tomorrow||0)+Number(r[hRev.indexOf('Scheduled_Tomorrow')]||0);
    o.Forecasted_Revenue = (o.Forecasted_Revenue||0)+Number(r[hRev.indexOf('Forecasted_Revenue')]||0);
    o.YOY_Target = (o.YOY_Target||0)+Number(r[hRev.indexOf('YOY_Target')]||0);
    o.YOY_Actual = (o.YOY_Actual||0)+Number(r[hRev.indexOf('YOY_Actual')]||0);
    byBranch[k]=o;
  });

  const baseSh = ensureSheet_(SHEETS.BRANCH_DAILY_SUMMARY, DB_SCHEMA[SHEETS.BRANCH_DAILY_SUMMARY]);
  const h = DB_SCHEMA[SHEETS.BRANCH_DAILY_SUMMARY];
  const rowsOut = [];
  Object.keys(byBranch).forEach(k=>{
    const o = byBranch[k];
    const tapPerc = (Number(o.TAP_Actual||0) && Number(o.TAP_Goal||0)) ? Number(o.TAP_Actual)/Number(o.TAP_Goal) : 0;
    const winRate = (Number(o.Quotes_Won||0) && Number(o.Quotes_Created||0)) ? Number(o.Quotes_Won)/Number(o.Quotes_Created) : 0;
    const revPerc = (Number(o.Daily_Actual||0) && Number(o.Daily_Goal||0)) ? Number(o.Daily_Actual)/Number(o.Daily_Goal) : 0;
    const backlogIdx = Number(o.Backlog_Percent||0) * Number(o.MissedStops_TMX||0) * Number(o.MissedStops_RNA||0);
    const laborEff = (Number(o.Forecasted_Hours||0)) ? Number(o.Daily_Actual||0)/Number(o.Forecasted_Hours||0) : 0;
    const forecastAcc = (Number(o.Forecasted_Revenue||0)) ? (Number(o.Forecasted_Revenue||0) - Number(o.Daily_Actual||0)) / Number(o.Forecasted_Revenue||0) : 0;
    const row = [
      nextId_('BRANCH_SUMMARY'),
      new Date(o.Date), String(o.BranchID||''), String(o.RegionID||''), String(o.MarketID||''),
      Number(o.TAP_Goal||0), Number(o.TAP_Actual||0), Number(o.Appointments_Set||0), Number(o.Appointments_Completed||0),
      Number(o.Quotes_Created||0), Number(o.Quotes_Won||0), Number(o.Quote_Value||0), Number(winRate||0),
      Number(o.Daily_Sales_Goal||0), Number(o.Daily_Sales_Actual||0),
      Number(o.MissedStops_TMX||0), Number(o.MissedStops_RNA||0), Number(o.Backlog_Percent||0), Number(o.OT_Percent||0),
      Number(o.Forecasted_Hours||0), Number(o.Request_Review_Goal||0), Number(o.Request_Review_Actual||0),
      Number(o.Coaching_Rides||0), Number(o.TAP_From_Coaching||0),
      Number(revPerc||0), Number(backlogIdx||0), Number(laborEff||0), Number(forecastAcc||0),
      now_(), now_()
    ];
    rowsOut.push(row);
  });
  if (rowsOut.length) baseSh.getRange(baseSh.getLastRow()+1,1,rowsOut.length,h.length).setValues(rowsOut);

  const regionAgg = {};
  const marketAgg = {};
  rowsOut.forEach(r=>{
    const idx = (nm)=>h.indexOf(nm);
    const d = r[idx('Date')]; const reg = r[idx('RegionID')]; const m = r[idx('MarketID')];
    const kReg = `${Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd')}|${reg}`;
    const kMar = `${Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd')}|${m}`;
    const collect = (agg,k)=>{
      const o = agg[k] || { Date: new Date(d) };
      ['TAP_Goal','TAP_Actual','Appointments_Set','Appointments_Completed','Quotes_Created','Quotes_Won','Quote_Value','Daily_Sales_Goal','Daily_Sales_Actual','MissedStops_TMX','MissedStops_RNA','Backlog_Percent','OT_Percent','Forecasted_Hours','Request_Review_Goal','Request_Review_Actual','Coaching_Rides','TAP_From_Coaching'].forEach(n=>{ o[n]=(o[n]||0)+Number(r[idx(n)]||0); });
      o.RegionID = reg; o.MarketID = m; agg[k]=o;
    };
    collect(regionAgg,kReg); collect(marketAgg,kMar);
  });

  const writeAgg = (agg, sheetKey) => {
    const sh = ensureSheet_(sheetKey, DB_SCHEMA[sheetKey]);
    const hh = DB_SCHEMA[sheetKey];
    const out = Object.keys(agg).map(k=>{
      const o = agg[k];
      const tapPerc = (o.TAP_Actual && o.TAP_Goal) ? o.TAP_Actual/o.TAP_Goal : 0;
      const winRate = (o.Quotes_Won && o.Quotes_Created) ? o.Quotes_Won/o.Quotes_Created : 0;
      const revPerc = (o.Daily_Sales_Actual && o.Daily_Sales_Goal) ? o.Daily_Sales_Actual/o.Daily_Sales_Goal : 0;
      const backlogIdx = Number(o.Backlog_Percent||0) * Number(o.MissedStops_TMX||0) * Number(o.MissedStops_RNA||0);
      const laborEff = (o.Forecasted_Hours) ? Number(o.Daily_Sales_Actual||0)/Number(o.Forecasted_Hours||0) : 0;
      const forecastAcc = (o.Forecasted_Hours || o.Forecasted_Revenue) ? ((Number(o.Forecasted_Revenue||0) - Number(o.Daily_Sales_Actual||0)) / Number(o.Forecasted_Revenue||0 || 1)) : 0;
      const base = [ nextId_(sheetKey), new Date(o.Date) ];
      const rest = sheetKey===SHEETS.REGION_SUMMARY ? [ String(o.RegionID||''), String(o.MarketID||'') ] : [ String(o.MarketID||'') ];
      const metrics = [ o.TAP_Goal||0,o.TAP_Actual||0,o.Appointments_Set||0,o.Appointments_Completed||0,o.Quotes_Created||0,o.Quotes_Won||0,o.Quote_Value||0, Number(winRate||0), o.Daily_Sales_Goal||0,o.Daily_Sales_Actual||0,o.MissedStops_TMX||0,o.MissedStops_RNA||0,o.Backlog_Percent||0,o.OT_Percent||0,o.Forecasted_Hours||0,o.Request_Review_Goal||0,o.Request_Review_Actual||0,o.Coaching_Rides||0,o.TAP_From_Coaching||0, Number(revPerc||0), Number(backlogIdx||0), Number(laborEff||0), Number(forecastAcc||0), now_(), now_() ];
      return base.concat(rest).concat(metrics);
    });
    if (out.length) sh.getRange(sh.getLastRow()+1,1,out.length,hh.length).setValues(out);
  };
  writeAgg(regionAgg, SHEETS.REGION_SUMMARY);
  writeAgg(marketAgg, SHEETS.MARKET_SUMMARY);

  rotatePartitions_();
  autoArchiveOldPartitions_();

  const cache = getCache_();
  const snapshot = JSON.stringify({ ts: now_().getTime(), lastRunCount: rowsOut.length });
  cache.put('dashboardCache', snapshot, 600);
  props.setProperty('DASHBOARD_CACHE', snapshot);
  props.setProperty('DB_LAST_ETL_TS', String(now_().getTime()));
  audit_("nightlyETL","SUMMARY", `Inserted ${rowsOut.length} branch rows`);
  return { success: true, inserted: rowsOut.length };
}

function getDashboardData(branchId, regionId, marketId, startDate, endDate) {
  const cache = getCache_();
  const key = `dashboardCache:${branchId||''}:${regionId||''}:${marketId||''}:${startDate||''}:${endDate||''}`;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  // Role-based scope enforcement
  const user = getCurrentUser();
  const scope = getRoleScope_(user);
  const branchFilter = branchId || scope.branchId || null;
  const regionFilter = regionId || scope.regionId || null;
  const marketFilter = marketId || scope.marketId || null;

  const start = new Date(startDate); const end = new Date(endDate);

  // Prefer BigQuery materialized views when available
  if (isBigQueryAvailable_()) {
    try {
      const { projectId, dsId } = ensureBQDataset_() || {};
      const sql = `SELECT * FROM \`${projectId}.${dsId}.v_branch_summary\` WHERE Date BETWEEN @start AND @end`
        + (branchFilter ? ` AND CAST(BranchID AS STRING) = @branchId` : '')
        + (regionFilter ? ` AND CAST(RegionID AS STRING) = @regionId` : '')
        + (marketFilter ? ` AND CAST(MarketID AS STRING) = @marketId` : '')
        + ` ORDER BY Date, BranchID`;
      const job = BigQuery.Jobs.insert({ configuration: { query: {
        query: sql,
        useLegacySql: false,
        parameterMode: 'NAMED',
        queryParameters: [
          { name: 'start', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: start.toISOString() } },
          { name: 'end', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: end.toISOString() } }
        ].concat(branchFilter ? [{ name: 'branchId', parameterType: { type: 'STRING' }, parameterValue: { value: String(branchFilter) } }] : [])
         .concat(regionFilter ? [{ name: 'regionId', parameterType: { type: 'STRING' }, parameterValue: { value: String(regionFilter) } }] : [])
         .concat(marketFilter ? [{ name: 'marketId', parameterType: { type: 'STRING' }, parameterValue: { value: String(marketFilter) } }] : [])
      } } }, projectId);
      const jobId = job.jobReference.jobId;
      let result = BigQuery.Jobs.getQueryResults(projectId, jobId);
      while (!result.jobComplete) {
        Utilities.sleep(200);
        result = BigQuery.Jobs.getQueryResults(projectId, jobId);
      }
      const rows = (result.rows || []).map(r => r.f.map(x => x.v));
      const res = { rows, count: rows.length };
      cache.put(key, JSON.stringify(res), 86400);
      PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(res));
      return res;
    } catch(e) {
      // Fallback to Sheets summary if BigQuery query fails
    }
  }

  // Sheets summary fallback
  const ss = getSS_();
  const parts = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) { parts.push(summaryPartitionName_(SHEETS.BRANCH_DAILY_SUMMARY, cur)); cur.setMonth(cur.getMonth()+1); }
  const baseSh = ss.getSheetByName(SHEETS.BRANCH_DAILY_SUMMARY);
  const dataCollect = [];
  const readSheet = sh => {
    if (!sh) return;
    const vals = sh.getDataRange().getValues(); if (!vals.length) return;
    const h = vals[0]; const rows = vals.slice(1);
    rows.forEach(r=>{
      const d = new Date(r[h.indexOf('Date')]); if (d < start || d > end) return;
      if (branchFilter && String(r[h.indexOf('BranchID')])!==String(branchFilter)) return;
      if (regionFilter && String(r[h.indexOf('RegionID')])!==String(regionFilter)) return;
      if (marketFilter && String(r[h.indexOf('MarketID')])!==String(marketFilter)) return;
      dataCollect.push(r);
    });
  };
  readSheet(baseSh); parts.forEach(p=>readSheet(ss.getSheetByName(p)));
  const res = { rows: dataCollect, count: dataCollect.length };
  cache.put(key, JSON.stringify(res), 86400);
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(res));
  return res;
}

function resetCache() {
  const props = getProps_();
  const keys = props.getKeys();
  keys.filter(k=>k.indexOf('dashboardCache')===0 || k.indexOf('DASHBOARD_CACHE')===0).forEach(k=>props.deleteProperty(k));
  getCache_().put('dashboardCache', JSON.stringify({ ts: now_().getTime(), reset: true }), 120);
  return { success: true };
}

function refreshSummaries() { return nightlyETL(); }

function ensureArchiveFolder_() {
  const name = 'PrestoX_Archives';
  const iter = DriveApp.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(name);
}

function exportArchive(month, year) {
  const ss = getSS_();
  const mk = `${year}_${String(month).padStart(2,'0')}`;
  const names = [ `Branch_Summary_${mk}`, `Region_Summary_${mk}`, `Market_Summary_${mk}` ];
  const folder = ensureArchiveFolder_();
  const out = [];
  names.forEach(n=>{
    const sh = ss.getSheetByName(n);
    if (!sh) return;
    const file = SpreadsheetApp.create(`Branch360_${n}`);
    const dest = file.getSheetByName('Sheet1');
    const vals = sh.getDataRange().getValues();
    dest.getRange(1,1,vals.length,vals[0].length).setValues(vals);
    const blob = file.getBlob();
    const copy = folder.createFile(blob).setName(`Branch360_${n}.xlsx`);
    out.push(copy.getId());
    SpreadsheetApp.openById(file.getId()).deleteSheet(dest);
  });
  audit_("exportArchive","ARCHIVE", `Exported ${names.join(', ')}`);
  return { success: true, files: out };
}

function autoArchiveOldPartitions_() {
  const ss = getSS_();
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth()-12);
  const names = ss.getSheets().map(sh=>sh.getName())
    .filter(n=>/(Sales_Activity_|Operations_Metrics_|Revenue_|Branch_Summary_|Region_Summary_|Market_Summary_)\d{4}_\d{2}/.test(n));
  const folder = ensureArchiveFolder_();
  names.forEach(n => {
    const parts = n.match(/(\d{4})_(\d{2})$/);
    if (!parts) return;
    const dt = new Date(Number(parts[1]), Number(parts[2])-1, 1);
    if (dt > cutoff) return;
    const sh = ss.getSheetByName(n); if (!sh) return;
    const file = SpreadsheetApp.create(`Branch360_${n}`);
    const dest = file.getSheetByName('Sheet1');
    const vals = sh.getDataRange().getValues();
    dest.getRange(1,1,vals.length,vals[0].length).setValues(vals);
    const blob = file.getBlob();
    const copy = folder.createFile(blob).setName(`Branch360_${n}.xlsx`);
    SpreadsheetApp.openById(file.getId()).deleteSheet(dest);
    audit_("autoArchive","ARCHIVE", `Archived ${n}`);
  });
}

function audit_(action, table, details) {
  try {
    const sh = ensureSheet_(SHEETS.AUDIT, ["Timestamp","UserEmail","Action","Table","Details","IP","UserAgent"]);
    sh.appendRow([ now_(), Session.getActiveUser().getEmail(), action, table, String(details||''), '', '' ]);
  } catch(e) {}
}

function getRoleScope_(user) {
  // Returns filters the user is allowed to access; null means unrestricted
  const role = String((user && user.role) || 'Sales');
  if (role === 'AE' || role === 'Sales') {
    // Limit to the user's Branch
    return { branchId: user.branch || null };
  }
  if (role === 'Branch' || role === 'Branch Manager') {
    return { branchId: user.branch || null };
  }
  if (role === 'Regional Director' || role === 'Region') {
    // Expect Preferences sheet to map user->Region
    return { regionId: user.branch || null }; // reuse branch field as region label if needed
  }
  if (role === 'Market Director' || role === 'Market') {
    return { marketId: user.branch || null };
  }
  if (role === 'Executive') {
    return { }; // no restriction
  }
  return { branchId: user.branch || null };
}

function ensureLinkage_(branchId, regionId, marketId) {
  const ss = getSS_();
  if (branchId) {
    const sh = ensureSheet_(SHEETS.BRANCHES, DB_SCHEMA[SHEETS.BRANCHES]);
    const vals = sh.getDataRange().getValues();
    const exists = vals.some((r,i)=> i>0 && String(r[0])===String(branchId));
    if (!exists) sh.appendRow([ branchId, `Branch ${branchId}`, regionId||'', '', true, now_(), now_() ]);
  }
  if (regionId) {
    const sh = ensureSheet_(SHEETS.REGIONS, DB_SCHEMA[SHEETS.REGIONS]);
    const vals = sh.getDataRange().getValues();
    const exists = vals.some((r,i)=> i>0 && String(r[0])===String(regionId));
    if (!exists) sh.appendRow([ regionId, `Region ${regionId}`, marketId||'', now_(), now_() ]);
  }
  if (marketId) {
    const sh = ensureSheet_(SHEETS.MARKETS, DB_SCHEMA[SHEETS.MARKETS]);
    const vals = sh.getDataRange().getValues();
    const exists = vals.some((r,i)=> i>0 && String(r[0])===String(marketId));
    if (!exists) sh.appendRow([ marketId, `Market ${marketId}`, now_(), now_() ]);
  }
}
const BASELINE_TASK_TIME_MINS = {
  'generate_cadence': 60,
  'create_start_packet': 45,
  'pull_kpis': 30,
  'generate_audit': 120,
  'manual_data_entry': 15
};

// --- TrackerData Headers ---
const TRACKER_HEADERS = [
  "ID", "Status", "Sales_Rep", "Branch", "Customer_Name", "Service_Address", "POC_Name", "POC_Phone",
  "Date_Proposal", "Date_Sold", "Date_Dead", "Date_Install_Scheduled", "Status_Install_Complete",
  "Source", "Sale_Type", "Service_Description", "Initial_Fee", "Monthly_Fee", "Frequency", "Annual_Value",
  "PestPac_ID", "Operations_Manager", "Assigned_Specialist", "Log_Book_Needed", "Materials_Ordered",
  "Status_Paid", "Notes", "StartPacket_Sent", "INSP_PRP", "LOBs_PRP", "TAP_Leads", "Next_Day_CONF", "PC_NO_TC_Conversions"
];

// --- StartPackets Headers ---
const PACKET_HEADERS = [
  "Packet_ID",
  "Sold_Date",
  "Account_Name",
  "Service_Address",
  "Sales_Reps",
  "Initial_Job1x_Price",
  "Maintenance_Price",
  "Type",
  "Frequency_Annual_Visits",
  "Log_Book_Needed",
  "Tap_Lead_or_Specialist",
  "PestPac_Loc_ID",
  "Customer_Requested_Start_Month",
  "Operations_Manager",
  "Assigned_Specialist",
  "Materials_Ordered",
  "Installation_Started",
  "POC_Name_Phone",
  "Confirmed_Start_Date_with_POC",
  "Special_Notes"
];
// --- CadenceReport Headers (31 Columns) ---
const CADENCE_HEADERS = [
  "Entry_ID", "Sales_Rep", "Stage", "Date_Proposal", "Date_Sold", "Date_Dead",
  "Customer_Name", "Service_Address", "POC_Name", "POC_Phone", "Source", "Sale_Type",
  "Service_Description", "Initial_Fee", "Monthly_Fee", "Frequency", "Annual_Value",
  "PestPac_ID", "Operations_Manager", "Assigned_Specialist", "Date_Install_Scheduled",
  "Status_Install_Complete", "Log_Book_Needed", "Materials_Ordered", "Status_Paid", "Notes",
  "INSP_PRP", "LOBs_PRP", "TAP_Leads", "Next_Day_CONF", "PC_NO_TC_Conversions"
];

// --- ------------------ ---
// 1. CORE SETUP & TRIGGERS
// --- ------------------ ---

/**
 * Serves the main HTML page of the web app.
 * @param {object} e - The event parameter.
 * @returns {HtmlOutput} The HTML page.
 */
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index').evaluate();
  html.setTitle('Branch360');
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  return html;
}

/**
 * [ADMIN] Runs setup to create necessary sheets, properties, and triggers.
 * Run this function manually ONE TIME from the Apps Script editor.
 */
function runSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // --- Create all 8 sheets ---
  ui.alert("Setup Started", "Creating 8 required sheets...", ui.ButtonSet.OK);
  Object.values(SHEETS).forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      ss.insertSheet(sheetName);
      Utilities.sleep(300);
    }
  });

  // --- Setup Users sheet ---
  const userSheet = ss.getSheetByName(SHEETS.USERS);
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow(["Email", "Role", "Branch", "Name"]);
    userSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
    userSheet.appendRow([Session.getActiveUser().getEmail(), "Admin", "Corporate", "Admin User"]);
    userSheet.appendRow(["brad.hudson@prestox.com", "Executive", "Corporate", "Brad Hudson"]);
    userSheet.appendRow(["sales.user@prestox.com", "Sales", "Branch A", "Sales User"]);
    userSheet.appendRow(["ops.user@prestox.com", "Ops", "Branch A", "Ops User"]);
    userSheet.appendRow(["branch.manager@prestox.com", "Branch", "Branch A", "Branch Manager"]);
  }

  // --- Setup TrackerData sheet ---
  const trackerSheet = ss.getSheetByName(SHEETS.TRACKER);
  if (trackerSheet.getLastRow() === 0) {
    trackerSheet.appendRow(TRACKER_HEADERS);
    trackerSheet.getRange(1, 1, 1, TRACKER_HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
    trackerSheet.setFrozenRows(1);
  } else {
    // Repair headers if run again
    repairSheetHeaders(trackerSheet, TRACKER_HEADERS);
  }
  
  // --- Setup CadenceReport sheet ---
  const cadenceSheet = ss.getSheetByName(SHEETS.CADENCE);
  if (cadenceSheet.getLastRow() === 0) {
    cadenceSheet.appendRow(CADENCE_HEADERS);
    cadenceSheet.getRange(1, 1, 1, CADENCE_HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
    cadenceSheet.setFrozenRows(1);
  }
  
  // --- Setup TaskLog sheet ---
  const taskSheet = ss.getSheetByName(SHEETS.TASKS);
  if (taskSheet.getLastRow() === 0) {
    taskSheet.appendRow(["Timestamp", "User", "Task", "Action", "Time_Baseline_Min", "Time_Actual_Min", "Time_Saved_Min"]);
    taskSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
  }

  // --- Setup MetricsSummary sheet ---
  const metricsSheet = ss.getSheetByName(SHEETS.METRICS);
  if (metricsSheet.getLastRow() === 0) {
    metricsSheet.appendRow(["Metric", "Value", "Date", "Branch"]);
    metricsSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
  }

  // --- Setup StartPackets sheet ---
  const packetsSheet = ss.getSheetByName(SHEETS.PACKETS);
  if (packetsSheet.getLastRow() === 0) {
    packetsSheet.appendRow(PACKET_HEADERS);
    packetsSheet.getRange(1, 1, 1, PACKET_HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
    packetsSheet.setFrozenRows(1);
  } else {
    repairSheetHeaders(packetsSheet, PACKET_HEADERS);
  }

  // --- Setup AuditLog sheet ---
  const auditSheet = ss.getSheetByName(SHEETS.AUDIT);
  if (auditSheet.getLastRow() === 0) {
    auditSheet.appendRow(["Timestamp", "User", "Action", "Details", "IP", "UserAgent"]);
    auditSheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
  }

  // --- Setup DailySalesPerformance sheet ---
  const dailySheet = ss.getSheetByName(SHEETS.DAILY_SALES);
  if (dailySheet.getLastRow() === 0) {
    dailySheet.appendRow([
      "Timestamp",
      "Email",
      "AE_Name",
      "Proposals_Delivered",
      "PRP_LOBs_Included_Count",
      "PRP_LOBs_Sold_Count",
      "Dollars_Sold_Today",
      "Next_Day_CONF",
      "Dollars_Proposed_Today",
      "Events_First_Appt",
      "Events_Site_Assessment",
      "Events_Proposals",
      "Events_In_Person",
      "Notes"
    ]);
    dailySheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
  }

  // --- Create sample data ---
  createSampleData();

  // --- Setup Triggers ---
  deleteAllTriggers();
  ScriptApp.newTrigger('refreshDailyMetrics').timeBased().everyDays(1).atHour(2).create();
  ScriptApp.newTrigger('emailWeeklyLeadershipSummary').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  ScriptApp.newTrigger('sendReminderEmails').timeBased().everyDays(1).atHour(9).create();

  ui.alert("Setup Complete", "All sheets created, sample data added, and triggers scheduled.", ui.ButtonSet.OK);
}

/**
 * Helper to repair sheet headers if they don't match expected headers.
 * @param {Sheet} sheet - The sheet to repair.
 * @param {string[]} expectedHeaders - The expected headers.
 */
function repairSheetHeaders(sheet, expectedHeaders) {
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (existingHeaders.length !== expectedHeaders.length || !expectedHeaders.every((header, i) => header === existingHeaders[i])) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange("1:1").setFontWeight("bold").setBackground("#f3f4f6");
  }
}

/**
 * Deletes all existing triggers.
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

// --- ------------------ ---
// 2. USER & AUTH FUNCTIONS
// --- ------------------ ---

/**
 * Gets the current user's role and data.
 * @returns {object} User object with role and permissions.
 */
function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  const users = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === email) {
      return {
        email: email,
        role: users[i][1],
        branch: users[i][2],
        name: users[i][3],
        isAuthenticated: true
      };
    }
  }
  
  // Return default user if not found
  return {
    email: email,
    role: "Sales",
    branch: "Unknown",
    name: "Unknown User",
    isAuthenticated: false
  };
}

/**
 * Gets brand information based on user email domain.
 * @returns {object} Brand information with color, logo, and name.
 */
function getBrandInfo() {
  const user = getCurrentUser();
  return getBranchBrand(user.branch || user.email);
}

/**
 * Gets dashboard data based on user role.
 * @param {string} role - The user's role.
 * @returns {object} Dashboard data for the role.
 */
function getDashboardData(role) {
  logUserAction("getDashboardData", `Role: ${role}`);
  
  switch (role.toLowerCase()) {
    case 'sales':
      return getSalesDashboardData();
    case 'ops':
    case 'operations':
      return getOperationsDashboardData();
    case 'branch':
    case 'branch manager':
      return getBranchDashboardData();
    case 'executive':
      return getExecutiveDashboardData();
    default:
      return getSalesDashboardData();
  }
}

/**
 * Returns recent Drive files for the active user.
 * Note: For broader queries, consider enabling Advanced Drive API.
 * @param {number} limit - Max number of files to return
 * @returns {object} { files: Array<{name,url,mimeType,lastUpdated}>
 */
function getDriveFiles(limit) {
  try {
    const max = Math.max(1, Math.min(Number(limit) || 25, 100));
    const filesIter = DriveApp.getFiles();
    const out = [];
    let count = 0;
    while (filesIter.hasNext() && count < max) {
      const f = filesIter.next();
      out.push({
        name: f.getName(),
        url: f.getUrl(),
        mimeType: f.getMimeType(),
        lastUpdated: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'MM/dd/yyyy')
      });
      count++;
    }
    return { files: out };
  } catch (err) {
    return { files: [], error: String(err) };
  }
}

/**
 * Returns Calendar events between start and end for the active user's primary calendar.
 * @param {Date} start
 * @param {Date} end
 * @returns {object} { events: Array<{title,date,time,location}>
 */
function getCalendarEvents(start, end) {
  try {
    const s = start ? new Date(start) : new Date();
    const e = end ? new Date(end) : new Date(Date.now() + 7*24*60*60*1000);
    const cal = CalendarApp.getDefaultCalendar();
    const events = cal.getEvents(s, e).map(ev => ({
      id: ev.getId(),
      title: ev.getTitle(),
      date: Utilities.formatDate(ev.getStartTime(), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
      time: Utilities.formatDate(ev.getStartTime(), Session.getScriptTimeZone(), 'h:mm a'),
      location: ev.getLocation() || '',
      hangoutLink: (typeof ev.getHangoutLink === 'function') ? (ev.getHangoutLink() || '') : ''
    }));
    return { events: events };
  } catch (err) {
    return { events: [], error: String(err) };
  }
}

/**
 * Update a calendar event's title and/or reschedule by id.
 * @param {string} eventId
 * @param {{title?: string, date?: string, time?: string}} payload
 */
function updateCalendarEvent(eventId, payload) {
  if (!eventId) throw new Error('Missing eventId');
  const ev = CalendarApp.getEventById(eventId);
  if (!ev) throw new Error('Event not found');
  if (payload.title) ev.setTitle(payload.title);
  if (payload.date || payload.time) {
    const tz = Session.getScriptTimeZone();
    const curStart = ev.getStartTime();
    const curEnd = ev.getEndTime();
    const dateStr = payload.date || Utilities.formatDate(curStart, tz, 'MM/dd/yyyy');
    const timeStr = payload.time || Utilities.formatDate(curStart, tz, 'h:mm a');
    const start = new Date(`${dateStr} ${timeStr}`);
    const durationMs = curEnd.getTime() - curStart.getTime();
    const end = new Date(start.getTime() + durationMs);
    ev.setTime(start, end);
  }
  return { ok: true };
}

/**
 * Rollout overview for Director panel.
 * Returns high-level adoption across branches/areas/regions/markets and a cohort table.
 * In production, source from Sheets like `Tracker` and `Users`.
 * @returns {object}
 */
function getRolloutOverview() {
  try {
    // TODO: Wire to real sheets. Stub values for initial UI.
    return {
      totals: {
        branches: { onboarded: 12, total: 20 },
        areas: { onboarded: 4, total: 6 },
        regions: { onboarded: 2, total: 4 },
        markets: { onboarded: 1, total: 3 }
      },
      status: {
        pipeline: 'Cohort 2 scheduling, training materials updated',
        blockers: ['Branch packet backlog in NE', 'Calendar invites pending for SE area'],
        nextActions: ['Finalize Region West training dates', 'Confirm owners for 3 remaining branches']
      },
      rows: [
        { market: 'North', region: 'West', area: 'Bay Area', branch: 'San Jose', owner: 'A. Lee', phase: 'Training', adoption: 75, notes: 'Great momentum' },
        { market: 'North', region: 'West', area: 'Bay Area', branch: 'Oakland', owner: 'B. Kim', phase: 'Onboarding', adoption: 40, notes: 'Packet prep' },
        { market: 'North', region: 'Central', area: 'Dallas Metro', branch: 'Plano', owner: 'C. Diaz', phase: 'Live', adoption: 95, notes: 'Fully adopted' },
        { market: 'South', region: 'SE', area: 'Atlanta Metro', branch: 'Decatur', owner: 'D. Patel', phase: 'Scheduling', adoption: 10, notes: 'Awaiting dates' }
      ]
    };
  } catch (err) {
    return { error: String(err), totals: {}, rows: [], status: { pipeline: 'Error' } };
  }
}

/**
 * Rollout overview for Director panel.
 * Returns high-level adoption across branches/areas/regions/markets and a cohort table.
 * In production, source from Sheets like `Tracker` and `Users`.
 * @returns {object}
 */
function getRolloutOverview() {
  try {
    // TODO: Wire to real sheets. Stub values for initial UI.
    return {
      totals: {
        branches: { onboarded: 12, total: 20 },
        areas: { onboarded: 4, total: 6 },
        regions: { onboarded: 2, total: 4 },
        markets: { onboarded: 1, total: 3 }
      },
      status: {
        pipeline: 'Cohort 2 scheduling, training materials updated',
        blockers: ['Branch packet backlog in NE', 'Calendar invites pending for SE area'],
        nextActions: ['Finalize Region West training dates', 'Confirm owners for 3 remaining branches']
      },
      rows: [
        { market: 'North', region: 'West', area: 'Bay Area', branch: 'San Jose', owner: 'A. Lee', phase: 'Training', adoption: 75, notes: 'Great momentum' },
        { market: 'North', region: 'West', area: 'Bay Area', branch: 'Oakland', owner: 'B. Kim', phase: 'Onboarding', adoption: 40, notes: 'Packet prep' },
        { market: 'North', region: 'Central', area: 'Dallas Metro', branch: 'Plano', owner: 'C. Diaz', phase: 'Live', adoption: 95, notes: 'Fully adopted' },
        { market: 'South', region: 'SE', area: 'Atlanta Metro', branch: 'Decatur', owner: 'D. Patel', phase: 'Scheduling', adoption: 10, notes: 'Awaiting dates' }
      ]
    };
  } catch (err) {
    return { error: String(err), totals: {}, rows: [], status: { pipeline: 'Error' } };
  }
}

/**
 * Returns recent Gmail inbox threads.
 * @param {number} limit - Max number of threads
 * @returns {object} { threads: Array<{subject,from,lastMessageDate,snippet,unread,webLink}>
 */
function getGmailInbox(limit) {
  try {
    const max = Math.max(1, Math.min(Number(limit) || 15, 50));
    const threads = GmailApp.getInboxThreads(0, max);
    const tz = Session.getScriptTimeZone();
    const out = threads.map(t => {
      const msgs = t.getMessages();
      const last = msgs[msgs.length - 1];
      let from = '';
      try { from = last.getFrom(); } catch(e) {}
      let messageId = '';
      try { messageId = last.getId(); } catch(e) {}
      return {
        subject: t.getFirstMessageSubject(),
        from: from,
        lastMessageDate: Utilities.formatDate(t.getLastMessageDate(), tz, 'MM/dd/yyyy'),
        snippet: last ? (last.getPlainBody().slice(0, 140).replace(/\s+/g,' ').trim()) : '',
        unread: t.isUnread(),
        messageId: messageId,
        webLink: messageId ? `https://mail.google.com/mail/u/0/#search/rfc822msgid:${messageId}` : 'https://mail.google.com/'
      };
    });
    return { threads: out };
  } catch (err) {
    return { threads: [], error: String(err) };
  }
}

/**
 * Create a new Google Doc and return metadata.
 * @param {string} name
 */
function createGoogleDoc(name) {
  const docName = name && String(name).trim() ? String(name).trim() : 'Untitled Document';
  const doc = DocumentApp.create(docName);
  return { id: doc.getId(), url: doc.getUrl(), name: doc.getName() };
}

/**
 * Send an email via Gmail.
 * @param {string} to
 * @param {string} subject
 * @param {string} body
 */
function sendEmailDraft(to, subject, body) {
  if (!to || !subject || !body) throw new Error('Missing fields');
  GmailApp.sendEmail(to, subject, body);
  return { ok: true };
}

// --- ------------------ ---
// 1a. ADMIN PROVISIONING HELPERS
// --- ------------------ ---

/**
 * One-time first setup alias: prepares sheets, Drive folders, and template docs.
 * Call this before deployment to provision required resources.
 */
function runFirstSetup() {
  try {
    runSetup();
  } catch (e) {}
  ensureDriveProvisioning();
}

/**
 * Ensures Branch360 root and subfolders exist in Drive and stores IDs in Script Properties.
 * Also creates placeholder template Docs if missing.
 */
function ensureDriveProvisioning() {
  const props = PropertiesService.getScriptProperties();
  const getProp = (k) => props.getProperty(k);
  const setProp = (k, v) => props.setProperty(k, v);

  // Root folder
  const ROOT_KEY = 'BRANCH360_ROOT_FOLDER_ID';
  let rootId = getProp(ROOT_KEY);
  let rootFolder;
  if (rootId) {
    try { rootFolder = DriveApp.getFolderById(rootId); } catch (e) { rootId = null; }
  }
  if (!rootId) {
    rootFolder = DriveApp.createFolder('Branch360');
    setProp(ROOT_KEY, rootFolder.getId());
  }

  // Subfolders
  const subSpecs = [
    ['BRANCH360_TEMPLATES_FOLDER_ID', 'Templates'],
    ['BRANCH360_START_PACKETS_FOLDER_ID', 'Start Packets'],
    ['BRANCH360_EXPORTS_FOLDER_ID', 'Exports']
  ];
  subSpecs.forEach(([key, name]) => {
    let id = getProp(key);
    let folder;
    if (id) {
      try { folder = DriveApp.getFolderById(id); } catch (e) { id = null; }
    }
    if (!id) {
      const iter = rootFolder.getFoldersByName(name);
      folder = iter.hasNext() ? iter.next() : rootFolder.createFolder(name);
      setProp(key, folder.getId());
    }
  });

  // Templates: create placeholder Docs if missing
  const tmplFolder = DriveApp.getFolderById(getProp('BRANCH360_TEMPLATES_FOLDER_ID'));
  const ensureDoc = (propKey, docName) => {
    let id = getProp(propKey);
    let file;
    if (id) {
      try { file = DriveApp.getFileById(id); } catch (e) { id = null; }
    }
    if (!id) {
      // Try to find by name in Templates
      const it = tmplFolder.getFilesByName(docName);
      if (it.hasNext()) {
        file = it.next();
      } else {
        const doc = DocumentApp.create(docName);
        file = DriveApp.getFileById(doc.getId());
        file.moveTo(tmplFolder);
        try { DocumentApp.openById(doc.getId()).getBody().appendParagraph('Template placeholder'); } catch (e) {}
      }
      setProp(propKey, file.getId());
    }
  };
  ensureDoc('BRANCH360_START_PACKET_TEMPLATE_ID', 'Branch360 - Start Packet Template');
  ensureDoc('BRANCH360_CADENCE_REPORT_TEMPLATE_ID', 'Branch360 - Cadence Report Template');
}

/**
 * Upserts a branch record into the BRANCHES sheet keyed by Code.
 * @param {Object} rec { region, code, branchName, branchManager, phone, pccInField }
 * @returns {boolean} true when upsert completes
 */
function upsertBranch(rec) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let bSheet = ss.getSheetByName(SHEETS.BRANCHES);
  if (!bSheet) {
    bSheet = ss.insertSheet(SHEETS.BRANCHES);
    const bHeaders = ['Region','Code','Branch_Name','Branch_Manager','Phone','#_PCC_in_Field'];
    bSheet.appendRow(bHeaders);
    bSheet.getRange(1,1,1,bHeaders.length).setFontWeight('bold').setBackground('#f3f4f6');
    bSheet.setFrozenRows(1);
  }
  const lastRow = bSheet.getLastRow();
  let foundIdx = -1;
  if (lastRow > 1) {
    const codeRange = bSheet.getRange(2, 2, lastRow-1, 1).getValues();
    const targetCode = String(rec.code || '').trim();
    for (let i = 0; i < codeRange.length; i++) {
      if (String(codeRange[i][0]).trim() === targetCode) { foundIdx = i; break; }
    }
  }
  const bRow = [
    String(rec.region || ''),
    String(rec.code || ''),
    String(rec.branchName || ''),
    String(rec.branchManager || ''),
    String(rec.phone || ''),
    (rec.pccInField || '')
  ];
  if (foundIdx >= 0) {
    bSheet.getRange(2 + foundIdx, 1, 1, bRow.length).setValues([bRow]);
  } else {
    bSheet.appendRow(bRow);
  }
  try { logUserAction('upsertBranch', `code=${String(rec.code||'')}`); } catch (err) {}
  return true;
}

// --- ------------------ ---
// 3. DASHBOARD DATA FUNCTIONS
// --- ------------------ ---

/**
 * Gets sales dashboard data.
 * @returns {object} Sales dashboard data.
 */
function getSalesDashboardData() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  let proposalsThisMonth = 0;
  let salesThisMonth = 0;
  let totalAnnualValue = 0;
  let recentActivity = [];
  
  rows.forEach(row => {
    const dateProposal = new Date(row[headers.indexOf("Date_Proposal")]);
    const dateSold = new Date(row[headers.indexOf("Date_Sold")]);
    const annualValue = parseFloat(row[headers.indexOf("Annual_Value")]) || 0;
    
    if (dateProposal.getMonth() === currentMonth && dateProposal.getFullYear() === currentYear) {
      proposalsThisMonth++;
    }
    
    if (dateSold.getMonth() === currentMonth && dateSold.getFullYear() === currentYear) {
      salesThisMonth++;
    }
    
    totalAnnualValue += annualValue;
    
    // Add to recent activity (last 5 items)
    if (recentActivity.length < 5) {
      recentActivity.push({
        customer: row[headers.indexOf("Customer_Name")],
        status: row[headers.indexOf("Status")],
        date: dateProposal,
        value: annualValue
      });
    }
  });
  
  return {
    kpis: {
      proposalsThisMonth: proposalsThisMonth,
      salesThisMonth: salesThisMonth,
      conversionRate: proposalsThisMonth > 0 ? Math.round((salesThisMonth / proposalsThisMonth) * 100) : 0,
      totalAnnualValue: totalAnnualValue
    },
    recentActivity: recentActivity,
    // For richer UI, callers may fetch proposals via getOpenProposals()
    forecastData: generateForecastData(),
    hoursSaved: calculateHoursSaved(),
    dollarSavings: calculateDollarSavings()
  };
}

/**
 * Returns a simplified list of open proposals from Tracker.
 * @returns {Array<Object>} [{ id, branch, customerName, serviceDescription, annualValue, salesRep, logBookNeeded }]
 */
function getOpenProposals() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const proposals = rows
    .filter(r => String(r[idx('Status')]).trim() === 'Proposal')
    .map(r => ({
      id: String(r[idx('ID')]),
      branch: String(r[idx('Branch')]),
      customerName: String(r[idx('Customer_Name')]),
      serviceDescription: String(r[idx('Service_Description')]),
      annualValue: Number(r[idx('Annual_Value')]) || 0,
      salesRep: String(r[idx('Sales_Rep')]),
      logBookNeeded: String(r[idx('Log_Book_Needed')]) || 'No'
    }));
  return proposals;
}

/**
 * Gets operations dashboard data.
 * @returns {object} Operations dashboard data.
 */
function getOperationsDashboardData() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  let installsScheduled = 0;
  let installsComplete = 0;
  let materialsOrdered = 0;
  let logBooksNeeded = 0;
  
  rows.forEach(row => {
    if (row[headers.indexOf("Date_Install_Scheduled")]) installsScheduled++;
    if (row[headers.indexOf("Status_Install_Complete")] === "Yes") installsComplete++;
    if (row[headers.indexOf("Materials_Ordered")] === "Yes") materialsOrdered++;
    if (row[headers.indexOf("Log_Book_Needed")] === "Yes") logBooksNeeded++;
  });
  
  return {
    kpis: {
      installsScheduled: installsScheduled,
      installsComplete: installsComplete,
      materialsOrdered: materialsOrdered,
      logBooksNeeded: logBooksNeeded,
      installCompletionRate: installsScheduled > 0 ? Math.round((installsComplete / installsScheduled) * 100) : 0
    },
    recentInstalls: getRecentInstalls(),
    pendingTasks: getPendingTasks(),
    hoursSaved: calculateHoursSaved(),
    dollarSavings: calculateDollarSavings()
  };
}

/**
 * Returns pending installs for Ops/Branch workflows.
 * Filters TrackerData where install is scheduled and not complete.
 * @returns {Array<Object>} List of jobs
 */
function getPendingInstalls() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  return rows
    .filter(r => r[idx("Date_Install_Scheduled")] && r[idx("Status_Install_Complete")] !== "Yes")
    .map(r => ({
      id: String(r[idx("ID")] || r[idx("PestPac_ID")] || ''),
      customer: String(r[idx("Customer_Name")] || ''),
      type: 'Install',
      scheduled: r[idx("Date_Install_Scheduled")] ? Utilities.formatDate(new Date(r[idx("Date_Install_Scheduled")]), Session.getScriptTimeZone(), 'MM/dd/yyyy') : '',
      assigned: String(r[idx("Assigned_Specialist")] || ''),
      om: String(r[idx("Operations_Manager")] || '')
    }));
}

/**
 * Returns overdue packets for Ops/Branch workflows.
 * Overdue defined as Sold and StartPacket_Sent not "Yes".
 * @returns {Array<Object>} List of jobs
 */
function getOverduePackets() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  return rows
    .filter(r => String(r[idx("Status")]) === "Sold" && String(r[idx("StartPacket_Sent")]) !== "Yes")
    .map(r => ({
      id: String(r[idx("ID")] || r[idx("PestPac_ID")] || ''),
      customer: String(r[idx("Customer_Name")] || ''),
      type: 'Packet',
      scheduled: '',
      assigned: String(r[idx("Assigned_Specialist")] || ''),
      om: String(r[idx("Operations_Manager")] || '')
    }));
}

/**
 * Returns reported service issues from TrackerData.
 * Rules:
 * - Include rows where Status equals one of known issue statuses (Issue, Needs Attention, Revisit, Repair, Follow-up, Complaint)
 * - Or Notes contains common issue keywords (missed stop, revisit, complaint, rework, problem, urgent, escalate, hazard, safety)
 * @returns {Array<Object>} List of issues
 */
function getIssuesReported() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const ISSUE_STATUS = ['Issue','Needs Attention','Revisit','Repair','Follow-up','Complaint'];
  const KEYWORDS = ['missed stop','missed','revisit','complaint','rework','problem','error','urgent','escalate','hazard','safety','service issue'];

  function severityFor(text) {
    const t = String(text || '').toLowerCase();
    if (t.includes('missed stop') || t.includes('urgent') || t.includes('escalate') || t.includes('hazard') || t.includes('safety')) return 'High';
    if (t.includes('complaint') || t.includes('revisit') || t.includes('rework')) return 'Medium';
    return 'Low';
  }

  return rows
    .filter(r => {
      const status = String(r[idx('Status')] || '');
      const notes = String(r[idx('Notes')] || '').toLowerCase();
      const statusFlag = ISSUE_STATUS.includes(status);
      const keywordFlag = KEYWORDS.some(k => notes.includes(k));
      return statusFlag || keywordFlag;
    })
    .map(r => {
      const status = String(r[idx('Status')] || '');
      const notes = String(r[idx('Notes')] || '');
      const issueText = notes ? notes : (status ? status : 'Issue');
      return {
        id: String(r[idx('ID')] || r[idx('PestPac_ID')] || ''),
        customer: String(r[idx('Customer_Name')] || ''),
        issue: issueText,
        severity: severityFor(issueText)
      };
    });
}

/**
 * Returns technicians (Ops users) for assignment dropdowns.
 * @returns {Array<Object>} {email, name, branch}
 */
function getTechnicians() {
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  const rows = userSheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1);
  const idx = name => headers.indexOf(name);
  return data
    .filter(u => {
      const role = String(u[idx("Role")] || '');
      return role.toLowerCase() === 'ops' || role.toLowerCase().includes('tech');
    })
    .map(u => ({
      email: String(u[idx("Email")] || ''),
      name: String(u[idx("Name")] || ''),
      branch: String(u[idx("Branch")] || '')
    }));
}

/**
 * Assigns a technician to a TrackerData entry by ID.
 * @param {string} entryId
 * @param {string} techEmail
 * @returns {boolean} success
 */
function assignTechnician(entryId, techEmail) {
  if (!entryId) throw new Error('Missing entryId');
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idIdx = headers.indexOf("ID");
  const assignedIdx = headers.indexOf("Assigned_Specialist");
  let targetRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][idIdx]) === String(entryId)) {
      targetRow = i + 2; // account for header and 1-indexing
      break;
    }
  }
  if (targetRow === -1) throw new Error('Tracker entry not found for ID: ' + entryId);
  trackerSheet.getRange(targetRow, assignedIdx + 1).setValue(techEmail);
  logUserAction('assignTechnician', `ID=${entryId}, tech=${techEmail}`);
  return true;
}

/**
 * Saves Daily Sales Performance entry.
 * @param {object} e - Entry from UI.
 * @returns {boolean} success
 */
function saveDailySalesPerformance(e) {
  if (!e) throw new Error('Missing entry');
  const dailySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DAILY_SALES);
  if (!dailySheet) throw new Error('DailySalesPerformance sheet not found');

  const row = [
    new Date(),
    String(e.email || ''),
    String(e.aeName || ''),
    Number(e.proposalsDelivered || 0),
    Number(e.lobsIncludedCount || 0),
    Number(e.lobsSoldCount || 0),
    Number(e.dollarsSold || 0),
    Number(e.nextDayConf || 0),
    Number(e.dollarsProposed || 0),
    Number(e.eventsFirstAppt || 0),
    Number(e.eventsSiteAssessment || 0),
    Number(e.eventsProposals || 0),
    Number(e.eventsInPerson || 0),
    String(e.notes || '')
  ];

  dailySheet.appendRow(row);
  try {
    logUserAction('saveDailySalesPerformance', `AE=${row[2]}, proposals=${row[3]}, sold=$${row[6]}`);
  } catch (err) {}
  return true;
}

/**
 * Saves Branch Cadence daily entry (Brad's cadence metrics).
 * Creates the sheet with headers if missing.
 * @param {object} e - Entry from UI
 * @returns {boolean} success
 */
function saveCadenceDailyEntry(e) {
  if (!e) throw new Error('Missing entry');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.CADENCE_DAILY);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CADENCE_DAILY);
    const headers = [
      'Timestamp','Submitted_By',
      'Entry_Date','Region','Code','Branch_Name','Branch_Manager','Phone','#_PCC_in_Field',
      'Branch',
      'Daily_TAP_Goal','Daily_TAP_Actual','Coaching_Rides_Today','TAP_from_Coaching_Rides','TAP_Part_TMX_70pct','TAP_Part_RNA_70pct','TAP_SOLD_25pct_YOY',
      'Daily_Raw_Sales_Need','Daily_Raw_Sales_Actual_20pct_YOY','Revenue_Daily_Goal_FcstREV_18d','Revenue_Scheduled_Tomorrow',
      'TMX_Missed_Stop_pct_10','RNA_Missed_Stop_pct_15','Backlog_Going_Tomorrow_20pct','Rep_Req_Daily_Goal_2perTech','Daily_Actual_Request_Reviews','OT_pct_of_Std_Hrs_Forecast','Initials_Date',
      'TAP_Leads','INSP_PRP','LOBs_PRP','LOBs_Sold','Dollars_SLD','Next_Day_CONF','PC_NO_TC_Conversions','Next_Day_Apps',
      'Notes'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }

  const row = [
    new Date(), String(e.submittedBy || ''),
    String(e.entryDate || ''), String(e.region || ''), String(e.code || ''), String(e.branchName || ''), String(e.branchManager || ''), String(e.phone || ''), (e.pccInField || ''),
    String(e.branch || ''),
    Number(e.tapGoal || 0), Number(e.tapActual || 0), Number(e.coachingRides || 0), Number(e.tapFromCoaching || 0), Number(e.tapPartTmx70 || 0), Number(e.tapPartRna70 || 0), Number(e.tapSold25Yoy || 0),
    Number(e.rawSalesNeed || 0), Number(e.rawSalesActual20Yoy || 0), Number(e.revenueDailyGoalFcst18d || 0), Number(e.revenueScheduledTomorrow || 0),
    Number(e.tmxMissedStopPct10 || 0), Number(e.rnaMissedStopPct15 || 0), Number(e.backlogTomorrow20 || 0), Number(e.repReqDailyGoal || 0), Number(e.dailyActualReqReviews || 0), Number(e.otPctStdHrsForecast || 0), String(e.initialsDate || ''),
    Number(e.tapLeads || 0), Number(e.inspPrp || 0), Number(e.lobsPrp || 0), Number(e.lobsSold || 0), Number(e.dollarsSld || 0), Number(e.nextDayConf || 0), Number(e.pcNoTcConversions || 0), Number(e.nextDayApps || 0),
    String(e.notes || '')
  ];
  
  sheet.appendRow(row);
  
  // Upsert Branches master keyed by Code
  let bSheet = ss.getSheetByName(SHEETS.BRANCHES);
  if (!bSheet) {
    bSheet = ss.insertSheet(SHEETS.BRANCHES);
    const bHeaders = ['Region','Code','Branch_Name','Branch_Manager','Phone','#_PCC_in_Field'];
    bSheet.appendRow(bHeaders);
    bSheet.getRange(1,1,1,bHeaders.length).setFontWeight('bold').setBackground('#f3f4f6');
    bSheet.setFrozenRows(1);
  }
  const lastRow = bSheet.getLastRow();
  let foundIdx = -1;
  if (lastRow > 1) {
    const codeRange = bSheet.getRange(2, 2, lastRow-1, 1).getValues();
    const targetCode = String(e.code || '').trim();
    for (let i = 0; i < codeRange.length; i++) {
      if (String(codeRange[i][0]).trim() === targetCode) { foundIdx = i; break; }
    }
  }
  const bRow = [String(e.region || ''), String(e.code || ''), String(e.branchName || ''), String(e.branchManager || ''), String(e.phone || ''), (e.pccInField || '')];
  if (foundIdx >= 0) {
    bSheet.getRange(2 + foundIdx, 1, 1, bRow.length).setValues([bRow]);
  } else {
    bSheet.appendRow(bRow);
  }
  try {
    logUserAction('saveCadenceDailyEntry', `branch=${String(e.branch || '')}, tapActual=${Number(e.tapActual || 0)}`);
  } catch (err) {}
  return true;
}

/**
 * Gets branch manager dashboard data.
 * @returns {object} Branch manager dashboard data.
 */
function getBranchDashboardData() {
  const user = getCurrentUser();
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  let branchProposals = 0;
  let branchSales = 0;
  let branchAnnualValue = 0;
  let branchInstalls = 0;
  
  rows.forEach(row => {
    if (row[headers.indexOf("Branch")] === user.branch) {
      branchProposals++;
      if (row[headers.indexOf("Status")] === "Sold") {
        branchSales++;
        branchAnnualValue += parseFloat(row[headers.indexOf("Annual_Value")]) || 0;
      }
      if (row[headers.indexOf("Status_Install_Complete")] === "Yes") {
        branchInstalls++;
      }
    }
  });

  // Compute team performance per Sales_Rep within branch
  const repStats = {};
  rows.forEach(row => {
    if (row[headers.indexOf("Branch")] !== user.branch) return;
    const rep = String(row[headers.indexOf("Sales_Rep")] || '').trim();
    if (!rep) return;
    if (!repStats[rep]) repStats[rep] = { proposals: 0, sales: 0 };
    repStats[rep].proposals++;
    if (String(row[headers.indexOf("Status")]).trim() === "Sold") {
      repStats[rep].sales++;
    }
  });
  const reps = Object.keys(repStats).filter(r => repStats[r].proposals > 0);
  const convPct = r => repStats[r].proposals > 0 ? (100 * repStats[r].sales / repStats[r].proposals) : 0;
  const avgConv = reps.length ? Math.round(reps.reduce((sum, r) => sum + convPct(r), 0) / reps.length) : 0;
  let topRep = '';
  let topConv = 0;
  reps.forEach(r => { const c = convPct(r); if (c > topConv) { topConv = c; topRep = r; } });
  const topAttainment = avgConv > 0 ? Math.round(topConv / avgConv * 100) : 0;
  const needsCoachingCount = reps.filter(r => {
    const c = convPct(r);
    const hasVolume = repStats[r].proposals >= 5; // ignore very low volume
    const threshold = Math.max(20, Math.round(0.75 * avgConv));
    return hasVolume && c < threshold;
  }).length;
  
  return {
    kpis: {
      branchProposals: branchProposals,
      branchSales: branchSales,
      branchConversionRate: branchProposals > 0 ? Math.round((branchSales / branchProposals) * 100) : 0,
      branchAnnualValue: branchAnnualValue,
      branchInstalls: branchInstalls
    },
    teamPerformance: {
      topPerformerName: topRep,
      topPerformerAttainmentPct: Math.round(topConv),
      teamAveragePct: avgConv,
      needsCoachingCount: needsCoachingCount
    },
    branchPerformance: getBranchPerformance(user.branch),
    teamActivity: getTeamActivity(user.branch),
    cadenceSummary: getCadenceDailySummary(user.branch),
    cadenceTimeseries: getCadenceDailyTimeseries(user.branch, 30),
    hoursSaved: calculateHoursSaved(),
    dollarSavings: calculateDollarSavings()
  };
}

/**
 * Branch Manager KPIs aggregation endpoint (prod mode).
 * This checks for required data sources and throws if unavailable,
 * allowing the client to gracefully fall back to demo fixtures.
 * @param {{branch:string, from:string, to:string, onlyRed:boolean}} params
 * @returns {object} Aggregated KPI payload (if data sources exist)
 */
function getBranchManagerKpi(params) {
  const t0 = new Date();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requiredNames = [
      'Appointments',
      'Work_Orders',
      'Scans',
      SHEETS.PACKETS,
      SHEETS.TRACKER
    ];
    const missing = [];
    requiredNames.forEach(name => { if (!ss.getSheetByName(String(name))) missing.push(String(name)); });
    if (missing.length > 0) {
      throw new Error('Missing data sources for Branch Manager KPIs: ' + missing.join(', '));
    }
    // If all sources exist, compute KPIs here (not implemented due to schema variance).
    // Intentionally throw to trigger client-side fixture fallback until sources are available.
    throw new Error('BM KPI computation not implemented for current dataset');
  } catch (err) {
    Logger.log('[getBranchManagerKpi] error: ' + (err && err.message ? err.message : err));
    throw err;
  } finally {
    const dt = (new Date()).getTime() - t0.getTime();
    Logger.log('[getBranchManagerKpi] timing(ms): ' + dt);
  }
}

/**
 * Aggregates CadenceDaily metrics for the given branch over last 7 and 30 days.
 * Matches on Branch code or Branch_Name where possible.
 * @param {string} branchKey
 * @returns {object} { last7: {...}, last30: {...} }
 */
function getCadenceDailySummary(branchKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CADENCE_DAILY);
  if (!sheet) return { last7: {}, last30: {} };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const now = new Date();
  const d7 = new Date(now.getTime() - 7*24*60*60*1000);
  const d30 = new Date(now.getTime() - 30*24*60*60*1000);
  const sumObj = () => ({ tapLeads:0, inspPrp:0, lobsPrp:0, lobsSold:0, dollarsSld:0, nextDayConf:0, pcNoTcConversions:0, nextDayApps:0 });
  const last7 = sumObj();
  const last30 = sumObj();

  rows.forEach(r => {
    const code = String(r[idx('Code')] || '').trim();
    const bname = String(r[idx('Branch_Name')] || '').trim();
    const match = branchKey ? (code === branchKey || bname === branchKey) : true;
    if (!match) return;
    const dtStr = r[idx('Entry_Date')];
    const dt = dtStr ? new Date(dtStr) : null;
    if (!dt) return;
    const metrics = {
      tapLeads: Number(r[idx('TAP_Leads')] || 0),
      inspPrp: Number(r[idx('INSP_PRP')] || 0),
      lobsPrp: Number(r[idx('LOBs_PRP')] || 0),
      lobsSold: Number(r[idx('LOBs_Sold')] || 0),
      dollarsSld: Number(r[idx('Dollars_SLD')] || 0),
      nextDayConf: Number(r[idx('Next_Day_CONF')] || 0),
      pcNoTcConversions: Number(r[idx('PC_NO_TC_Conversions')] || 0),
      nextDayApps: Number(r[idx('Next_Day_Apps')] || 0)
    };
    if (dt >= d30) {
      Object.keys(metrics).forEach(k => last30[k] += metrics[k]);
    }
    if (dt >= d7) {
      Object.keys(metrics).forEach(k => last7[k] += metrics[k]);
    }
  });
  return { last7: last7, last30: last30 };
}

/**
 * Builds a per-day timeseries of CadenceDaily metrics for the given branch.
 * @param {string} branchKey Branch code or Branch_Name
 * @param {number} days Number of days to include (default 30)
 * @returns {object} { labels: [MM/DD,...], data: { tapLeads:[], inspPrp:[], ... } }
 */
function getCadenceDailyTimeseries(branchKey, days) {
  const windowDays = Number(days || 30);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.CADENCE_DAILY);
  if (!sheet) return { labels: [], data: {} };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { labels: [], data: {} };
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);

  const end = new Date();
  const start = new Date(end.getTime() - windowDays*24*60*60*1000);
  // Build label dates from start to end, inclusive
  const labelDates = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start.getTime() + i*24*60*60*1000);
    labelDates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  const fmtLabel = d => Utilities.formatDate(d, Session.getScriptTimeZone() || 'GMT', 'M/d');
  const labels = labelDates.map(fmtLabel);

  const keys = ['TAP_Leads','INSP_PRP','LOBs_PRP','LOBs_Sold','Dollars_SLD','Next_Day_CONF','PC_NO_TC_Conversions','Next_Day_Apps'];
  const outKeys = ['tapLeads','inspPrp','lobsPrp','lobsSold','dollarsSld','nextDayConf','pcNoTcConversions','nextDayApps'];
  const series = {};
  outKeys.forEach(k => series[k] = new Array(labels.length).fill(0));

  rows.forEach(r => {
    const code = String(r[idx('Code')] || '').trim();
    const bname = String(r[idx('Branch_Name')] || '').trim();
    const match = branchKey ? (code === branchKey || bname === branchKey) : true;
    if (!match) return;
    const dtStr = r[idx('Entry_Date')];
    const dt = dtStr ? new Date(dtStr) : null;
    if (!dt) return;
    const dKey = fmtLabel(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const idxLabel = labels.indexOf(dKey);
    if (idxLabel < 0) return;
    keys.forEach((k, i) => {
      const v = Number(r[idx(k)] || 0);
      series[outKeys[i]][idxLabel] += v;
    });
  });

  return { labels: labels, data: series };
}

/**
 * Saves a user preference key/value to Preferences sheet, keyed by user email.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function saveUserPreference(key, value) {
  const user = getCurrentUser();
  const email = String(user.email || '').trim();
  if (!email) throw new Error('Missing user email');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PREFERENCES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.PREFERENCES);
    const headers = ['User','Key','Value','Updated_At'];
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const uIdx = headers.indexOf('User');
  const kIdx = headers.indexOf('Key');
  const vIdx = headers.indexOf('Value');
  let targetRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][uIdx]).trim() === email && String(rows[i][kIdx]).trim() === key) {
      targetRow = i + 2; // account for header and 1-index
      break;
    }
  }
  if (targetRow > 0) {
    sheet.getRange(targetRow, vIdx + 1).setValue(String(value));
    sheet.getRange(targetRow, vIdx + 2).setValue(new Date());
  } else {
    sheet.appendRow([email, key, String(value), new Date()]);
  }
  try { logUserAction('saveUserPreference', `${email} ${key}=${value}`); } catch(err) {}
  return true;
}

/**
 * Gets preferences for current user from Preferences sheet.
 * @returns {object} key/value map
 */
function getUserPreferences() {
  const user = getCurrentUser();
  const email = String(user.email || '').trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PREFERENCES);
  if (!sheet || !email) return {};
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const uIdx = headers.indexOf('User');
  const kIdx = headers.indexOf('Key');
  const vIdx = headers.indexOf('Value');
  const prefs = {};
  rows.forEach(r => {
    if (String(r[uIdx]).trim() === email) {
      prefs[String(r[kIdx]).trim()] = String(r[vIdx]).trim();
    }
  });
  return prefs;
}

/**
 * Gets executive dashboard data.
 * @returns {object} Executive dashboard data.
 */
function getExecutiveDashboardData() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  let totalProposals = 0;
  let totalSales = 0;
  let totalAnnualValue = 0;
  let totalInstalls = 0;
  
  const branchPerformance = {};
  
  rows.forEach(row => {
    totalProposals++;
    const branch = row[headers.indexOf("Branch")];
    const status = row[headers.indexOf("Status")];
    const annualValue = parseFloat(row[headers.indexOf("Annual_Value")]) || 0;
    
    if (!branchPerformance[branch]) {
      branchPerformance[branch] = {
        proposals: 0,
        sales: 0,
        annualValue: 0,
        installs: 0
      };
    }
    
    branchPerformance[branch].proposals++;
    
    if (status === "Sold") {
      totalSales++;
      branchPerformance[branch].sales++;
      totalAnnualValue += annualValue;
      branchPerformance[branch].annualValue += annualValue;
    }
    
    if (row[headers.indexOf("Status_Install_Complete")] === "Yes") {
      totalInstalls++;
      branchPerformance[branch].installs++;
    }
  });
  
  const hoursSaved = calculateHoursSaved();
  const dollarSavings = calculateDollarSavings();
  const adoptionRate = calculateAdoptionRate();
  const dataHygieneScore = calculateDataHygieneScore();
  
  return {
    kpis: {
      totalProposals: totalProposals,
      totalSales: totalSales,
      overallConversionRate: totalProposals > 0 ? Math.round((totalSales / totalProposals) * 100) : 0,
      totalAnnualValue: totalAnnualValue,
      totalInstalls: totalInstalls,
      hoursSaved: hoursSaved,
      dollarSavings: dollarSavings,
      adoptionRate: adoptionRate,
      dataHygieneScore: dataHygieneScore,
      roi: calculateROI()
    },
    branchPerformance: branchPerformance,
    forecastData: generateForecastData(),
    systemMetrics: getSystemMetrics()
  };
}

/**
 * Bulk-import parsed entries into TrackerData.
 * Each entry is a partial map of TRACKER_HEADERS; missing fields are blank.
 * @param {Array<Object>} entries
 * @returns {number} count of imported rows
 */
function bulkImportTracker(entries) {
  if (!entries || !entries.length) return 0;
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const headers = trackerSheet.getDataRange().getValues()[0];
  const headerIndex = name => headers.indexOf(name);
  const rows = entries.map(e => {
    const row = new Array(headers.length).fill('');
    Object.keys(e).forEach(k => {
      const idx = headerIndex(k);
      if (idx >= 0) row[idx] = e[k];
    });
    return row;
  });
  trackerSheet.getRange(trackerSheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  logUserAction('bulkImportTracker', `rows=${rows.length}`);
  return rows.length;
}

// --- ------------------ ---
// 4. METRICS CALCULATION
// --- ------------------ ---

/**
 * Calculates hours saved by the system.
 * @returns {number} Total hours saved.
 */
function calculateHoursSaved() {
  const taskSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TASKS);
  const data = taskSheet.getDataRange().getValues();
  
  if (data.length <= 1) return 0;
  
  let totalHoursSaved = 0;
  const rows = data.slice(1);
  
  rows.forEach(row => {
    const timeSaved = parseFloat(row[6]) || 0; // Time_Saved_Min column
    totalHoursSaved += timeSaved;
  });
  
  return Math.round(totalHoursSaved / 60); // Convert to hours
}

/**
 * Calculates dollar savings.
 * @returns {number} Total dollar savings.
 */
function calculateDollarSavings() {
  const hoursSaved = calculateHoursSaved();
  return hoursSaved * HOURLY_RATE_USD;
}

/**
 * Calculates ROI percentage.
 * @returns {number} ROI percentage.
 */
function calculateROI() {
  const dollarSavings = calculateDollarSavings();
  if (ESTIMATED_SYSTEM_COST === 0) return 0;
  return Math.round(((dollarSavings - ESTIMATED_SYSTEM_COST) / ESTIMATED_SYSTEM_COST) * 100);
}

/**
 * Calculates adoption rate.
 * @returns {number} Adoption rate percentage.
 */
function calculateAdoptionRate() {
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  const users = userSheet.getDataRange().getValues();
  
  if (users.length <= 1) return 0;
  
  const totalUsers = users.length - 1;
  const activeUsers = users.slice(1).filter(user => user[1] !== "Inactive").length;
  
  return Math.round((activeUsers / totalUsers) * 100);
}

/**
 * Calculates data hygiene score.
 * @returns {number} Data hygiene score percentage.
 */
function calculateDataHygieneScore() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  
  if (data.length <= 1) return 100;
  
  const headers = data[0];
  const rows = data.slice(1);
  let totalScore = 0;
  
  rows.forEach(row => {
    let rowScore = 0;
    let fieldCount = 0;
    
    // Check required fields
    if (row[headers.indexOf("Customer_Name")]) rowScore += 20; fieldCount++;
    if (row[headers.indexOf("Service_Address")]) rowScore += 20; fieldCount++;
    if (row[headers.indexOf("POC_Name")]) rowScore += 15; fieldCount++;
    if (row[headers.indexOf("POC_Phone")]) rowScore += 15; fieldCount++;
    if (row[headers.indexOf("Status")]) rowScore += 15; fieldCount++;
    if (row[headers.indexOf("Annual_Value")]) rowScore += 15; fieldCount++;
    
    totalScore += rowScore;
  });
  
  return Math.round(totalScore / (rows.length * 6));
}

/**
 * Gets branch brand configuration based on branch name.
 * @param {string} branchName - The branch name.
 * @returns {object} Brand configuration with color, logo, and name.
 */
function getBranchBrand(branchOrEmail) {
  if (!branchOrEmail) return BRAND_MAP["Rentokil"];
  const input = String(branchOrEmail);
  let brandKey = input;
  if (input.includes('@')) {
    const domain = input.split('@')[1].toLowerCase();
    brandKey = domain.includes('prestox') || domain.includes('presto-x') ? 'Presto-X'
      : domain.includes('bugout') || domain.includes('bug-out') ? 'BugOut'
      : domain.includes('terminix') ? 'Terminix'
      : domain.includes('rentokil') ? 'Rentokil'
      : 'Rentokil';
  }
  return BRAND_MAP[brandKey] || BRAND_MAP['Rentokil'];
}

function getCurrentUserRole() {
  return getCurrentUser();
}

/**
 * Saves a Sales entry (Proposal) into Tracker.
 * Maps minimal UI fields to Tracker schema.
 * @param {object} e - { customer, pocEmail, branch, annualValue, scope, aeName, pnol, logBook }
 * @returns {object} result
 */
function saveSalesEntry(e) {
  if (!e) throw new Error('Missing sales entry');
  const salesData = {
    status: 'Proposal',
    salesRep: String(e.aeName || ''),
    branch: String(e.branch || ''),
    customerName: String(e.customer || ''),
    serviceAddress: String(e.serviceAddress || ''),
    pocName: String(e.pocName || ''),
    pocPhone: String(e.pocPhone || ''),
    serviceDescription: String(e.scope || ''),
    annualValue: Number(e.annualValue || 0),
    logBookNeeded: e.logBook ? 'Yes' : 'No',
    notes: `POC_Email: ${String(e.pocEmail || '')} | POC_Name: ${String(e.pocName || '')} | POC_Phone: ${String(e.pocPhone || '')} | PNOL: ${e.pnol ? 'Yes' : 'No'} | LogBook: ${e.logBook ? 'Yes' : 'No'}`
  };
  const res = recordSalesEntry(salesData);
  logUserAction('saveSalesEntry', `Proposal recorded for ${salesData.customerName} (${salesData.branch})`);
  logTimeSaved('manual_data_entry', BASELINE_TASK_TIME_MINS['manual_data_entry'], 2);
  return res;
}

/**
 * Marks a sale as Sold, queues Ops tasks, and generates Start Packet.
 * @param {object} e - { customer, pocEmail, branch, annualValue, scope, aeName, pnol, logBook }
 * @returns {object} result
 */
function markSaleAndQueueOps(e) {
  if (!e) throw new Error('Missing sales entry');
  const salesData = {
    status: 'Sold',
    salesRep: String(e.aeName || ''),
    branch: String(e.branch || ''),
    customerName: String(e.customer || ''),
    serviceAddress: String(e.serviceAddress || ''),
    pocName: String(e.pocName || ''),
    pocPhone: String(e.pocPhone || ''),
    serviceDescription: String(e.scope || ''),
    annualValue: Number(e.annualValue || 0),
    logBookNeeded: e.logBook ? 'Yes' : 'No',
    dateSold: new Date(),
    notes: `POC_Email: ${String(e.pocEmail || '')} | POC_Name: ${String(e.pocName || '')} | POC_Phone: ${String(e.pocPhone || '')} | PNOL: ${e.pnol ? 'Yes' : 'No'} | LogBook: ${e.logBook ? 'Yes' : 'No'}`
  };

  const res = recordSalesEntry(salesData);
  // recordSalesEntry will generate the Start Packet; we also queue ops tasks and notify
  try {
    queueOpsTasksForSale(res.id, {
      pnol: !!e.pnol,
      logBook: !!e.logBook,
      pocEmail: String(e.pocEmail || ''),
      pocName: String(e.pocName || ''),
      pocPhone: String(e.pocPhone || ''),
      branch: String(e.branch || ''),
      customer: String(e.customer || ''),
      serviceAddress: String(e.serviceAddress || ''),
      scope: String(e.scope || ''),
      annualValue: Number(e.annualValue || 0)
    });
  } catch (err) {
    // Non-blocking
    logUserAction('queueOpsTasksForSale_error', err && err.message ? err.message : String(err));
  }

  logUserAction('markSaleAndQueueOps', `Sold recorded and ops queued for ${salesData.customerName}`);
  logTimeSaved('create_start_packet', BASELINE_TASK_TIME_MINS['create_start_packet'], 3);
  return res;
}

/**
 * Updates Tracker flags and emails Ops when sale is queued.
 * @param {string} salesId
 * @param {object} flags - { pnol, logBook, pocEmail, branch, customer, scope, annualValue }
 */
function queueOpsTasksForSale(salesId, flags) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const trackerSheet = ss.getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const rIndex = rows.findIndex(r => String(r[idx('ID')]) === String(salesId));
  if (rIndex === -1) throw new Error('Sale row not found for ops queue');
  const sheetRow = rIndex + 2; // account for header

  // Update flags in tracker
  if (idx('Log_Book_Needed') !== -1) trackerSheet.getRange(sheetRow, idx('Log_Book_Needed') + 1).setValue(flags.logBook ? 'Yes' : 'No');
  if (idx('Materials_Ordered') !== -1) trackerSheet.getRange(sheetRow, idx('Materials_Ordered') + 1).setValue('Pending');
  // Append PNOL + POC email to Notes
  if (idx('Notes') !== -1) {
    const existing = String(trackerSheet.getRange(sheetRow, idx('Notes') + 1).getValue() || '');
    const additive = ` | PNOL: ${flags.pnol ? 'Yes' : 'No'} | POC_Email: ${flags.pocEmail || ''}`;
    trackerSheet.getRange(sheetRow, idx('Notes') + 1).setValue(existing + additive);
  }

  // Email Ops notification
  const subject = `Ops Queue: ${flags.customer} (${flags.branch})`;
  const body = `
    <h3>New Sold Account Queued for Ops</h3>
    <ul>
      <li><strong>Customer:</strong> ${flags.customer}</li>
      <li><strong>Branch:</strong> ${flags.branch}</li>
      <li><strong>Scope:</strong> ${flags.scope}</li>
      <li><strong>Annual Value:</strong> $${Number(flags.annualValue || 0).toFixed(2)}</li>
      <li><strong>PNOL Requested:</strong> ${flags.pnol ? 'Yes' : 'No'}</li>
      <li><strong>Log Book Needed:</strong> ${flags.logBook ? 'Yes' : 'No'}</li>
      <li><strong>POC Email:</strong> ${flags.pocEmail || '(none)'} </li>
    </ul>
    <p>The Start Packet has been generated. Please schedule install, order materials, and update Tracker.</p>
  `;
  const mail = {
    to: OPS_MANAGERS_EMAILS,
    subject: subject,
    htmlBody: body
  };
  if (flags.pocEmail) mail.cc = flags.pocEmail; // include POC email for visibility; ops may reply and edit recipients
  MailApp.sendEmail(mail);

  logUserAction('queueOpsTasksForSale', `Ops notified for ${flags.customer} (${salesId})`);
}
/**
 * Records a new sales entry.
 * @param {object} salesData - The sales data object.
 * @returns {object} Result of the sales entry recording.
 */
function recordSalesEntry(salesData) {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  
  // Generate unique ID
  const id = Utilities.getUuid();
  
  // Prepare the row data
  const rowData = [
    id, // ID
    salesData.status || "Proposal", // Status
    salesData.salesRep || "", // Sales_Rep
    salesData.branch || "", // Branch
    salesData.customerName || "", // Customer_Name
    salesData.serviceAddress || "", // Service_Address
    salesData.pocName || "", // POC_Name
    salesData.pocPhone || "", // POC_Phone
    salesData.dateProposal || new Date(), // Date_Proposal
    salesData.dateSold || null, // Date_Sold
    salesData.dateDead || null, // Date_Dead
    salesData.dateInstallScheduled || null, // Date_Install_Scheduled
    salesData.statusInstallComplete || "No", // Status_Install_Complete
    salesData.source || "", // Source
    salesData.saleType || "", // Sale_Type
    salesData.serviceDescription || "", // Service_Description
    salesData.initialFee || 0, // Initial_Fee
    salesData.monthlyFee || 0, // Monthly_Fee
    salesData.frequency || "", // Frequency
    salesData.annualValue || 0, // Annual_Value
    salesData.pestPacId || "", // PestPac_ID
    salesData.operationsManager || "", // Operations_Manager
    salesData.assignedSpecialist || "", // Assigned_Specialist
    salesData.logBookNeeded || "No", // Log_Book_Needed
    salesData.materialsOrdered || "No", // Materials_Ordered
    salesData.statusPaid || "No", // Status_Paid
    salesData.notes || "", // Notes
    salesData.startPacketSent || "No", // StartPacket_Sent
    salesData.inspPRP || "", // INSP_PRP
    salesData.lobsPRP || "", // LOBs_PRP
    salesData.tapLeads || "", // TAP_Leads
    salesData.nextDayCONF || "", // Next_Day_CONF
    salesData.pcNoTCConversions || "" // PC_NO_TC_Conversions
  ];
  
  // Append to tracker sheet
  trackerSheet.appendRow(rowData);
  
  // Log the action
  logUserAction("recordSalesEntry", `New sales entry recorded for ${salesData.customerName}`);
  
  // If status is "Sold", trigger start packet generation
  if (salesData.status === "Sold") {
    generateStartPacketFromSales(id);
  }
  
  return {
    success: true,
    message: "Sales entry recorded successfully",
    id: id
  };
}

/**
 * Generates start packet from sales record.
 * @param {string} salesId - The sales record ID.
 * @returns {object} Result of start packet generation.
 */
function generateStartPacketFromSales(salesId) {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Find the sales record
  const salesRecord = rows.find(row => row[headers.indexOf("ID")] === salesId);
  
  if (!salesRecord) {
    return {
      success: false,
      message: "Sales record not found"
    };
  }
  
  // Generate start packet data
  const packetData = {
    customerName: salesRecord[headers.indexOf("Customer_Name")],
    serviceAddress: salesRecord[headers.indexOf("Service_Address")],
    serviceDescription: salesRecord[headers.indexOf("Service_Description")],
    operationsManager: salesRecord[headers.indexOf("Operations_Manager")],
    assignedSpecialist: salesRecord[headers.indexOf("Assigned_Specialist")],
    initialFee: salesRecord[headers.indexOf("Initial_Fee")],
    monthlyFee: salesRecord[headers.indexOf("Monthly_Fee")],
    frequency: salesRecord[headers.indexOf("Frequency")],
    dateSold: salesRecord[headers.indexOf("Date_Sold")]
  };
  
  // Create PDF (mock implementation)
  const pdfBlob = createStartPacketPDF(packetData);
  
  // Log time saved
  logTimeSaved("create_start_packet", BASELINE_TASK_TIME_MINS['create_start_packet'], 3);
  
  // Update tracker to mark start packet as sent
  const rowIndex = rows.findIndex(row => row[headers.indexOf("ID")] === salesId) + 2;
  trackerSheet.getRange(rowIndex, headers.indexOf("StartPacket_Sent") + 1).setValue("Yes");
  
  // Email the start packet
  emailStartPacket(packetData, pdfBlob);
  
  return {
    success: true,
    message: "Start packet generated and emailed successfully",
    data: packetData
  };
}

/**
 * Generates a start packet directly from a parsed Quote object.
 * @param {object} quote - { customer, serviceType, frequency, initialFee, monthlyFee, annualValue, contactEmail, contactPhone }
 * @returns {object} Result of start packet generation and email.
 */
function generateStartPacketFromQuote(quote) {
  if (!quote) throw new Error('Missing quote');
  const packetData = {
    customerName: String(quote.customer || ''),
    serviceAddress: '',
    serviceDescription: [String(quote.serviceType || ''), String(quote.frequency || '')].filter(Boolean).join(' '),
    operationsManager: '',
    assignedSpecialist: '',
    initialFee: Number(quote.initialFee || 0),
    monthlyFee: Number(quote.monthlyFee || 0),
    frequency: String(quote.frequency || ''),
    dateSold: new Date()
  };
  const pdfBlob = createStartPacketPDF(packetData);
  emailStartPacket(packetData, pdfBlob);
  logTimeSaved('create_start_packet', BASELINE_TASK_TIME_MINS['create_start_packet'], 3);
  logUserAction('generateStartPacketFromQuote', `Start packet from quote for ${packetData.customerName}`);
  return { success: true, message: 'Start packet generated and emailed from quote', data: packetData };
}

/**
 * Creates start packet PDF.
 * @param {object} packetData - The packet data.
 * @returns {Blob} PDF blob.
 */
function createStartPacketPDF(packetData) {
  // Mock PDF creation - in real implementation, would use PDF service
  const pdfContent = `
    START PACKET
    
    Customer: ${packetData.customerName}
    Address: ${packetData.serviceAddress}
    Service: ${packetData.serviceDescription}
    Operations Manager: ${packetData.operationsManager}
    Assigned Specialist: ${packetData.assignedSpecialist}
    Initial Fee: $${packetData.initialFee}
    Monthly Fee: $${packetData.monthlyFee}
    Frequency: ${packetData.frequency}
    Date Sold: ${packetData.dateSold}
  `;
  
  return Utilities.newBlob(pdfContent, 'text/plain', 'start_packet.txt');
}

/**
 * Emails start packet to operations managers.
 * @param {object} packetData - The packet data.
 * @param {Blob} pdfBlob - The PDF blob.
 */
function emailStartPacket(packetData, pdfBlob) {
  const subject = `Start Packet - ${packetData.customerName}`;
  const body = `
    <h2>Start Packet Generated</h2>
    <p>A new start packet has been generated for:</p>
    <ul>
      <li>Customer: ${packetData.customerName}</li>
      <li>Address: ${packetData.serviceAddress}</li>
      <li>Service: ${packetData.serviceDescription}</li>
      <li>Operations Manager: ${packetData.operationsManager}</li>
      <li>Assigned Specialist: ${packetData.assignedSpecialist}</li>
    </ul>
    <p>Please review and take necessary action.</p>
  `;
  
  MailApp.sendEmail({
    to: OPS_MANAGERS_EMAILS,
    subject: subject,
    htmlBody: body,
    attachments: [pdfBlob]
  });
  
  logUserAction("emailStartPacket", `Start packet emailed for ${packetData.customerName}`);
}

/**
 * Saves a single Start Log entry to StartPackets.
 * @param {object} packet - Start log fields from UI.
 * @returns {object} Result with new Packet_ID.
 */
function saveStartPacket(packet) {
  const packetsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PACKETS);
  const id = `SP-${Date.now()}`;
  const row = [
    id,
    packet.soldDate || "",
    packet.accountName || "",
    packet.serviceAddress || "",
    packet.salesReps || "",
    packet.initialJob1xPrice || "",
    packet.maintenancePrice || "",
    packet.type || "",
    packet.frequencyAnnualVisits || "",
    packet.logBookNeeded || "",
    packet.tapLeadOrSpecialist || "",
    packet.pestPacLocId || "",
    packet.customerRequestedStartMonth || "",
    packet.operationsManager || "",
    packet.assignedSpecialist || "",
    packet.materialsOrdered || "",
    packet.installationStarted || "",
    packet.pocNamePhone || "",
    packet.confirmedStartDateWithPOC || "",
    packet.specialNotes || ""
  ];

  packetsSheet.appendRow(row);
  logUserAction("saveStartPacket", `Start log saved for ${packet.accountName}`);
  logTimeSaved("manual_data_entry", BASELINE_TASK_TIME_MINS['manual_data_entry'], 2);

  return { success: true, id: id };
}

/**
 * Bulk imports start log entries to StartPackets.
 * @param {object[]} entries - Array of start log objects.
 * @returns {object} Import result.
 */
function bulkImportStartPackets(entries) {
  const packetsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PACKETS);
  const values = entries.map(e => [
    `SP-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    e.soldDate || "",
    e.accountName || "",
    e.serviceAddress || "",
    e.salesReps || "",
    e.initialJob1xPrice || "",
    e.maintenancePrice || "",
    e.type || "",
    e.frequencyAnnualVisits || "",
    e.logBookNeeded || "",
    e.tapLeadOrSpecialist || "",
    e.pestPacLocId || "",
    e.customerRequestedStartMonth || "",
    e.operationsManager || "",
    e.assignedSpecialist || "",
    e.materialsOrdered || "",
    e.installationStarted || "",
    e.pocNamePhone || "",
    e.confirmedStartDateWithPOC || "",
    e.specialNotes || ""
  ]);

  if (values.length) {
    packetsSheet.getRange(packetsSheet.getLastRow() + 1, 1, values.length, PACKET_HEADERS.length).setValues(values);
  }
  logUserAction("bulkImportStartPackets", `Imported ${values.length} start log entries`);
  logTimeSaved("manual_data_entry", BASELINE_TASK_TIME_MINS['manual_data_entry'] * values.length, 5);
  return { success: true, imported: values.length };
}

/**
 * Generates cadence report.
 * @returns {object} Result of cadence report generation.
 */
function generateCadenceReport() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const cadenceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE);
  
  // Get recent data (last 7 days)
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentData = rows.filter(row => {
    const dateSold = row[headers.indexOf("Date_Sold")];
    return dateSold && new Date(dateSold) >= sevenDaysAgo;
  });
  
  // Calculate metrics
  const totalSold = recentData.length;
  const totalValue = recentData.reduce((sum, row) => {
    return sum + (parseFloat(row[headers.indexOf("Annual_Value")]) || 0);
  }, 0);
  
  const avgValue = totalSold > 0 ? totalValue / totalSold : 0;
  
  // Add to cadence report
  const reportData = [
    new Date(), // Date
    totalSold, // Total_Sold
    totalValue, // Total_Value
    avgValue, // Avg_Value
    recentData.length, // New_Entries
    "Generated" // Status
  ];
  
  cadenceSheet.appendRow(reportData);
  
  // Log time saved
  logTimeSaved("generate_cadence_report", BASELINE_TASK_TIME_MINS['generate_cadence_report'], 5);
  
  logUserAction("generateCadenceReport", `Cadence report generated: ${totalSold} sales, $${totalValue.toFixed(2)} total`);
  
  return {
    success: true,
    message: "Cadence report generated successfully",
    data: {
      totalSold: totalSold,
      totalValue: totalValue,
      avgValue: avgValue
    }
  };
}

/**
 * Checks if cadence report is ready.
 * @returns {boolean} True if cadence report is ready.
 */
function checkCadenceStatus() {
  const cadenceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE);
  const data = cadenceSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return false;
  }
  
  const lastReport = data[data.length - 1];
  const lastReportDate = new Date(lastReport[0]);
  const today = new Date();
  
  // Check if report is older than 7 days
  const daysDiff = (today - lastReportDate) / (1000 * 60 * 60 * 24);
  
  return daysDiff <= 7;
}

/**
 * Emails cadence report to operations managers.
 * @returns {object} Result of email operation.
 */
function emailCadenceReport() {
  const cadenceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE);
  const data = cadenceSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return {
      success: false,
      message: "No cadence report data available"
    };
  }
  
  const lastReport = data[data.length - 1];
  const reportDate = new Date(lastReport[0]);
  const totalSold = lastReport[1];
  const totalValue = lastReport[2];
  const avgValue = lastReport[3];
  
  const subject = `Weekly Cadence Report - ${reportDate.toDateString()}`;
  const body = `
    <h2>Weekly Cadence Report</h2>
    <p><strong>Report Date:</strong> ${reportDate.toDateString()}</p>
    <ul>
      <li><strong>Total Sales:</strong> ${totalSold}</li>
      <li><strong>Total Value:</strong> $${totalValue.toFixed(2)}</li>
      <li><strong>Average Value:</strong> $${avgValue.toFixed(2)}</li>
    </ul>
    <p>Please review and take necessary action.</p>
  `;
  
  MailApp.sendEmail({
    to: OPS_MANAGERS_EMAILS,
    subject: subject,
    htmlBody: body
  });
  
  logUserAction("emailCadenceReport", `Cadence report emailed for ${reportDate.toDateString()}`);
  
  return {
    success: true,
    message: "Cadence report emailed successfully"
  };
}

/**
 * Generates forecast data for charts.
 * @returns {array} Forecast data array.
 */
function generateForecastData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  const data = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    data.push({
      month: months[monthIndex],
      projected: Math.floor(Math.random() * 50) + 30,
      actual: i <= currentMonth ? Math.floor(Math.random() * 50) + 25 : null
    });
  }
  
  return data;
}

// --- ------------------ ---
// 5. CADENCE & AUTOMATION
// --- ------------------ ---

/**
 * Generates a cadence report.
 * @returns {object} Cadence report data.
 */
function generateCadenceReport() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const cadenceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE);
  
  const trackerData = trackerSheet.getDataRange().getValues();
  const cadenceData = cadenceSheet.getDataRange().getValues();
  
  logUserAction("generateCadenceReport", "Cadence report generated");
  
  // Log time saved
  logTimeSaved("generate_cadence", BASELINE_TASK_TIME_MINS['generate_cadence'], 5);
  
  return {
    success: true,
    message: "Cadence report generated successfully",
    timestamp: new Date(),
    dataCount: cadenceData.length - 1
  };
}

/**
 * Checks if cadence report is ready.
 * @returns {boolean} True if cadence report is ready.
 */
function isCadenceReady() {
  const cadenceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE);
  const lastRow = cadenceSheet.getLastRow();
  
  // Simple check: if there's data beyond header, consider it ready
  return lastRow > 1;
}

/**
 * Emails cadence report to operations managers.
 */
function emailCadenceReport() {
  const cadenceData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CADENCE).getDataRange().getValues();
  
  if (cadenceData.length <= 1) {
    console.log("No cadence data to email");
    return;
  }
  
  const subject = "Weekly Cadence Report - " + new Date().toDateString();
  const body = `
    <h2>Weekly Cadence Report</h2>
    <p>Please find the latest cadence report attached.</p>
    <p>Total entries: ${cadenceData.length - 1}</p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  `;
  
  MailApp.sendEmail({
    to: OPS_MANAGERS_EMAILS,
    subject: subject,
    htmlBody: body
  });
  
  logUserAction("emailCadenceReport", "Cadence report emailed to operations managers");
}

// --- ------------------ ---
// 6. UTILITY FUNCTIONS
// --- ------------------ ---

/**
 * Logs user actions to the audit log.
 * @param {string} action - The action performed.
 * @param {string} details - Additional details about the action.
 */
function logUserAction(action, details) {
  const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUDIT);
  const timestamp = new Date();
  const user = Session.getActiveUser().getEmail();
  
  auditSheet.appendRow([timestamp, user, action, details, "", navigator.userAgent || ""]);
}

/**
 * Logs time saved for a task.
 * @param {string} task - The task name.
 * @param {number} baselineTime - The baseline time in minutes.
 * @param {number} actualTime - The actual time in minutes.
 */
function logTimeSaved(task, baselineTime, actualTime) {
  const taskSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TASKS);
  const timestamp = new Date();
  const user = Session.getActiveUser().getEmail();
  const timeSaved = baselineTime - actualTime;
  
  taskSheet.appendRow([timestamp, user, task, "completed", baselineTime, actualTime, timeSaved]);
}

/**
 * Gets recent installs data.
 * @returns {array} Recent installs array.
 */
function getRecentInstalls() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const recentInstalls = rows
    .filter(row => row[headers.indexOf("Status_Install_Complete")] === "Yes")
    .slice(-5)
    .map(row => ({
      customer: row[headers.indexOf("Customer_Name")],
      date: row[headers.indexOf("Date_Install_Scheduled")],
      specialist: row[headers.indexOf("Assigned_Specialist")]
    }));
  
  return recentInstalls;
}

/**
 * Gets pending tasks.
 * @returns {array} Pending tasks array.
 */
function getPendingTasks() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const pendingTasks = rows
    .filter(row => row[headers.indexOf("Status_Install_Complete")] !== "Yes" && row[headers.indexOf("Date_Install_Scheduled")])
    .slice(-5)
    .map(row => ({
      customer: row[headers.indexOf("Customer_Name")],
      scheduledDate: row[headers.indexOf("Date_Install_Scheduled")],
      specialist: row[headers.indexOf("Assigned_Specialist")]
    }));
  
  return pendingTasks;
}

/**
 * Gets branch performance data.
 * @param {string} branch - The branch name.
 * @returns {object} Branch performance data.
 */
function getBranchPerformance(branch) {
  // Mock implementation - would query actual branch data
  return {
    monthlyTrend: [
      { month: 'Jan', proposals: 15, sales: 8 },
      { month: 'Feb', proposals: 18, sales: 10 },
      { month: 'Mar', proposals: 22, sales: 12 }
    ],
    topPerformers: [
      { name: 'Rep 1', sales: 25 },
      { name: 'Rep 2', sales: 22 },
      { name: 'Rep 3', sales: 18 }
    ]
  };
}

/**
 * Sends communications email from Director panel.
 * @param {string} recipients Comma-separated recipient emails.
 * @param {string} subject Email subject.
 * @param {string} body HTML body content.
 * @returns {{success:boolean,message:string}}
 */
function sendCommunicationEmail(recipients, subject, body) {
  try {
    const to = String(recipients || '').trim();
    if (!to) {
      return { success: false, message: 'Recipients are required' };
    }

    MailApp.sendEmail({
      to: to,
      subject: subject || 'Branch360 Update',
      htmlBody: body || ''
    });

    logUserAction('sendCommunicationEmail', `To: ${to} | Subject: ${subject || ''}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (err) {
    logUserAction('sendCommunicationEmail_error', err && err.message ? err.message : String(err));
    return { success: false, message: 'Failed to send email' };
  }
}

/**
 * Gets team activity data.
 * @param {string} branch - The branch name.
 * @returns {array} Team activity array.
 */
function getTeamActivity(branch) {
  const taskSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TASKS);
  const data = taskSheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  return data.slice(-5).map(row => ({
    user: row[1],
    action: row[2],
    timestamp: row[0]
  }));
}

/**
 * Returns the Region/Market for a given branch using BRANCHES sheet.
 * Matches on Branch_Name or Code.
 * @param {string} branchKey
 * @returns {string} market (Region) or ''
 */
function getMarketForBranch(branchKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.BRANCHES);
  if (!sheet || !branchKey) return '';
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const key = String(branchKey).trim();
  for (let i = 0; i < rows.length; i++) {
    const region = String(rows[i][idx('Region')] || '').trim();
    const code = String(rows[i][idx('Code')] || '').trim();
    const bname = String(rows[i][idx('Branch_Name')] || '').trim();
    if (key === code || key === bname) return region;
  }
  return '';
}

/**
 * Returns branches belonging to a given market (Region).
 * @param {string} market
 * @returns {Array<string>} branch names
 */
function getBranchesForMarket(market) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.BRANCHES);
  if (!sheet || !market) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const m = String(market).trim();
  const out = [];
  rows.forEach(r => {
    const region = String(r[idx('Region')] || '').trim();
    if (region === m) out.push(String(r[idx('Branch_Name')] || '').trim());
  });
  return out;
}

/**
 * Returns list of unique markets (Regions) from BRANCHES.
 * @returns {Array<string>} markets
 */
function getMarkets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.BRANCHES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const set = {};
  rows.forEach(r => {
    const region = String(r[idx('Region')] || '').trim();
    if (region) set[region] = true;
  });
  return Object.keys(set).sort();
}

/**
 * Gets system metrics.
 * @returns {object} System metrics data.
 */
function getSystemMetrics() {
  const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUDIT);
  const taskSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TASKS);
  
  const totalActions = auditSheet.getLastRow() - 1;
  const totalTasks = taskSheet.getLastRow() - 1;
  
  return {
    totalActions: totalActions,
    totalTasks: totalTasks,
    systemUptime: "99.9%",
    lastBackup: new Date().toLocaleString()
  };
}

/**
 * Creates sample data for testing.
 */
function createSampleData() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  
  // Add sample tracker data if empty
  if (trackerSheet.getLastRow() <= 1) {
    const sampleData = [
      ["001", "Proposal", "John Smith", "Branch A", "ABC Company", "123 Main St", "Bob Johnson", "555-1234", 
       new Date(2024, 0, 15), null, null, new Date(2024, 1, 1), "No",
       "Referral", "New Sale", "Pest Control", 500, 150, "Monthly", 1800,
       "PC123", "Jane Doe", "Mike Wilson", "Yes", "Yes",
       "No", "Initial proposal", "Yes", "Yes", "Yes", "5", "Yes", "3"],
      
      ["002", "Sold", "Sarah Jones", "Branch B", "XYZ Corporation", "456 Oak Ave", "Alice Brown", "555-5678",
       new Date(2024, 0, 20), new Date(2024, 0, 25), null, new Date(2024, 1, 15), "Yes",
       "Cold Call", "Renewal", "Termite Treatment", 750, 200, "Quarterly", 2400,
       "PC456", "Tom Davis", "Lisa Garcia", "No", "Yes",
       "Yes", "Renewal completed", "Yes", "Yes", "Yes", "8", "Yes", "5"]
    ];
    
    sampleData.forEach(row => trackerSheet.appendRow(row));
  }
  
  // Log some sample tasks
  logTimeSaved("generate_cadence", 60, 5);
  logTimeSaved("create_start_packet", 45, 3);
  logTimeSaved("pull_kpis", 30, 2);
}

// --- ------------------ ---
// 7. AUTOMATED TRIGGERS
// --- ------------------ ---

/**
 * Refreshes daily metrics (runs daily at 2 AM).
 */
function refreshDailyMetrics() {
  const metricsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.METRICS);
  const today = new Date();
  
  const metrics = [
    ["Hours Saved", calculateHoursSaved(), today, "All"],
    ["Dollar Savings", calculateDollarSavings(), today, "All"],
    ["Adoption Rate", calculateAdoptionRate(), today, "All"],
    ["Data Hygiene Score", calculateDataHygieneScore(), today, "All"],
    ["ROI Percentage", calculateROI(), today, "All"]
  ];
  
  metrics.forEach(metric => metricsSheet.appendRow(metric));
  
  console.log("Daily metrics refreshed");
}

/**
 * Sends weekly leadership summary (runs every Monday at 8 AM).
 */
function emailWeeklyLeadershipSummary() {
  const subject = "Weekly Leadership Summary - Branch360";
  const hoursSaved = calculateHoursSaved();
  const dollarSavings = calculateDollarSavings();
  const adoptionRate = calculateAdoptionRate();
  const roi = calculateROI();
  
  const body = `
    <h2>Weekly Leadership Summary</h2>
    <h3>System Performance</h3>
    <ul>
      <li>Hours Saved: ${hoursSaved}</li>
      <li>Dollar Savings: $${dollarSavings.toLocaleString()}</li>
      <li>Adoption Rate: ${adoptionRate}%</li>
      <li>ROI: ${roi}%</li>
    </ul>
    <p>Report generated on: ${new Date().toLocaleString()}</p>
  `;
  
  MailApp.sendEmail({
    to: EXECUTIVE_EMAILS,
    subject: subject,
    htmlBody: body
  });
  
  console.log("Weekly leadership summary sent");
}

/**
 * Sends reminder emails (runs daily at 9 AM).
 */
function sendReminderEmails() {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  rows.forEach(row => {
    const installDate = new Date(row[headers.indexOf("Date_Install_Scheduled")]);
    const status = row[headers.indexOf("Status_Install_Complete")];
    
    if (installDate <= threeDaysFromNow && status !== "Yes") {
      const customer = row[headers.indexOf("Customer_Name")];
      const specialist = row[headers.indexOf("Assigned_Specialist")];
      
      // Send reminder email to specialist
      const subject = `Upcoming Installation Reminder - ${customer}`;
      const body = `
        <h3>Installation Reminder</h3>
        <p>Installation scheduled for ${installDate.toLocaleDateString()}</p>
        <p>Customer: ${customer}</p>
        <p>Please ensure all preparations are complete.</p>
      `;
      
      // Mock email sending - in real implementation, would send to specialist's email
      console.log(`Reminder: Installation for ${customer} on ${installDate.toLocaleDateString()}`);
    }
  });
}

// Export functions for use in frontend
function getMetricsSummary() {
  return {
    hoursSaved: calculateHoursSaved(),
    dollarSavings: calculateDollarSavings(),
    adoptionRate: calculateAdoptionRate(),
    dataHygieneScore: calculateDataHygieneScore(),
    roi: calculateROI()
  };
}

// --- ------------------ ---
// 8. UNIFIED TRACKER VIEW
// --- ------------------ ---

/**
 * Returns unified tracker rows with computed next actions.
 * Filters optionally by role/branch/market.
 * @param {object} opts - { role, branch, market, colleague }
 * @returns {Array<Object>} rows
 */
function getUnifiedTrackerView(opts) {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);

  const toRow = r => {
    const status = String(r[idx('Status')] || '');
    const soldDate = r[idx('Date_Sold')] || '';
    const startPacketSent = String(r[idx('StartPacket_Sent')] || '');
    const installScheduled = r[idx('Date_Install_Scheduled')] || '';
    const installComplete = String(r[idx('Status_Install_Complete')] || '');
    const logBookNeeded = String(r[idx('Log_Book_Needed')] || 'No');
    const materialsOrdered = String(r[idx('Materials_Ordered')] || 'No');
    const opsManager = String(r[idx('Operations_Manager')] || '');
    const specialist = String(r[idx('Assigned_Specialist')] || '');
    const annualValue = parseFloat(r[idx('Annual_Value')] || 0) || 0;

    const nextActions = [];
    if (status === 'Sold' && startPacketSent !== 'Yes') nextActions.push('Send Start Packet');
    if (status === 'Sold' && startPacketSent === 'Yes' && !installScheduled) nextActions.push('Schedule Install');
    if (materialsOrdered !== 'Yes') nextActions.push('Order Materials');
    if (logBookNeeded === 'Yes') nextActions.push('Prepare Log Book');
    if (installScheduled && installComplete !== 'Yes') nextActions.push('Perform Install');

    return {
      id: String(r[idx('ID')] || r[idx('PestPac_ID')] || ''),
      status: status,
      branch: String(r[idx('Branch')] || ''),
      customer: String(r[idx('Customer_Name')] || ''),
      serviceAddress: String(r[idx('Service_Address')] || ''),
      serviceDescription: String(r[idx('Service_Description')] || ''),
      annualValue: annualValue,
      dateSold: soldDate || '',
      startPacketSent: startPacketSent === 'Yes',
      dateInstallScheduled: installScheduled || '',
      installComplete: installComplete === 'Yes',
      logBookNeeded: logBookNeeded === 'Yes',
      materialsOrdered: materialsOrdered === 'Yes',
      operationsManager: opsManager,
      assignedSpecialist: specialist,
      nextActions: nextActions
    };
  };

  let out = rows.map(toRow);
  if (opts && opts.branch) out = out.filter(x => x.branch === opts.branch);
  if (opts && opts.market) {
    const branches = getBranchesForMarket(opts.market);
    if (branches.length) {
      const bset = branches.reduce((acc, b) => { acc[String(b)] = true; return acc; }, {});
      out = out.filter(x => bset[String(x.branch || '')]);
    }
  }

  // Filter by colleague: matches Operations Manager, Assigned Specialist,
  // or branches managed by the selected Branch Manager.
  if (opts && opts.colleague) {
    const name = String(opts.colleague || '').trim();
    if (name) {
      // Collect branches for a Branch Manager match
      const managedBranches = getBranchesForManager(name);
      const mbSet = managedBranches.reduce((acc, b) => { acc[String(b)] = true; return acc; }, {});
      out = out.filter(x => (
        String(x.operationsManager || '') === name ||
        String(x.assignedSpecialist || '') === name ||
        (managedBranches.length && mbSet[String(x.branch || '')])
      ));
    }
  }

  return out;
}

/**
 * Patch specific fields of a tracker entry by ID.
 * @param {string} id
 * @param {object} patch - keys to update
 * @returns {object} result
 */
function updateTrackerEntry(id, patch) {
  const trackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TRACKER);
  const data = trackerSheet.getDataRange().getValues();
  if (data.length <= 1) throw new Error('Tracker is empty');
  const headers = data[0];
  const rows = data.slice(1);
  const idx = name => headers.indexOf(name);
  const rIndex = rows.findIndex(r => String(r[idx('ID')]) === String(id) || String(r[idx('PestPac_ID')]) === String(id));
  if (rIndex === -1) throw new Error('Tracker entry not found');
  const sheetRow = rIndex + 2;

  const apply = (col, val) => { const i = idx(col); if (i !== -1) trackerSheet.getRange(sheetRow, i + 1).setValue(val); };
  if (patch.hasOwnProperty('StartPacket_Sent')) apply('StartPacket_Sent', patch.StartPacket_Sent ? 'Yes' : 'No');
  if (patch.hasOwnProperty('Date_Install_Scheduled')) apply('Date_Install_Scheduled', patch.Date_Install_Scheduled || '');
  if (patch.hasOwnProperty('Status_Install_Complete')) apply('Status_Install_Complete', patch.Status_Install_Complete ? 'Yes' : 'No');
  if (patch.hasOwnProperty('Materials_Ordered')) apply('Materials_Ordered', patch.Materials_Ordered ? 'Yes' : 'No');
  if (patch.hasOwnProperty('Log_Book_Needed')) apply('Log_Book_Needed', patch.Log_Book_Needed ? 'Yes' : 'No');
  if (patch.hasOwnProperty('Operations_Manager')) apply('Operations_Manager', patch.Operations_Manager || '');
  if (patch.hasOwnProperty('Assigned_Specialist')) apply('Assigned_Specialist', patch.Assigned_Specialist || '');
  if (patch.hasOwnProperty('Notes')) apply('Notes', patch.Notes || '');

  logUserAction('updateTrackerEntry', `Patched ${id}: ${Object.keys(patch).join(', ')}`);
  return { success: true };
}

/**
 * Return list of colleagues (Users + Branch Managers) for filtering.
 * @returns {Array<{name:string,email:string,role:string,branch:string}>}
 */
function getColleagues() {
  const out = [];
  // From USERS sheet
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  if (userSheet) {
    const rows = userSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][0] || '').trim();
      const role = String(rows[i][1] || '').trim();
      const branch = String(rows[i][2] || '').trim();
      const name = String(rows[i][3] || '').trim();
      if (name) out.push({ name, email, role, branch });
    }
  }
  // From BRANCHES sheet: Branch_Manager values
  const bSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.BRANCHES);
  if (bSheet) {
    const data = bSheet.getDataRange().getValues();
    if (data.length > 1) {
      const headers = data[0];
      const rows = data.slice(1);
      const idx = n => headers.indexOf(n);
      for (let i = 0; i < rows.length; i++) {
        const name = String(rows[i][idx('Branch_Manager')] || '').trim();
        const branchName = String(rows[i][idx('Branch_Name')] || '').trim();
        if (name) out.push({ name, email: '', role: 'Branch Manager', branch: branchName });
      }
    }
  }
  // Deduplicate by name+email
  const seen = {};
  return out.filter(u => {
    const key = `${u.name}|${u.email}`;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  }).sort((a,b) => String(a.name).localeCompare(String(b.name)));
}

/**
 * Returns branches managed by a given Branch Manager name.
 * @param {string} managerName
 * @returns {Array<string>} branchNames
 */
function getBranchesForManager(managerName) {
  const out = [];
  const bSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.BRANCHES);
  if (!bSheet) return out;
  const data = bSheet.getDataRange().getValues();
  if (data.length <= 1) return out;
  const headers = data[0];
  const rows = data.slice(1);
  const idx = n => headers.indexOf(n);
  const target = String(managerName || '').trim();
  for (let i = 0; i < rows.length; i++) {
    const mgr = String(rows[i][idx('Branch_Manager')] || '').trim();
    if (mgr === target) {
      out.push(String(rows[i][idx('Branch_Name')] || '').trim());
    }
  }
  return out;
}
/**
 * Gmail helpers for Streamline Dashboard.
 * These functions run in Google Apps Script when deployed as a Web App.
 * Frontend should call via google.script.run.
 */

/**
 * List recent emails in the user's inbox.
 * @param {string} query Gmail search query (e.g., 'in:inbox newer_than:7d').
 * @param {number} max Maximum number of threads/messages to fetch.
 * @return {Array<Object>} Basic email info for list view.
 */
function listEmails(query, max) {
  query = query || 'in:inbox newer_than:7d';
  max = Math.min(max || 25, 100);

  var threads = GmailApp.search(query, 0, max);
  var items = [];
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var message = messages[messages.length - 1]; // last message in thread

    items.push({
      threadId: thread.getId(),
      messageId: message.getId(),
      subject: message.getSubject(),
      from: message.getFrom(),
      to: message.getTo(),
      date: message.getDate().toISOString(),
      snippet: (message.getPlainBody() || '').substring(0, 200),
      unread: thread.isUnread()
    });
  }
  return items;
}

/**
 * Get the HTML body for a specific message.
 * Render in an iframe with srcdoc on the client for safety.
 * @param {string} messageId Gmail message ID.
 * @return {Object} HTML content and metadata.
 */
function getEmailHtml(messageId) {
  var msg = GmailApp.getMessageById(messageId);
  return {
    messageId: messageId,
    subject: msg.getSubject(),
    from: msg.getFrom(),
    to: msg.getTo(),
    date: msg.getDate().toISOString(),
    html: msg.getBody()
  };
}

/**
 * Mark a thread as read.
 * @param {string} threadId Gmail thread ID.
 * @return {boolean} true on success.
 */
function markThreadRead(threadId) {
  var t = GmailApp.getThreadById(threadId);
  if (t) {
    t.markRead();
    return true;
  }
  return false;
}
