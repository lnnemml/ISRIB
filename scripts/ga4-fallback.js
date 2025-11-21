// scripts/ga4-fallback.js
// ============================================
// GA4 FALLBACK MECHANISM
// Відправляє події через Measurement Protocol якщо GTM не завантажився
// ============================================

(function() {
  console.log('[GA4 Fallback] 🔧 Initializing...');
  
  const MEASUREMENT_ID = 'G-LJEBV5NPCT';
  const API_SECRET = 'YOUR_API_SECRET_HERE'; // ✅ ЗАМІНІТЬ на ваш API secret з GA4
  
  // ============================================
  // HELPER: Generate/Get Client ID
  // ============================================
  function getClientId() {
    const CID_KEY = '_ga_cid';
    let cid = localStorage.getItem(CID_KEY);
    
    if (!cid) {
      // Генеруємо новий CID
      cid = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      try {
        localStorage.setItem(CID_KEY, cid);
        console.log('[GA4 Fallback] 🆔 Generated new Client ID:', cid);
      } catch(e) {
        console.warn('[GA4 Fallback] ⚠️ Cannot save Client ID');
      }
    }
    
    return cid;
  }
  
  // ============================================
  // HELPER: Check if GTM loaded
  // ============================================
  function isGTMLoaded() {
    return window.google_tag_manager && 
           window.google_tag_manager['GTM-M2QCB45Q'];
  }
  
  // ============================================
  // HELPER: Send event via Measurement Protocol
  // ============================================
  function sendToMeasurementProtocol(eventName, params = {}) {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
    
    const payload = {
      client_id: getClientId(),
      events: [{
        name: eventName,
        params: {
          ...params,
          page_location: location.href,
          page_title: document.title,
          page_path: location.pathname + location.search,
          engagement_time_msec: '100'
        }
      }]
    };
    
    console.log('[GA4 Fallback] 📤 Sending via Measurement Protocol:', {
      event: eventName,
      params: params
    });
    
    // Використовуємо fetch з keepalive для надійності
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true
    }).then(() => {
      console.log('[GA4 Fallback] ✅ Event sent:', eventName);
    }).catch(err => {
      console.error('[GA4 Fallback] ❌ Failed to send:', err);
    });
  }
  
  // ============================================
  // CHECK: GTM Status after 3 seconds
  // ============================================
  setTimeout(function() {
    if (!isGTMLoaded()) {
      console.warn('[GA4 Fallback] ⚠️ GTM not loaded after 3s, using fallback');
      
      // Відправляємо page_view через MP
      sendToMeasurementProtocol('page_view');
      
      // Якщо це checkout page - відправляємо begin_checkout
      if (location.pathname.includes('checkout')) {
        try {
          const cart = JSON.parse(localStorage.getItem('isrib_cart') || '[]');
          if (cart.length > 0) {
            const cartValue = cart.reduce((sum, item) => {
              return sum + (Number(item.price || 0) * Number(item.count || 1));
            }, 0);
            
            sendToMeasurementProtocol('begin_checkout', {
              value: cartValue,
              currency: 'USD'
            });
          }
        } catch(e) {
          console.error('[GA4 Fallback] ❌ Checkout event error:', e);
        }
      }
      
    } else {
      console.log('[GA4 Fallback] ✅ GTM loaded successfully, no fallback needed');
    }
  }, 3000);
  
  // ============================================
  // BACKUP: Intercept dataLayer pushes
  // ============================================
  window.dataLayer = window.dataLayer || [];
  const originalPush = window.dataLayer.push;
  
  window.dataLayer.push = function(...args) {
    // Спочатку викликаємо оригінальний push
    const result = originalPush.apply(this, args);
    
    // Якщо GTM не завантажився - дублюємо в MP
    if (!isGTMLoaded() && args[0] && typeof args[0] === 'object') {
      const eventData = args[0];
      
      if (eventData.event) {
        console.log('[GA4 Fallback] 🔄 GTM not loaded, duplicating event to MP:', eventData.event);
        
        // Витягуємо параметри залежно від типу події
        let params = {};
        
        if (eventData.ecommerce) {
          params.value = eventData.ecommerce.value;
          params.currency = eventData.ecommerce.currency || 'USD';
          params.transaction_id = eventData.ecommerce.transaction_id || eventData.transaction_id;
        }
        
        sendToMeasurementProtocol(eventData.event, params);
      }
    }
    
    return result;
  };
  
  console.log('[GA4 Fallback] ✅ Initialized successfully');
  
})();
