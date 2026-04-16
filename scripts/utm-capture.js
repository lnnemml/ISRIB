(function() {
  'use strict';

  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORAGE_KEY = 'isrib_utm';
  var TTL_MS = 30 * 24 * 60 * 60 * 1000;

  function readUTMFromURL() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    var hasAny = false;
    UTM_PARAMS.forEach(function(key) {
      var val = params.get(key);
      if (val) { utm[key] = val; hasAny = true; }
    });
    return hasAny ? utm : null;
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

  function saveUTM(utm) {
    try {
      utm._ts = Date.now();
      utm._url = window.location.href;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
    } catch(e) {}
  }

  var urlUTM = readUTMFromURL();
  if (urlUTM) saveUTM(urlUTM);

  window.ISRIBTracking = window.ISRIBTracking || {};
  window.ISRIBTracking.getUTM = function() {
    return getStoredUTM() || {};
  };

})();
