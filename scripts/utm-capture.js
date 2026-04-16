(function() {
  'use strict';

  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_IDS  = ['fbclid', 'gclid', 'ttclid', 'twclid'];
  var STORAGE_KEY = 'isrib_utm';
  var TTL_MS = 30 * 24 * 60 * 60 * 1000;

  function readFromURL() {
    var params = new URLSearchParams(window.location.search);
    var data = {};
    var hasAny = false;

    UTM_PARAMS.forEach(function(key) {
      var val = params.get(key);
      if (val) { data[key] = val; hasAny = true; }
    });

    CLICK_IDS.forEach(function(key) {
      var val = params.get(key);
      if (val) { data[key] = val; hasAny = true; }
    });

    return hasAny ? data : null;
  }

  function getStoredUTM() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var stored = JSON.parse(raw);
      if (Date.now() - (stored._ts || 0) > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return stored;
    } catch(e) { return null; }
  }

  function saveUTM(data) {
    try {
      data._ts = Date.now();
      data._url = window.location.href;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  // Last-touch: якщо в URL є UTM або click ID — перезаписуємо
  var urlData = readFromURL();
  if (urlData) saveUTM(urlData);

  // Публічний API
  window.ISRIBTracking = window.ISRIBTracking || {};
  window.ISRIBTracking.getUTM = function() {
    return getStoredUTM() || {};
  };

  // Push attribution data to dataLayer after GTM loads
  function pushToDataLayer() {
    var data = getStoredUTM();
    if (!data) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'attribution_data',
      utm_source:   data.utm_source   || undefined,
      utm_medium:   data.utm_medium   || undefined,
      utm_campaign: data.utm_campaign || undefined,
      utm_content:  data.utm_content  || undefined,
      utm_term:     data.utm_term     || undefined,
      fbclid:       data.fbclid       || undefined,
      gclid:        data.gclid        || undefined,
      ttclid:       data.ttclid       || undefined
    });
  }

  // Wait for DOM ready so GTM has initialized
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pushToDataLayer);
  } else {
    pushToDataLayer();
  }

})();
