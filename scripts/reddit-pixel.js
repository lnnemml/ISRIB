// Reddit Pixel Base Code
// Pixel ID: a2_hz77nm0joupm

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
rdt('init','a2_hz77nm0joupm', {
  "optOut": false,
  "useDecimalCurrencyValues": true
});

// Track page visit
rdt('track', 'PageVisit');

// Helper functions for events
window.RedditPixel = {
  // Begin Checkout (AddToCart)
trackBeginCheckout: function(transactionId, value) {
  try {
    rdt('track', 'AddToCart', {
      'value': value || 0,
      'currency': 'USD',
      'itemCount': 1
      // Прибрали transactionId — Reddit не підтримує його для AddToCart
    });
    console.log('[Reddit Pixel] ✅ AddToCart fired, value:', value);
  } catch(e) {
    console.error('[Reddit Pixel] ❌ AddToCart error:', e);
  }
},
  
  // Buy Intent (Lead)
  trackBuyIntent: function(transactionId) {
    rdt('track', 'Lead', {
      'transactionId': transactionId || ''
    });
    console.log('✅ Reddit: Lead fired', transactionId);
  },
  
  // Purchase
  trackPurchase: function(transactionId, value) {
    rdt('track', 'Purchase', {
      'transactionId': transactionId || '',
      'value': value || 0,
      'currency': 'USD'
    });
    console.log('✅ Reddit: Purchase fired', transactionId, value);
  }
};

console.log('✅ Reddit Pixel initialized on:', window.location.pathname);
