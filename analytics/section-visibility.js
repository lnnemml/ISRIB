/**
 * ISRIB Analytics - Section Visibility Tracking
 * Version: 1.0.0
 *
 * Tracks which page sections users view and for how long.
 * Useful for understanding content engagement and optimal CTA placement.
 */

(function() {
  'use strict';

  const CONFIG = {
    // Sections to track
    sectionSelectors: [
      // Homepage sections
      { selector: '.hero-section, .hero', name: 'hero' },
      { selector: '.product-grid, .products-section', name: 'products' },
      { selector: '.research-section, .science-section', name: 'research' },
      { selector: '.testimonials-section, .reviews', name: 'testimonials' },
      { selector: '.faq-section, .faq', name: 'faq' },
      { selector: '.bundle-section', name: 'bundle_offer' },

      // Product page sections
      { selector: '.product-hero, .product-header', name: 'product_header' },
      { selector: '.product-description', name: 'product_description' },
      { selector: '.pricing-section, .tier-pricing', name: 'pricing' },
      { selector: '.dosage-section, .dosage-info', name: 'dosage' },
      { selector: '.quality-section, .lab-reports', name: 'quality' },
      { selector: '.mechanism-section', name: 'mechanism' },

      // Checkout sections
      { selector: '#shippingSection, .shipping-form', name: 'shipping_form' },
      { selector: '#paymentSection, .payment-form', name: 'payment_form' },
      { selector: '.order-summary, #orderSummary', name: 'order_summary' },
      { selector: '#checkoutUpsell', name: 'checkout_upsell' },

      // General
      { selector: '.cta-section, .call-to-action', name: 'cta' },
      { selector: 'footer, .site-footer', name: 'footer' }
    ],

    // Visibility threshold (0.5 = 50% visible)
    threshold: 0.5,

    // Minimum time visible to track (ms)
    minVisibleTime: 1000,

    // Track view duration intervals (seconds)
    durationMilestones: [5, 15, 30, 60],

    // Debug mode
    debug: false
  };

  // Tracking state
  const sectionState = new Map();
  let observer = null;

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[Section Visibility]', message, data || '');
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
    if (path.includes('success')) return 'success';
    return 'other';
  }

  function getSectionId(element, sectionName) {
    return element.id || sectionName + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ============================================
  // SECTION VIEW TRACKING
  // ============================================

  function handleIntersection(entries) {
    entries.forEach(function(entry) {
      const element = entry.target;
      const sectionName = element.dataset.sectionName;
      const sectionId = element.dataset.sectionId;

      if (!sectionName) return;

      let state = sectionState.get(sectionId);

      if (entry.isIntersecting) {
        // Section became visible
        if (!state) {
          state = {
            sectionName: sectionName,
            sectionId: sectionId,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            totalVisibleTime: 0,
            viewCount: 0,
            tracked: false,
            milestones: new Set()
          };
          sectionState.set(sectionId, state);
        }

        state.lastSeen = Date.now();
        state.viewCount++;

        // Track first view after minimum time
        if (!state.tracked) {
          setTimeout(function() {
            if (entry.isIntersecting && !state.tracked) {
              state.tracked = true;
              trackSectionView(element, state, entry.intersectionRatio);
            }
          }, CONFIG.minVisibleTime);
        }

        // Start duration tracking
        startDurationTracking(sectionId);

      } else if (state) {
        // Section became hidden
        state.totalVisibleTime += Date.now() - state.lastSeen;
        stopDurationTracking(sectionId);
      }
    });
  }

  function trackSectionView(element, state, visibilityPercent) {
    const eventData = {
      event_category: 'engagement',
      section_id: state.sectionId,
      section_name: state.sectionName,
      visibility_percent: Math.round(visibilityPercent * 100),
      view_count: state.viewCount,
      page_type: getPageType(),
      viewport_position: getViewportPosition(element)
    };

    pushEvent('section_view', eventData);
    log('Section view:', eventData);
  }

  function getViewportPosition(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.top < viewportHeight / 3) return 'top';
    if (rect.top < viewportHeight * 2 / 3) return 'middle';
    return 'bottom';
  }

  // ============================================
  // DURATION TRACKING
  // ============================================

  const durationIntervals = new Map();

  function startDurationTracking(sectionId) {
    if (durationIntervals.has(sectionId)) return;

    const state = sectionState.get(sectionId);
    if (!state) return;

    const intervalId = setInterval(function() {
      const visibleTime = Math.floor((Date.now() - state.lastSeen + state.totalVisibleTime) / 1000);

      CONFIG.durationMilestones.forEach(function(milestone) {
        if (visibleTime >= milestone && !state.milestones.has(milestone)) {
          state.milestones.add(milestone);
          trackDurationMilestone(state, milestone);
        }
      });
    }, 1000);

    durationIntervals.set(sectionId, intervalId);
  }

  function stopDurationTracking(sectionId) {
    const intervalId = durationIntervals.get(sectionId);
    if (intervalId) {
      clearInterval(intervalId);
      durationIntervals.delete(sectionId);
    }
  }

  function trackDurationMilestone(state, seconds) {
    pushEvent('section_engagement', {
      event_category: 'engagement',
      section_id: state.sectionId,
      section_name: state.sectionName,
      visible_seconds: seconds,
      engagement_level: getEngagementLevel(seconds),
      page_type: getPageType()
    });

    log('Section duration milestone:', { section: state.sectionName, seconds: seconds });
  }

  function getEngagementLevel(seconds) {
    if (seconds >= 30) return 'high';
    if (seconds >= 15) return 'medium';
    return 'low';
  }

  // ============================================
  // CTA VISIBILITY TRACKING
  // ============================================

  function initCTAVisibilityTracking() {
    const ctaSelectors = [
      '.btn-primary',
      '.btn-cta',
      '.add-to-cart',
      '[data-cta]',
      '#addToCartA15',
      '#addToCartISRIB',
      '#addBundleBtn',
      '#submitOrderBtn'
    ];

    const ctaElements = document.querySelectorAll(ctaSelectors.join(','));
    const trackedCTAs = new Set();

    const ctaObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const element = entry.target;
          const ctaId = element.id || element.className.split(' ')[0] + '_' + Math.random().toString(36).substr(2, 4);

          if (!trackedCTAs.has(ctaId)) {
            trackedCTAs.add(ctaId);

            const rect = element.getBoundingClientRect();

            pushEvent('cta_visible', {
              event_category: 'engagement',
              cta_id: ctaId,
              cta_text: element.textContent.trim().substring(0, 50),
              cta_classes: element.className,
              cta_position: {
                top: Math.round(rect.top + window.scrollY),
                left: Math.round(rect.left)
              },
              viewport_position: rect.top < window.innerHeight / 2 ? 'above_fold' : 'below_fold',
              page_type: getPageType()
            });

            log('CTA visible:', { id: ctaId, text: element.textContent.trim().substring(0, 30) });
          }
        }
      });
    }, { threshold: 0.5 });

    ctaElements.forEach(function(cta) {
      ctaObserver.observe(cta);
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Create intersection observer for sections
    observer = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.25, 0.5, 0.75, 1.0]
    });

    // Find and observe all sections
    CONFIG.sectionSelectors.forEach(function(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(function(element) {
        const sectionId = getSectionId(element, config.name);
        element.dataset.sectionName = config.name;
        element.dataset.sectionId = sectionId;
        observer.observe(element);
        log('Observing section:', { name: config.name, id: sectionId });
      });
    });

    // Initialize CTA tracking
    initCTAVisibilityTracking();

    // Track page leave with section stats
    window.addEventListener('beforeunload', function() {
      const sectionStats = [];

      sectionState.forEach(function(state) {
        sectionStats.push({
          name: state.sectionName,
          viewed: state.tracked,
          view_count: state.viewCount,
          total_visible_seconds: Math.round(state.totalVisibleTime / 1000)
        });
      });

      if (sectionStats.length > 0) {
        pushEvent('page_section_summary', {
          event_category: 'engagement',
          sections_viewed: sectionStats.filter(function(s) { return s.viewed; }).length,
          total_sections: sectionStats.length,
          section_details: sectionStats,
          page_type: getPageType()
        });
      }
    });

    log('Section Visibility Tracking initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.ISRIBSectionVisibility = {
    getSectionState: function() {
      const state = {};
      sectionState.forEach(function(value, key) {
        state[key] = {
          name: value.sectionName,
          viewed: value.tracked,
          viewCount: value.viewCount,
          totalVisibleTime: value.totalVisibleTime
        };
      });
      return state;
    },
    getActiveObservations: function() {
      return sectionState.size;
    }
  };

})();
