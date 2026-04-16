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

})();
