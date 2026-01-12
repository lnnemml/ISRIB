/**
 * ISRIB Basic Analytics
 * Simplified tracking: scroll, time, sections, forms, errors
 */

(function() {
  'use strict';

  // ============================================
  // UTILITIES
  // ============================================

  function push(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      ...params
    });
  }

  function getPageType() {
    const p = window.location.pathname.toLowerCase();
    if (p === '/' || p === '/index.html') return 'homepage';
    if (p.includes('product_')) return 'product';
    if (p.includes('checkout')) return 'checkout';
    if (p.includes('success')) return 'success';
    return 'other';
  }

  // ============================================
  // 1. SCROLL DEPTH TRACKING
  // ============================================

  const scrollTracked = new Set();
  let maxScroll = 0;

  function trackScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ) - window.innerHeight;

    const currentDepth = Math.round((scrollTop / docHeight) * 100) || 0;
    if (currentDepth > maxScroll) maxScroll = currentDepth;

    [25, 50, 75, 90, 100].forEach(function(threshold) {
      if (currentDepth >= threshold && !scrollTracked.has(threshold)) {
        scrollTracked.add(threshold);
        push('scroll_depth', {
          scroll_percent: threshold,
          page_type: getPageType()
        });
      }
    });
  }

  let scrollTicking = false;
  window.addEventListener('scroll', function() {
    if (!scrollTicking) {
      window.requestAnimationFrame(function() {
        trackScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // ============================================
  // 2. TIME ON PAGE TRACKING
  // ============================================

  const startTime = Date.now();
  const timeTracked = new Set();

  setInterval(function() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    [15, 30, 60, 120].forEach(function(milestone) {
      if (elapsed >= milestone && !timeTracked.has(milestone)) {
        timeTracked.add(milestone);
        push('time_on_page', {
          time_seconds: milestone,
          page_type: getPageType(),
          scroll_depth: maxScroll
        });
      }
    });
  }, 1000);

  // ============================================
  // 3. SECTION VISIBILITY TRACKING
  // ============================================

  const sections = [
    { sel: '.hero-section, .hero', name: 'hero' },
    { sel: '.product-grid, .products-section', name: 'products' },
    { sel: '.pricing-section, .tier-pricing', name: 'pricing' },
    { sel: '.faq-section, .faq', name: 'faq' },
    { sel: '.research-section, .science-section', name: 'research' },
    { sel: '#shippingSection', name: 'shipping_form' },
    { sel: '#paymentSection', name: 'payment_form' },
    { sel: '.order-summary', name: 'order_summary' }
  ];

  const sectionsSeen = new Set();

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const name = entry.target.dataset.section;
        if (!sectionsSeen.has(name)) {
          sectionsSeen.add(name);
          push('section_view', {
            section_name: name,
            page_type: getPageType()
          });
        }
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(function(s) {
    const els = document.querySelectorAll(s.sel);
    els.forEach(function(el) {
      el.dataset.section = s.name;
      observer.observe(el);
    });
  });

  // ============================================
  // 4. FORM TRACKING
  // ============================================

  const formStates = new Map();

  function getFormInfo(form) {
    const id = form.id || 'unknown_form';
    let type = 'other';
    if (id.includes('checkout')) type = 'checkout';
    else if (id.includes('contact')) type = 'contact';
    return { id, type };
  }

  document.addEventListener('focusin', function(e) {
    const field = e.target;
    if (!field.name && !field.id) return;
    
    const form = field.closest('form');
    if (!form) return;

    const info = getFormInfo(form);
    
    if (!formStates.has(info.id)) {
      formStates.set(info.id, {
        started: true,
        startTime: Date.now(),
        fields: new Set(),
        lastField: null
      });

      push('form_start', {
        form_id: info.id,
        form_type: info.type,
        first_field: field.name || field.id,
        page_type: getPageType()
      });
    }

    const state = formStates.get(info.id);
    state.fields.add(field.name || field.id);
    state.lastField = field.name || field.id;

    push('form_field_focus', {
      form_id: info.id,
      form_type: info.type,
      field_name: field.name || field.id,
      fields_touched: state.fields.size,
      page_type: getPageType()
    });
  });

  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form.tagName || form.tagName !== 'FORM') return;

    const info = getFormInfo(form);
    const state = formStates.get(info.id);

    push('form_submit', {
      form_id: info.id,
      form_type: info.type,
      fields_touched: state ? state.fields.size : 0,
      time_spent: state ? Math.floor((Date.now() - state.startTime) / 1000) : 0,
      page_type: getPageType()
    });
  });

  // Track form abandonment
  window.addEventListener('beforeunload', function() {
    formStates.forEach(function(state, formId) {
      push('form_abandon', {
        form_id: formId,
        last_field: state.lastField,
        fields_touched: state.fields.size,
        time_spent: Math.floor((Date.now() - state.startTime) / 1000),
        page_type: getPageType()
      });
    });
  });

  // ============================================
  // 5. ERROR TRACKING
  // ============================================

  window.addEventListener('error', function(e) {
    push('js_error', {
      error_message: e.message,
      error_url: e.filename,
      error_line: e.lineno,
      page_type: getPageType()
    });
  });

  // Dead clicks (clicks on non-interactive elements)
  const deadClickTracked = new Set();
  document.addEventListener('click', function(e) {
    const el = e.target;
    
    // Check if element or parent is interactive
    let current = el;
    let isInteractive = false;
    for (let i = 0; i < 5; i++) {
      if (!current) break;
      if (current.tagName === 'A' || 
          current.tagName === 'BUTTON' || 
          current.onclick ||
          current.classList.contains('btn') ||
          current.classList.contains('add-to-cart')) {
        isInteractive = true;
        break;
      }
      current = current.parentElement;
    }

    if (!isInteractive) {
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') {
        const key = el.tagName + '_' + el.className;
        if (!deadClickTracked.has(key)) {
          deadClickTracked.add(key);
          push('dead_click', {
            element_type: el.tagName,
            element_class: el.className,
            element_text: el.textContent.substring(0, 50),
            page_type: getPageType()
          });
        }
      }
    }
  });

  // ============================================
  // INIT
  // ============================================

  console.log('[ISRIB Analytics] Basic tracking initialized');

})();
