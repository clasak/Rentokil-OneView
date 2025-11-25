/**
 * ===============================================================================
 * UNIFIED DAILY ENTRY SYSTEM
 * ===============================================================================
 * Single entry point that replaces:
 * - Daily Performance Form
 * - Sales Tracker
 * - Proposals Tracker
 * - Houston New Start Log (AE portion)
 *
 * Auto-calculates totals and metrics, hands off to Operations seamlessly
 */

(function() {
  'use strict';

  //=============================================================================
  // UNIFIED DAILY ENTRY
  //=============================================================================

  class UnifiedDailyEntry {
    constructor() {
      this.entries = [];
      this.dailyMetrics = {
        proposalsDelivered: 0,
        prpLobsProposed: 0,
        prpLobsSold: 0,
        totalDollarsSold: 0,
        nextDayConf: 0,
        totalDollarsProposed: 0,
        eventsCompleted: 0
      };

      this.init();
    }

    async init() {
      console.log('[UnifiedDailyEntry] Initializing...');

      // Load any existing entries for today
      await this.loadTodaysEntries();

      // Auto-calculate metrics from entries
      this.recalculateMetrics();
    }

    /**
     * Open unified daily entry form
     */
    openDailyEntryForm() {
      const modal = this.createDailyEntryModal();
      document.body.appendChild(modal);

      // Attach listeners
      this.attachModalListeners();

      // Pre-populate with user info
      this.prefillUserInfo();
    }

    /**
     * Create daily entry modal
     */
    createDailyEntryModal() {
      const modal = document.createElement('div');
      modal.id = 'unifiedDailyEntryModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';

      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-brand to-brand-color-dark px-6 py-4 flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-white">Daily Entry - ${new Date().toLocaleDateString()}</h2>
              <p class="text-sm text-white/80 mt-1">Single entry point for all daily tracking</p>
            </div>
            <button id="closeDailyEntry" class="text-white hover:bg-white/10 p-2 rounded">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tab Navigation -->
          <div class="border-b bg-gray-50 px-6">
            <nav class="flex gap-4">
              <button data-tab="quick-entry" class="tab-btn active px-4 py-3 border-b-2 border-brand text-brand font-medium">
                Quick Entry
              </button>
              <button data-tab="new-sale" class="tab-btn px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800">
                New Sale/Start Log
              </button>
              <button data-tab="proposal" class="tab-btn px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800">
                Proposal Delivered
              </button>
              <button data-tab="daily-summary" class="tab-btn px-4 py-3 border-b-2 border-transparent text-gray-600 hover:text-gray-800">
                Daily Summary
              </button>
            </nav>
          </div>

          <!-- Content Area -->
          <div class="flex-1 overflow-auto p-6">
            ${this.getQuickEntryContent()}
            ${this.getNewSaleContent()}
            ${this.getProposalContent()}
            ${this.getDailySummaryContent()}
          </div>

          <!-- Footer -->
          <div class="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div class="text-sm text-gray-600">
              <span id="entriesCount">0</span> entries today •
              <span id="autoSaveStatus" class="text-green-600">Auto-saved</span>
            </div>
            <div class="flex gap-3">
              <button id="saveDraft" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Save Draft
              </button>
              <button id="submitDaily" class="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-color-light font-medium">
                Submit & Sync
              </button>
            </div>
          </div>
        </div>
      `;

      return modal;
    }

    /**
     * Quick Entry Tab - For fast daily metrics
     */
    getQuickEntryContent() {
      return `
        <div id="tab-quick-entry" class="tab-content">
          <div class="max-w-4xl">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Quick Daily Metrics</h3>
            <p class="text-sm text-gray-600 mb-6">Enter your daily numbers - we'll auto-calculate totals from your detailed entries below</p>

            <div class="grid grid-cols-2 gap-6">
              <!-- Left Column -->
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Proposals Delivered Today
                    <span class="text-xs text-gray-500 ml-2">(Auto-calculated: <span id="autoProposalsCount">0</span>)</span>
                  </label>
                  <input type="number" id="quickProposalsDelivered" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    PRP LOBs on Proposals Delivered
                    <span class="text-xs text-gray-500 ml-2">(Crawling, Rodent, Fly, Bird, Drain, etc.)</span>
                  </label>
                  <input type="number" id="quickPrpLobsProposed" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    PRP LOBs Sold Today
                    <span class="text-xs text-gray-500 ml-2">(Included on signed proposals)</span>
                  </label>
                  <input type="number" id="quickPrpLobsSold" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Total $ Sold (SLD) Today
                    <span class="text-xs text-gray-500 ml-2">(Auto: $<span id="autoTotalSold">0</span>)</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                    <input type="number" id="quickTotalDollarsSold" min="0" step="0.01"
                           class="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                  </div>
                </div>
              </div>

              <!-- Right Column -->
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Next Day CONF
                    <span class="text-xs text-gray-500 ml-2">(Proposals to be delivered - Monday if reporting Friday)</span>
                  </label>
                  <input type="number" id="quickNextDayConf" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Total $ Proposed Today
                    <span class="text-xs text-gray-500 ml-2">(Auto: $<span id="autoTotalProposed">0</span>)</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                    <input type="number" id="quickTotalDollarsProposed" min="0" step="0.01"
                           class="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Events Completed Today
                    <span class="text-xs text-gray-500 ml-2">(First time appoint, Site Assessment, Proposals, In Person Follow-up)</span>
                  </label>
                  <input type="number" id="quickEventsCompleted" min="0"
                         class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-lg" />
                </div>

                <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mt-4">
                  <div class="text-sm text-blue-700 font-medium mb-2">💡 Pro Tip</div>
                  <div class="text-xs text-blue-600">
                    Add your individual sales and proposals in the other tabs, and these totals will auto-calculate!
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="mt-8 pt-6 border-t">
              <h4 class="text-md font-semibold text-gray-700 mb-4">Quick Actions</h4>
              <div class="flex gap-3">
                <button onclick="window.unifiedDailyEntry.switchTab('new-sale')"
                        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                  </svg>
                  Add New Sale
                </button>
                <button onclick="window.unifiedDailyEntry.switchTab('proposal')"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
                  </svg>
                  Add Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * New Sale Tab - Replaces Sales Tracker + Houston New Start Log (AE portion)
     */
    getNewSaleContent() {
      return `
        <div id="tab-new-sale" class="tab-content hidden">
          <div class="max-w-6xl">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h3 class="text-lg font-bold text-gray-800">New Sale / Start Log Entry</h3>
                <p class="text-sm text-gray-600 mt-1">This replaces your Sales Tracker and fills the Houston New Start Log</p>
              </div>
              <button id="importFromSalesforce" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
                📄 Import from Salesforce
              </button>
            </div>

            <!-- Sales Entry Form -->
            <div class="space-y-6">
              <!-- Basic Info -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="font-semibold text-gray-800 mb-4">Account Information</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Sold Date *</label>
                    <input type="date" id="saleSoldDate" required
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           value="${new Date().toISOString().split('T')[0]}" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                    <input type="text" id="saleAccountName" required
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="e.g., ACME Corp" />
                  </div>
                  <div class="col-span-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Service Address *</label>
                    <input type="text" id="saleServiceAddress" required
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="Full service address" />
                  </div>
                </div>
              </div>

              <!-- Sales Details -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="font-semibold text-gray-800 mb-4">Sales Details</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Sales Rep(s) Involved</label>
                    <input type="text" id="saleSalesReps"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="Your name (auto-filled)"
                           readonly />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                    <select id="saleLeadType" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                      <option value="In Bound">In Bound</option>
                      <option value="Creative">Creative</option>
                      <option value="Referral">Referral</option>
                      <option value="Existing Customer">Existing Customer</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                    <select id="saleServiceType" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                      <option value="GPC (Comm)">GPC (Commercial)</option>
                      <option value="Rodent Control">Rodent Control</option>
                      <option value="Termite (Comm)">Termite (Commercial)</option>
                      <option value="Mass Trapping (Bird)">Mass Trapping (Bird)</option>
                      <option value="Bed Bug">Bed Bug</option>
                      <option value="Wildlife">Wildlife</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Pricing -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="font-semibold text-gray-800 mb-4">Pricing & Contract</h4>
                <div class="grid grid-cols-4 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Initial / Job Detail $</label>
                    <input type="number" id="saleInitialJob" min="0" step="0.01"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Initial / Job YR Merchandise</label>
                    <input type="number" id="saleInitialJobYr" min="0" step="0.01"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Maintenance (CONTRACT) $ PY MFR</label>
                    <input type="number" id="saleMaintenanceContract" min="0" step="0.01"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Type (Contract/Job)</label>
                    <select id="saleType" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                      <option value="Contract">Contract</option>
                      <option value="Job">Job</option>
                      <option value="PO">PO</option>
                      <option value="Donna">Donna</option>
                      <option value="April">April</option>
                      <option value="Cody">Cody</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Premium (OO-Job $)</label>
                    <input type="number" id="salePremium" min="0" step="0.01"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Log Date</label>
                    <input type="date" id="saleLogDate"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">LOBs # APCA +14LOBs</label>
                    <input type="text" id="saleLobs"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="e.g., n, y, n" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Confirmed Package</label>
                    <select id="saleConfirmedPackage" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48 wk">48 wk</option>
                      <option value="contract">contract</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- UAC & Customer Info -->
              <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="font-semibold text-gray-800 mb-4">UAC & Customer Details</h4>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">UAC Expires</label>
                    <select id="saleUacExpires" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                      <option value="y">Yes</option>
                      <option value="n">No</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Confirmed with POC (every past 2 weeks)</label>
                    <input type="text" id="saleConfirmedWithPoc"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="Details" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Customer Confirmed Month</label>
                    <input type="text" id="saleCustomerConfirmedMonth"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="Month" />
                  </div>
                  <div class="col-span-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">POC Name/Phone#</label>
                    <input type="text" id="salePocInfo"
                           class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                           placeholder="Primary contact name and phone number" />
                  </div>
                  <div class="col-span-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Special Notes / Equipment Overview</label>
                    <textarea id="saleSpecialNotes" rows="3"
                              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                              placeholder="Any special instructions, equipment needed, etc."></textarea>
                  </div>
                </div>
              </div>

              <!-- Operations Section (Read-Only for AE) -->
              <div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                <div class="flex items-start gap-3 mb-4">
                  <svg class="w-6 h-6 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                  </svg>
                  <div>
                    <h4 class="font-semibold text-gray-800">Operations Will Fill These Fields</h4>
                    <p class="text-sm text-gray-600 mt-1">These will appear in Operations dashboard after you submit</p>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-4 opacity-50">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Operations Manager</label>
                    <input type="text" disabled class="w-full px-3 py-2 border rounded-md bg-gray-100" placeholder="Ops fills" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Assigned Specialist</label>
                    <input type="text" disabled class="w-full px-3 py-2 border rounded-md bg-gray-100" placeholder="Ops fills" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Have Been Ordered</label>
                    <input type="text" disabled class="w-full px-3 py-2 border rounded-md bg-gray-100" placeholder="Ops fills" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Initial/Maint Service Ordered</label>
                    <input type="text" disabled class="w-full px-3 py-2 border rounded-md bg-gray-100" placeholder="Ops fills" />
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-between items-center pt-6 border-t">
                <button onclick="window.unifiedDailyEntry.clearSaleForm()"
                        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Clear Form
                </button>
                <div class="flex gap-3">
                  <button onclick="window.unifiedDailyEntry.saveSaleEntry(false)"
                          class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    Save & Add Another
                  </button>
                  <button onclick="window.unifiedDailyEntry.saveSaleEntry(true)"
                          class="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-color-light">
                    Save & Submit to Ops
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Proposal Tab - Replaces Proposals Tracker
     */
    getProposalContent() {
      return `
        <div id="tab-proposal" class="tab-content hidden">
          <div class="max-w-4xl">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h3 class="text-lg font-bold text-gray-800">Proposal Delivered</h3>
                <p class="text-sm text-gray-600 mt-1">Log proposals you delivered today</p>
              </div>
            </div>

            <div class="space-y-6">
              <!-- Basic Info -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date Delivered *</label>
                  <input type="date" id="propDate" required
                         class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                         value="${new Date().toISOString().split('T')[0]}" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" id="propCompanyName" required
                         class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand"
                         placeholder="Company name" />
                </div>
              </div>

              <!-- Service Details -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Lead Type</label>
                  <select id="propLeadType" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                    <option value="In Bound">In Bound</option>
                    <option value="Creative">Creative</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <select id="propService" class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand">
                    <option value="GPC (Comm)">GPC (Commercial)</option>
                    <option value="Rodent Control">Rodent Control</option>
                    <option value="Termite (Comm)">Termite (Commercial)</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              <!-- Pricing -->
              <div class="grid grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Job Work Total</label>
                  <input type="number" id="propJobWorkTotal" min="0" step="0.01"
                         class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Termite Total</label>
                  <input type="number" id="propTermiteTotal" min="0" step="0.01"
                         class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Contract Total</label>
                  <input type="number" id="propContractTotal" min="0" step="0.01"
                         class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Grand Total</label>
                  <input type="number" id="propGrandTotal" min="0" step="0.01" readonly
                         class="w-full px-3 py-2 border rounded-md bg-gray-50 font-semibold" />
                </div>
              </div>

              <!-- Status Checkboxes -->
              <div class="flex gap-6">
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="propSold" class="w-4 h-4 text-brand rounded" />
                  <span class="text-sm font-medium text-gray-700">Sold</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="propDelivered" class="w-4 h-4 text-brand rounded" checked />
                  <span class="text-sm font-medium text-gray-700">Delivered</span>
                </label>
              </div>

              <!-- Action Buttons -->
              <div class="flex justify-between items-center pt-6 border-t">
                <button onclick="window.unifiedDailyEntry.clearProposalForm()"
                        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Clear Form
                </button>
                <div class="flex gap-3">
                  <button onclick="window.unifiedDailyEntry.saveProposalEntry(false)"
                          class="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    Save & Add Another
                  </button>
                  <button onclick="window.unifiedDailyEntry.saveProposalEntry(true)"
                          class="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-color-light">
                    Save Proposal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Daily Summary Tab - Shows all entries and calculated metrics
     */
    getDailySummaryContent() {
      return `
        <div id="tab-daily-summary" class="tab-content hidden">
          <div class="max-w-6xl">
            <h3 class="text-lg font-bold text-gray-800 mb-6">Today's Summary - ${new Date().toLocaleDateString()}</h3>

            <!-- Metrics Cards -->
            <div class="grid grid-cols-4 gap-4 mb-8">
              <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div class="text-sm text-blue-700 font-medium">Proposals Delivered</div>
                <div class="text-3xl font-bold text-blue-900 mt-2" id="summaryProposalsDelivered">0</div>
              </div>
              <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div class="text-sm text-green-700 font-medium">Total $ Sold</div>
                <div class="text-3xl font-bold text-green-900 mt-2" id="summaryTotalSold">$0</div>
              </div>
              <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div class="text-sm text-purple-700 font-medium">Total $ Proposed</div>
                <div class="text-3xl font-bold text-purple-900 mt-2" id="summaryTotalProposed">$0</div>
              </div>
              <div class="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div class="text-sm text-orange-700 font-medium">Events Completed</div>
                <div class="text-3xl font-bold text-orange-900 mt-2" id="summaryEventsCompleted">0</div>
              </div>
            </div>

            <!-- Sales Entries -->
            <div class="mb-8">
              <h4 class="font-semibold text-gray-800 mb-4">Sales Entries (<span id="salesEntriesCount">0</span>)</h4>
              <div id="salesEntriesList" class="space-y-2">
                <div class="text-sm text-gray-500 text-center py-8">No sales entries yet</div>
              </div>
            </div>

            <!-- Proposal Entries -->
            <div class="mb-8">
              <h4 class="font-semibold text-gray-800 mb-4">Proposal Entries (<span id="proposalEntriesCount">0</span>)</h4>
              <div id="proposalEntriesList" class="space-y-2">
                <div class="text-sm text-gray-500 text-center py-8">No proposal entries yet</div>
              </div>
            </div>

            <!-- Submit Summary -->
            <div class="bg-gradient-to-r from-brand/10 to-brand-color-dark/10 border-2 border-brand rounded-lg p-6">
              <h4 class="font-semibold text-gray-800 mb-3">Ready to Submit?</h4>
              <p class="text-sm text-gray-600 mb-4">
                This will sync all your entries to:
                <ul class="list-disc ml-6 mt-2">
                  <li>Daily Performance Form (Google Sheets)</li>
                  <li>Sales Tracker (your individual tracker)</li>
                  <li>Proposals Tracker (proposals sheet)</li>
                  <li>Houston New Start Log (operations will see their portion)</li>
                  <li>Operations Dashboard (new sales will appear in their queue)</li>
                </ul>
              </p>
              <button id="submitAllDaily" onclick="window.unifiedDailyEntry.submitAllEntries()"
                      class="px-8 py-3 bg-brand text-white rounded-lg hover:bg-brand-color-light font-semibold text-lg">
                Submit All & Sync to All Systems
              </button>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Attach modal event listeners
     */
    attachModalListeners() {
      // Close button
      document.getElementById('closeDailyEntry')?.addEventListener('click', () => {
        this.closeDailyEntry();
      });

      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = e.target.dataset.tab;
          this.switchTab(tab);
        });
      });

      // Auto-calculate grand total for proposals
      ['propJobWorkTotal', 'propTermiteTotal', 'propContractTotal'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
          this.calculateProposalTotal();
        });
      });

      // Auto-save on input changes
      this.setupAutoSave();
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
      // Update buttons
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-brand', 'text-brand');
        btn.classList.add('border-transparent', 'text-gray-600');
      });
      document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active', 'border-brand', 'text-brand');
      document.querySelector(`[data-tab="${tabName}"]`)?.classList.remove('border-transparent', 'text-gray-600');

      // Update content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });
      document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
    }

    /**
     * Pre-fill user info
     */
    prefillUserInfo() {
      const user = window.currentUser;
      if (!user) return;

      // Fill sales rep name
      const salesRepField = document.getElementById('saleSalesReps');
      if (salesRepField) salesRepField.value = user.name;
    }

    /**
     * Calculate proposal total
     */
    calculateProposalTotal() {
      const jobWork = Number(document.getElementById('propJobWorkTotal')?.value || 0);
      const termite = Number(document.getElementById('propTermiteTotal')?.value || 0);
      const contract = Number(document.getElementById('propContractTotal')?.value || 0);

      const total = jobWork + termite + contract;

      const grandTotalField = document.getElementById('propGrandTotal');
      if (grandTotalField) grandTotalField.value = total.toFixed(2);
    }

    /**
     * Save sale entry
     */
    async saveSaleEntry(submitToOps) {
      // Collect form data
      const saleData = {
        soldDate: document.getElementById('saleSoldDate')?.value,
        accountName: document.getElementById('saleAccountName')?.value,
        serviceAddress: document.getElementById('saleServiceAddress')?.value,
        salesReps: document.getElementById('saleSalesReps')?.value,
        leadType: document.getElementById('saleLeadType')?.value,
        serviceType: document.getElementById('saleServiceType')?.value,
        initialJob: Number(document.getElementById('saleInitialJob')?.value || 0),
        initialJobYr: Number(document.getElementById('saleInitialJobYr')?.value || 0),
        maintenanceContract: Number(document.getElementById('saleMaintenanceContract')?.value || 0),
        type: document.getElementById('saleType')?.value,
        premium: Number(document.getElementById('salePremium')?.value || 0),
        logDate: document.getElementById('saleLogDate')?.value,
        lobs: document.getElementById('saleLobs')?.value,
        confirmedPackage: document.getElementById('saleConfirmedPackage')?.value,
        uacExpires: document.getElementById('saleUacExpires')?.value,
        confirmedWithPoc: document.getElementById('saleConfirmedWithPoc')?.value,
        customerConfirmedMonth: document.getElementById('saleCustomerConfirmedMonth')?.value,
        pocInfo: document.getElementById('salePocInfo')?.value,
        specialNotes: document.getElementById('saleSpecialNotes')?.value,
        timestamp: new Date().toISOString(),
        ae: window.currentUser?.email,
        status: submitToOps ? 'submitted_to_ops' : 'draft'
      };

      // Validate
      if (!saleData.accountName || !saleData.serviceAddress) {
        window.DataValidation?.showToast('Please fill required fields', 'error');
        return;
      }

      // Add to entries
      this.entries.push({
        type: 'sale',
        data: saleData
      });

      // Save to backend
      await this.saveTodaysEntries();

      // If submitting to ops, move to sold state and notify ops
      if (submitToOps) {
        await window.DataSync?.updateDealState(
          `DEAL_${Date.now()}`,
          window.DataSync.WorkflowStates.SOLD,
          saleData
        );

        window.DataValidation?.showToast('Sale submitted to Operations!', 'success');
      } else {
        window.DataValidation?.showToast('Sale entry saved!', 'success');
      }

      // Recalculate metrics
      this.recalculateMetrics();

      // Clear form if not adding another
      if (submitToOps) {
        this.clearSaleForm();
        this.switchTab('daily-summary');
      }
    }

    /**
     * Save proposal entry
     */
    async saveProposalEntry(isDone) {
      const proposalData = {
        date: document.getElementById('propDate')?.value,
        companyName: document.getElementById('propCompanyName')?.value,
        leadType: document.getElementById('propLeadType')?.value,
        service: document.getElementById('propService')?.value,
        jobWorkTotal: Number(document.getElementById('propJobWorkTotal')?.value || 0),
        termiteTotal: Number(document.getElementById('propTermiteTotal')?.value || 0),
        contractTotal: Number(document.getElementById('propContractTotal')?.value || 0),
        grandTotal: Number(document.getElementById('propGrandTotal')?.value || 0),
        sold: document.getElementById('propSold')?.checked,
        delivered: document.getElementById('propDelivered')?.checked,
        timestamp: new Date().toISOString(),
        ae: window.currentUser?.email
      };

      // Validate
      if (!proposalData.companyName) {
        window.DataValidation?.showToast('Please enter company name', 'error');
        return;
      }

      // Add to entries
      this.entries.push({
        type: 'proposal',
        data: proposalData
      });

      // Save
      await this.saveTodaysEntries();

      window.DataValidation?.showToast('Proposal entry saved!', 'success');

      // Recalculate
      this.recalculateMetrics();

      // Clear form if done
      if (isDone) {
        this.clearProposalForm();
        this.switchTab('daily-summary');
      }
    }

    /**
     * Recalculate daily metrics from entries
     */
    recalculateMetrics() {
      const sales = this.entries.filter(e => e.type === 'sale');
      const proposals = this.entries.filter(e => e.type === 'proposal');

      // Calculate totals
      this.dailyMetrics.proposalsDelivered = proposals.length;
      this.dailyMetrics.totalDollarsSold = sales.reduce((sum, s) => {
        return sum + (s.data.initialJob || 0) + (s.data.maintenanceContract || 0);
      }, 0);
      this.dailyMetrics.totalDollarsProposed = proposals.reduce((sum, p) => {
        return sum + (p.data.grandTotal || 0);
      }, 0);

      // Update UI
      this.updateSummaryUI();
    }

    /**
     * Update summary UI
     */
    updateSummaryUI() {
      // Auto-calculated displays
      document.getElementById('autoProposalsCount').textContent = this.dailyMetrics.proposalsDelivered;
      document.getElementById('autoTotalSold').textContent = this.dailyMetrics.totalDollarsSold.toLocaleString();
      document.getElementById('autoTotalProposed').textContent = this.dailyMetrics.totalDollarsProposed.toLocaleString();

      // Summary tab
      document.getElementById('summaryProposalsDelivered').textContent = this.dailyMetrics.proposalsDelivered;
      document.getElementById('summaryTotalSold').textContent = '$' + this.dailyMetrics.totalDollarsSold.toLocaleString();
      document.getElementById('summaryTotalProposed').textContent = '$' + this.dailyMetrics.totalDollarsProposed.toLocaleString();
      document.getElementById('summaryEventsCompleted').textContent = this.dailyMetrics.eventsCompleted;

      // Entry counts
      document.getElementById('entriesCount').textContent = this.entries.length;
      document.getElementById('salesEntriesCount').textContent = this.entries.filter(e => e.type === 'sale').length;
      document.getElementById('proposalEntriesCount').textContent = this.entries.filter(e => e.type === 'proposal').length;

      // Render entry lists
      this.renderEntryLists();
    }

    /**
     * Render entry lists
     */
    renderEntryLists() {
      // Sales list
      const salesList = document.getElementById('salesEntriesList');
      const sales = this.entries.filter(e => e.type === 'sale');

      if (sales.length === 0) {
        salesList.innerHTML = '<div class="text-sm text-gray-500 text-center py-8">No sales entries yet</div>';
      } else {
        salesList.innerHTML = sales.map((entry, idx) => `
          <div class="bg-white border-2 border-gray-200 rounded-lg p-4 flex justify-between items-start">
            <div>
              <div class="font-semibold text-gray-800">${entry.data.accountName}</div>
              <div class="text-sm text-gray-600 mt-1">
                ${entry.data.serviceType} • $${(entry.data.initialJob + entry.data.maintenanceContract).toLocaleString()}
              </div>
              <div class="text-xs text-gray-500 mt-1">${entry.data.serviceAddress}</div>
            </div>
            <div class="flex gap-2">
              <span class="px-2 py-1 text-xs rounded ${entry.data.status === 'submitted_to_ops' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                ${entry.data.status === 'submitted_to_ops' ? 'Submitted to Ops' : 'Draft'}
              </span>
              <button onclick="window.unifiedDailyEntry.removeEntry(${idx})"
                      class="text-red-600 hover:text-red-800 text-sm">
                ✕
              </button>
            </div>
          </div>
        `).join('');
      }

      // Proposals list
      const proposalsList = document.getElementById('proposalEntriesList');
      const proposals = this.entries.filter(e => e.type === 'proposal');

      if (proposals.length === 0) {
        proposalsList.innerHTML = '<div class="text-sm text-gray-500 text-center py-8">No proposal entries yet</div>';
      } else {
        proposalsList.innerHTML = proposals.map((entry, idx) => `
          <div class="bg-white border-2 border-gray-200 rounded-lg p-4 flex justify-between items-start">
            <div>
              <div class="font-semibold text-gray-800">${entry.data.companyName}</div>
              <div class="text-sm text-gray-600 mt-1">
                ${entry.data.service} • $${entry.data.grandTotal.toLocaleString()}
              </div>
            </div>
            <div class="flex gap-2">
              ${entry.data.sold ? '<span class="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Sold</span>' : ''}
              ${entry.data.delivered ? '<span class="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Delivered</span>' : ''}
              <button onclick="window.unifiedDailyEntry.removeEntry(${idx})"
                      class="text-red-600 hover:text-red-800 text-sm">
                ✕
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    /**
     * Remove entry
     */
    removeEntry(index) {
      this.entries.splice(index, 1);
      this.recalculateMetrics();
      this.saveTodaysEntries();
    }

    /**
     * Submit all entries
     */
    async submitAllEntries() {
      // Get quick entry metrics
      const quickMetrics = {
        proposalsDelivered: Number(document.getElementById('quickProposalsDelivered')?.value || this.dailyMetrics.proposalsDelivered),
        prpLobsProposed: Number(document.getElementById('quickPrpLobsProposed')?.value || 0),
        prpLobsSold: Number(document.getElementById('quickPrpLobsSold')?.value || 0),
        totalDollarsSold: Number(document.getElementById('quickTotalDollarsSold')?.value || this.dailyMetrics.totalDollarsSold),
        nextDayConf: Number(document.getElementById('quickNextDayConf')?.value || 0),
        totalDollarsProposed: Number(document.getElementById('quickTotalDollarsProposed')?.value || this.dailyMetrics.totalDollarsProposed),
        eventsCompleted: Number(document.getElementById('quickEventsCompleted')?.value || 0)
      };

      const submissionData = {
        date: new Date().toISOString(),
        ae: window.currentUser?.email,
        aeName: window.currentUser?.name,
        metrics: quickMetrics,
        salesEntries: this.entries.filter(e => e.type === 'sale'),
        proposalEntries: this.entries.filter(e => e.type === 'proposal')
      };

      try {
        // Submit to backend
        const result = await this.syncToAllSystems(submissionData);

        if (result.success) {
          window.DataValidation?.showToast('All entries submitted successfully!', 'success');

          // Clear entries
          this.entries = [];
          this.recalculateMetrics();

          // Close modal
          setTimeout(() => this.closeDailyEntry(), 1500);

          // Refresh dashboard
          if (window.refreshDashboard) {
            window.refreshDashboard();
          }
        }
      } catch (error) {
        console.error('[UnifiedDailyEntry] Submission error:', error);
        window.DataValidation?.showToast('Error submitting entries: ' + error.message, 'error');
      }
    }

    /**
     * Sync to all systems
     */
    async syncToAllSystems(data) {
      if (typeof google !== 'undefined' && google.script?.run) {
        return new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .submitUnifiedDailyEntry(data);
        });
      } else {
        // Mock success
        console.log('[UnifiedDailyEntry] Mock sync:', data);
        return { success: true, mock: true };
      }
    }

    /**
     * Save today's entries to cache/backend
     */
    async saveTodaysEntries() {
      const cacheKey = `daily_entries_${new Date().toISOString().split('T')[0]}_${window.currentUser?.email}`;

      const data = {
        date: new Date().toISOString(),
        entries: this.entries,
        metrics: this.dailyMetrics
      };

      // Save to cache
      if (window.CacheLayer) {
        window.CacheLayer.set(cacheKey, data, { persistent: true });
      }

      // Update auto-save status
      const statusEl = document.getElementById('autoSaveStatus');
      if (statusEl) {
        statusEl.textContent = 'Auto-saved';
        statusEl.className = 'text-green-600';
      }
    }

    /**
     * Load today's entries from cache
     */
    async loadTodaysEntries() {
      const cacheKey = `daily_entries_${new Date().toISOString().split('T')[0]}_${window.currentUser?.email}`;

      if (window.CacheLayer) {
        const data = window.CacheLayer.get(cacheKey);

        if (data) {
          this.entries = data.entries || [];
          this.dailyMetrics = data.metrics || this.dailyMetrics;

          console.log('[UnifiedDailyEntry] Loaded cached entries:', this.entries.length);
        }
      }
    }

    /**
     * Setup auto-save
     */
    setupAutoSave() {
      // Auto-save every 30 seconds
      setInterval(() => {
        if (this.entries.length > 0) {
          this.saveTodaysEntries();
        }
      }, 30 * 1000);
    }

    /**
     * Clear forms
     */
    clearSaleForm() {
      ['saleAccountName', 'saleServiceAddress', 'saleInitialJob', 'saleInitialJobYr',
       'saleMaintenanceContract', 'salePremium', 'saleLobs', 'saleConfirmedWithPoc',
       'saleCustomerConfirmedMonth', 'salePocInfo', 'saleSpecialNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    clearProposalForm() {
      ['propCompanyName', 'propJobWorkTotal', 'propTermiteTotal', 'propContractTotal',
       'propGrandTotal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.getElementById('propSold').checked = false;
      document.getElementById('propDelivered').checked = true;
    }

    /**
     * Close modal
     */
    closeDailyEntry() {
      document.getElementById('unifiedDailyEntryModal')?.remove();
    }
  }

  //=============================================================================
  // INITIALIZE
  //=============================================================================

  // Create global instance
  window.unifiedDailyEntry = new UnifiedDailyEntry();

  // Add global function to open
  window.openUnifiedDailyEntry = () => {
    window.unifiedDailyEntry.openDailyEntryForm();
  };

  console.log('[UnifiedDailyEntry] System initialized');

})();
