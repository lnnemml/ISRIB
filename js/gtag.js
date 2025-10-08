// Google Analytics 4 (gtag.js) ініціалізація для isrib.shop

// Ініціалізація dataLayer та функції gtag()
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

// Відмітити час запуску
gtag('js', new Date());

// Тимчасовий default consent: аналітика дозволена, реклама — ні
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500
});

// Основна конфігурація GA4
gtag('config', 'G-XGMHXZNME9', {
  debug_mode: true, // додай, щоб бачити все у DebugView
  linker: { domains: ['isrib.shop','www.isrib.shop','isrib-landing.vercel.app'] }
});
