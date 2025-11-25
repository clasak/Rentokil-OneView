/**
 * ===============================================================================
 * UNIFIED DAILY ENTRY SUBMISSION
 * ===============================================================================
 * Handles submissions from the Unified Daily Entry system.
 * Syncs data to all 4 tracking systems:
 * - Daily Performance Form
 * - Sales Tracker
 * - Proposals Tracker
 * - Houston New Start Log (AE columns)
 */

/**
 * Submit unified daily entry data to all systems
 * @param {Object} data Submission data from frontend
 * @returns {Object} Result object with success status
 */
function submitUnifiedDailyEntry(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = new Date();

    // Extract data
    const date = data.date;
    const ae = data.ae;
    const aeName = data.aeName;
    const metrics = data.metrics;
    const salesEntries = data.salesEntries || [];
    const proposalEntries = data.proposalEntries || [];

    // 1. Write to Daily Performance Form sheet
    const dailyPerfSheet = ss.getSheetByName('Daily_Performance') || ss.getSheetByName('DailyPerformance');
    if (dailyPerfSheet) {
      dailyPerfSheet.appendRow([
        new Date(date),
        aeName || ae,
        metrics.proposalsDelivered || 0,
        metrics.prpLobsProposed || 0,
        metrics.prpLobsSold || 0,
        metrics.totalDollarsSold || 0,
        metrics.nextDayConf || 0,
        metrics.totalDollarsProposed || 0,
        metrics.eventsCompleted || 0,
        timestamp
      ]);
    }

    // 2. Write to Sales Tracker sheet (one row per sale)
    const salesTrackerSheet = ss.getSheetByName('Sales_Tracker') || ss.getSheetByName('SalesTracker');
    if (salesTrackerSheet && salesEntries && salesEntries.length > 0) {
      for (var i = 0; i < salesEntries.length; i++) {
        const entry = salesEntries[i];
        const saleData = entry.data;
        salesTrackerSheet.appendRow([
          new Date(saleData.soldDate),
          saleData.accountName || '',
          saleData.serviceAddress || '',
          saleData.salesReps || aeName || ae,
          saleData.leadType || '',
          saleData.serviceType || '',
          saleData.initialJob || 0,
          saleData.maintenanceContract || 0,
          (saleData.initialJob || 0) + (saleData.maintenanceContract || 0), // Total
          saleData.type || '',
          timestamp
        ]);
      }
    }

    // 3. Write to Proposals Tracker sheet (one row per proposal)
    const proposalsSheet = ss.getSheetByName('Proposals_Tracker') || ss.getSheetByName('ProposalsTracker');
    if (proposalsSheet && proposalEntries && proposalEntries.length > 0) {
      for (var j = 0; j < proposalEntries.length; j++) {
        const entry = proposalEntries[j];
        const propData = entry.data;
        proposalsSheet.appendRow([
          new Date(propData.date),
          propData.companyName || '',
          propData.leadType || '',
          propData.service || '',
          propData.jobWorkTotal || 0,
          propData.termiteTotal || 0,
          propData.contractTotal || 0,
          propData.grandTotal || 0,
          propData.sold ? 'Yes' : 'No',
          propData.delivered ? 'Yes' : 'No',
          aeName || ae,
          timestamp
        ]);
      }
    }

    // 4. Write to Houston New Start Log (AE portion - columns A-K)
    const newStartSheet = ss.getSheetByName('Houston_New_Start_Log') || ss.getSheetByName('NewStartLog');
    if (newStartSheet && salesEntries && salesEntries.length > 0) {
      for (var k = 0; k < salesEntries.length; k++) {
        const entry = salesEntries[k];
        const saleData = entry.data;

        // Only fill AE columns (A-K), leaving Ops columns (M,N,O,P,R) empty for Operations to fill
        const row = [
          new Date(saleData.soldDate),                    // A: Sold Date
          saleData.accountName || '',                     // B: Account Name
          saleData.serviceAddress || '',                  // C: Service Address
          saleData.initialJob || 0,                       // D: Initial/Job Detail $
          saleData.initialJobYr || 0,                     // E: Initial/Job YR Merchandise
          saleData.maintenanceContract || 0,              // F: Maintenance Contract $ PY MFR
          saleData.type || '',                            // G: Type
          saleData.premium || 0,                          // H: Premium
          saleData.lobs || '',                            // I: LOBs
          saleData.confirmedPackage || '',                // J: Confirmed Package
          saleData.uacExpires || '',                      // K: UAC Expires
          saleData.confirmedWithPoc || '',                // L: Confirmed with POC
          '',                                             // M: Ops Manager (Ops fills)
          '',                                             // N: Assigned Specialist (Ops fills)
          '',                                             // O: Have Been Ordered (Ops fills)
          '',                                             // P: Initial/Maint Service Ordered (Ops fills)
          saleData.customerConfirmedMonth || '',          // Q: Customer Confirmed Month
          '',                                             // R: (Ops fills)
          saleData.pocInfo || '',                         // S: POC Name/Phone
          saleData.specialNotes || '',                    // T: Special Notes
          aeName || ae,                                   // U: Sales Rep
          timestamp                                       // V: Entry Timestamp
        ];

        newStartSheet.appendRow(row);
      }
    }

    // Log success
    Logger.log('[UnifiedDailyEntry] Successfully submitted for ' + aeName + ' (' + ae + ')');
    Logger.log('  - ' + salesEntries.length + ' sales entries');
    Logger.log('  - ' + proposalEntries.length + ' proposal entries');

    return {
      success: true,
      message: 'All entries submitted successfully',
      timestamp: timestamp.toISOString(),
      salesCount: salesEntries.length,
      proposalsCount: proposalEntries.length
    };

  } catch (error) {
    Logger.log('[UnifiedDailyEntry] Error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: 'Failed to submit entries'
    };
  }
}

/**
 * Get today's entries for a specific AE (for loading cached data)
 * @param {string} aeEmail AE email address
 * @returns {Object} Entries data
 */
function getTodaysEntries(aeEmail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const today = new Date().toISOString().split('T')[0];

    const result = {
      salesEntries: [],
      proposalEntries: []
    };

    // Get sales from Sales Tracker
    const salesTrackerSheet = ss.getSheetByName('Sales_Tracker') || ss.getSheetByName('SalesTracker');
    if (salesTrackerSheet) {
      const data = salesTrackerSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      for (var i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowDate = row[0] ? new Date(row[0]).toISOString().split('T')[0] : null;
        const rowAE = row[3]; // Sales Rep column

        if (rowDate === today && rowAE === aeEmail) {
          result.salesEntries.push({
            accountName: row[1],
            serviceAddress: row[2],
            leadType: row[4],
            serviceType: row[5],
            initialJob: row[6],
            maintenanceContract: row[7]
          });
        }
      }
    }

    // Get proposals from Proposals Tracker
    const proposalsSheet = ss.getSheetByName('Proposals_Tracker') || ss.getSheetByName('ProposalsTracker');
    if (proposalsSheet) {
      const data = proposalsSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      for (var j = 0; j < rows.length; j++) {
        const row = rows[j];
        const rowDate = row[0] ? new Date(row[0]).toISOString().split('T')[0] : null;
        const rowAE = row[10]; // AE column

        if (rowDate === today && rowAE === aeEmail) {
          result.proposalEntries.push({
            companyName: row[1],
            leadType: row[2],
            service: row[3],
            grandTotal: row[7],
            sold: row[8] === 'Yes',
            delivered: row[9] === 'Yes'
          });
        }
      }
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    Logger.log('[UnifiedDailyEntry] Error getting entries: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
