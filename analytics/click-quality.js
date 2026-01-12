/**
 * ISRIB Analytics - Click Quality Tracking
 * Version: 1.0.0
 *
 * Tracks dead clicks (clicks on non-interactive elements) and
 * click rage (rapid repeated clicks indicating frustration).
 */

(function() {
  'use strict';

  const CONFIG = {
    // Click rage detection
    rageThreshold: 3,      // Number of clicks to trigger rage
    rageTimeWindow: 2000,  // Time window in ms
    rageRadius: 50,        // Pixel radius to consider same area

    // Dead click detection
    deadClickSelectors: [
      'p', 'span:not(.btn-text)', 'div:not([onclick])',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img:not([onclick])', 'section', 'article'
    ],

    // Interactive element selectors (not dead clicks)
    interactiveSelectors: [
      'a', 'button', 'input', 'select', 'textarea',
      '[onclick]', '[role="button"]', '.btn', '.add-to-cart',
      '.quantity-option', '.tier-option', '.faq-button',
      '.accordion-head', '[data-cta]', 'label[for]'
    ],

    // Throttle tracking (don't spam events)
    throttleDelay: 1000,

    // Debug mode
    debug: false
  };

  // Click history for rage detection
  let clickHistory = [];
  let lastDeadClickTime = 0;
  let lastRageEventTime = 0;

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[Click Quality]', message, data || '');
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
    return 'other';
  }

  function getElementDescription(element) {
    // Get a useful description of the element
    if (element.id) return '#' + element.id;
    if (element.className) return '.' + element.className.split(' ')[0];
    return element.tagName.toLowerCase();
  }

  function getElementPath(element) {
    // Get a CSS selector-like path
    const parts = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 5) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
      } else if (current.className) {
        selector += '.' + current.className.split(' ')[0];
      }
      parts.unshift(selector);
      current = current.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  function isInteractiveElement(element) {
    // Check if element or any parent is interactive
    let current = element;
    let depth = 0;

    while (current && depth < 10) {
      // Check if matches any interactive selector
      for (let i = 0; i < CONFIG.interactiveSelectors.length; i++) {
        try {
          if (current.matches && current.matches(CONFIG.interactiveSelectors[i])) {
            return true;
          }
        } catch(e) {}
      }

      // Check for onclick attribute
      if (current.onclick || current.getAttribute('onclick')) {
        return true;
      }

      // Check for event listeners (limited detection)
      if (current._bound) {
        return true;
      }

      current = current.parentElement;
      depth++;
    }

    return false;
  }

  function isLikelyDeadClick(element) {
    // Skip if obviously interactive
    if (isInteractiveElement(element)) {
      return false;
    }

    // Check if element looks clickable but isn't
    const style = window.getComputedStyle(element);

    // Check cursor style
    if (style.cursor === 'pointer') {
      return true; // Looks clickable but isn't interactive
    }

    // Check if text that might look like a link
    if (element.tagName === 'SPAN' || element.tagName === 'P') {
      const color = style.color;
      // Check for link-like colors (blue-ish)
      if (color.includes('rgb(0,') || color.includes('rgb(59,') ||
          color.includes('#0') || color.includes('blue')) {
        return true;
      }
    }

    return false;
  }

  // ============================================
  // DEAD CLICK DETECTION
  // ============================================

  function handleDeadClick(event) {
    const element = event.target;

    // Throttle
    if (Date.now() - lastDeadClickTime < CONFIG.throttleDelay) {
      return;
    }

    // Check if this is actually a dead click
    if (isInteractiveElement(element)) {
      return;
    }

    // Only track if element looks like it should be clickable
    if (!isLikelyDeadClick(element)) {
      // Still track if multiple dead clicks on same element type
      return;
    }

    lastDeadClickTime = Date.now();

    const eventData = {
      event_category: 'error',
      element_type: element.tagName.toLowerCase(),
      element_text: (element.textContent || '').trim().substring(0, 50),
      element_path: getElementPath(element),
      click_x: event.clientX,
      click_y: event.clientY,
      page_type: getPageType(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight
    };

    pushEvent('dead_click', eventData);
    log('Dead click detected:', eventData);
  }

  // ============================================
  // CLICK RAGE DETECTION
  // ============================================

  function recordClick(event) {
    const now = Date.now();

    // Add to history
    clickHistory.push({
      time: now,
      x: event.clientX,
      y: event.clientY,
      target: event.target
    });

    // Remove old clicks
    clickHistory = clickHistory.filter(function(click) {
      return (now - click.time) < CONFIG.rageTimeWindow;
    });

    // Check for rage
    checkForRage(event);
  }

  function checkForRage(latestEvent) {
    if (clickHistory.length < CONFIG.rageThreshold) {
      return;
    }

    // Throttle rage events
    if (Date.now() - lastRageEventTime < CONFIG.throttleDelay * 2) {
      return;
    }

    const latest = clickHistory[clickHistory.length - 1];
    let nearbyClicks = 0;
    let sameElementClicks = 0;

    for (let i = 0; i < clickHistory.length - 1; i++) {
      const click = clickHistory[i];

      // Check if clicks are in same area
      const dx = Math.abs(click.x - latest.x);
      const dy = Math.abs(click.y - latest.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < CONFIG.rageRadius) {
        nearbyClicks++;
      }

      // Check if same element
      if (click.target === latest.target) {
        sameElementClicks++;
      }
    }

    // Trigger rage if enough nearby clicks
    if (nearbyClicks >= CONFIG.rageThreshold - 1 || sameElementClicks >= CONFIG.rageThreshold - 1) {
      lastRageEventTime = Date.now();

      const element = latestEvent.target;
      const timeSpan = clickHistory[clickHistory.length - 1].time - clickHistory[0].time;

      const eventData = {
        event_category: 'error',
        element_clicked: getElementDescription(element),
        element_path: getElementPath(element),
        element_text: (element.textContent || '').trim().substring(0, 50),
        click_count: clickHistory.length,
        time_span_ms: timeSpan,
        is_interactive: isInteractiveElement(element),
        page_type: getPageType(),
        click_x: latestEvent.clientX,
        click_y: latestEvent.clientY
      };

      pushEvent('click_rage', eventData);
      log('Click rage detected:', eventData);

      // Clear history after rage event
      clickHistory = [];
    }
  }

  // ============================================
  // SLOW ELEMENT DETECTION
  // ============================================

  function trackSlowElements() {
    // Use Performance Observer for slow loading elements
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          // Track elements that take more than 3 seconds
          if (entry.duration > 3000) {
            pushEvent('slow_element', {
              event_category: 'error',
              element_type: entry.initiatorType,
              element_name: entry.name.split('/').pop().substring(0, 50),
              load_time_ms: Math.round(entry.duration),
              page_type: getPageType()
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource', 'longtask'] });
    } catch(e) {
      log('PerformanceObserver not available');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Track all clicks for both dead click and rage detection
    document.addEventListener('click', function(event) {
      recordClick(event);

      // Check for dead click after a small delay
      // (to allow event handlers to run first)
      setTimeout(function() {
        handleDeadClick(event);
      }, 10);
    }, true);

    // Track slow elements
    trackSlowElements();

    log('Click Quality Tracking initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.ISRIBClickQuality = {
    isInteractive: isInteractiveElement,
    isDeadClick: isLikelyDeadClick,
    getClickHistory: function() { return clickHistory; },
    clearHistory: function() { clickHistory = []; }
  };

})();
