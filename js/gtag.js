window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());

// Consent (для ЄС)
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied', 
  ad_personalization: 'denied',
  analytics_storage: 'granted',
  functionality_storage: 'granted',
  security_storage: 'granted'
});

// Основна конфігурація
gtag('config', 'G-SMCGZ6BPDC', {
  linker: { 
    domains: ['isrib.shop', 'www.isrib.shop', 'isrib-landing.vercel.app'] 
  },
  send_page_view: true,
  cookie_flags: 'SameSite=None;Secure',
  debug_mode: true
});

// Debug для тестування (видаліть після перевірки)
console.log('[GA4] Configuration loaded');
