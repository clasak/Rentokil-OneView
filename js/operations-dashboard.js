/**
 * ===============================================================================
 * OPERATIONS DASHBOARD
 * ===============================================================================
 * Operations-specific dashboard with job scheduling and technician assignment
 */

(function() {
  'use strict';

  //=============================================================================
  // OPERATIONS DASHBOARD MANAGER
  //=============================================================================

  class OperationsDashboard {
    constructor() {
      this.selectedDeal = null;
      this.selectedTech = null;
      this.pendingDeals = [];
      this.technicians = [];

      this.init();
    }

    async init() {
      console.log('[OpsDashboard] Initializing operations dashboard...');

      // Subscribe to new deals from sales
      window.DataSync?.subscribe('new_ops_item', (deal) => {
        this.handleNewDeal(deal);
      });

      // Subscribe to job assignments
      window.DataSync?.subscribe('job_assigned', (assignment) => {
        this.handleJobAssigned(assignment);
      });

      // Load initial data
      await this.loadData();

      // Setup UI
      this.setupUI();

      console.log('[OpsDashboard] Operations dashboard ready');
    }

    /**
     * Load operations data
     */
    async loadData() {
      try {
        // Get deals pending scheduling
        this.pendingDeals = await window.DataSync?.getDealsForOps({
          branch: window.currentUser?.branchId,
          state: [
            window.DataSync.WorkflowStates.SOLD,
            window.DataSync.WorkflowStates.PENDING_SCHEDULE
          ]
        }) || [];

        // Get available technicians
        this.technicians = await window.DataSync?.getAvailableTechs({
          branchId: window.currentUser?.branchId,
          date: new Date().toISOString().split('T')[0]
        }) || [];

        console.log('[OpsDashboard] Loaded:', this.pendingDeals.length, 'pending deals');
        console.log('[OpsDashboard] Loaded:', this.technicians.length, 'technicians');

        this.renderDashboard();
      } catch (error) {
        console.error('[OpsDashboard] Failed to load data:', error);
      }
    }

    /**
     * Handle new deal from sales
     */
    handleNewDeal(deal) {
      console.log('[OpsDashboard] New deal received:', deal);

      // Add to pending list
      this.pendingDeals.unshift(deal);

      // Show notification
      if (window.DataValidation) {
        window.DataValidation.showToast(
          `New deal from ${deal.ae}: ${deal.customerName}`,
          'info'
        );
      }

      // Refresh display
      this.renderPendingDeals();

      // Play notification sound (if enabled)
      this.playNotificationSound();
    }

    /**
     * Handle job assignment
     */
    handleJobAssigned(assignment) {
      console.log('[OpsDashboard] Job assigned:', assignment);

      // Remove from pending list
      this.pendingDeals = this.pendingDeals.filter(d => d.id !== assignment.jobId);

      // Update tech availability
      const tech = this.technicians.find(t => t.id === assignment.techId);
      if (tech) {
        tech.assignedJobs = tech.assignedJobs || [];
        tech.assignedJobs.push(assignment.jobId);
      }

      // Refresh display
      this.renderDashboard();
    }

    /**
     * Setup UI components
     */
    setupUI() {
      // Create operations dashboard container
      const container = document.getElementById('operationsDashboardContainer');
      if (!container) {
        console.warn('[OpsDashboard] Container not found');
        return;
      }

      container.innerHTML = this.getTemplate();

      // Attach event listeners
      this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Deal selection
      document.addEventListener('click', (e) => {
        if (e.target.closest('.ops-deal-item')) {
          const dealId = e.target.closest('.ops-deal-item').dataset.dealId;
          this.selectDeal(dealId);
        }
      });

      // Tech selection
      document.addEventListener('click', (e) => {
        if (e.target.closest('.ops-tech-item')) {
          const techId = e.target.closest('.ops-tech-item').dataset.techId;
          this.selectTech(techId);
        }
      });

      // Assign button
      document.addEventListener('click', (e) => {
        if (e.target.closest('#opsAssignBtn')) {
          this.assignSelectedJob();
        }
      });

      // Schedule button
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-schedule-deal]')) {
          const dealId = e.target.closest('[data-schedule-deal]').dataset.scheduleDeal;
          this.openScheduleModal(dealId);
        }
      });

      // View details button
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-view-deal]')) {
          const dealId = e.target.closest('[data-view-deal]').dataset.viewDeal;
          this.viewDealDetails(dealId);
        }
      });
    }

    /**
     * Select deal
     */
    selectDeal(dealId) {
      this.selectedDeal = dealId;

      // Update UI
      document.querySelectorAll('.ops-deal-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.dealId === dealId);
      });

      // Enable assign button if tech is also selected
      this.updateAssignButton();
    }

    /**
     * Select technician
     */
    selectTech(techId) {
      this.selectedTech = techId;

      // Update UI
      document.querySelectorAll('.ops-tech-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.techId === techId);
      });

      // Enable assign button if deal is also selected
      this.updateAssignButton();
    }

    /**
     * Update assign button state
     */
    updateAssignButton() {
      const btn = document.getElementById('opsAssignBtn');
      if (btn) {
        btn.disabled = !this.selectedDeal || !this.selectedTech;
      }
    }

    /**
     * Assign selected job to selected tech
     */
    async assignSelectedJob() {
      if (!this.selectedDeal || !this.selectedTech) return;

      const deal = this.pendingDeals.find(d => d.id === this.selectedDeal);
      const tech = this.technicians.find(t => t.id === this.selectedTech);

      if (!deal || !tech) return;

      try {
        // Show loading
        const btn = document.getElementById('opsAssignBtn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Assigning...';
        }

        // Assign job
        await window.DataSync?.assignJob(
          deal.id,
          tech.id,
          {
            customerName: deal.customerName,
            services: deal.services,
            scheduledDate: new Date().toISOString(),
            estimatedDuration: this.estimateDuration(deal),
            priority: deal.priority
          }
        );

        // Update deal state
        await window.DataSync?.updateDealState(
          deal.id,
          window.DataSync.WorkflowStates.ASSIGNED,
          {
            assignedTo: tech.id,
            assignedBy: window.currentUser?.email
          }
        );

        // Show success
        if (window.DataValidation) {
          window.DataValidation.showToast(
            `Job assigned to ${tech.name}`,
            'success'
          );
        }

        // Clear selections
        this.selectedDeal = null;
        this.selectedTech = null;

      } catch (error) {
        console.error('[OpsDashboard] Assignment failed:', error);

        if (window.DataValidation) {
          window.DataValidation.showToast(
            `Failed to assign job: ${error.message}`,
            'error'
          );
        }
      } finally {
        // Reset button
        const btn = document.getElementById('opsAssignBtn');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Assign Job';
        }
      }
    }

    /**
     * Estimate job duration
     */
    estimateDuration(deal) {
      // Simple estimation based on services
      const baseTime = 60; // 1 hour
      const serviceTime = (deal.services?.length || 1) * 30; // 30 min per service
      return baseTime + serviceTime;
    }

    /**
     * Open schedule modal
     */
    openScheduleModal(dealId) {
      const deal = this.pendingDeals.find(d => d.id === dealId);
      if (!deal) return;

      // Show modal with calendar and time picker
      const modal = this.createScheduleModal(deal);
      document.body.appendChild(modal);
    }

    /**
     * Create schedule modal
     */
    createScheduleModal(deal) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-2xl font-bold text-gray-800">Schedule Installation</h2>
            <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-6">
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">${deal.customerName}</h3>
              <p class="text-sm text-gray-600">Services: ${deal.services?.join(', ')}</p>
              <p class="text-sm text-gray-600">Value: $${deal.totalValue?.toLocaleString()}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" id="scheduleDate" class="w-full px-3 py-2 border rounded-md"
                       min="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <select id="scheduleTime" class="w-full px-3 py-2 border rounded-md">
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Assign Technician</label>
              <select id="scheduleTech" class="w-full px-3 py-2 border rounded-md">
                <option value="">Select Technician</option>
                ${this.technicians.map(tech => `
                  <option value="${tech.id}">${tech.name} (${tech.currentLoad}/${tech.maxJobsPerDay} jobs)</option>
                `).join('')}
              </select>
            </div>

            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea id="scheduleNotes" rows="3" class="w-full px-3 py-2 border rounded-md"
                        placeholder="Special instructions, equipment needed, etc."></textarea>
            </div>

            <div class="flex gap-3 justify-end">
              <button onclick="this.closest('.fixed').remove()"
                      class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onclick="window.opsDashboard.confirmSchedule('${deal.id}')"
                      class="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand-color-light">
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      `;

      return modal;
    }

    /**
     * Confirm schedule
     */
    async confirmSchedule(dealId) {
      const date = document.getElementById('scheduleDate')?.value;
      const time = document.getElementById('scheduleTime')?.value;
      const techId = document.getElementById('scheduleTech')?.value;
      const notes = document.getElementById('scheduleNotes')?.value;

      if (!date || !techId) {
        if (window.DataValidation) {
          window.DataValidation.showToast('Please select date and technician', 'error');
        }
        return;
      }

      try {
        // Assign job
        await window.DataSync?.assignJob(dealId, techId, {
          scheduledDate: `${date}T${time}:00`,
          notes: notes,
          scheduledBy: window.currentUser?.email
        });

        // Update state
        await window.DataSync?.updateDealState(
          dealId,
          window.DataSync.WorkflowStates.SCHEDULED
        );

        // Close modal
        document.querySelector('.fixed.inset-0').remove();

        // Show success
        if (window.DataValidation) {
          window.DataValidation.showToast('Job scheduled successfully', 'success');
        }

        // Refresh data
        await this.loadData();

      } catch (error) {
        console.error('[OpsDashboard] Scheduling failed:', error);
        if (window.DataValidation) {
          window.DataValidation.showToast(`Failed to schedule: ${error.message}`, 'error');
        }
      }
    }

    /**
     * View deal details
     */
    viewDealDetails(dealId) {
      const deal = this.pendingDeals.find(d => d.id === dealId);
      if (!deal) return;

      // Show detailed view modal
      console.log('[OpsDashboard] Viewing deal:', deal);

      // Could open a detailed modal or navigate to detail page
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
      // Simple notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzPLaizsKGGm98OScTgwOUKzn77lpGgU7k9nyyX0sBSF1y/Dgk0ILElav6OqnWBMLRqLi8LxwJAUqgs3y2oo5CRZqvvDonFALDk6s6O+4aBsCO5PY88l+LQUgdcvw4JNEC');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Silently fail if autoplay blocked
      } catch (e) {
        // Ignore errors
      }
    }

    /**
     * Render dashboard
     */
    renderDashboard() {
      this.renderPendingDeals();
      this.renderTechnicians();
      this.renderStats();
    }

    /**
     * Render pending deals
     */
    renderPendingDeals() {
      const container = document.getElementById('opsPendingDeals');
      if (!container) return;

      if (this.pendingDeals.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-lg font-medium">No pending installations</p>
            <p class="text-sm mt-2">New deals from sales will appear here</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="space-y-3">
          ${this.pendingDeals.map(deal => this.renderDealCard(deal)).join('')}
        </div>
      `;
    }

    /**
     * Render deal card
     */
    renderDealCard(deal) {
      const priorityColors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
      };

      const priorityColor = priorityColors[deal.priority] || priorityColors.low;

      return `
        <div class="ops-deal-item border-2 border-gray-200 rounded-lg p-4 hover:border-brand cursor-pointer transition-colors ${this.selectedDeal === deal.id ? 'border-brand bg-blue-50' : ''}"
             data-deal-id="${deal.id}">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-800">${deal.customerName}</h3>
              <p class="text-sm text-gray-600 mt-1">AE: ${deal.ae} • Branch: ${deal.branch}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 text-xs rounded ${priorityColor}">
                ${deal.priority.toUpperCase()}
              </span>
              ${deal.isOverdue ? '<span class="px-2 py-1 text-xs rounded bg-red-600 text-white">OVERDUE</span>' : ''}
            </div>
          </div>

          <div class="mb-3">
            <p class="text-sm text-gray-700">
              <strong>Services:</strong> ${deal.services?.join(', ')}
            </p>
            <p class="text-sm text-gray-700 mt-1">
              <strong>Value:</strong> $${deal.totalValue?.toLocaleString()}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              Sold ${deal.daysOld} days ago
            </p>
          </div>

          <div class="flex gap-2">
            <button data-schedule-deal="${deal.id}"
                    class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              Schedule
            </button>
            <button data-view-deal="${deal.id}"
                    class="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
              View Details
            </button>
          </div>
        </div>
      `;
    }

    /**
     * Render technicians
     */
    renderTechnicians() {
      const container = document.getElementById('opsTechnicians');
      if (!container) return;

      container.innerHTML = `
        <div class="space-y-3">
          ${this.technicians.map(tech => this.renderTechCard(tech)).join('')}
        </div>
      `;
    }

    /**
     * Render tech card
     */
    renderTechCard(tech) {
      const loadPercent = (tech.currentLoad / tech.maxJobsPerDay) * 100;
      const loadColor = loadPercent >= 100 ? 'bg-red-500' :
                        loadPercent >= 75 ? 'bg-yellow-500' :
                        'bg-green-500';

      return `
        <div class="ops-tech-item border-2 border-gray-200 rounded-lg p-4 hover:border-brand cursor-pointer transition-colors ${this.selectedTech === tech.id ? 'border-brand bg-blue-50' : ''}"
             data-tech-id="${tech.id}">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-semibold text-gray-800">${tech.name}</h3>
              <p class="text-sm text-gray-600 mt-1">${tech.skills?.join(', ')}</p>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-gray-700">${tech.currentLoad}/${tech.maxJobsPerDay}</div>
              <div class="text-xs text-gray-500">jobs today</div>
            </div>
          </div>

          <div class="mb-2">
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="${loadColor} h-full rounded-full transition-all" style="width: ${Math.min(loadPercent, 100)}%"></div>
            </div>
          </div>

          <div class="flex justify-between text-xs text-gray-600">
            <span>Availability: ${tech.availability} slots</span>
            <span class="${loadPercent >= 100 ? 'text-red-600 font-semibold' : loadPercent >= 75 ? 'text-yellow-600' : 'text-green-600'}">
              ${loadPercent >= 100 ? 'Full' : loadPercent >= 75 ? 'Busy' : 'Available'}
            </span>
          </div>
        </div>
      `;
    }

    /**
     * Render stats
     */
    renderStats() {
      const container = document.getElementById('opsStats');
      if (!container) return;

      const stats = {
        pending: this.pendingDeals.length,
        overdue: this.pendingDeals.filter(d => d.isOverdue).length,
        highPriority: this.pendingDeals.filter(d => d.priority === 'high').length,
        availableTechs: this.technicians.filter(t => t.availability > 0).length
      };

      container.innerHTML = `
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-blue-900">${stats.pending}</div>
            <div class="text-sm text-blue-700 mt-1">Pending</div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-red-900">${stats.overdue}</div>
            <div class="text-sm text-red-700 mt-1">Overdue</div>
          </div>
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-orange-900">${stats.highPriority}</div>
            <div class="text-sm text-orange-700 mt-1">High Priority</div>
          </div>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="text-3xl font-bold text-green-900">${stats.availableTechs}</div>
            <div class="text-sm text-green-700 mt-1">Available Techs</div>
          </div>
        </div>
      `;
    }

    /**
     * Get dashboard template
     */
    getTemplate() {
      return `
        <div class="operations-dashboard">
          <!-- Stats Bar -->
          <div id="opsStats" class="mb-6"></div>

          <!-- Main Content -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Pending Deals -->
            <div class="bg-white rounded-lg shadow-md">
              <div class="p-4 border-b">
                <h2 class="text-lg font-bold text-gray-800">Pending Installations</h2>
                <p class="text-sm text-gray-600 mt-1">Deals from sales awaiting schedule</p>
              </div>
              <div id="opsPendingDeals" class="p-4 max-h-[600px] overflow-y-auto"></div>
            </div>

            <!-- Technicians -->
            <div class="bg-white rounded-lg shadow-md">
              <div class="p-4 border-b">
                <h2 class="text-lg font-bold text-gray-800">Technicians</h2>
                <p class="text-sm text-gray-600 mt-1">Available for job assignment</p>
              </div>
              <div id="opsTechnicians" class="p-4 max-h-[600px] overflow-y-auto"></div>
            </div>
          </div>

          <!-- Quick Assign Panel -->
          <div class="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl p-6 border-2 border-brand max-w-md">
            <h3 class="font-bold text-gray-800 mb-4">Quick Assign</h3>
            <div class="space-y-3 text-sm">
              <div>
                <strong>Selected Job:</strong>
                <span id="selectedJobName" class="text-gray-600 ml-2">None</span>
              </div>
              <div>
                <strong>Selected Tech:</strong>
                <span id="selectedTechName" class="text-gray-600 ml-2">None</span>
              </div>
              <button id="opsAssignBtn" disabled
                      class="w-full px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-color-light disabled:bg-gray-300 disabled:cursor-not-allowed">
                Assign Job
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  //=============================================================================
  // INITIALIZE
  //=============================================================================

  // Create global instance
  window.opsDashboard = null;

  // Initialize when DOM is ready and DataSync is available
  function initOperationsDashboard() {
    if (window.DataSync && document.getElementById('operationsDashboardContainer')) {
      window.opsDashboard = new OperationsDashboard();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOperationsDashboard);
  } else {
    initOperationsDashboard();
  }

  // Also try to initialize when DataSync becomes available
  window.addEventListener('DataSyncReady', initOperationsDashboard);

})();
