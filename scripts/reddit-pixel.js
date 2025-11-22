// ============================================
// Reddit Pixel Base Code
// Pixel ID: a2_hz77nm0joupm
// ============================================

!function(w,d){
  if(!w.rdt){
    var p=w.rdt=function(){
      p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)
    };
    p.callQueue=[];
    var t=d.createElement("script");
    t.src="https://www.redditstatic.com/ads/pixel.js";
    t.async=!0;
    var s=d.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(t,s)
  }
}(window,document);

// Initialize pixel
rdt('init', 'a2_hz77nm0joupm', {
  "optOut": false,
  "useDecimalCurrencyValues": true
});

// Track page visit on every page
rdt('track', 'PageVisit');

console.log('[Reddit Pixel] ✅ Initialized on:', window.location.pathname);

// ============================================
// Helper Functions for Event Tracking
// Using ONLY officially supported parameters
// ============================================

window.RedditPixel = {
  
  // Begin Checkout (AddToCart event)
  // Supported: value, currency, itemCount
  trackBeginCheckout: function(transactionId, value) {
    try {
      rdt('track', 'AddToCart', {
        'value': value || 0,
        'currency': 'USD',
        'itemCount': 1
      });
      console.log('[Reddit Pixel] ✅ AddToCart (Begin Checkout) fired:', {
        value: value
      });
    } catch(e) {
      console.error('[Reddit Pixel] ❌ AddToCart error:', e);
    }
  },
  
  // Buy Intent (Lead event)
  // Supported: value, currency
  trackBuyIntent: function(transactionId, value) {
    try {
      rdt('track', 'Lead', {
        'value': value || 0,
        'currency': 'USD'
      });
      console.log('[Reddit Pixel] ✅ Lead (Buy Intent) fired:', {
        value: value
      });
    } catch(e) {
      console.error('[Reddit Pixel] ❌ Lead error:', e);
    }
  },
  
  // Purchase (final conversion)
  // Supported: value, currency, transactionId, itemCount
  trackPurchase: function(transactionId, value) {
    try {
      rdt('track', 'Purchase', {
        'transactionId': transactionId || '',
        'value': value || 0,
        'currency': 'USD',
        'itemCount': 1
      });
      console.log('[Reddit Pixel] ✅ Purchase fired:', {
        transactionId: transactionId,
        value: value
      });
    } catch(e) {
      console.error('[Reddit Pixel] ❌ Purchase error:', e);
    }
  },
  
  // View Content (for product views)
  // Supported: value, currency, content_ids, content_type, content_name, content_category
  trackViewContent: function(contentName, value) {
    try {
      rdt('track', 'ViewContent', {
        'content_type': 'product',
        'content_name': contentName || 'ISRIB Product',
        'value': value || 0,
        'currency': 'USD'
      });
      console.log('[Reddit Pixel] ✅ ViewContent fired:', {
        content_name: contentName,
        value: value
      });
    } catch(e) {
      console.error('[Reddit Pixel] ❌ ViewContent error:', e);
    }
  },
  
  // Custom event (for any other tracking)
  // MUST include customEventName
  trackCustom: function(eventName, data) {
    try {
      rdt('track', 'Custom', {
        'customEventName': eventName || 'CustomEvent',
        ...data
      });
      console.log('[Reddit Pixel] ✅ Custom event fired:', eventName);
    } catch(e) {
      console.error('[Reddit Pixel] ❌ Custom event error:', e);
    }
  }
};
