# Cross-Dashboard Integration Guide

## 🔄 Overview

All dashboards now communicate with each other in real-time, enabling seamless workflow from Sales → Operations → Management. Data flows automatically between roles, keeping everyone synchronized.

## 📊 Dashboard Communication Flow

```
Sales Dashboard
    ↓ (Deal Sold)
Operations Dashboard
    ↓ (Job Assigned)
Branch Manager Dashboard
    ↓ (Metrics Roll-up)
Area Manager Dashboard
    ↓ (Metrics Roll-up)
Region Director Dashboard
    ↓ (Metrics Roll-up)
Market Director Dashboard
```

## 🎯 What Each Dashboard Sees

### Sales Dashboard
**What They Do:**
- Create quotes/proposals
- Move deals through pipeline (Lead → Qualified → Proposal → Negotiation → Sold)
- View their performance metrics

**What Operations Sees:**
- When a deal moves to "Sold" status, it automatically appears in Operations queue
- Operations gets real-time notification
- Deal details, services, and customer info are immediately available

**Integration Points:**
```javascript
// Sales marks deal as sold
await DataSync.updateDealState(
  dealId,
  DataSync.WorkflowStates.SOLD,
  { customerName, services, totalValue }
);

// Operations automatically notified → new item appears in their queue
```

---

### Operations Dashboard
**What They Do:**
- See all deals sold by AEs (pending scheduling)
- View available technicians and their current workload
- Assign jobs to techs
- Schedule installations

**What They See from Sales:**
- Customer name
- Services needed
- Total value
- AE who sold it
- Days since sold (priority indicator)
- Priority level (high/medium/low based on value + age)

**What Branch Manager Sees:**
- When operations assigns a job, manager gets notification
- Manager sees real-time tech utilization
- Manager sees scheduling status

**Integration Points:**
```javascript
// Operations assigns job to tech
await DataSync.assignJob(dealId, techId, {
  scheduledDate: '2025-11-26',
  estimatedDuration: 90
});

// Branch Manager automatically notified → sees updated schedules
```

---

### Branch Manager Dashboard
**What They Do:**
- Overview of entire branch (sales + operations)
- See sales pipeline
- Monitor operations efficiency
- View team performance
- Drill down into specific deals or jobs
- See overdue items requiring attention

**What They See:**
- All sales activity in branch
- All operations activity in branch
- Tech utilization and availability
- Revenue vs goal
- Backlog percentages
- Missed stops
- Team member performance

**Pinpoint Views:**
- Click any deal → see full history (AE → Current State → Assigned Tech → Schedule)
- Click any tech → see their schedule and workload
- Click any metric → see detailed breakdown
- Click any alert → go directly to issue

**Integration Points:**
```javascript
// Get all data for branch
const branchData = await DataSync.hierarchy.getCurrentHierarchyData();

// Drill down into specific entity
await DataSync.hierarchy.drillDown(childId);
```

---

### Area Manager Dashboard
**What They Do:**
- See all branches in their area
- Compare branch performance
- Identify branches needing support
- Drill down into any branch for details
- View area-wide trends

**What They See:**
- List of all branches with key metrics
- Performance ratings (A+, A, B, C, D)
- Revenue to goal percentages
- Status indicators (Excellent, Good, Fair, Needs Attention)
- Area-wide totals and averages

**Drill-Down:**
- Click any branch → switch to that branch's full dashboard
- Navigate back up to area view
- See real-time updates from all branches

---

### Region Director Dashboard
**What They Do:**
- See all areas in their region
- Compare area performance
- Drill down to area → branch levels
- View region-wide metrics
- Track market share

**What They See:**
- List of areas with aggregated metrics
- Region totals (revenue, deals, customers)
- Performance trends
- Cross-area comparisons
- Regional alerts and attention items

---

### Market Director Dashboard
**What They Do:**
- See all regions in their market
- Executive-level metrics
- Market-wide trends
- Drill down through entire hierarchy (Market → Region → Area → Branch)
- Strategic oversight

**What They See:**
- Complete market overview
- All regions at a glance
- Market-wide KPIs
- Growth rates and trends
- Executive alerts

---

## 🔧 Technical Implementation

### 1. Data Synchronization Layer (`js/data-sync.js`)

**Core Features:**
- Real-time data subscription system
- Workflow state management
- Cross-dashboard communication
- Hierarchical data access
- Optimistic updates with rollback
- Offline queue (syncs when back online)

**Usage:**
```javascript
// Subscribe to changes
DataSync.subscribe('deal_state_changed', (update) => {
  console.log('Deal updated:', update);
  // Refresh relevant sections
});

// Update deal state (triggers notifications)
await DataSync.updateDealState(dealId, newState, metadata);

// Assign job (operations)
await DataSync.assignJob(jobId, techId, details);

// Get hierarchy data (managers)
const data = await DataSync.getHierarchyData();
```

### 2. Operations Dashboard (`js/operations-dashboard.js`)

**Features:**
- Real-time queue of sold deals from sales
- Technician roster with availability
- Drag-and-drop job assignment
- Schedule modal with calendar
- Quick assign panel
- Priority sorting
- Overdue indicators

**Workflow:**
1. AE sells deal → appears in ops queue (red if overdue)
2. Ops sees deal details, services, customer info
3. Ops selects deal + tech → assigns
4. Job moves to "Assigned" state
5. Manager gets notification

**HTML Required:**
```html
<div id="operationsDashboardContainer"></div>
```

### 3. Hierarchy Dashboard (`js/hierarchy-dashboard.js`)

**Features:**
- Multi-level navigation (Market → Region → Area → Branch)
- Drill-down capabilities
- Performance ratings
- Status indicators
- Breadcrumb navigation
- Overview vs Details toggle
- Real-time metrics

**Navigation:**
1. Manager starts at their level
2. Sees children (branches, areas, regions)
3. Clicks child → drills down
4. Sees detailed view of that entity
5. Clicks "Back" → returns to previous level

**HTML Required:**
```html
<div id="hierarchyDashboardContainer"></div>
```

---

## 📦 Integration Steps

### Step 1: Add Scripts to index.html

```html
<!-- Add after the enhanced dashboard components -->
<script src="js/data-sync.js"></script>
<script src="js/operations-dashboard.js"></script>
<script src="js/hierarchy-dashboard.js"></script>
```

**Order Matters:** data-sync.js must load first!

### Step 2: Add HTML Containers

```html
<!-- For Operations Dashboard (Ops role) -->
<div id="operationsDashboardContainer" class="dashboard-container">
  <!-- Operations dashboard renders here -->
</div>

<!-- For Hierarchy Dashboard (Managers) -->
<div id="hierarchyDashboardContainer" class="dashboard-container">
  <!-- Hierarchy dashboard renders here -->
</div>
```

### Step 3: Role-Based Display

```javascript
// Show appropriate dashboard based on user role
const role = window.currentUser?.role;

if (role === 'Sales') {
  // Show sales dashboard (already implemented)
  document.getElementById('salesDashboard').classList.remove('hidden');
} else if (role === 'Ops') {
  // Show operations dashboard
  document.getElementById('operationsDashboardContainer').classList.remove('hidden');
} else if (role === 'Manager' || role === 'Executive') {
  // Show hierarchy dashboard
  document.getElementById('hierarchyDashboardContainer').classList.remove('hidden');
}
```

### Step 4: Test the Integration

**Sales → Operations Test:**
1. Login as Sales
2. Create a quote and mark as "Sold"
3. Login as Operations
4. Verify deal appears in queue
5. Assign to a technician
6. Login as Manager
7. Verify assignment shows in dashboard

**Hierarchy Test:**
1. Login as Area Manager
2. See list of branches
3. Click a branch
4. See full branch details
5. Click "Back"
6. Return to area view

---

## 🔔 Notifications & Alerts

### When Sales Sells a Deal:
- **Operations** gets notification: "New deal ready for scheduling"
- **Branch Manager** sees updated pipeline metrics
- Deal appears with priority indicator (high/medium/low)
- Overdue indicator if not scheduled within 5 days

### When Operations Assigns Job:
- **Assigned Tech** gets notification (if tech dashboard/app)
- **Branch Manager** sees updated tech utilization
- **Sales AE** can see status update on their deal
- Deal state changes to "Assigned"

### When Manager Drills Down:
- Real-time data loads for selected entity
- Performance ratings update
- Alerts for that entity show
- Can see all activity in that entity

---

## 📊 Real-Time Updates

All dashboards use **DataSync subscriptions** for real-time updates:

```javascript
// Sales dashboard subscribes to deal updates
DataSync.subscribe('deal_state_changed', handleDealUpdate);

// Operations subscribes to new deals
DataSync.subscribe('new_ops_item', handleNewDeal);

// Managers subscribe to metrics updates
DataSync.subscribe('branch_metrics_update', handleMetricsUpdate);
```

**Update Flow:**
1. User makes change (e.g., sells deal)
2. DataSync updates backend
3. DataSync notifies all subscribers
4. Relevant dashboards refresh
5. Notifications show
6. UI updates automatically

---

## 🎯 Data Flow Examples

### Example 1: AE Sells a Deal

```javascript
// 1. AE in Sales Dashboard submits quote as sold
await DataSync.updateDealState(
  'DEAL001',
  DataSync.WorkflowStates.SOLD,
  {
    customerName: 'ACME Corp',
    services: ['IPM', 'Rodent'],
    totalValue: 12000,
    ae: 'John Smith'
  }
);

// 2. DataSync fires event
DataSync.service.notify('deal_state_changed', {
  dealId: 'DEAL001',
  newState: 'sold',
  metadata: { ... }
});

// 3. Operations Dashboard receives notification
opsDashboard.handleNewDeal({
  id: 'DEAL001',
  customerName: 'ACME Corp',
  soldDate: '2025-11-25',
  totalValue: 12000,
  services: ['IPM', 'Rodent'],
  ae: 'John Smith',
  state: 'sold',
  priority: 'medium',
  daysOld: 0,
  isOverdue: false
});

// 4. Deal appears in ops queue
// 5. Operations sees it, can assign immediately
```

### Example 2: Operations Assigns Job

```javascript
// 1. Ops in Operations Dashboard assigns job
await DataSync.assignJob(
  'DEAL001',
  'TECH001',
  {
    scheduledDate: '2025-11-26T09:00:00',
    estimatedDuration: 90,
    notes: 'Bring extra bait stations'
  }
);

// 2. DataSync updates deal state
await DataSync.updateDealState(
  'DEAL001',
  DataSync.WorkflowStates.ASSIGNED,
  {
    assignedTo: 'TECH001',
    assignedBy: 'ops@rentokil.com'
  }
);

// 3. Branch Manager gets notification
dashboardComm.notifyBranchManager('job_assigned', {
  jobId: 'DEAL001',
  techId: 'TECH001',
  customerName: 'ACME Corp'
});

// 4. Tech utilization updates
// 5. Schedule shows updated assignment
```

### Example 3: Manager Drills Down

```javascript
// 1. Area Manager clicks on a branch
await hierarchyDashboard.drillDown('BR001', 'Omaha Branch');

// 2. Load branch data
const branchData = await DataSync.service.getHierarchicalData('branch', 'BR001');

// 3. Display branch metrics
hierarchyDashboard.render();

// 4. Manager sees:
// - All sales in branch
// - All operations in branch
// - Team performance
// - Revenue vs goal
// - Alerts and issues

// 5. Manager can click "Back" to return to area view
```

---

## 🎨 UI Customization

### Operations Queue Styling
```css
.ops-deal-item.high-priority {
  border-color: #ef4444;
  border-width: 3px;
}

.ops-deal-item.overdue {
  background: #fee2e2;
}

.ops-deal-item.selected {
  border-color: #0066cc;
  background: #eff6ff;
}
```

### Hierarchy Drill-Down
```css
.hierarchy-child-card:hover {
  border-color: var(--brand-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.hierarchy-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

---

## 🐛 Troubleshooting

### Operations Not Seeing New Deals

**Check:**
1. Is DataSync loaded? `console.log(window.DataSync)`
2. Is Operations subscribed? Check console for subscription logs
3. Did deal move to "Sold" state?
4. Check network tab for API calls

**Fix:**
```javascript
// Force refresh operations queue
if (window.opsDashboard) {
  await window.opsDashboard.loadData();
}
```

### Hierarchy Not Drilling Down

**Check:**
1. Is hierarchy dashboard initialized?
2. Check currentLevel and currentId
3. Verify user has hierarchy level set

**Fix:**
```javascript
// Manual drill down
if (window.hierarchyDashboard) {
  await window.hierarchyDashboard.drillDown('BR001', 'Omaha');
}
```

### Updates Not Showing in Real-Time

**Check:**
1. Are subscriptions active?
2. Is cache interfering?
3. Check console for DataSync events

**Fix:**
```javascript
// Clear cache and reload
CacheLayer.clear();
await window.refreshDashboard(true);
```

---

## 📚 API Reference

### DataSync.updateDealState(dealId, newState, metadata)
Update deal workflow state and notify all dashboards.

### DataSync.assignJob(jobId, techId, details)
Assign job to technician and update schedules.

### DataSync.getDealsForOps(filters)
Get deals pending operations attention.

### DataSync.getAvailableTechs(filters)
Get available technicians for assignment.

### DataSync.getHierarchyData()
Get current user's hierarchy level data.

### DataSync.subscribe(event, callback)
Subscribe to data changes.

---

## ✅ Summary

All dashboards now talk to each other:

✅ **Sales → Operations:** Sold deals appear instantly in ops queue
✅ **Operations → Management:** Job assignments update manager views
✅ **Management → All:** Hierarchical drill-down shows complete picture
✅ **Real-Time Updates:** All dashboards sync automatically
✅ **Workflow Tracking:** Deal states move through pipeline
✅ **Smart Notifications:** Relevant parties notified of changes
✅ **Offline Support:** Changes queue and sync when back online

The system provides a **complete, integrated workflow** from initial sale through installation to management oversight. Everyone sees what they need, when they need it! 🚀
