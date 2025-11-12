// Phase 5.1 - Proposal Entry Form (Multi-step)
// Implements: showProposalForm, addServiceRow, removeServiceRow, nextStep, previousStep,
// recalculateTotals (debounced), saveProposal, formatCurrency, selectAllMonths, clearAllMonths

(function(){
  const STATE_KEY = 'proposals.draft';
  let debounceTimer = null;
  let currentStep = 1;

  function formatCurrency(value){
    const n = Number(value || 0);
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getDraft(){ try { return (window.AppState?.getState(STATE_KEY) || {}); } catch(_) { return {}; } }
  function saveDraft(draft){ try { window.AppState?.setState(STATE_KEY, draft); } catch(_) {} }

  function closeProposalForm(){
    const modal = document.getElementById('proposalFormModal');
    if (modal) modal.remove();
  }

  function ensureModal(){
    let modal = document.getElementById('proposalFormModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'proposalFormModal';
    modal.className = 'fixed inset-0 z-50';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/40" data-dismiss></div>
      <div class="absolute inset-6 md:inset-10 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-gray-800">Create Proposal</h2>
            <span class="text-sm text-gray-500">Phase 5.1</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="pf-close" class="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200">Close</button>
          </div>
        </div>
        <div class="px-4 py-3 border-b">
          <div class="grid grid-cols-4 gap-2" id="pf-steps">
            <div class="pf-step active px-3 py-2 rounded bg-blue-600 text-white">1. Account Info</div>
            <div class="pf-step px-3 py-2 rounded bg-gray-100 text-gray-800">2. Services</div>
            <div class="pf-step px-3 py-2 rounded bg-gray-100 text-gray-800">3. Setup</div>
            <div class="pf-step px-3 py-2 rounded bg-gray-100 text-gray-800">4. Review</div>
          </div>
        </div>
        <div class="flex-1 overflow-auto p-4" id="pf-body">
          <!-- Step 1: Account Information -->
          <section id="pf-step-1" class="pf-section">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Account Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input id="pf-customerName" type="text" class="w-full px-3 py-2 border rounded" placeholder="Customer Name *" required />
              <input id="pf-quoteName" type="text" class="w-full px-3 py-2 border rounded" placeholder="Quote Name" />
              <input id="pf-serviceAddress" type="text" class="w-full px-3 py-2 border rounded" placeholder="Service Address *" required />
              <input id="pf-billingAddress" type="text" class="w-full px-3 py-2 border rounded" placeholder="Billing Address (blank = same as service)" />
              <input id="pf-pocName" type="text" class="w-full px-3 py-2 border rounded" placeholder="POC Name *" required />
              <input id="pf-pocEmail" type="email" class="w-full px-3 py-2 border rounded" placeholder="POC Email *" required />
              <input id="pf-pocPhone" type="tel" class="w-full px-3 py-2 border rounded" placeholder="POC Phone" />
              <input id="pf-pocMobile" type="tel" class="w-full px-3 py-2 border rounded" placeholder="POC Mobile" />
              <input id="pf-salesRep" type="text" class="w-full px-3 py-2 border rounded bg-gray-50" placeholder="Sales Rep" readonly />
              <input id="pf-dateOfSale" type="date" class="w-full px-3 py-2 border rounded" />
            </div>
          </section>
          <!-- Step 2: Services & Pricing -->
          <section id="pf-step-2" class="pf-section hidden">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-800">Services & Pricing</h3>
              <button id="pf-add-service" class="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Service</button>
            </div>
            <div id="pf-services" class="space-y-3"></div>
          </section>
          <!-- Step 3: Setup Requirements -->
          <section id="pf-step-3" class="pf-section hidden">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Setup Requirements</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select id="pf-pnol" class="w-full px-3 py-2 border rounded">
                <option value="no" selected>PNOL Requested? No</option>
                <option value="yes">PNOL Requested? Yes</option>
              </select>
              <select id="pf-logBook" class="w-full px-3 py-2 border rounded">
                <option value="no" selected>Log Book Needed? No</option>
                <option value="yes">Log Book Needed? Yes</option>
              </select>
              <input id="pf-opsManager" type="text" class="w-full px-3 py-2 border rounded" placeholder="Operations Manager" />
              <input id="pf-specialist" type="text" class="w-full px-3 py-2 border rounded" placeholder="Assigned Specialist" />
              <textarea id="pf-notes" class="md:col-span-2 w-full px-3 py-2 border rounded" rows="4" placeholder="Notes / Instructions"></textarea>
            </div>
          </section>
          <!-- Step 4: Review & Submit -->
          <section id="pf-step-4" class="pf-section hidden">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Review & Submit</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div class="bg-white border rounded p-3">
                <div class="text-sm text-gray-600">Total Initial</div>
                <div id="pf-total-initial" class="text-2xl font-bold text-brand">$0.00</div>
              </div>
              <div class="bg-white border rounded p-3">
                <div class="text-sm text-gray-600">Total Monthly</div>
                <div id="pf-total-monthly" class="text-2xl font-bold text-rentokil-blue">$0.00</div>
              </div>
              <div class="bg-white border rounded p-3">
                <div class="text-sm text-gray-600">Grand Total</div>
                <div id="pf-grand-total" class="text-2xl font-bold text-green-600">$0.00</div>
              </div>
            </div>
            <div id="pf-review-list" class="bg-white border rounded p-3"></div>
          </section>
        </div>
        <div class="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <div class="text-sm text-gray-500">Step <span id="pf-step-ind">1</span> / 4</div>
          <div class="flex items-center gap-2">
            <button id="pf-prev" class="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200">Back</button>
            <button id="pf-next" class="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Next</button>
            <button id="pf-save" class="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">Save Draft</button>
            <button id="pf-submit" class="px-3 py-2 text-sm bg-brand text-white rounded hover:bg-brand-color-light">Submit</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-dismiss]')?.addEventListener('click', closeProposalForm);
    modal.querySelector('#pf-close')?.addEventListener('click', closeProposalForm);
    modal.querySelector('#pf-prev')?.addEventListener('click', previousStep);
    modal.querySelector('#pf-next')?.addEventListener('click', nextStep);
    modal.querySelector('#pf-save')?.addEventListener('click', saveProposal);
    modal.querySelector('#pf-submit')?.addEventListener('click', saveProposal);
    modal.querySelector('#pf-add-service')?.addEventListener('click', addServiceRow);
    return modal;
  }

  function setActiveStep(step){
    currentStep = step;
    const steps = document.querySelectorAll('#pf-steps .pf-step');
    steps.forEach((el, i) => {
      if (i === (step - 1)) { el.classList.add('bg-blue-600','text-white'); el.classList.remove('bg-gray-100','text-gray-800'); }
      else { el.classList.remove('bg-blue-600','text-white'); el.classList.add('bg-gray-100','text-gray-800'); }
    });
    document.querySelectorAll('.pf-section').forEach((sec, i) => {
      sec.classList.toggle('hidden', (i !== (step - 1)));
    });
    const ind = document.getElementById('pf-step-ind'); if (ind) ind.textContent = String(step);
  }

  function validateStep(step){
    if (step === 1) {
      const req = ['pf-customerName','pf-serviceAddress','pf-pocName','pf-pocEmail'];
      for (const id of req) {
        const el = document.getElementById(id);
        if (!el || !String(el.value || '').trim()) { alert('Please fill required fields'); return false; }
      }
    }
    if (step === 2) {
      const rows = document.querySelectorAll('.pf-service-row');
      if (rows.length === 0) { alert('Add at least one service'); return false; }
    }
    return true;
  }

  function previousStep(){ if (currentStep > 1) setActiveStep(currentStep - 1); }
  function nextStep(){ if (!validateStep(currentStep)) return; if (currentStep < 4) setActiveStep(currentStep + 1); if (currentStep === 3) recalculateTotals(); if (currentStep === 4) renderReview(); }

  function monthsTemplate(){
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return months.map(m => `<label class="inline-flex items-center gap-1 mr-2 mb-2"><input type="checkbox" class="pf-month" value="${m}"><span class="text-xs">${m}</span></label>`).join('');
  }

  function addServiceRow(){
    const host = document.getElementById('pf-services');
    if (!host) return;
    const row = document.createElement('div');
    row.className = 'pf-service-row border rounded p-3';
    row.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input type="text" class="pf-s-name w-full px-3 py-2 border rounded" placeholder="Service Name *" />
        <select class="pf-s-type w-full px-3 py-2 border rounded">
          <option value="Recurring" selected>Recurring</option>
          <option value="Corrective">Corrective</option>
          <option value="Equipment">Equipment</option>
        </select>
        <input type="date" class="pf-s-start w-full px-3 py-2 border rounded" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <input type="number" min="0" step="0.01" class="pf-s-initial w-full px-3 py-2 border rounded" placeholder="Initial Price" />
        <input type="number" min="0" step="0.01" class="pf-s-monthly w-full px-3 py-2 border rounded" placeholder="Monthly Price" />
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200" data-select-all>Select All</button>
          <button class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200" data-clear-all>Clear All</button>
          <button class="ml-auto px-2 py-1 text-xs bg-red-600 text-white rounded" data-remove>Remove</button>
        </div>
      </div>
      <div class="mt-2 flex flex-wrap">${monthsTemplate()}</div>
      <textarea class="pf-s-notes w-full px-3 py-2 border rounded mt-3" rows="3" placeholder="Notes / Instructions"></textarea>
    `;
    host.appendChild(row);
    row.querySelector('[data-remove]').addEventListener('click', () => removeServiceRow(row));
    row.querySelector('[data-select-all]').addEventListener('click', () => selectAllMonths(row));
    row.querySelector('[data-clear-all]').addEventListener('click', () => clearAllMonths(row));
    row.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('input', () => recalculateTotals()));
  }

  function removeServiceRow(row){ row.remove(); recalculateTotals(); }
  function selectAllMonths(row){ row.querySelectorAll('.pf-month').forEach(cb => cb.checked = true); recalculateTotals(); }
  function clearAllMonths(row){ row.querySelectorAll('.pf-month').forEach(cb => cb.checked = false); recalculateTotals(); }

  function readServices(){
    const rows = Array.from(document.querySelectorAll('.pf-service-row'));
    return rows.map(r => {
      const months = Array.from(r.querySelectorAll('.pf-month')).filter(cb => cb.checked).map(cb => cb.value);
      return {
        name: r.querySelector('.pf-s-name')?.value?.trim() || '',
        type: r.querySelector('.pf-s-type')?.value || 'Recurring',
        startDate: r.querySelector('.pf-s-start')?.value || '',
        initialPrice: Number(r.querySelector('.pf-s-initial')?.value || 0),
        monthlyPrice: Number(r.querySelector('.pf-s-monthly')?.value || 0),
        serviceMonths: months,
        notes: r.querySelector('.pf-s-notes')?.value?.trim() || ''
      };
    });
  }

  function recalculateTotals(){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const services = readServices();
      const totals = {
        totalInitial: services.reduce((sum, s) => sum + (s.initialPrice || 0), 0),
        totalMonthly: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0), 0),
        totalAnnual: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0) * (s.serviceMonths?.length || 0), 0),
      };
      totals.grandTotal = totals.totalInitial + totals.totalAnnual;
      const d = getDraft(); d.totals = totals; d.services = services; saveDraft(d);
      const ti = document.getElementById('pf-total-initial'); if (ti) ti.textContent = formatCurrency(totals.totalInitial);
      const tm = document.getElementById('pf-total-monthly'); if (tm) tm.textContent = formatCurrency(totals.totalMonthly);
      const gt = document.getElementById('pf-grand-total'); if (gt) gt.textContent = formatCurrency(totals.grandTotal);
    }, 300);
  }

  function renderReview(){
    const host = document.getElementById('pf-review-list'); if (!host) return;
    const d = getDraft(); const svcs = d.services || [];
    host.innerHTML = svcs.length ? svcs.map(s => `
      <div class="border rounded p-3 mb-2">
        <div class="font-medium text-gray-800">${s.name} • ${s.type}</div>
        <div class="text-sm text-gray-600">Init: ${formatCurrency(s.initialPrice)} • Monthly: ${formatCurrency(s.monthlyPrice)} • Months: ${(s.serviceMonths||[]).join(', ') || 'None'}</div>
        <div class="text-sm text-gray-600">Start: ${s.startDate || '—'}</div>
        <div class="text-sm text-gray-600">${s.notes || ''}</div>
      </div>
    `).join('') : '<div class="text-sm text-gray-500">No services added.</div>';
  }

  function readForm(){
    const services = readServices();
    const totals = {
      totalInitial: services.reduce((sum, s) => sum + (s.initialPrice || 0), 0),
      totalMonthly: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0), 0),
      totalAnnual: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0) * (s.serviceMonths?.length || 0), 0),
    };
    totals.grandTotal = totals.totalInitial + totals.totalAnnual;
    return {
      customerName: document.getElementById('pf-customerName')?.value?.trim() || '',
      quoteName: document.getElementById('pf-quoteName')?.value?.trim() || '',
      serviceAddress: document.getElementById('pf-serviceAddress')?.value?.trim() || '',
      billingAddress: document.getElementById('pf-billingAddress')?.value?.trim() || '',
      poc: {
        name: document.getElementById('pf-pocName')?.value?.trim() || '',
        email: document.getElementById('pf-pocEmail')?.value?.trim() || '',
        phone: document.getElementById('pf-pocPhone')?.value?.trim() || '',
        mobile: document.getElementById('pf-pocMobile')?.value?.trim() || '',
      },
      salesRep: document.getElementById('pf-salesRep')?.value?.trim() || '',
      dateOfSale: document.getElementById('pf-dateOfSale')?.value || '',
      setup: {
        pnol: (document.getElementById('pf-pnol')?.value || 'no') === 'yes',
        logBook: (document.getElementById('pf-logBook')?.value || 'no') === 'yes',
        opsManager: document.getElementById('pf-opsManager')?.value?.trim() || '',
        specialist: document.getElementById('pf-specialist')?.value?.trim() || '',
        notes: document.getElementById('pf-notes')?.value?.trim() || '',
      },
      services,
      totals,
      status: 'Draft'
    };
  }

  function saveProposal(){
    const proposal = readForm();
    saveDraft(proposal);
    alert('Proposal saved.');
  }

  function restoreDraft(){
    const d = getDraft(); if (!d) return;
    const bind = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    bind('pf-customerName', d.customerName);
    bind('pf-quoteName', d.quoteName);
    bind('pf-serviceAddress', d.serviceAddress);
    bind('pf-billingAddress', d.billingAddress);
    bind('pf-pocName', d?.poc?.name);
    bind('pf-pocEmail', d?.poc?.email);
    bind('pf-pocPhone', d?.poc?.phone);
    bind('pf-pocMobile', d?.poc?.mobile);
    bind('pf-salesRep', d.salesRep);
    bind('pf-dateOfSale', d.dateOfSale);
    bind('pf-pnol', d?.setup?.pnol ? 'yes' : 'no');
    bind('pf-logBook', d?.setup?.logBook ? 'yes' : 'no');
    bind('pf-opsManager', d?.setup?.opsManager);
    bind('pf-specialist', d?.setup?.specialist);
    bind('pf-notes', d?.setup?.notes);
    (d.services || []).forEach(s => {
      addServiceRow();
      const rows = document.querySelectorAll('.pf-service-row');
      const r = rows[rows.length - 1];
      r.querySelector('.pf-s-name').value = s.name || '';
      r.querySelector('.pf-s-type').value = s.type || 'Recurring';
      r.querySelector('.pf-s-start').value = s.startDate || '';
      r.querySelector('.pf-s-initial').value = String(s.initialPrice || 0);
      r.querySelector('.pf-s-monthly').value = String(s.monthlyPrice || 0);
      r.querySelector('.pf-s-notes').value = s.notes || '';
      const months = s.serviceMonths || [];
      r.querySelectorAll('.pf-month').forEach(cb => { cb.checked = months.includes(cb.value); });
    });
    recalculateTotals();
  }

  function setSmartDefaults(){
    const name = (window.currentUser?.name) || '';
    const branch = (window.currentUser?.branch) || '';
    const elRep = document.getElementById('pf-salesRep'); if (elRep) elRep.value = name;
    const elDate = document.getElementById('pf-dateOfSale'); if (elDate) elDate.value = new Date().toISOString().split('T')[0];
    if (branch) {
      // Optionally store branch in draft for future use
      const d = getDraft(); d.branch = branch; saveDraft(d);
    }
  }

  window.showProposalForm = function(){
    const modal = ensureModal();
    setActiveStep(1);
    setSmartDefaults();
    restoreDraft();
    // Allow drag/resize behavior to be applied if available
    try { window.makeModalDraggableAndResizable('proposalFormModal'); window.addDynamicGlowEffect('proposalFormModal'); } catch(_){}
  };

  // Expose helpers
  window.addServiceRow = addServiceRow;
  window.removeServiceRow = removeServiceRow;
  window.nextStep = nextStep;
  window.previousStep = previousStep;
  window.recalculateTotals = recalculateTotals;
  window.saveProposal = saveProposal;
  window.selectAllMonths = selectAllMonths;
  window.clearAllMonths = clearAllMonths;
})();

