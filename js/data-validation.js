/**
 * ===============================================================================
 * DATA VALIDATION & ERROR HANDLING
 * ===============================================================================
 * Comprehensive validation library for forms, data integrity, and error handling
 */

(function() {
  'use strict';

  //=============================================================================
  // VALIDATION RULES
  //=============================================================================

  const ValidationRules = {
    // Required field validation
    required: (value, fieldName = 'Field') => {
      if (value === null || value === undefined || String(value).trim() === '') {
        return { valid: false, error: `${fieldName} is required` };
      }
      return { valid: true };
    },

    // Email validation
    email: (value, fieldName = 'Email') => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid email address` };
      }
      return { valid: true };
    },

    // Phone number validation (US format)
    phone: (value, fieldName = 'Phone number') => {
      if (!value) return { valid: true }; // Optional

      const phoneRegex = /^[\d\s\-\(\)]+$/;
      const digits = value.replace(/\D/g, '');

      if (!phoneRegex.test(value) || digits.length < 10) {
        return { valid: false, error: `${fieldName} must be a valid phone number` };
      }
      return { valid: true };
    },

    // Number validation
    number: (value, fieldName = 'Value') => {
      if (value === '' || value === null || value === undefined) {
        return { valid: true }; // Optional
      }

      if (isNaN(value)) {
        return { valid: false, error: `${fieldName} must be a valid number` };
      }
      return { valid: true };
    },

    // Positive number validation
    positiveNumber: (value, fieldName = 'Value') => {
      const numCheck = ValidationRules.number(value, fieldName);
      if (!numCheck.valid) return numCheck;

      if (value !== '' && Number(value) < 0) {
        return { valid: false, error: `${fieldName} must be a positive number` };
      }
      return { valid: true };
    },

    // Currency validation
    currency: (value, fieldName = 'Amount') => {
      if (value === '' || value === null || value === undefined) {
        return { valid: true };
      }

      const numValue = typeof value === 'string' ?
        parseFloat(value.replace(/[$,]/g, '')) :
        Number(value);

      if (isNaN(numValue) || numValue < 0) {
        return { valid: false, error: `${fieldName} must be a valid currency amount` };
      }
      return { valid: true };
    },

    // Date validation
    date: (value, fieldName = 'Date') => {
      if (!value) return { valid: true };

      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: `${fieldName} must be a valid date` };
      }
      return { valid: true };
    },

    // Future date validation
    futureDate: (value, fieldName = 'Date') => {
      const dateCheck = ValidationRules.date(value, fieldName);
      if (!dateCheck.valid) return dateCheck;

      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date < today) {
          return { valid: false, error: `${fieldName} must be in the future` };
        }
      }
      return { valid: true };
    },

    // Min length validation
    minLength: (value, min, fieldName = 'Field') => {
      if (value && String(value).length < min) {
        return { valid: false, error: `${fieldName} must be at least ${min} characters` };
      }
      return { valid: true };
    },

    // Max length validation
    maxLength: (value, max, fieldName = 'Field') => {
      if (value && String(value).length > max) {
        return { valid: false, error: `${fieldName} must be no more than ${max} characters` };
      }
      return { valid: true };
    },

    // Pattern validation
    pattern: (value, pattern, fieldName = 'Field') => {
      if (value && !pattern.test(value)) {
        return { valid: false, error: `${fieldName} format is invalid` };
      }
      return { valid: true };
    },

    // ZIP code validation
    zipCode: (value, fieldName = 'ZIP code') => {
      if (!value) return { valid: true };

      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(value)) {
        return { valid: false, error: `${fieldName} must be a valid ZIP code` };
      }
      return { valid: true };
    },

    // State abbreviation validation
    state: (value, fieldName = 'State') => {
      if (!value) return { valid: true };

      const states = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ];

      if (!states.includes(value.toUpperCase())) {
        return { valid: false, error: `${fieldName} must be a valid US state abbreviation` };
      }
      return { valid: true };
    }
  };

  //=============================================================================
  // FORM VALIDATION
  //=============================================================================

  /**
   * Validate a form element
   * @param {HTMLFormElement} form - Form to validate
   * @param {Object} rules - Validation rules object
   * @returns {Object} Validation result
   */
  function validateForm(form, rules = {}) {
    const errors = {};
    let isValid = true;

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const element = form.elements[fieldName];
      if (!element) continue;

      const value = element.value;
      const fieldResult = validateField(value, fieldRules, fieldName);

      if (!fieldResult.valid) {
        errors[fieldName] = fieldResult.errors;
        isValid = false;

        // Add error styling
        element.classList.add('border-red-500', 'focus:ring-red-500');
        element.classList.remove('border-gray-300');

        // Show error message
        showFieldError(element, fieldResult.errors[0]);
      } else {
        // Remove error styling
        element.classList.remove('border-red-500', 'focus:ring-red-500');
        element.classList.add('border-gray-300');
        hideFieldError(element);
      }
    }

    return { valid: isValid, errors };
  }

  /**
   * Validate a single field
   * @param {any} value - Field value
   * @param {Array|Object} rules - Validation rules
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  function validateField(value, rules, fieldName = 'Field') {
    const errors = [];
    let isValid = true;

    // Convert single rule to array
    const ruleList = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleList) {
      let result;

      if (typeof rule === 'string') {
        // Simple rule name
        result = ValidationRules[rule]?.(value, fieldName);
      } else if (typeof rule === 'function') {
        // Custom validation function
        result = rule(value, fieldName);
      } else if (typeof rule === 'object') {
        // Rule with parameters
        const { type, params, message } = rule;
        result = ValidationRules[type]?.(value, ...(params || []), fieldName);
        if (result && !result.valid && message) {
          result.error = message;
        }
      }

      if (result && !result.valid) {
        errors.push(result.error);
        isValid = false;
      }
    }

    return { valid: isValid, errors };
  }

  /**
   * Show error message for a field
   * @param {HTMLElement} element - Form element
   * @param {string} message - Error message
   */
  function showFieldError(element, message) {
    // Remove existing error
    hideFieldError(element);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-600 text-xs mt-1';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');

    element.parentNode.appendChild(errorDiv);
  }

  /**
   * Hide error message for a field
   * @param {HTMLElement} element - Form element
   */
  function hideFieldError(element) {
    const existingError = element.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  /**
   * Clear all form errors
   * @param {HTMLFormElement} form - Form to clear
   */
  function clearFormErrors(form) {
    // Remove all error classes
    form.querySelectorAll('.border-red-500').forEach(el => {
      el.classList.remove('border-red-500', 'focus:ring-red-500');
      el.classList.add('border-gray-300');
    });

    // Remove all error messages
    form.querySelectorAll('.field-error').forEach(el => el.remove());
  }

  //=============================================================================
  // QUOTE/PROPOSAL VALIDATION
  //=============================================================================

  const QuoteValidationRules = {
    customerName: ['required', { type: 'minLength', params: [2] }],
    quoteName: [],
    serviceAddress: ['required', { type: 'minLength', params: [5] }],
    billingAddress: [],
    pocName: ['required', { type: 'minLength', params: [2] }],
    pocEmail: ['required', 'email'],
    pocPhone: ['phone'],
    pocMobile: ['phone'],
    salesRep: [],
    dateOfSale: ['date'],
    opportunityId: [],
    accountNumber: []
  };

  function validateQuote(quoteData) {
    const errors = {};
    let isValid = true;

    // Validate account information
    for (const [field, rules] of Object.entries(QuoteValidationRules)) {
      const value = field.startsWith('poc') ?
        quoteData.poc?.[field.replace('poc', '').toLowerCase()] :
        quoteData[field];

      const result = validateField(value, rules, field);
      if (!result.valid) {
        errors[field] = result.errors;
        isValid = false;
      }
    }

    // Validate services
    if (!quoteData.services || quoteData.services.length === 0) {
      errors.services = ['At least one service is required'];
      isValid = false;
    } else {
      quoteData.services.forEach((service, index) => {
        const serviceErrors = {};

        if (!service.name || service.name.trim() === '') {
          serviceErrors.name = ['Service name is required'];
          isValid = false;
        }

        if (service.initialPrice < 0) {
          serviceErrors.initialPrice = ['Initial price cannot be negative'];
          isValid = false;
        }

        if (service.monthlyPrice < 0) {
          serviceErrors.monthlyPrice = ['Monthly price cannot be negative'];
          isValid = false;
        }

        if (service.type === 'Recurring' && service.serviceMonths.length === 0) {
          serviceErrors.serviceMonths = ['Recurring services must have at least one service month'];
          isValid = false;
        }

        if (Object.keys(serviceErrors).length > 0) {
          errors[`service_${index}`] = serviceErrors;
        }
      });
    }

    // Validate totals
    if (quoteData.totals) {
      if (quoteData.totals.totalInitial < 0 || quoteData.totals.totalMonthly < 0) {
        errors.totals = ['Totals cannot be negative'];
        isValid = false;
      }
    }

    return { valid: isValid, errors };
  }

  //=============================================================================
  // DATA SANITIZATION
  //=============================================================================

  /**
   * Sanitize string input
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value
   */
  function sanitizeString(value) {
    if (typeof value !== 'string') return value;

    return value
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '');
  }

  /**
   * Sanitize number input
   * @param {any} value - Value to sanitize
   * @returns {number} Sanitized number
   */
  function sanitizeNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /**
   * Sanitize currency input
   * @param {any} value - Value to sanitize
   * @returns {number} Sanitized currency amount
   */
  function sanitizeCurrency(value) {
    if (typeof value === 'number') return Math.max(0, value);
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[$,]/g, ''));
      return isNaN(num) ? 0 : Math.max(0, num);
    }
    return 0;
  }

  /**
   * Sanitize quote data
   * @param {Object} quoteData - Quote data to sanitize
   * @returns {Object} Sanitized quote data
   */
  function sanitizeQuoteData(quoteData) {
    const sanitized = {
      ...quoteData,
      customerName: sanitizeString(quoteData.customerName),
      quoteName: sanitizeString(quoteData.quoteName),
      serviceAddress: sanitizeString(quoteData.serviceAddress),
      billingAddress: sanitizeString(quoteData.billingAddress),
      opportunityId: sanitizeString(quoteData.opportunityId),
      accountNumber: sanitizeString(quoteData.accountNumber),
      poc: {
        name: sanitizeString(quoteData.poc?.name),
        email: sanitizeString(quoteData.poc?.email),
        phone: sanitizeString(quoteData.poc?.phone),
        mobile: sanitizeString(quoteData.poc?.mobile)
      },
      services: (quoteData.services || []).map(service => ({
        ...service,
        name: sanitizeString(service.name),
        initialPrice: sanitizeCurrency(service.initialPrice),
        monthlyPrice: sanitizeCurrency(service.monthlyPrice),
        notes: sanitizeString(service.notes)
      })),
      setup: {
        ...quoteData.setup,
        opsManager: sanitizeString(quoteData.setup?.opsManager),
        specialist: sanitizeString(quoteData.setup?.specialist),
        notes: sanitizeString(quoteData.setup?.notes)
      }
    };

    return sanitized;
  }

  //=============================================================================
  // ERROR HANDLING
  //=============================================================================

  /**
   * Global error handler
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  function handleError(error, context = 'Application') {
    console.error(`[${context}] Error:`, error);

    // Log to external service if available
    if (window.errorLogger) {
      window.errorLogger.log(error, context);
    }

    // Show user-friendly error message
    showToast(`An error occurred: ${error.message}`, 'error');
  }

  /**
   * Try-catch wrapper with error handling
   * @param {Function} fn - Function to execute
   * @param {string} context - Error context
   * @returns {any} Function result or null on error
   */
  async function tryCatch(fn, context = 'Operation') {
    try {
      return await fn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, warning, info)
   */
  function showToast(message, type = 'info') {
    const toast = document.getElementById('appToast');
    const toastMsg = document.getElementById('appToastMessage');
    const toastInner = document.getElementById('appToastInner');

    if (toast && toastMsg && toastInner) {
      toastMsg.textContent = message;

      toastInner.className = 'px-4 py-2 rounded-md shadow-lg text-white text-sm';
      const colors = {
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        success: 'bg-green-600',
        info: 'bg-blue-600'
      };
      toastInner.classList.add(colors[type] || colors.info);

      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }
  }

  //=============================================================================
  // EXPORT PUBLIC API
  //=============================================================================

  window.DataValidation = {
    // Validation rules
    rules: ValidationRules,

    // Form validation
    validateForm,
    validateField,
    clearFormErrors,
    showFieldError,
    hideFieldError,

    // Quote validation
    validateQuote,
    QuoteValidationRules,

    // Data sanitization
    sanitizeString,
    sanitizeNumber,
    sanitizeCurrency,
    sanitizeQuoteData,

    // Error handling
    handleError,
    tryCatch,
    showToast
  };

})();
