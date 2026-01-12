/**
 * ISRIB Analytics - Cart Abandonment Tracking
 * Version: 1.0.0
 *
 * Tracks cart abandonment with precise timing and context.
 * Integrates with existing cart recovery system.
 */

(function() {
  'use strict';

  const CONFIG = {
    // Time intervals to track (seconds)
    checkIntervals: [30, 60, 120, 300, 600],

    // Storage keys
    storageKey: '_isrib_cart_session',

    // Debug mode
    debug: false
  };

  let sessionData = {
    cartFirstSeen: null,
    checkoutStarted: false,
    lastCartUpdate: null,
    lastValue: 0,
    trackedIntervals: new Set()
  };

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[Cart Abandonment]', message, data || '');
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

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem('isrib_cart') || '[]');
    } catch(e) {
      return [];
    }
  }

  function getCartValue() {
    const cart = getCart();
    return cart.reduce(function(sum, item) {
      return sum + (Number(item.price) * Number(item.count || 1));
    }, 0);
  }

  function getCartItemsCount() {
    const cart = getCart();
    return cart.reduce(function(sum, item) {
      return sum + Number(item.count || 1);
    }, 0);
  }

  function getCartProducts() {
    const cart = getCart();
    return cart.map(function(item) {
      return {
        id: item.sku,
        name: item.name,
        variant: item.display,
        price: item.price,
        quantity: item.count || 1
      };
    });
  }

  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('cart')) return 'cart';
    if (path.includes('product_')) return 'product';
    if (path === '/' || path === '/index.html') return 'homepage';
    return 'other';
  }

  // ============================================
  // CART SESSION TRACKING
  // ============================================

  function initCartSession() {
    try {
      const stored = sessionStorage.getItem(CONFIG.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        sessionData.cartFirstSeen = parsed.cartFirstSeen;
        sessionData.checkoutStarted = parsed.checkoutStarted;
        sessionData.trackedIntervals = new Set(parsed.trackedIntervals || []);
      }
    } catch(e) {}
  }

  function saveCartSession() {
    try {
      sessionStorage.setItem(CONFIG.storageKey, JSON.stringify({
        cartFirstSeen: sessionData.cartFirstSeen,
        checkoutStarted: sessionData.checkoutStarted,
        trackedIntervals: Array.from(sessionData.trackedIntervals)
      }));
    } catch(e) {}
  }

  function updateCartSession() {
    const cartValue = getCartValue();
    const pageType = getPageType();

    // Track first cart interaction
    if (cartValue > 0 && !sessionData.cartFirstSeen) {
      sessionData.cartFirstSeen = Date.now();
      saveCartSession();

      pushEvent('cart_active', {
        event_category: 'ecommerce',
        cart_value: cartValue,
        cart_items_count: getCartItemsCount(),
        page_type: pageType
      });
    }

    // Track checkout started
    if (pageType === 'checkout' && !sessionData.checkoutStarted && cartValue > 0) {
      sessionData.checkoutStarted = true;
      saveCartSession();
    }

    sessionData.lastCartUpdate = Date.now();
    sessionData.lastValue = cartValue;
  }

  // ============================================
  // TIMED ABANDONMENT CHECKS
  // ============================================

  function startAbandonmentTimer() {
    setInterval(function() {
      checkAbandonmentStatus();
    }, 30000); // Check every 30 seconds
  }

  function checkAbandonmentStatus() {
    if (!sessionData.cartFirstSeen) return;

    const cartValue = getCartValue();
    if (cartValue === 0) return;

    const timeWithCart = Math.floor((Date.now() - sessionData.cartFirstSeen) / 1000);
    const pageType = getPageType();

    // Check each interval
    CONFIG.checkIntervals.forEach(function(interval) {
      if (timeWithCart >= interval && !sessionData.trackedIntervals.has(interval)) {
        sessionData.trackedIntervals.add(interval);
        saveCartSession();

        // Determine abandonment stage
        let abandonmentStage = 'browsing';
        if (sessionData.checkoutStarted) {
          abandonmentStage = 'checkout';
        } else if (pageType === 'product') {
          abandonmentStage = 'product_view';
        }

        // Only track if still has cart and not on success page
        if (cartValue > 0 && pageType !== 'success') {
          pushEvent('cart_idle', {
            event_category: 'ecommerce',
            idle_time_seconds: interval,
            cart_value: cartValue,
            cart_items_count: getCartItemsCount(),
            cart_products: getCartProducts(),
            abandonment_stage: abandonmentStage,
            page_type: pageType
          });

          log('Cart idle:', { interval: interval, stage: abandonmentStage, value: cartValue });
        }
      }
    });
  }

  // ============================================
  // CART CHANGE TRACKING
  // ============================================

  function initCartChangeTracking() {
    // Watch for cart changes via localStorage events
    window.addEventListener('storage', function(e) {
      if (e.key === 'isrib_cart') {
        handleCartChange(e.oldValue, e.newValue);
      }
    });

    // Also poll for changes (for same-tab updates)
    let lastCartJSON = localStorage.getItem('isrib_cart');

    setInterval(function() {
      const currentCartJSON = localStorage.getItem('isrib_cart');
      if (currentCartJSON !== lastCartJSON) {
        handleCartChange(lastCartJSON, currentCartJSON);
        lastCartJSON = currentCartJSON;
      }
    }, 1000);
  }

  function handleCartChange(oldJSON, newJSON) {
    try {
      const oldCart = JSON.parse(oldJSON || '[]');
      const newCart = JSON.parse(newJSON || '[]');

      const oldValue = oldCart.reduce(function(s, i) { return s + (Number(i.price) * Number(i.count || 1)); }, 0);
      const newValue = newCart.reduce(function(s, i) { return s + (Number(i.price) * Number(i.count || 1)); }, 0);

      // Cart cleared
      if (oldValue > 0 && newValue === 0) {
        pushEvent('cart_cleared', {
          event_category: 'ecommerce',
          previous_value: oldValue,
          previous_items_count: oldCart.length,
          page_type: getPageType(),
          checkout_started: sessionData.checkoutStarted
        });
      }

      // Item removed
      if (newValue < oldValue && newValue > 0) {
        // Find removed item
        const newSkus = new Set(newCart.map(function(i) { return i.sku + '_' + i.grams; }));
        const removedItems = oldCart.filter(function(i) {
          return !newSkus.has(i.sku + '_' + i.grams);
        });

        if (removedItems.length > 0) {
          pushEvent('cart_item_remove', {
            event_category: 'ecommerce',
            removed_items: removedItems.map(function(i) {
              return { id: i.sku, name: i.name, price: i.price };
            }),
            new_cart_value: newValue,
            page_type: getPageType()
          });
        }
      }

      // Quantity changed
      oldCart.forEach(function(oldItem) {
        const newItem = newCart.find(function(n) {
          return n.sku === oldItem.sku && n.grams === oldItem.grams;
        });

        if (newItem && newItem.count !== oldItem.count) {
          pushEvent('cart_quantity_change', {
            event_category: 'ecommerce',
            item_id: oldItem.sku,
            item_name: oldItem.name,
            old_quantity: oldItem.count,
            new_quantity: newItem.count,
            page_type: getPageType()
          });
        }
      });

      updateCartSession();

    } catch(e) {
      log('Cart change error:', e);
    }
  }

  // ============================================
  // PAGE LEAVE TRACKING
  // ============================================

  function initPageLeaveTracking() {
    window.addEventListener('beforeunload', function() {
      const cartValue = getCartValue();
      const pageType = getPageType();

      if (cartValue > 0 && pageType !== 'success') {
        const timeWithCart = sessionData.cartFirstSeen
          ? Math.floor((Date.now() - sessionData.cartFirstSeen) / 1000)
          : 0;

        // Determine abandonment context
        let abandonmentContext = 'page_leave';
        if (sessionData.checkoutStarted) {
          abandonmentContext = 'checkout_abandon';
        }

        pushEvent('cart_abandonment', {
          event_category: 'ecommerce',
          cart_value: cartValue,
          cart_items_count: getCartItemsCount(),
          cart_products: getCartProducts(),
          time_with_cart_seconds: timeWithCart,
          abandonment_context: abandonmentContext,
          checkout_started: sessionData.checkoutStarted,
          page_type: pageType,
          last_page: window.location.pathname
        });

        log('Cart abandonment:', {
          value: cartValue,
          context: abandonmentContext,
          timeWithCart: timeWithCart
        });
      }
    });
  }

  // ============================================
  // CHECKOUT SUCCESS TRACKING
  // ============================================

  function initSuccessTracking() {
    const pageType = getPageType();

    if (pageType === 'success') {
      // Clear abandonment tracking - purchase completed
      sessionData = {
        cartFirstSeen: null,
        checkoutStarted: false,
        lastCartUpdate: null,
        lastValue: 0,
        trackedIntervals: new Set()
      };

      try {
        sessionStorage.removeItem(CONFIG.storageKey);
      } catch(e) {}

      log('Purchase completed, abandonment tracking cleared');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    initCartSession();
    updateCartSession();
    initCartChangeTracking();
    startAbandonmentTimer();
    initPageLeaveTracking();
    initSuccessTracking();

    log('Cart Abandonment Tracking initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.ISRIBCartAbandonment = {
    getSessionData: function() { return sessionData; },
    getCartValue: getCartValue,
    getCartProducts: getCartProducts,
    checkStatus: checkAbandonmentStatus
  };

})();
