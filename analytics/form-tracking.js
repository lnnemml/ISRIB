/**
 * ISRIB Analytics - Form Interaction Tracking
 * Version: 1.0.0
 *
 * Tracks detailed form interactions including:
 * - Form start (first field focus)
 * - Field-level interactions
 * - Validation errors
 * - Form abandonment
 * - Submission success/failure
 */

(function() {
  'use strict';

  const CONFIG = {
    // Forms to track
    formSelectors: [
      '#checkoutForm',
      '#contactForm',
      '#emailForm',
      '.signup-form',
      '[data-track-form]'
    ],

    // Field types to track
    trackableFields: ['input', 'select', 'textarea'],

    // Ignore these field types
    ignoreFields: ['hidden', 'submit', 'button', 'reset'],

    // Sensitive fields (don't track values)
    sensitiveFields: ['password', 'card', 'cvv', 'ssn', 'credit'],

    // Minimum interaction time to track (ms)
    minInteractionTime: 500,

    // Debug mode
    debug: false
  };

  // Form state tracking
  const formStates = new Map();

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[Form Tracking]', message, data || '');
    }
  }

  function pushEvent(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      ...params
    });
  }

  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.includes('product_')) return 'product';
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('contact')) return 'contact';
    return 'other';
  }

  function getFormId(form) {
    return form.id || form.name || form.getAttribute('data-form-id') ||
           'form_' + Math.random().toString(36).substr(2, 6);
  }

  function getFormType(form) {
    const id = (form.id || '').toLowerCase();
    const action = (form.action || '').toLowerCase();
    const classes = (form.className || '').toLowerCase();

    if (id.includes('checkout') || action.includes('checkout')) return 'checkout';
    if (id.includes('contact') || action.includes('contact')) return 'contact';
    if (id.includes('signup') || id.includes('subscribe') || classes.includes('email')) return 'email_capture';
    if (id.includes('search')) return 'search';

    return 'other';
  }

  function getFieldName(field) {
    return field.name || field.id || field.placeholder || field.getAttribute('aria-label') || 'unknown';
  }

  function isSensitiveField(field) {
    const name = getFieldName(field).toLowerCase();
    const type = (field.type || '').toLowerCase();

    return type === 'password' ||
           CONFIG.sensitiveFields.some(function(s) { return name.includes(s); });
  }

  function getFieldType(field) {
    if (field.tagName === 'SELECT') return 'select';
    if (field.tagName === 'TEXTAREA') return 'textarea';
    return field.type || 'text';
  }

  function shouldTrackField(field) {
    const type = field.type || '';
    return !CONFIG.ignoreFields.includes(type);
  }

  function hasValue(field) {
    if (field.type === 'checkbox' || field.type === 'radio') {
      return field.checked;
    }
    return field.value && field.value.trim().length > 0;
  }

  // ============================================
  // FORM STATE MANAGEMENT
  // ============================================

  function getOrCreateFormState(form) {
    const formId = getFormId(form);

    if (!formStates.has(formId)) {
      formStates.set(formId, {
        formId: formId,
        formType: getFormType(form),
        started: false,
        startTime: null,
        lastActiveField: null,
        fieldsInteracted: new Set(),
        fieldsCompleted: new Set(),
        fieldErrors: new Map(),
        currentFieldStart: null,
        submitted: false
      });
    }

    return formStates.get(formId);
  }

  // ============================================
  // FORM START TRACKING
  // ============================================

  function handleFormStart(form, field) {
    const state = getOrCreateFormState(form);

    if (!state.started) {
      state.started = true;
      state.startTime = Date.now();

      pushEvent('form_start', {
        event_category: 'form',
        form_id: state.formId,
        form_type: state.formType,
        first_field: getFieldName(field),
        page_type: getPageType()
      });

      log('Form start:', { formId: state.formId, firstField: getFieldName(field) });
    }
  }

  // ============================================
  // FIELD INTERACTION TRACKING
  // ============================================

  function handleFieldFocus(form, field) {
    if (!shouldTrackField(field)) return;

    const state = getOrCreateFormState(form);
    const fieldName = getFieldName(field);

    // Track form start if not started
    handleFormStart(form, field);

    // Record field focus
    state.currentFieldStart = Date.now();
    state.lastActiveField = fieldName;
    state.fieldsInteracted.add(fieldName);

    // Get field position
    const allFields = form.querySelectorAll(CONFIG.trackableFields.join(','));
    let fieldIndex = 0;
    for (let i = 0; i < allFields.length; i++) {
      if (allFields[i] === field) {
        fieldIndex = i + 1;
        break;
      }
    }

    pushEvent('form_field_focus', {
      event_category: 'form',
      form_id: state.formId,
      form_type: state.formType,
      field_name: fieldName,
      field_type: getFieldType(field),
      field_index: fieldIndex,
      total_fields: allFields.length,
      fields_completed: state.fieldsCompleted.size,
      page_type: getPageType()
    });
  }

  function handleFieldBlur(form, field) {
    if (!shouldTrackField(field)) return;

    const state = getOrCreateFormState(form);
    const fieldName = getFieldName(field);
    const timeSpent = state.currentFieldStart ? Date.now() - state.currentFieldStart : 0;

    // Check if field has value
    const completed = hasValue(field);
    const valid = field.checkValidity ? field.checkValidity() : true;

    if (completed) {
      state.fieldsCompleted.add(fieldName);
    }

    // Only track if meaningful interaction
    if (timeSpent >= CONFIG.minInteractionTime) {
      pushEvent('form_field_complete', {
        event_category: 'form',
        form_id: state.formId,
        form_type: state.formType,
        field_name: fieldName,
        field_type: getFieldType(field),
        field_completed: completed,
        field_valid: valid,
        time_spent_ms: timeSpent,
        fields_completed_count: state.fieldsCompleted.size,
        page_type: getPageType()
      });
    }

    // Track validation error if invalid
    if (!valid && completed) {
      handleFieldError(form, field, field.validationMessage || 'Validation failed');
    }
  }

  function handleFieldError(form, field, errorMessage) {
    const state = getOrCreateFormState(form);
    const fieldName = getFieldName(field);

    // Track error count per field
    const errorCount = (state.fieldErrors.get(fieldName) || 0) + 1;
    state.fieldErrors.set(fieldName, errorCount);

    pushEvent('form_field_error', {
      event_category: 'form',
      form_id: state.formId,
      form_type: state.formType,
      field_name: fieldName,
      field_type: getFieldType(field),
      error_message: errorMessage.substring(0, 100),
      error_count: errorCount,
      page_type: getPageType()
    });

    log('Field error:', { field: fieldName, error: errorMessage, count: errorCount });
  }

  // ============================================
  // FORM ABANDONMENT TRACKING
  // ============================================

  function trackFormAbandonment() {
    formStates.forEach(function(state) {
      if (state.started && !state.submitted) {
        const timeSpent = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;

        pushEvent('form_abandon', {
          event_category: 'form',
          form_id: state.formId,
          form_type: state.formType,
          last_field: state.lastActiveField,
          fields_interacted: state.fieldsInteracted.size,
          fields_completed: state.fieldsCompleted.size,
          field_errors_total: Array.from(state.fieldErrors.values()).reduce(function(a, b) { return a + b; }, 0),
          time_spent_seconds: timeSpent,
          page_type: getPageType()
        });

        log('Form abandonment:', {
          formId: state.formId,
          fieldsCompleted: state.fieldsCompleted.size,
          timeSpent: timeSpent
        });
      }
    });
  }

  // ============================================
  // FORM SUBMISSION TRACKING
  // ============================================

  function handleFormSubmit(form, event) {
    const state = getOrCreateFormState(form);

    // Mark as submitted to prevent abandonment tracking
    state.submitted = true;

    const timeSpent = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;

    // Check form validity
    const isValid = form.checkValidity ? form.checkValidity() : true;

    pushEvent('form_submit', {
      event_category: 'form',
      form_id: state.formId,
      form_type: state.formType,
      submit_valid: isValid,
      fields_completed: state.fieldsCompleted.size,
      fields_with_errors: state.fieldErrors.size,
      time_to_complete_seconds: timeSpent,
      page_type: getPageType()
    });

    log('Form submit:', {
      formId: state.formId,
      valid: isValid,
      fieldsCompleted: state.fieldsCompleted.size,
      timeSpent: timeSpent
    });
  }

  // ============================================
  // EMAIL CAPTURE TRACKING
  // ============================================

  function initEmailCaptureTracking() {
    // Track popup/modal email captures
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"]');

    emailInputs.forEach(function(input) {
      const form = input.closest('form');
      if (!form) return;

      // Determine capture location
      let captureLocation = 'inline';
      if (input.closest('.popup, .modal, [data-popup]')) {
        captureLocation = 'popup';
      } else if (input.closest('footer, .footer')) {
        captureLocation = 'footer';
      } else if (input.closest('.hero, .hero-section')) {
        captureLocation = 'hero';
      }

      form.addEventListener('submit', function(e) {
        const hasConsent = form.querySelector('[name*="consent"], [name*="gdpr"]')?.checked !== false;

        pushEvent('email_capture', {
          event_category: 'form',
          capture_location: captureLocation,
          has_consent: hasConsent,
          page_type: getPageType()
        });
      });
    });
  }

  // ============================================
  // CHECKOUT-SPECIFIC TRACKING
  // ============================================

  function initCheckoutFormTracking() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    // Track checkout steps
    const steps = [
      { selector: '#shippingSection, [data-step="shipping"]', name: 'shipping' },
      { selector: '#paymentSection, [data-step="payment"]', name: 'payment' },
      { selector: '#reviewSection, [data-step="review"]', name: 'review' }
    ];

    let currentStep = 0;

    // Observe section visibility for step tracking
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const stepName = entry.target.dataset.stepName;
          const stepIndex = parseInt(entry.target.dataset.stepIndex);

          if (stepIndex > currentStep) {
            currentStep = stepIndex;

            pushEvent('checkout_step', {
              event_category: 'ecommerce',
              step_number: stepIndex,
              step_name: stepName,
              page_type: 'checkout'
            });
          }
        }
      });
    }, { threshold: 0.5 });

    steps.forEach(function(step, index) {
      const element = document.querySelector(step.selector);
      if (element) {
        element.dataset.stepName = step.name;
        element.dataset.stepIndex = index + 1;
        observer.observe(element);
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Find all trackable forms
    const forms = document.querySelectorAll(CONFIG.formSelectors.join(','));

    forms.forEach(function(form) {
      const fields = form.querySelectorAll(CONFIG.trackableFields.join(','));

      fields.forEach(function(field) {
        // Focus handler
        field.addEventListener('focus', function() {
          handleFieldFocus(form, field);
        });

        // Blur handler
        field.addEventListener('blur', function() {
          handleFieldBlur(form, field);
        });

        // Input handler for validation
        field.addEventListener('invalid', function(e) {
          handleFieldError(form, field, e.target.validationMessage || 'Validation failed');
        });
      });

      // Submit handler
      form.addEventListener('submit', function(e) {
        handleFormSubmit(form, e);
      });
    });

    // Also track dynamically: focus events bubble
    document.addEventListener('focusin', function(e) {
      const field = e.target;
      if (!field.tagName) return;

      const tagName = field.tagName.toLowerCase();
      if (!CONFIG.trackableFields.includes(tagName)) return;

      const form = field.closest('form');
      if (form) {
        handleFieldFocus(form, field);
      }
    });

    document.addEventListener('focusout', function(e) {
      const field = e.target;
      if (!field.tagName) return;

      const tagName = field.tagName.toLowerCase();
      if (!CONFIG.trackableFields.includes(tagName)) return;

      const form = field.closest('form');
      if (form) {
        handleFieldBlur(form, field);
      }
    });

    // Track abandonment on page leave
    window.addEventListener('beforeunload', trackFormAbandonment);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        trackFormAbandonment();
      }
    });

    // Initialize special tracking
    initEmailCaptureTracking();
    initCheckoutFormTracking();

    log('Form Tracking initialized', { formsTracked: forms.length });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.ISRIBFormTracking = {
    getFormState: function(formId) {
      return formStates.get(formId);
    },
    getAllFormStates: function() {
      const states = {};
      formStates.forEach(function(value, key) {
        states[key] = {
          started: value.started,
          submitted: value.submitted,
          fieldsInteracted: Array.from(value.fieldsInteracted),
          fieldsCompleted: Array.from(value.fieldsCompleted),
          lastField: value.lastActiveField
        };
      });
      return states;
    }
  };

})();
