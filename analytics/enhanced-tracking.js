/**
 * ISRIB Analytics - Enhanced Tracking Module
 * Version: 1.0.0
 *
 * This script provides comprehensive user behavior tracking.
 * Include this after GTM loads, or add as Custom HTML tag in GTM.
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Scroll depth thresholds to track
    scrollDepths: [25, 50, 75, 90, 100],

    // Time milestones in seconds
    timeMilestones: [15, 30, 60, 120, 300],

    // Debug mode - set to false in production
    debug: false,

    // Prefix for localStorage keys
    storagePrefix: '_isrib_',

    // Session timeout in ms (30 minutes)
    sessionTimeout: 30 * 60 * 1000
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[ISRIB Analytics]', message, data || '');
    }
  }

  function pushEvent(eventName, params) {
    window.dataLayer = window.dataLayer || [];

    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      ...params
    };

    window.dataLayer.push(eventData);
    log('Event pushed:', eventData);
  }

  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.includes('product_')) return 'product';
    if (path.includes('checkout')) return 'checkout';
    if (path.includes('success')) return 'success';
    if (path.includes('cart')) return 'cart';
    if (path.includes('faq')) return 'faq';
    if (path.includes('research') || path.includes('about')) return 'content';
    if (path.includes('contact')) return 'contact';
    return 'other';
  }

  function getDeviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  function getUserType() {
    try {
      const key = CONFIG.storagePrefix + 'visitor';
      const existing = localStorage.getItem(key);
      if (existing) {
        return 'returning';
      } else {
        localStorage.setItem(key, Date.now().toString());
        return 'new';
      }
    } catch(e) {
      return 'unknown';
    }
  }

  function getUTMParams() {
    const params = {};
    const search = window.location.search;
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

    utmKeys.forEach(function(key) {
      const match = search.match(new RegExp('[?&]' + key + '=([^&]+)'));
      if (match) {
        params[key] = decodeURIComponent(match[1]);
      }
    });

    // Store UTMs in session
    try {
      const stored = sessionStorage.getItem(CONFIG.storagePrefix + 'utm');
      if (stored) {
        const storedParams = JSON.parse(stored);
        utmKeys.forEach(function(key) {
          if (!params[key] && storedParams[key]) {
            params[key] = storedParams[key];
          }
        });
      }
      if (Object.keys(params).length > 0) {
        sessionStorage.setItem(CONFIG.storagePrefix + 'utm', JSON.stringify(params));
      }
    } catch(e) {}

    return params;
  }

  function getTrafficSource() {
    const referrer = document.referrer || '';
    const utm = getUTMParams();

    if (utm.utm_source) {
      const source = utm.utm_source.toLowerCase();
      if (source.includes('reddit')) return 'reddit';
      if (source.includes('facebook') || source.includes('meta')) return 'meta';
      if (source.includes('email')) return 'email';
      return utm.utm_source;
    }

    if (!referrer || referrer.includes(location.hostname)) return 'direct';
    if (referrer.includes('reddit.com')) return 'reddit';
    if (referrer.includes('facebook.com') || referrer.includes('instagram.com')) return 'meta';
    if (referrer.includes('google.')) return 'organic_google';
    if (referrer.includes('bing.')) return 'organic_bing';
    if (referrer.includes('isrib-research.com')) return 'prelanding';

    return 'referral';
  }

  function getRedditInfo() {
    const referrer = document.referrer || '';
    const result = { subreddit: null, thread_id: null };

    if (referrer.includes('reddit.com')) {
      const subMatch = referrer.match(/\/r\/([^\/\?]+)/);
      if (subMatch) result.subreddit = subMatch[1];

      const threadMatch = referrer.match(/\/comments\/([a-z0-9]+)/i);
      if (threadMatch) result.thread_id = threadMatch[1];
    }

    return result;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  const Session = {
    init: function() {
      const sessionKey = CONFIG.storagePrefix + 'session';
      const timestampKey = CONFIG.storagePrefix + 'session_ts';

      try {
        const existingSession = sessionStorage.getItem(sessionKey);
        const timestamp = parseInt(sessionStorage.getItem(timestampKey) || '0');

        if (existingSession && (Date.now() - timestamp) < CONFIG.sessionTimeout) {
          this.id = existingSession;
          this.isNew = false;
        } else {
          this.id = 'SES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
          this.isNew = true;
          sessionStorage.setItem(sessionKey, this.id);
        }

        sessionStorage.setItem(timestampKey, Date.now().toString());
      } catch(e) {
        this.id = 'SES-' + Date.now();
        this.isNew = true;
      }

      return this;
    },

    getId: function() {
      return this.id;
    }
  };

  // ============================================
  // SCROLL TRACKING
  // ============================================

  const ScrollTracker = {
    trackedDepths: new Set(),
    maxDepth: 0,

    init: function() {
      const self = this;

      // Throttled scroll handler
      let ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            self.checkDepth();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // Initial check
      setTimeout(function() { self.checkDepth(); }, 1000);
    },

    checkDepth: function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight;

      const currentDepth = Math.round((scrollTop / docHeight) * 100) || 0;

      if (currentDepth > this.maxDepth) {
        this.maxDepth = currentDepth;
      }

      // Check thresholds
      CONFIG.scrollDepths.forEach(function(threshold) {
        if (currentDepth >= threshold && !this.trackedDepths.has(threshold)) {
          this.trackedDepths.add(threshold);
          this.trackScrollDepth(threshold);
        }
      }, this);
    },

    trackScrollDepth: function(depth) {
      pushEvent('scroll_depth', {
        event_category: 'engagement',
        scroll_percent: depth,
        page_type: getPageType(),
        device_type: getDeviceType(),
        max_scroll: this.maxDepth
      });
    },

    getMaxDepth: function() {
      return this.maxDepth;
    }
  };

  // ============================================
  // TIME ON PAGE TRACKING
  // ============================================

  const TimeTracker = {
    startTime: Date.now(),
    trackedMilestones: new Set(),
    intervalId: null,

    init: function() {
      const self = this;

      // Check every second
      this.intervalId = setInterval(function() {
        self.checkMilestones();
      }, 1000);

      // Stop tracking when page hidden
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          clearInterval(self.intervalId);
        } else {
          self.intervalId = setInterval(function() {
            self.checkMilestones();
          }, 1000);
        }
      });
    },

    checkMilestones: function() {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      CONFIG.timeMilestones.forEach(function(milestone) {
        if (elapsed >= milestone && !this.trackedMilestones.has(milestone)) {
          this.trackedMilestones.add(milestone);
          this.trackTimeMilestone(milestone);
        }
      }, this);
    },

    trackTimeMilestone: function(seconds) {
      let engagementLevel = 'low';
      if (seconds >= 120) engagementLevel = 'high';
      else if (seconds >= 60) engagementLevel = 'medium';

      pushEvent('time_on_page', {
        event_category: 'engagement',
        time_seconds: seconds,
        page_type: getPageType(),
        device_type: getDeviceType(),
        engagement_level: engagementLevel,
        scroll_depth: ScrollTracker.getMaxDepth()
      });
    },

    getTimeOnPage: function() {
      return Math.floor((Date.now() - this.startTime) / 1000);
    }
  };

  // ============================================
  // CTA TRACKING
  // ============================================

  const CTATracker = {
    observedCTAs: new Map(),

    init: function() {
      const self = this;

      // Find all CTAs
      const ctaSelectors = [
        '.btn-primary',
        '.btn-cta',
        '.add-to-cart',
        '[data-cta]',
        '.hero-cta',
        '#addToCartA15',
        '#addToCartISRIB',
        '#addBundleBtn',
        '#submitOrderBtn'
      ];

      const ctas = document.querySelectorAll(ctaSelectors.join(','));

      // Intersection observer for visibility
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting && !self.observedCTAs.get(entry.target)) {
            self.observedCTAs.set(entry.target, true);
            self.trackCTAVisible(entry.target);
          }
        });
      }, { threshold: 0.5 });

      ctas.forEach(function(cta) {
        observer.observe(cta);

        // Track clicks
        cta.addEventListener('click', function(e) {
          self.trackCTAClick(cta, e);
        });
      });
    },

    trackCTAVisible: function(element) {
      const ctaId = element.id || element.className.split(' ')[0];
      const ctaText = element.textContent.trim().substring(0, 50);
      const rect = element.getBoundingClientRect();

      pushEvent('cta_visible', {
        event_category: 'engagement',
        cta_id: ctaId,
        cta_text: ctaText,
        cta_position: {
          top: Math.round(rect.top + window.scrollY),
          left: Math.round(rect.left)
        },
        page_type: getPageType(),
        viewport_position: rect.top < window.innerHeight / 2 ? 'above_fold' : 'below_fold'
      });
    },

    trackCTAClick: function(element, event) {
      const ctaId = element.id || element.className.split(' ')[0];
      const ctaText = element.textContent.trim().substring(0, 50);

      pushEvent('cta_click', {
        event_category: 'engagement',
        cta_id: ctaId,
        cta_text: ctaText,
        cta_classes: element.className,
        page_type: getPageType(),
        scroll_depth: ScrollTracker.getMaxDepth(),
        time_on_page: TimeTracker.getTimeOnPage()
      });
    }
  };

  // ============================================
  // FAQ TRACKING
  // ============================================

  const FAQTracker = {
    init: function() {
      const self = this;

      // New FAQ structure
      document.querySelectorAll('.faq-button').forEach(function(btn, index) {
        btn.addEventListener('click', function() {
          const item = btn.closest('.faq-item');
          const isOpen = item && item.classList.contains('open');
          const question = btn.textContent.trim().substring(0, 100);

          if (!isOpen) {
            pushEvent('faq_expand', {
              event_category: 'engagement',
              faq_question: question,
              faq_index: index,
              page_type: getPageType()
            });
          } else {
            pushEvent('faq_collapse', {
              event_category: 'engagement',
              faq_question: question,
              faq_index: index,
              page_type: getPageType()
            });
          }
        });
      });

      // Legacy accordion structure
      document.querySelectorAll('.accordion-head').forEach(function(head, index) {
        head.addEventListener('click', function() {
          const item = head.closest('.accordion-item');
          const wasOpen = item && item.classList.contains('open');
          const question = head.textContent.trim().substring(0, 100);

          if (!wasOpen) {
            pushEvent('faq_expand', {
              event_category: 'engagement',
              faq_question: question,
              faq_index: index,
              page_type: getPageType()
            });
          }
        });
      });
    }
  };

  // ============================================
  // NAVIGATION TRACKING
  // ============================================

  const NavigationTracker = {
    init: function() {
      const self = this;

      // Track all internal links
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const isInternal = href.startsWith('/') ||
                          href.startsWith('#') ||
                          href.includes(location.hostname);

        if (isInternal && !href.startsWith('#')) {
          self.trackInternalLink(link, href);
        } else if (!isInternal && href.startsWith('http')) {
          self.trackExternalLink(link, href);
        }
      });

      // Track back button usage
      window.addEventListener('popstate', function(e) {
        pushEvent('back_button', {
          event_category: 'navigation',
          from_page: document.referrer,
          to_page: window.location.href,
          page_type: getPageType()
        });
      });
    },

    trackInternalLink: function(element, href) {
      // Determine link type
      let linkType = 'other';
      if (href.includes('product')) linkType = 'product';
      else if (href.includes('checkout')) linkType = 'checkout';
      else if (href.includes('research') || href.includes('about')) linkType = 'education';
      else if (element.closest('.nav, header')) linkType = 'navigation';
      else if (element.closest('.breadcrumb')) linkType = 'breadcrumb';

      pushEvent('internal_link_click', {
        event_category: 'navigation',
        link_url: href,
        link_text: element.textContent.trim().substring(0, 50),
        link_type: linkType,
        page_type: getPageType()
      });
    },

    trackExternalLink: function(element, href) {
      // Check if it's a research paper link
      const isResearchLink = href.includes('pubmed') ||
                            href.includes('doi.org') ||
                            href.includes('ncbi') ||
                            href.includes('elifesciences');

      pushEvent('external_link_click', {
        event_category: 'navigation',
        link_url: href,
        link_text: element.textContent.trim().substring(0, 50),
        link_type: isResearchLink ? 'research_paper' : 'external',
        page_type: getPageType()
      });
    }
  };

  // ============================================
  // PRODUCT TRACKING
  // ============================================

  const ProductTracker = {
    init: function() {
      const self = this;
      const pageType = getPageType();

      if (pageType !== 'product') return;

      // Track product view
      this.trackProductView();

      // Track tier/variant selections
      document.querySelectorAll('.quantity-option, .tier-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
          setTimeout(function() {
            self.trackVariantSelect(opt);
          }, 100); // Wait for price update
        });
      });

      // Track tier calculator usage
      const calcBtn = document.getElementById('calculateBtn') ||
                     document.getElementById('calculateBtnISRIB');
      if (calcBtn) {
        calcBtn.addEventListener('click', function() {
          self.trackTierCalculator();
        });
      }

      // Track lab report/COA clicks
      document.querySelectorAll('a[href*="coa"], a[href*="nmr"], a[href*=".pdf"]').forEach(function(link) {
        link.addEventListener('click', function() {
          self.trackLabReport(link);
        });
      });
    },

    trackProductView: function() {
      // Extract product info from page
      const productName = document.querySelector('.product-title, h1')?.textContent.trim() || 'Unknown';
      const productSku = document.querySelector('[data-sku]')?.dataset.sku ||
                        window.location.pathname.replace(/[^a-z0-9]/gi, '-');

      const priceEl = document.querySelector('.current-price, .price');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : 0;

      pushEvent('view_item', {
        event_category: 'product',
        ecommerce: {
          currency: 'USD',
          value: price,
          items: [{
            item_id: productSku,
            item_name: productName,
            item_category: 'Research Compounds',
            price: price,
            quantity: 1
          }]
        },
        page_type: 'product'
      });

      // Also push to Reddit Pixel if available
      if (window.RedditPixel && typeof window.RedditPixel.trackViewContent === 'function') {
        window.RedditPixel.trackViewContent(productName, price);
      }
    },

    trackVariantSelect: function(element) {
      const card = element.closest('.product-card, .product-card--order');
      if (!card) return;

      const addBtn = card.querySelector('.add-to-cart');
      if (!addBtn) return;

      pushEvent('product_variant_select', {
        event_category: 'product',
        item_id: addBtn.dataset.sku || card.dataset.sku,
        variant_selected: addBtn.dataset.display || element.dataset.quantity,
        variant_price: parseFloat(addBtn.dataset.price) || 0,
        variant_grams: parseFloat(addBtn.dataset.grams) || 0,
        page_type: 'product'
      });
    },

    trackTierCalculator: function() {
      const input = document.getElementById('customQuantity') ||
                   document.getElementById('customQuantityISRIB');
      const tierLabel = document.getElementById('tierLabel') ||
                       document.getElementById('tierLabelISRIB');
      const totalPrice = document.getElementById('totalPrice') ||
                        document.getElementById('totalPriceISRIB');

      if (!input) return;

      const quantity = parseFloat(input.value) || 0;
      const unit = (document.getElementById('quantityUnit') ||
                   document.getElementById('quantityUnitISRIB'))?.value || 'mg';
      const quantityMg = unit === 'g' ? quantity * 1000 : quantity;

      pushEvent('tier_calculator_use', {
        event_category: 'product',
        quantity_mg: quantityMg,
        tier_name: tierLabel?.textContent.trim() || 'unknown',
        total_price: parseFloat(totalPrice?.textContent.replace(/[^0-9.]/g, '')) || 0,
        page_type: 'product'
      });
    },

    trackLabReport: function(link) {
      const href = link.getAttribute('href') || '';
      let reportType = 'other';
      if (href.includes('coa')) reportType = 'coa';
      else if (href.includes('nmr')) reportType = 'nmr';
      else if (href.includes('hplc')) reportType = 'hplc';

      pushEvent('lab_report_view', {
        event_category: 'product',
        report_type: reportType,
        report_url: href,
        page_type: getPageType()
      });
    }
  };

  // ============================================
  // PROMO CODE TRACKING
  // ============================================

  const PromoTracker = {
    init: function() {
      const self = this;

      const applyBtn = document.getElementById('applyPromoBtn');
      if (!applyBtn) return;

      applyBtn.addEventListener('click', function() {
        setTimeout(function() {
          self.trackPromoAttempt();
        }, 100);
      });
    },

    trackPromoAttempt: function() {
      const input = document.getElementById('promoCode');
      const msg = document.getElementById('promoMsg');

      if (!input || !msg) return;

      const code = input.value.trim().toUpperCase();
      const success = msg.style.color === 'rgb(16, 185, 129)' ||
                     msg.textContent.includes('applied');

      // Calculate discount if applied
      let discountValue = 0;
      if (success) {
        const totalsEl = document.getElementById('summaryTotals');
        if (totalsEl) {
          const discountMatch = totalsEl.textContent.match(/Discount.*\$([0-9.]+)/);
          if (discountMatch) discountValue = parseFloat(discountMatch[1]);
        }
      }

      pushEvent('promo_code_attempt', {
        event_category: 'ecommerce',
        promo_code: code,
        promo_success: success,
        discount_value: discountValue,
        page_type: 'checkout'
      });
    }
  };

  // ============================================
  // SESSION START & ATTRIBUTION
  // ============================================

  const SessionTracker = {
    init: function() {
      if (!Session.isNew) return;

      const utm = getUTMParams();
      const redditInfo = getRedditInfo();

      pushEvent('session_start', {
        event_category: 'attribution',
        session_id: Session.getId(),
        user_type: getUserType(),
        traffic_source: getTrafficSource(),
        referrer: document.referrer,
        landing_page: window.location.pathname,
        device_type: getDeviceType(),
        utm_source: utm.utm_source || null,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        utm_content: utm.utm_content || null,
        reddit_subreddit: redditInfo.subreddit,
        reddit_thread_id: redditInfo.thread_id
      });

      // Reddit-specific tracking
      if (redditInfo.subreddit) {
        pushEvent('reddit_thread_referral', {
          event_category: 'attribution',
          subreddit: redditInfo.subreddit,
          thread_id: redditInfo.thread_id,
          landing_page: window.location.pathname
        });
      }
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    log('Initializing Enhanced Analytics...');

    // Initialize session first
    Session.init();

    // Initialize all trackers
    ScrollTracker.init();
    TimeTracker.init();
    CTATracker.init();
    FAQTracker.init();
    NavigationTracker.init();
    ProductTracker.init();
    PromoTracker.init();
    SessionTracker.init();

    // Set global analytics context
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'analytics_ready',
      session_id: Session.getId(),
      user_type: getUserType(),
      device_type: getDeviceType(),
      page_type: getPageType(),
      traffic_source: getTrafficSource()
    });

    log('Enhanced Analytics initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use
  window.ISRIBAnalytics = {
    pushEvent: pushEvent,
    getPageType: getPageType,
    getDeviceType: getDeviceType,
    getUserType: getUserType,
    getTrafficSource: getTrafficSource,
    getSessionId: function() { return Session.getId(); },
    getScrollDepth: function() { return ScrollTracker.getMaxDepth(); },
    getTimeOnPage: function() { return TimeTracker.getTimeOnPage(); }
  };

})();
