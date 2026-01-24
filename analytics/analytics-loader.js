/**
 * ISRIB Analytics - Unified Loader
 * Version: 1.0.0
 *
 * This is the main entry point that loads all analytics modules.
 * Include this single script to enable comprehensive tracking.
 *
 * Usage:
 * <script src="/analytics/analytics-loader.js" defer></script>
 *
 * Or add as Custom HTML tag in GTM firing on All Pages - DOM Ready
 */

(function() {
  'use strict';

  const CONFIG = {
    // Base path for analytics scripts
    basePath: '/analytics/',

    // Modules to load
    modules: [
      'enhanced-tracking.js',
      'exit-intent.js',
      'click-quality.js',
      'section-visibility.js',
      'form-tracking.js',
      'cart-abandonment.js',
      'basic-analytics.js'
    ],

    // Load modules asynchronously
    async: true,

    // Debug mode - logs loading status
    debug: false,

    // Retry failed loads
    retryCount: 2,
    retryDelay: 1000
  };

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[Analytics Loader]', message, data || '');
    }
  }

  function loadScript(src, retries) {
    retries = retries || 0;

    return new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = CONFIG.async;

      script.onload = function() {
        log('Loaded:', src);
        resolve(src);
      };

      script.onerror = function() {
        log('Failed to load:', src);

        if (retries < CONFIG.retryCount) {
          log('Retrying...', { attempt: retries + 1 });
          setTimeout(function() {
            loadScript(src, retries + 1).then(resolve).catch(reject);
          }, CONFIG.retryDelay);
        } else {
          reject(new Error('Failed to load: ' + src));
        }
      };

      document.head.appendChild(script);
    });
  }

  function loadAllModules() {
    log('Starting analytics module loading...');

    const loadPromises = CONFIG.modules.map(function(module) {
      const fullPath = CONFIG.basePath + module;
      return loadScript(fullPath);
    });

    Promise.all(loadPromises)
      .then(function(loaded) {
        log('All modules loaded successfully:', loaded);

        // Signal that analytics is ready
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'analytics_modules_loaded',
          modules_count: loaded.length,
          modules: loaded
        });

        // Dispatch custom event for other scripts to hook into
        document.dispatchEvent(new CustomEvent('isrib:analytics:ready', {
          detail: { modules: loaded }
        }));
      })
      .catch(function(error) {
        console.error('[Analytics Loader] Error loading modules:', error);

        // Still signal partial load
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'analytics_modules_partial',
          error: error.message
        });
      });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Check if already initialized
    if (window._isribAnalyticsLoaded) {
      log('Analytics already loaded, skipping');
      return;
    }
    window._isribAnalyticsLoaded = true;

    // Ensure dataLayer exists
    window.dataLayer = window.dataLayer || [];

    // Determine base path from current script
    try {
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.includes('analytics-loader')) {
          const srcParts = scripts[i].src.split('/');
          srcParts.pop(); // Remove filename
          CONFIG.basePath = srcParts.join('/') + '/';
          break;
        }
      }
    } catch(e) {}

    log('Initializing with base path:', CONFIG.basePath);

    // Load all modules
    loadAllModules();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/**
 * ALTERNATIVE: GTM Custom HTML Tag Version
 *
 * If using GTM, you can include this as a Custom HTML tag:
 *
 * <script>
 * (function() {
 *   var scripts = [
 *     '/analytics/enhanced-tracking.js',
 *     '/analytics/exit-intent.js',
 *     '/analytics/click-quality.js',
 *     '/analytics/section-visibility.js',
 *     '/analytics/form-tracking.js',
 *     '/analytics/cart-abandonment.js',
       
 *   ];
 *
 *   scripts.forEach(function(src) {
 *     var s = document.createElement('script');
 *     s.src = src;
 *     s.async = true;
 *     document.head.appendChild(s);
 *   });
 * })();
 * </script>
 *
 * Fire on: All Pages - DOM Ready
 */
