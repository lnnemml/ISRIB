// Utility для збору та відправки tracking IDs з checkout form
(function() {
  'use strict';

  // ============================================
  // CAPTURE TRACKING IDs З URL
  // ============================================
  function captureTrackingFromURL() {
    const params = new URLSearchParams(window.location.search);

    const gacid = params.get('gacid');
    const fbp = params.get('fbp');
    const fbc = params.get('fbc');

    if (gacid) {
      localStorage.setItem('ga_client_id', gacid);
      console.log('[Tracking] ✅ Stored GA Client ID:', gacid);
    }

    if (fbp) {
      localStorage.setItem('fbp', fbp);
      console.log('[Tracking] ✅ Stored FBP:', fbp);
    }

    if (fbc) {
      localStorage.setItem('fbc', fbc);
      console.log('[Tracking] ✅ Stored FBC:', fbc);
    }
  }

  // ============================================
  // GET TRACKING IDs ДЛЯ ORDER SUBMISSION
  // ============================================
  function getTrackingData() {
    const tracking = {
      fbp: localStorage.getItem('fbp') || getCookie('_fbp') || '',
      fbc: localStorage.getItem('fbc') || getCookie('_fbc') || '',
      ga_client_id: localStorage.getItem('ga_client_id') || ''
    };

    console.log('[Tracking] 📦 Current tracking data:', tracking);

    return tracking;
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  // ============================================
  // EXPOSE GLOBAL
  // ============================================
  window.CheckoutTracking = {
    captureTrackingFromURL,
    getTrackingData
  };

  // Auto-capture on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', captureTrackingFromURL);
  } else {
    captureTrackingFromURL();
  }

  console.log('[Tracking] ✅ Checkout tracking helper loaded');
})();
