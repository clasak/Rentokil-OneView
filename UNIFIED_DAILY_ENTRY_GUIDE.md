# Unified Daily Entry System - Complete Guide

## 🎯 Overview

The **Unified Daily Entry System** replaces 4 separate entry points with a single, streamlined interface:

### What It Replaces:
1. ❌ **Daily Performance Google Form** → ✅ Quick Entry tab
2. ❌ **Sales Tracker Spreadsheet** → ✅ New Sale/Start Log tab
3. ❌ **Proposals Tracker Spreadsheet** → ✅ Proposal tab
4. ❌ **Houston New Start Log** → ✅ New Sale/Start Log tab

### Key Benefits:
- 📝 **One Entry, Four Systems** - Enter once, syncs to all systems automatically
- 🤖 **Auto-Calculation** - Totals calculate from detailed entries (no duplicate data entry)
- 💾 **Auto-Save** - Saves every 30 seconds, never lose your work
- 🔄 **Real-Time Sync** - Operations sees new sales instantly
- ⚡ **Fast & Simple** - Clean tabbed interface, intuitive workflow

---

## 📊 How It Works

### The 4 Tabs:

#### 1️⃣ **Quick Entry** - Daily Metrics
Fast entry for daily performance numbers:
- Proposals Delivered (auto-calculated from Proposal tab)
- PRP LOBs Proposed/Sold
- Total $ Sold (auto-calculated from New Sale tab)
- Total $ Proposed (auto-calculated from Proposal tab)
- Next Day CONF
- Events Completed

**Pro Tip:** Add detailed sales/proposals in other tabs, and these totals auto-calculate!

#### 2️⃣ **New Sale/Start Log** - Sold Deals
Replaces both Sales Tracker AND Houston New Start Log (AE portion):

**Account Information:**
- Sold Date
- Account Name *
- Service Address *

**Sales Details:**
- Sales Rep(s) (auto-filled with your name)
- Lead Type (In Bound, Creative, Referral, Existing Customer)
- Service Type (GPC, Rodent, Termite, etc.)

**Pricing & Contract:**
- Initial/Job Detail $
- Initial/Job YR Merchandise
- Maintenance Contract $ PY MFR
- Type (Contract/Job/PO)
- Premium (OO-Job $)
- Log Date
- LOBs # APCA +14LOBs
- Confirmed Package (12/24/48 wk/contract)

**UAC & Customer Details:**
- UAC Expires (y/n/pending)
- Confirmed with POC
- Customer Confirmed Month
- POC Name/Phone#
- Special Notes / Equipment Overview

**Operations Section (Read-Only for AE):**
These fields are shown but disabled - Operations will fill them:
- Operations Manager
- Assigned Specialist
- Have Been Ordered
- Initial/Maint Service Ordered

**Actions:**
- **Save & Add Another** - Saves this sale, keeps form open for next entry
- **Save & Submit to Ops** - Saves sale and sends to Operations queue immediately

#### 3️⃣ **Proposal Delivered** - Proposals
Track proposals you delivered:
- Date Delivered *
- Company Name *
- Lead Type
- Service
- Job Work Total
- Termite Total
- Contract Total
- Grand Total (auto-calculated)
- Sold / Delivered checkboxes

#### 4️⃣ **Daily Summary** - Review Everything
Shows all your entries for the day:
- **Metrics Cards:** Proposals Delivered, Total $ Sold, Total $ Proposed, Events Completed
- **Sales Entries List:** All sales you entered
- **Proposal Entries List:** All proposals you entered
- **Submit All Button:** Syncs everything to all 4 systems

---

## 🚀 Workflow Examples

### Example 1: Simple Daily Entry

**Morning:**
1. Open Unified Daily Entry
2. Go to **Quick Entry** tab
3. Enter:
   - Next Day CONF: 3
   - Events Completed: 5
4. Click "Save Draft"

**When you sell something:**
1. Open Unified Daily Entry
2. Go to **New Sale/Start Log** tab
3. Fill in account info, pricing, details
4. Click "Save & Submit to Ops"
5. ✅ Sale appears in Operations queue instantly

**End of day:**
1. Go to **Daily Summary** tab
2. Review all entries
3. Click "Submit All & Sync to All Systems"
4. ✅ Data syncs to all 4 systems

---

### Example 2: Multiple Sales Day

**Throughout the day:**
1. **Sale #1 at 9am:**
   - Fill New Sale form
   - Click "Save & Submit to Ops"
   - Operations gets notified

2. **Proposal #1 at 10am:**
   - Fill Proposal form
   - Click "Save & Add Another"

3. **Proposal #2 at 11am:**
   - Fill Proposal form
   - Click "Save Proposal"

4. **Sale #2 at 2pm:**
   - Fill New Sale form
   - Click "Save & Submit to Ops"

**End of day:**
1. Go to **Quick Entry** tab
2. Notice auto-calculated totals:
   - Proposals Delivered: 2 (auto)
   - Total $ Sold: $15,450 (auto)
   - Total $ Proposed: $28,900 (auto)
3. Manually enter:
   - PRP LOBs Proposed: 8
   - PRP LOBs Sold: 5
   - Next Day CONF: 4
   - Events Completed: 7
4. Go to **Daily Summary**
5. Click "Submit All & Sync to All Systems"

---

## 🔄 Where Your Data Goes

When you click "Submit All & Sync to All Systems":

### 1. Daily Performance Form (Google Sheets)
```
Date | AE Name | Proposals | PRP LOBs Proposed | PRP LOBs Sold | $ Sold | Next Day CONF | $ Proposed | Events
```
→ One row per day with your metrics

### 2. Sales Tracker
```
Date | Account | Address | Sales Rep | Lead Type | Service | Initial $ | Maintenance $ | Total | Type
```
→ One row per sale you entered

### 3. Proposals Tracker
```
Date | Company | Lead Type | Service | Job Work | Termite | Contract | Grand Total | Sold | Delivered | AE
```
→ One row per proposal you entered

### 4. Houston New Start Log
```
Sold Date | Account | Address | Initial $ | ... | UAC | POC | [Ops columns empty] | Special Notes | Sales Rep
```
→ One row per sale, with AE columns filled and Ops columns left empty

### 5. Operations Dashboard
→ Sales marked "Submit to Ops" appear in Operations queue immediately

---

## 💾 Auto-Save & Draft Management

**Auto-Save:**
- Saves every 30 seconds automatically
- Status shows "Auto-saved" in footer
- Uses cache (localStorage + memory)

**Draft Persistence:**
- Close modal anytime - your entries are saved
- Reopen modal - your entries reload
- Drafts persist until you submit or clear

**Manual Save:**
- Click "Save Draft" button to force save
- Useful before closing browser

---

## 🎨 Features & Tips

### Auto-Calculation
The system is smart - it calculates totals from your detailed entries:

```
You enter in New Sale tab:
  Sale 1: Initial $5,000 + Maintenance $7,000 = $12,000
  Sale 2: Initial $3,000 + Maintenance $8,000 = $11,000

Quick Entry tab automatically shows:
  Total $ Sold: $23,000 ✅
```

No need to enter the same number twice!

### Clear Separation: AE vs Operations
- **AE Fills:** Account info, pricing, customer details, special notes
- **Ops Fills:** Assigned tech, ordered status, service scheduling
- Operations columns shown but disabled for AE (you can see them, but can't edit)

### Real-Time Operations Notification
When you click "Save & Submit to Ops":
1. Sale saved to your entries
2. Deal state moves to "Sold" in workflow
3. Operations dashboard gets notification
4. Sale appears in Operations queue with priority indicator
5. Operations can assign tech and schedule immediately

### Import from Salesforce (Coming Soon)
Button shown for future Salesforce PDF import feature

---

## 🔧 Technical Details

### Frontend Files:
- **`js/unified-daily-entry.js`** - Main UI and logic
- Integrates with:
  - `js/data-sync.js` (real-time sync)
  - `js/data-validation.js` (validation)
  - `js/cache-layer.js` (auto-save)

### Backend Function:
- **`unified-entry-backend.gs`** - Google Apps Script backend
- Function: `submitUnifiedDailyEntry(data)`
- Handles syncing to all 4 sheets

### Data Flow:
```
Unified Daily Entry Modal
    ↓
Cache Layer (auto-save)
    ↓
Submit Button Clicked
    ↓
submitUnifiedDailyEntry() in Apps Script
    ↓
Writes to 4 sheets:
  - Daily_Performance
  - Sales_Tracker
  - Proposals_Tracker
  - Houston_New_Start_Log
    ↓
DataSync notifies Operations
    ↓
Operations sees new sales
```

---

## 🐛 Troubleshooting

### Entries not saving?
**Check:**
1. Is modal open? (must have modal open to save)
2. Check browser console for errors
3. Try manual "Save Draft" button

**Fix:**
```javascript
// Force save
if (window.unifiedDailyEntry) {
  await window.unifiedDailyEntry.saveTodaysEntries();
}
```

### Auto-calculated totals wrong?
**Check:**
1. Are detailed entries entered correctly?
2. Did you add entries in correct tabs?
3. Refresh calculations: go to Daily Summary tab

**Fix:**
```javascript
// Recalculate metrics
if (window.unifiedDailyEntry) {
  window.unifiedDailyEntry.recalculateMetrics();
}
```

### Submit fails?
**Check:**
1. Network connection
2. Google Sheets permissions
3. Sheet names match (see backend function)
4. Browser console for detailed error

**Fix:**
- Retry submit
- Check sheet names exist:
  - `Daily_Performance` or `DailyPerformance`
  - `Sales_Tracker` or `SalesTracker`
  - `Proposals_Tracker` or `ProposalsTracker`
  - `Houston_New_Start_Log` or `NewStartLog`

### Operations not seeing sales?
**Check:**
1. Did you click "Save & Submit to Ops"? (not just "Save & Add Another")
2. Is DataSync loaded? `console.log(window.DataSync)`
3. Is Operations dashboard subscribed to events?

**Fix:**
```javascript
// Force notify operations
if (window.DataSync) {
  await window.DataSync.updateDealState(
    'DEAL_' + Date.now(),
    window.DataSync.WorkflowStates.SOLD,
    saleData
  );
}
```

---

## 📋 Required Sheet Structure

### Daily_Performance Sheet Columns:
```
A: Date
B: AE Name
C: Proposals Delivered
D: PRP LOBs Proposed
E: PRP LOBs Sold
F: Total Dollars Sold
G: Next Day CONF
H: Total Dollars Proposed
I: Events Completed
J: Timestamp
```

### Sales_Tracker Sheet Columns:
```
A: Sold Date
B: Account Name
C: Service Address
D: Sales Rep
E: Lead Type
F: Service Type
G: Initial Job $
H: Maintenance Contract $
I: Total $
J: Type
K: Timestamp
```

### Proposals_Tracker Sheet Columns:
```
A: Date Delivered
B: Company Name
C: Lead Type
D: Service
E: Job Work Total
F: Termite Total
G: Contract Total
H: Grand Total
I: Sold (Yes/No)
J: Delivered (Yes/No)
K: AE
L: Timestamp
```

### Houston_New_Start_Log Sheet Columns:
```
A: Sold Date
B: Account Name
C: Service Address
D: Initial/Job Detail $
E: Initial/Job YR Merchandise
F: Maintenance Contract $
G: Type
H: Premium
I: LOBs
J: Confirmed Package
K: UAC Expires
L: Confirmed with POC
M: Ops Manager (OPS FILLS)
N: Assigned Specialist (OPS FILLS)
O: Have Been Ordered (OPS FILLS)
P: Initial/Maint Service Ordered (OPS FILLS)
Q: Customer Confirmed Month
R: (OPS FILLS)
S: POC Name/Phone
T: Special Notes
U: Sales Rep
V: Entry Timestamp
```

---

## 🎓 Training Guide

### For AEs:

**Day 1: Learn Quick Entry**
- Open Unified Daily Entry
- Practice entering daily metrics
- Save draft, close, reopen (see it persist)
- Submit at end of day

**Day 2: Add First Sale**
- Go to New Sale tab
- Fill account info (required fields)
- Fill pricing details
- Click "Save & Submit to Ops"
- Verify it appears in Daily Summary

**Day 3: Add Proposals**
- Go to Proposal tab
- Enter proposal details
- See auto-calculated grand total
- Save multiple proposals
- Check Daily Summary auto-calculated totals

**Day 4: Full Workflow**
- Start with Quick Entry metrics
- Add 2-3 sales throughout day
- Add 2-3 proposals
- Review Daily Summary
- Submit all at end of day

**Day 5: Master It**
- Use all tabs
- Verify auto-calculations
- Check Operations gets notifications
- Confirm data appears in all 4 sheets

---

## ✅ Checklist for Managers

**Setup:**
- [ ] Sheets created with correct names
- [ ] Columns match structure above
- [ ] Backend function deployed (unified-entry-backend.gs)
- [ ] Frontend script loaded (unified-daily-entry.js)
- [ ] User permissions set

**Testing:**
- [ ] AE can open modal
- [ ] Auto-save works
- [ ] Quick Entry saves
- [ ] New Sale submits to Ops
- [ ] Proposals save
- [ ] Daily Summary shows entries
- [ ] Submit syncs to all 4 sheets
- [ ] Operations sees new sales

**Training:**
- [ ] AEs trained on 4 tabs
- [ ] AEs understand auto-calculation
- [ ] AEs know when to "Submit to Ops"
- [ ] Ops trained on receiving notifications
- [ ] Managers can view all data

---

## 🚀 Next Steps

1. **Deploy Backend:**
   - Copy `unified-entry-backend.gs` to your Apps Script project
   - Deploy as web app with correct permissions

2. **Test with One AE:**
   - Have one AE test full workflow
   - Verify data appears in all 4 sheets
   - Confirm Operations gets notifications

3. **Roll Out to Team:**
   - Train all AEs on 4-tab system
   - Emphasize auto-calculation benefits
   - Show how it replaces 4 separate entries

4. **Monitor & Support:**
   - Check for submission errors
   - Verify data accuracy
   - Gather feedback for improvements

---

## 📞 Support

**Common Questions:**

**Q: Do I still need to fill out the Google Form?**
A: No! Quick Entry tab replaces it.

**Q: Do I still need to update my Sales Tracker?**
A: No! New Sale tab replaces it.

**Q: What if Operations needs to fill their columns?**
A: They see your entries in Houston New Start Log with their columns empty (M,N,O,P,R). They fill those columns directly in the sheet or via Operations dashboard.

**Q: Can I edit entries after submitting?**
A: Not currently. Double-check before clicking "Submit All". (Future feature: edit/delete entries)

**Q: What if I make a mistake?**
A: Before submitting, you can remove entries using the ✕ button in Daily Summary. After submitting, contact your manager to edit the sheet directly.

---

## 🎉 Summary

**One Entry Point. Four Systems. Zero Duplication.**

The Unified Daily Entry System gives AEs:
- ⚡ **Faster** - One form instead of four
- 🎯 **Smarter** - Auto-calculated totals
- 💪 **Reliable** - Auto-save, never lose work
- 🔄 **Connected** - Real-time sync to Operations

**Result:** AEs spend less time on data entry, more time selling! 🚀
