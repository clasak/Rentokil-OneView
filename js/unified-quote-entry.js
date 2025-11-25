/**
 * ===============================================================================
 * UNIFIED QUOTE/PROPOSAL ENTRY SYSTEM
 * ===============================================================================
 * Comprehensive quote entry system that supports:
 * - Manual multi-step form entry
 * - Salesforce PDF import with automatic parsing
 * - Excel/CSV import
 * - Data validation and deduplication
 * - Automatic data population from CRM
 */

(function() {
  'use strict';

  const STATE_KEY = 'unified.quote.draft';
  let debounceTimer = null;
  let currentStep = 1;
  let parsedPdfData = null;

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  function formatCurrency(value) {
    const n = Number(value || 0);
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getDraft() {
    try {
      return window.AppState?.getState(STATE_KEY) || {};
    } catch(_) {
      return {};
    }
  }

  function saveDraft(draft) {
    try {
      window.AppState?.setState(STATE_KEY, draft);
    } catch(_) {}
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('appToast');
    const toastMsg = document.getElementById('appToastMessage');
    const toastInner = document.getElementById('appToastInner');

    if (toast && toastMsg && toastInner) {
      toastMsg.textContent = message;

      // Set color based on type
      toastInner.className = 'px-4 py-2 rounded-md shadow-lg text-white text-sm';
      if (type === 'error') {
        toastInner.classList.add('bg-red-600');
      } else if (type === 'warning') {
        toastInner.classList.add('bg-yellow-600');
      } else {
        toastInner.classList.add('bg-green-600');
      }

      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  }

  // =============================================================================
  // PDF PARSING FUNCTIONS
  // =============================================================================

  async function ensurePdfJs() {
    if (window.pdfjsLib) return;

    // Load PDF.js library
    const sources = [
      'https://unpkg.com/pdfjs-dist@3.11.108/build/pdf.min.js',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.108/build/pdf.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.108/pdf.min.js'
    ];

    for (const src of sources) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.replace('/pdf.min.js', '/pdf.worker.min.js');
          return;
        }
      } catch(e) {
        continue;
      }
    }

    throw new Error('Failed to load PDF.js library');
  }

  async function parseSalesforcePdf(file) {
    try {
      await ensurePdfJs();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;

      let fullText = '';

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // Parse the extracted text to find quote data
      return parseQuoteText(fullText);

    } catch(error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF: ' + error.message);
    }
  }

  function parseQuoteText(text) {
    const data = {
      customerName: '',
      quoteName: '',
      serviceAddress: '',
      billingAddress: '',
      poc: {
        name: '',
        email: '',
        phone: '',
        mobile: ''
      },
      services: [],
      totals: {
        totalInitial: 0,
        totalMonthly: 0,
        totalAnnual: 0,
        grandTotal: 0
      },
      opportunityId: '',
      accountNumber: '',
      quoteNumber: ''
    };

    // Extract customer/account name
    const customerMatch = text.match(/(?:Account Name|Customer Name|Company)[:\s]+([^\n]+)/i);
    if (customerMatch) data.customerName = customerMatch[1].trim();

    // Extract quote name/number
    const quoteMatch = text.match(/(?:Quote|Proposal)[:\s#]+([A-Z0-9-]+)/i);
    if (quoteMatch) data.quoteName = quoteMatch[1].trim();

    // Extract opportunity ID (Salesforce format)
    const oppMatch = text.match(/(?:Opportunity|Opp)[:\s]+([0-9A-Z]{15,18})/i);
    if (oppMatch) data.opportunityId = oppMatch[1].trim();

    // Extract service address
    const addressMatch = text.match(/(?:Service Address|Site Location)[:\s]+([^\n]+(?:\n[^\n]+)?)/i);
    if (addressMatch) {
      data.serviceAddress = addressMatch[1].replace(/\n/g, ', ').trim();
    }

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) data.poc.email = emailMatch[1].trim();

    // Extract phone numbers
    const phoneMatches = text.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g);
    if (phoneMatches && phoneMatches.length > 0) {
      data.poc.phone = phoneMatches[0].replace(/[-.\s]/g, '');
      if (phoneMatches.length > 1) {
        data.poc.mobile = phoneMatches[1].replace(/[-.\s]/g, '');
      }
    }

    // Extract contact name
    const contactMatch = text.match(/(?:Contact|POC|Primary Contact)[:\s]+([A-Z][a-zA-Z\s]+)/i);
    if (contactMatch) data.poc.name = contactMatch[1].trim();

    // Extract services and pricing
    const priceMatches = text.matchAll(/\$\s?([\d,]+\.?\d*)/g);
    const prices = Array.from(priceMatches).map(m => parseFloat(m[1].replace(/,/g, '')));

    if (prices.length > 0) {
      // Try to identify initial vs monthly pricing
      const sortedPrices = [...prices].sort((a, b) => b - a);

      // Assume first large price is initial, smaller recurring prices are monthly
      if (sortedPrices.length >= 2) {
        data.totals.totalInitial = sortedPrices[0];
        data.totals.totalMonthly = sortedPrices[1];
        data.totals.totalAnnual = data.totals.totalMonthly * 12;
        data.totals.grandTotal = data.totals.totalInitial + data.totals.totalAnnual;
      }
    }

    // Try to extract service names
    const servicePatterns = [
      /(?:Service|Program)[:\s]+([^\n$]+)/gi,
      /(?:IPM|Rodent|Termite|Bed Bug|Wildlife)[^$\n]*/gi
    ];

    servicePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const serviceName = match[1] || match[0];
        if (serviceName && serviceName.length < 100 && serviceName.trim().length > 3) {
          data.services.push({
            name: serviceName.trim(),
            type: 'Recurring',
            initialPrice: 0,
            monthlyPrice: 0,
            serviceMonths: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
            startDate: '',
            notes: 'Imported from Salesforce PDF'
          });
        }
      }
    });

    // If no services extracted, create a default one
    if (data.services.length === 0) {
      data.services.push({
        name: 'Pest Management Service',
        type: 'Recurring',
        initialPrice: data.totals.totalInitial || 0,
        monthlyPrice: data.totals.totalMonthly || 0,
        serviceMonths: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
        startDate: '',
        notes: 'Imported from Salesforce PDF - please verify details'
      });
    }

    return data;
  }

  // =============================================================================
  // MODAL MANAGEMENT
  // =============================================================================

  function closeUnifiedQuoteForm() {
    const modal = document.getElementById('unifiedQuoteFormModal');
    if (modal) modal.remove();
    parsedPdfData = null;
  }

  function ensureModal() {
    let modal = document.getElementById('unifiedQuoteFormModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'unifiedQuoteFormModal';
    modal.className = 'fixed inset-0 z-50';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/40" data-dismiss></div>
      <div class="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-brand to-brand-color-dark">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold text-white">Unified Quote Entry</h2>
            <span class="px-2 py-1 text-xs bg-white/20 text-white rounded">v2.0</span>
          </div>
          <button id="uqf-close" class="text-white hover:bg-white/10 p-2 rounded">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Import Options Bar -->
        <div class="px-6 py-3 border-b bg-gray-50">
          <div class="flex gap-2 flex-wrap">
            <button id="uqf-import-pdf" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
              </svg>
              Import Salesforce PDF
            </button>
            <button id="uqf-import-excel" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
              </svg>
              Import Excel/CSV
            </button>
            <button id="uqf-manual-entry" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z"/>
              </svg>
              Manual Entry
            </button>
            <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
              <span id="uqf-import-status" class="italic"></span>
            </div>
          </div>
        </div>

        <!-- Progress Steps -->
        <div class="px-6 py-4 border-b">
          <div class="grid grid-cols-5 gap-2" id="uqf-steps">
            <div class="uqf-step active px-3 py-2 rounded bg-blue-600 text-white text-center text-sm font-medium">
              1. Import
            </div>
            <div class="uqf-step px-3 py-2 rounded bg-gray-100 text-gray-800 text-center text-sm font-medium">
              2. Account
            </div>
            <div class="uqf-step px-3 py-2 rounded bg-gray-100 text-gray-800 text-center text-sm font-medium">
              3. Services
            </div>
            <div class="uqf-step px-3 py-2 rounded bg-gray-100 text-gray-800 text-center text-sm font-medium">
              4. Setup
            </div>
            <div class="uqf-step px-3 py-2 rounded bg-gray-100 text-gray-800 text-center text-sm font-medium">
              5. Review
            </div>
          </div>
        </div>

        <!-- Form Body -->
        <div class="flex-1 overflow-auto p-6" id="uqf-body">
          ${generateStepContent()}
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            Step <span id="uqf-step-ind">1</span> / 5
          </div>
          <div class="flex items-center gap-2">
            <button id="uqf-prev" class="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Back
            </button>
            <button id="uqf-next" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Next
            </button>
            <button id="uqf-save" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
              Save Draft
            </button>
            <button id="uqf-submit" class="px-6 py-2 text-sm bg-brand text-white rounded-md hover:bg-brand-color-light font-medium">
              Submit Quote
            </button>
          </div>
        </div>

        <!-- Hidden file inputs -->
        <input type="file" id="uqf-pdf-input" accept=".pdf" class="hidden" />
        <input type="file" id="uqf-excel-input" accept=".xlsx,.xls,.csv" class="hidden" />
      </div>
    `;

    document.body.appendChild(modal);

    // Attach event listeners
    modal.querySelector('[data-dismiss]')?.addEventListener('click', closeUnifiedQuoteForm);
    modal.querySelector('#uqf-close')?.addEventListener('click', closeUnifiedQuoteForm);
    modal.querySelector('#uqf-prev')?.addEventListener('click', previousStep);
    modal.querySelector('#uqf-next')?.addEventListener('click', nextStep);
    modal.querySelector('#uqf-save')?.addEventListener('click', saveQuote);
    modal.querySelector('#uqf-submit')?.addEventListener('click', () => saveQuote(true));
    modal.querySelector('#uqf-import-pdf')?.addEventListener('click', triggerPdfImport);
    modal.querySelector('#uqf-import-excel')?.addEventListener('click', triggerExcelImport);
    modal.querySelector('#uqf-manual-entry')?.addEventListener('click', () => setActiveStep(2));

    return modal;
  }

  function generateStepContent() {
    return `
      <!-- Step 1: Import Method -->
      <section id="uqf-step-1" class="uqf-section">
        <div class="max-w-3xl mx-auto text-center py-12">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Choose Entry Method</h3>
          <p class="text-gray-600 mb-8">Select how you'd like to enter quote information</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="border-2 border-gray-200 rounded-lg p-6 hover:border-brand hover:shadow-lg transition-all cursor-pointer" onclick="document.getElementById('uqf-pdf-input').click()">
              <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                </svg>
              </div>
              <h4 class="font-semibold text-lg mb-2">Import PDF</h4>
              <p class="text-sm text-gray-600">Upload Salesforce quote PDF for automatic data extraction</p>
            </div>

            <div class="border-2 border-gray-200 rounded-lg p-6 hover:border-brand hover:shadow-lg transition-all cursor-pointer" onclick="document.getElementById('uqf-excel-input').click()">
              <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                </svg>
              </div>
              <h4 class="font-semibold text-lg mb-2">Import Excel</h4>
              <p class="text-sm text-gray-600">Upload Excel or CSV file with quote data</p>
            </div>

            <div class="border-2 border-gray-200 rounded-lg p-6 hover:border-brand hover:shadow-lg transition-all cursor-pointer" onclick="window.setActiveStep(2)">
              <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z"/>
                </svg>
              </div>
              <h4 class="font-semibold text-lg mb-2">Manual Entry</h4>
              <p class="text-sm text-gray-600">Enter quote information manually step-by-step</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Step 2: Account Information -->
      <section id="uqf-step-2" class="uqf-section hidden">
        <h3 class="text-xl font-bold text-gray-800 mb-6">Account Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input id="uqf-customerName" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quote Name/Number</label>
            <input id="uqf-quoteName" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Service Address *</label>
            <input id="uqf-serviceAddress" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
            <input id="uqf-billingAddress" type="text" placeholder="Same as service address if blank" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">POC Name *</label>
            <input id="uqf-pocName" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">POC Email *</label>
            <input id="uqf-pocEmail" type="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">POC Phone</label>
            <input id="uqf-pocPhone" type="tel" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">POC Mobile</label>
            <input id="uqf-pocMobile" type="tel" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sales Rep</label>
            <input id="uqf-salesRep" type="text" readonly class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date of Sale</label>
            <input id="uqf-dateOfSale" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Opportunity ID</label>
            <input id="uqf-opportunityId" type="text" placeholder="Salesforce Opportunity ID" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input id="uqf-accountNumber" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
        </div>
      </section>

      <!-- Step 3: Services & Pricing -->
      <section id="uqf-step-3" class="uqf-section hidden">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">Services & Pricing</h3>
          <button id="uqf-add-service" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
            </svg>
            Add Service
          </button>
        </div>
        <div id="uqf-services" class="space-y-4"></div>
      </section>

      <!-- Step 4: Setup Requirements -->
      <section id="uqf-step-4" class="uqf-section hidden">
        <h3 class="text-xl font-bold text-gray-800 mb-6">Setup Requirements</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PNOL Requested?</label>
            <select id="uqf-pnol" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Log Book Needed?</label>
            <select id="uqf-logBook" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Operations Manager</label>
            <input id="uqf-opsManager" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Assigned Specialist</label>
            <input id="uqf-specialist" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes / Instructions</label>
            <textarea id="uqf-notes" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent"></textarea>
          </div>
        </div>
      </section>

      <!-- Step 5: Review & Submit -->
      <section id="uqf-step-5" class="uqf-section hidden">
        <h3 class="text-xl font-bold text-gray-800 mb-6">Review & Submit</h3>

        <!-- Totals Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="text-sm text-blue-700 font-medium mb-1">Total Initial</div>
            <div id="uqf-total-initial" class="text-2xl font-bold text-blue-900">$0.00</div>
          </div>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="text-sm text-green-700 font-medium mb-1">Monthly Recurring</div>
            <div id="uqf-total-monthly" class="text-2xl font-bold text-green-900">$0.00</div>
          </div>
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div class="text-sm text-purple-700 font-medium mb-1">Annual Value</div>
            <div id="uqf-total-annual" class="text-2xl font-bold text-purple-900">$0.00</div>
          </div>
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="text-sm text-orange-700 font-medium mb-1">Grand Total</div>
            <div id="uqf-grand-total" class="text-2xl font-bold text-orange-900">$0.00</div>
          </div>
        </div>

        <!-- Review Details -->
        <div id="uqf-review-content" class="bg-white border rounded-lg p-6"></div>
      </section>
    `;
  }

  // =============================================================================
  // STEP NAVIGATION
  // =============================================================================

  function setActiveStep(step) {
    currentStep = step;

    // Update step indicators
    const steps = document.querySelectorAll('#uqf-steps .uqf-step');
    steps.forEach((el, i) => {
      if (i === (step - 1)) {
        el.classList.add('bg-blue-600', 'text-white');
        el.classList.remove('bg-gray-100', 'text-gray-800');
      } else {
        el.classList.remove('bg-blue-600', 'text-white');
        el.classList.add('bg-gray-100', 'text-gray-800');
      }
    });

    // Update section visibility
    document.querySelectorAll('.uqf-section').forEach((sec, i) => {
      sec.classList.toggle('hidden', (i !== (step - 1)));
    });

    // Update step indicator
    const ind = document.getElementById('uqf-step-ind');
    if (ind) ind.textContent = String(step);

    // Show/hide navigation buttons
    const prevBtn = document.getElementById('uqf-prev');
    const nextBtn = document.getElementById('uqf-next');
    const submitBtn = document.getElementById('uqf-submit');

    if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
    if (nextBtn) nextBtn.style.display = step === 5 ? 'none' : 'inline-block';
    if (submitBtn) submitBtn.style.display = step === 5 ? 'inline-block' : 'none';
  }

  function validateStep(step) {
    if (step === 2) {
      const required = ['uqf-customerName', 'uqf-serviceAddress', 'uqf-pocName', 'uqf-pocEmail'];
      for (const id of required) {
        const el = document.getElementById(id);
        if (!el || !String(el.value || '').trim()) {
          showToast('Please fill all required fields', 'error');
          el?.focus();
          return false;
        }
      }

      // Validate email format
      const email = document.getElementById('uqf-pocEmail')?.value;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }
    }

    if (step === 3) {
      const rows = document.querySelectorAll('.uqf-service-row');
      if (rows.length === 0) {
        showToast('Please add at least one service', 'warning');
        return false;
      }

      // Validate each service
      for (const row of rows) {
        const name = row.querySelector('.uqf-s-name')?.value?.trim();
        if (!name) {
          showToast('Service name is required for all services', 'error');
          return false;
        }
      }
    }

    return true;
  }

  function previousStep() {
    if (currentStep > 1) {
      setActiveStep(currentStep - 1);
    }
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;

    if (currentStep < 5) {
      setActiveStep(currentStep + 1);

      // Trigger calculations and reviews
      if (currentStep === 4) recalculateTotals();
      if (currentStep === 5) renderReview();
    }
  }

  // =============================================================================
  // SERVICE MANAGEMENT
  // =============================================================================

  function monthsTemplate() {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return months.map(m =>
      `<label class="inline-flex items-center gap-1 mr-2 mb-2">
        <input type="checkbox" class="uqf-month rounded text-brand focus:ring-brand" value="${m}">
        <span class="text-xs">${m}</span>
      </label>`
    ).join('');
  }

  function addServiceRow(serviceData = null) {
    const host = document.getElementById('uqf-services');
    if (!host) return;

    const row = document.createElement('div');
    row.className = 'uqf-service-row border-2 border-gray-200 rounded-lg p-4 hover:border-brand transition-colors';
    row.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Service Name *</label>
          <input type="text" class="uqf-s-name w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand" value="${serviceData?.name || ''}" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Service Type</label>
          <select class="uqf-s-type w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand">
            <option value="Recurring" ${serviceData?.type === 'Recurring' ? 'selected' : ''}>Recurring</option>
            <option value="Corrective" ${serviceData?.type === 'Corrective' ? 'selected' : ''}>Corrective</option>
            <option value="Equipment" ${serviceData?.type === 'Equipment' ? 'selected' : ''}>Equipment</option>
            <option value="One-Time" ${serviceData?.type === 'One-Time' ? 'selected' : ''}>One-Time</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" class="uqf-s-start w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand" value="${serviceData?.startDate || ''}" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Initial Price ($)</label>
          <input type="number" min="0" step="0.01" class="uqf-s-initial w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand" value="${serviceData?.initialPrice || ''}" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Monthly Price ($)</label>
          <input type="number" min="0" step="0.01" class="uqf-s-monthly w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand" value="${serviceData?.monthlyPrice || ''}" />
        </div>
        <div class="flex items-end gap-2">
          <button class="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200" data-select-all>Select All Months</button>
          <button class="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200" data-clear-all>Clear All</button>
          <button class="px-3 py-2 text-xs bg-red-600 text-white rounded-md hover:bg-red-700" data-remove>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-2">Service Months</label>
        <div class="flex flex-wrap">${monthsTemplate()}</div>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Notes / Instructions</label>
        <textarea class="uqf-s-notes w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand" rows="2">${serviceData?.notes || ''}</textarea>
      </div>
    `;

    host.appendChild(row);

    // Set service months if provided
    if (serviceData?.serviceMonths) {
      row.querySelectorAll('.uqf-month').forEach(cb => {
        cb.checked = serviceData.serviceMonths.includes(cb.value);
      });
    }

    // Attach event listeners
    row.querySelector('[data-remove]')?.addEventListener('click', () => {
      row.remove();
      recalculateTotals();
    });
    row.querySelector('[data-select-all]')?.addEventListener('click', () => {
      row.querySelectorAll('.uqf-month').forEach(cb => cb.checked = true);
      recalculateTotals();
    });
    row.querySelector('[data-clear-all]')?.addEventListener('click', () => {
      row.querySelectorAll('.uqf-month').forEach(cb => cb.checked = false);
      recalculateTotals();
    });
    row.querySelectorAll('input, select, textarea').forEach(el =>
      el.addEventListener('input', () => recalculateTotals())
    );
  }

  function readServices() {
    const rows = Array.from(document.querySelectorAll('.uqf-service-row'));
    return rows.map(r => {
      const months = Array.from(r.querySelectorAll('.uqf-month'))
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      return {
        name: r.querySelector('.uqf-s-name')?.value?.trim() || '',
        type: r.querySelector('.uqf-s-type')?.value || 'Recurring',
        startDate: r.querySelector('.uqf-s-start')?.value || '',
        initialPrice: Number(r.querySelector('.uqf-s-initial')?.value || 0),
        monthlyPrice: Number(r.querySelector('.uqf-s-monthly')?.value || 0),
        serviceMonths: months,
        notes: r.querySelector('.uqf-s-notes')?.value?.trim() || ''
      };
    });
  }

  function recalculateTotals() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const services = readServices();

      const totals = {
        totalInitial: services.reduce((sum, s) => sum + (s.initialPrice || 0), 0),
        totalMonthly: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0), 0),
        totalAnnual: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0) * (s.serviceMonths?.length || 0), 0),
      };
      totals.grandTotal = totals.totalInitial + totals.totalAnnual;

      // Update draft
      const draft = getDraft();
      draft.totals = totals;
      draft.services = services;
      saveDraft(draft);

      // Update UI
      const ti = document.getElementById('uqf-total-initial');
      const tm = document.getElementById('uqf-total-monthly');
      const ta = document.getElementById('uqf-total-annual');
      const gt = document.getElementById('uqf-grand-total');

      if (ti) ti.textContent = formatCurrency(totals.totalInitial);
      if (tm) tm.textContent = formatCurrency(totals.totalMonthly);
      if (ta) ta.textContent = formatCurrency(totals.totalAnnual);
      if (gt) gt.textContent = formatCurrency(totals.grandTotal);
    }, 300);
  }

  // =============================================================================
  // REVIEW & SUBMISSION
  // =============================================================================

  function renderReview() {
    const host = document.getElementById('uqf-review-content');
    if (!host) return;

    const quote = readForm();

    host.innerHTML = `
      <div class="space-y-6">
        <!-- Account Information -->
        <div>
          <h4 class="font-semibold text-lg text-gray-800 mb-3 pb-2 border-b">Account Information</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-gray-600">Customer:</span> <span class="font-medium">${quote.customerName || '—'}</span></div>
            <div><span class="text-gray-600">Quote #:</span> <span class="font-medium">${quote.quoteName || '—'}</span></div>
            <div><span class="text-gray-600">Service Address:</span> <span class="font-medium">${quote.serviceAddress || '—'}</span></div>
            <div><span class="text-gray-600">Billing Address:</span> <span class="font-medium">${quote.billingAddress || 'Same as service'}</span></div>
            <div><span class="text-gray-600">POC:</span> <span class="font-medium">${quote.poc.name || '—'}</span></div>
            <div><span class="text-gray-600">POC Email:</span> <span class="font-medium">${quote.poc.email || '—'}</span></div>
            <div><span class="text-gray-600">Sales Rep:</span> <span class="font-medium">${quote.salesRep || '—'}</span></div>
            <div><span class="text-gray-600">Date:</span> <span class="font-medium">${quote.dateOfSale || '—'}</span></div>
          </div>
        </div>

        <!-- Services -->
        <div>
          <h4 class="font-semibold text-lg text-gray-800 mb-3 pb-2 border-b">Services (${quote.services.length})</h4>
          <div class="space-y-3">
            ${quote.services.map(s => `
              <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
                <div class="flex justify-between items-start mb-2">
                  <div class="font-medium text-gray-800">${s.name}</div>
                  <div class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${s.type}</div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Initial: <span class="font-medium text-gray-800">${formatCurrency(s.initialPrice)}</span></div>
                  <div>Monthly: <span class="font-medium text-gray-800">${formatCurrency(s.monthlyPrice)}</span></div>
                  <div class="col-span-2">Months: <span class="font-medium text-gray-800">${s.serviceMonths.join(', ') || 'None'}</span></div>
                  ${s.startDate ? `<div class="col-span-2">Start: <span class="font-medium text-gray-800">${s.startDate}</span></div>` : ''}
                  ${s.notes ? `<div class="col-span-2 mt-1 pt-1 border-t text-xs">${s.notes}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Setup Requirements -->
        <div>
          <h4 class="font-semibold text-lg text-gray-800 mb-3 pb-2 border-b">Setup Requirements</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-gray-600">PNOL:</span> <span class="font-medium">${quote.setup.pnol ? 'Yes' : 'No'}</span></div>
            <div><span class="text-gray-600">Log Book:</span> <span class="font-medium">${quote.setup.logBook ? 'Yes' : 'No'}</span></div>
            <div><span class="text-gray-600">Ops Manager:</span> <span class="font-medium">${quote.setup.opsManager || '—'}</span></div>
            <div><span class="text-gray-600">Specialist:</span> <span class="font-medium">${quote.setup.specialist || '—'}</span></div>
            ${quote.setup.notes ? `<div class="col-span-2 mt-2 pt-2 border-t"><span class="text-gray-600">Notes:</span><div class="mt-1 font-medium">${quote.setup.notes}</div></div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function readForm() {
    const services = readServices();
    const totals = {
      totalInitial: services.reduce((sum, s) => sum + (s.initialPrice || 0), 0),
      totalMonthly: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0), 0),
      totalAnnual: services.filter(s => s.type === 'Recurring').reduce((sum, s) => sum + (s.monthlyPrice || 0) * (s.serviceMonths?.length || 0), 0),
    };
    totals.grandTotal = totals.totalInitial + totals.totalAnnual;

    return {
      customerName: document.getElementById('uqf-customerName')?.value?.trim() || '',
      quoteName: document.getElementById('uqf-quoteName')?.value?.trim() || '',
      serviceAddress: document.getElementById('uqf-serviceAddress')?.value?.trim() || '',
      billingAddress: document.getElementById('uqf-billingAddress')?.value?.trim() || '',
      poc: {
        name: document.getElementById('uqf-pocName')?.value?.trim() || '',
        email: document.getElementById('uqf-pocEmail')?.value?.trim() || '',
        phone: document.getElementById('uqf-pocPhone')?.value?.trim() || '',
        mobile: document.getElementById('uqf-pocMobile')?.value?.trim() || '',
      },
      salesRep: document.getElementById('uqf-salesRep')?.value?.trim() || '',
      dateOfSale: document.getElementById('uqf-dateOfSale')?.value || '',
      opportunityId: document.getElementById('uqf-opportunityId')?.value?.trim() || '',
      accountNumber: document.getElementById('uqf-accountNumber')?.value?.trim() || '',
      setup: {
        pnol: (document.getElementById('uqf-pnol')?.value || 'no') === 'yes',
        logBook: (document.getElementById('uqf-logBook')?.value || 'no') === 'yes',
        opsManager: document.getElementById('uqf-opsManager')?.value?.trim() || '',
        specialist: document.getElementById('uqf-specialist')?.value?.trim() || '',
        notes: document.getElementById('uqf-notes')?.value?.trim() || '',
      },
      services,
      totals,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      createdBy: window.currentUser?.email || 'unknown'
    };
  }

  function saveQuote(submit = false) {
    const quote = readForm();

    if (submit) {
      // Validate before submission
      if (!quote.customerName || !quote.serviceAddress || !quote.poc.name || !quote.poc.email) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      if (quote.services.length === 0) {
        showToast('Please add at least one service', 'error');
        return;
      }

      quote.status = 'Submitted';
    }

    saveDraft(quote);

    // Call backend to save
    if (typeof google !== 'undefined' && google.script?.run) {
      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            showToast(submit ? 'Quote submitted successfully!' : 'Draft saved successfully', 'success');
            if (submit) {
              setTimeout(() => {
                closeUnifiedQuoteForm();
                // Refresh dashboard if function exists
                if (typeof window.refreshDashboard === 'function') {
                  window.refreshDashboard();
                }
              }, 1500);
            }
          } else {
            showToast('Error saving quote: ' + (response.error || 'Unknown error'), 'error');
          }
        })
        .withFailureHandler(function(error) {
          showToast('Error saving quote: ' + error.message, 'error');
        })
        .saveSalesEntry(quote);
    } else {
      // Mock save for development
      console.log('Quote saved (mock):', quote);
      showToast(submit ? 'Quote submitted successfully!' : 'Draft saved successfully', 'success');
      if (submit) {
        setTimeout(closeUnifiedQuoteForm, 1500);
      }
    }
  }

  // =============================================================================
  // PDF & EXCEL IMPORT HANDLERS
  // =============================================================================

  function triggerPdfImport() {
    const input = document.getElementById('uqf-pdf-input');
    if (input) input.click();
  }

  function triggerExcelImport() {
    const input = document.getElementById('uqf-excel-input');
    if (input) input.click();
  }

  async function handlePdfImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('uqf-import-status');
    if (statusEl) statusEl.textContent = 'Parsing PDF...';

    try {
      parsedPdfData = await parseSalesforcePdf(file);
      populateFromPdfData(parsedPdfData);

      if (statusEl) statusEl.textContent = 'PDF imported successfully!';
      showToast('PDF imported successfully! Review and adjust data as needed.', 'success');

      // Move to account info step
      setTimeout(() => setActiveStep(2), 500);

    } catch(error) {
      if (statusEl) statusEl.textContent = 'Error parsing PDF';
      showToast('Error parsing PDF: ' + error.message, 'error');
      console.error('PDF import error:', error);
    }

    // Reset file input
    event.target.value = '';
  }

  function populateFromPdfData(data) {
    if (!data) return;

    // Populate account fields
    if (data.customerName) document.getElementById('uqf-customerName').value = data.customerName;
    if (data.quoteName) document.getElementById('uqf-quoteName').value = data.quoteName;
    if (data.serviceAddress) document.getElementById('uqf-serviceAddress').value = data.serviceAddress;
    if (data.billingAddress) document.getElementById('uqf-billingAddress').value = data.billingAddress;
    if (data.poc?.name) document.getElementById('uqf-pocName').value = data.poc.name;
    if (data.poc?.email) document.getElementById('uqf-pocEmail').value = data.poc.email;
    if (data.poc?.phone) document.getElementById('uqf-pocPhone').value = data.poc.phone;
    if (data.poc?.mobile) document.getElementById('uqf-pocMobile').value = data.poc.mobile;
    if (data.opportunityId) document.getElementById('uqf-opportunityId').value = data.opportunityId;
    if (data.accountNumber) document.getElementById('uqf-accountNumber').value = data.accountNumber;

    // Clear existing services
    const servicesHost = document.getElementById('uqf-services');
    if (servicesHost) servicesHost.innerHTML = '';

    // Add imported services
    if (data.services && data.services.length > 0) {
      data.services.forEach(service => addServiceRow(service));
      recalculateTotals();
    }

    // Save to draft
    saveDraft(data);
  }

  async function handleExcelImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('uqf-import-status');
    if (statusEl) statusEl.textContent = 'Parsing Excel...';

    try {
      // Ensure SheetJS is loaded
      if (!window.XLSX) {
        throw new Error('Excel library not loaded. Please refresh the page.');
      }

      const data = await file.arrayBuffer();
      const workbook = window.XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = window.XLSX.utils.sheet_to_json(firstSheet);

      // Parse Excel data (customize based on your Excel format)
      const parsedData = parseExcelData(jsonData);
      populateFromPdfData(parsedData);

      if (statusEl) statusEl.textContent = 'Excel imported successfully!';
      showToast('Excel imported successfully! Review and adjust data as needed.', 'success');

      setTimeout(() => setActiveStep(2), 500);

    } catch(error) {
      if (statusEl) statusEl.textContent = 'Error parsing Excel';
      showToast('Error parsing Excel: ' + error.message, 'error');
      console.error('Excel import error:', error);
    }

    event.target.value = '';
  }

  function parseExcelData(jsonData) {
    // Customize this based on your Excel format
    // This is a basic example
    const data = {
      customerName: '',
      services: [],
      totals: { totalInitial: 0, totalMonthly: 0, totalAnnual: 0, grandTotal: 0 }
    };

    jsonData.forEach((row, index) => {
      if (index === 0) {
        // First row might contain customer info
        data.customerName = row['Customer Name'] || row['Account'] || '';
        data.serviceAddress = row['Address'] || '';
      }

      // Extract services
      if (row['Service'] || row['Service Name']) {
        data.services.push({
          name: row['Service'] || row['Service Name'] || '',
          type: row['Type'] || 'Recurring',
          initialPrice: Number(row['Initial'] || row['Initial Price'] || 0),
          monthlyPrice: Number(row['Monthly'] || row['Monthly Price'] || 0),
          serviceMonths: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
          notes: 'Imported from Excel'
        });
      }
    });

    return data;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  function setSmartDefaults() {
    const name = window.currentUser?.name || '';
    const branch = window.currentUser?.branch || '';

    const elRep = document.getElementById('uqf-salesRep');
    if (elRep) elRep.value = name;

    const elDate = document.getElementById('uqf-dateOfSale');
    if (elDate) elDate.value = new Date().toISOString().split('T')[0];

    if (branch) {
      const draft = getDraft();
      draft.branch = branch;
      saveDraft(draft);
    }
  }

  function restoreDraft() {
    const draft = getDraft();
    if (!draft || Object.keys(draft).length === 0) return;

    // Restore account fields
    const bindValue = (id, val) => {
      const el = document.getElementById(id);
      if (el && val != null) el.value = val;
    };

    bindValue('uqf-customerName', draft.customerName);
    bindValue('uqf-quoteName', draft.quoteName);
    bindValue('uqf-serviceAddress', draft.serviceAddress);
    bindValue('uqf-billingAddress', draft.billingAddress);
    bindValue('uqf-pocName', draft.poc?.name);
    bindValue('uqf-pocEmail', draft.poc?.email);
    bindValue('uqf-pocPhone', draft.poc?.phone);
    bindValue('uqf-pocMobile', draft.poc?.mobile);
    bindValue('uqf-salesRep', draft.salesRep);
    bindValue('uqf-dateOfSale', draft.dateOfSale);
    bindValue('uqf-opportunityId', draft.opportunityId);
    bindValue('uqf-accountNumber', draft.accountNumber);
    bindValue('uqf-pnol', draft.setup?.pnol ? 'yes' : 'no');
    bindValue('uqf-logBook', draft.setup?.logBook ? 'yes' : 'no');
    bindValue('uqf-opsManager', draft.setup?.opsManager);
    bindValue('uqf-specialist', draft.setup?.specialist);
    bindValue('uqf-notes', draft.setup?.notes);

    // Restore services
    const servicesHost = document.getElementById('uqf-services');
    if (servicesHost) servicesHost.innerHTML = '';

    (draft.services || []).forEach(service => addServiceRow(service));
    recalculateTotals();
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  window.openUnifiedQuoteForm = function() {
    const modal = ensureModal();
    setActiveStep(1);
    setSmartDefaults();
    restoreDraft();

    // Attach file input listeners
    const pdfInput = document.getElementById('uqf-pdf-input');
    const excelInput = document.getElementById('uqf-excel-input');

    if (pdfInput) {
      pdfInput.removeEventListener('change', handlePdfImport);
      pdfInput.addEventListener('change', handlePdfImport);
    }

    if (excelInput) {
      excelInput.removeEventListener('change', handleExcelImport);
      excelInput.addEventListener('change', handleExcelImport);
    }

    // Attach service button listener
    const addServiceBtn = document.getElementById('uqf-add-service');
    if (addServiceBtn) {
      addServiceBtn.removeEventListener('click', addServiceRow);
      addServiceBtn.addEventListener('click', () => addServiceRow());
    }
  };

  // Expose functions globally
  window.closeUnifiedQuoteForm = closeUnifiedQuoteForm;
  window.setActiveStep = setActiveStep;
  window.addUnifiedServiceRow = addServiceRow;

  // Alias for backward compatibility
  window.openSalesEntryForm = window.openUnifiedQuoteForm;

})();
