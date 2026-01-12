/**
 * ISRIB Analytics - Exit Intent Tracking
 * Version: 1.0.0
 *
 * Tracks when users show exit intent (mouse leaving viewport on desktop,
 * back button on mobile).
 */

(function() {
  'use strict';

  const CONFIG = {
    // Minimum time on page before tracking exit intent (ms)
    minTimeOnPage: 5000,

    // Debounce delay for exit intent (ms)
    debounceDelay: 500,

    // Only track once per session
    oncePerSession: true,

    // Mouse Y threshold for desktop (pixels from top)
    mouseThreshold: 20,

    // Storage key
    storageKey: '_isrib_exit_tracked'
  };

  let hasTracked = false;
  let pageLoadTime = Date.now();
  let lastExitIntentTime = 0;

  function log(message, data) {
    console.log('[Exit Intent]', message, data || '');
  }

  function pushEvent(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      ...params
    });
  }

  function getTimeOnPage() {
    return Math.floor((Date.now() - pageLoadTime) / 1000);
  }

  function getScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ) - window.innerHeight;
    return Math.round((scrollTop / docHeight) * 100) || 0;
  }

  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.includes('product_')) return 'product';
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('success')) return 'success';
    return 'other';
  }

  function getCartValue() {
    try {
      const cart = JSON.parse(localStorage.getItem('isrib_cart') || '[]');
      return cart.reduce(function(sum, item) {
        return sum + (Number(item.price) * Number(item.count || 1));
      }, 0);
    } catch(e) {
      return 0;
    }
  }

  function getCartItemsCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('isrib_cart') || '[]');
      return cart.reduce(function(sum, item) {
        return sum + Number(item.count || 1);
      }, 0);
    } catch(e) {
      return 0;
    }
  }

  function shouldTrack() {
    // Check minimum time on page
    if ((Date.now() - pageLoadTime) < CONFIG.minTimeOnPage) {
      return false;
    }

    // Check if already tracked this session
    if (CONFIG.oncePerSession && hasTracked) {
      return false;
    }

    // Check session storage
    try {
      if (sessionStorage.getItem(CONFIG.storageKey)) {
        return false;
      }
    } catch(e) {}

    // Debounce
    if ((Date.now() - lastExitIntentTime) < CONFIG.debounceDelay) {
      return false;
    }

    return true;
  }

  function trackExitIntent(trigger) {
    if (!shouldTrack()) return;

    hasTracked = true;
    lastExitIntentTime = Date.now();

    try {
      sessionStorage.setItem(CONFIG.storageKey, 'true');
    } catch(e) {}

    const pageType = getPageType();
    const cartValue = getCartValue();
    const hasItemsInCart = getCartItemsCount() > 0;

    const eventData = {
      event_category: 'navigation',
      exit_trigger: trigger, // 'mouse_leave', 'back_button', 'visibility_change'
      page_type: pageType,
      time_on_page: getTimeOnPage(),
      scroll_depth: getScrollDepth(),
      has_cart_items: hasItemsInCart,
      cart_value: cartValue,
      cart_items_count: getCartItemsCount()
    };

    pushEvent('exit_intent', eventData);
    log('Exit intent tracked:', eventData);

    // If on checkout with items, track potential cart abandonment
    if (pageType === 'checkout' && hasItemsInCart) {
      pushEvent('cart_abandonment', {
        event_category: 'ecommerce',
        cart_value: cartValue,
        cart_items_count: getCartItemsCount(),
        abandonment_timing: getTimeOnPage(),
        abandonment_stage: 'checkout_exit',
        scroll_depth: getScrollDepth()
      });
    }
  }

  // ============================================
  // DESKTOP: Mouse leave detection
  // ============================================

  function initDesktopTracking() {
    document.addEventListener('mouseout', function(e) {
      // Check if mouse is leaving the viewport from the top
      if (e.clientY <= CONFIG.mouseThreshold &&
          e.relatedTarget == null &&
          e.target.nodeName.toLowerCase() !== 'select') {
        trackExitIntent('mouse_leave');
      }
    });
  }

  // ============================================
  // MOBILE: Back button & visibility
  // ============================================

  function initMobileTracking() {
    // Track page visibility changes (tab switch, app switch)
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        trackExitIntent('visibility_change');
      }
    });

    // Track before unload (works on both desktop and mobile)
    window.addEventListener('beforeunload', function() {
      trackExitIntent('page_leave');
    });

    // Track back button
    window.addEventListener('popstate', function() {
      trackExitIntent('back_button');
    });
  }

  // ============================================
  // CHECKOUT-SPECIFIC TRACKING
  // ============================================

  function initCheckoutTracking() {
    const pageType = getPageType();
    if (pageType !== 'checkout') return;

    // Track time spent on checkout
    let checkoutStartTime = Date.now();
    let lastActiveField = null;

    // Track field focus
    document.querySelectorAll('#checkoutForm input, #checkoutForm select, #checkoutForm textarea').forEach(function(field) {
      field.addEventListener('focus', function() {
        lastActiveField = field.name || field.id || 'unknown';
      });
    });

    // Enhanced exit tracking for checkout
    window.addEventListener('beforeunload', function() {
      const cartValue = getCartValue();
      if (cartValue > 0 && !hasTracked) {
        pushEvent('checkout_abandonment', {
          event_category: 'ecommerce',
          cart_value: cartValue,
          cart_items_count: getCartItemsCount(),
          time_on_checkout: Math.floor((Date.now() - checkoutStartTime) / 1000),
          last_active_field: lastActiveField,
          scroll_depth: getScrollDepth(),
          abandonment_stage: 'checkout'
        });
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Detect device type
    const isMobile = window.innerWidth < 768 ||
                    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      initDesktopTracking();
    }

    initMobileTracking();
    initCheckoutTracking();

    log('Exit Intent Tracking initialized', { isMobile: isMobile });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.ISRIBExitIntent = {
    track: trackExitIntent,
    shouldTrack: shouldTrack,
    reset: function() {
      hasTracked = false;
      try { sessionStorage.removeItem(CONFIG.storageKey); } catch(e) {}
    }
  };

})();
