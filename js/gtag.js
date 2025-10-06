// Google Analytics 4 (gtag.js) ініціалізація для isrib.shop

// Ініціалізація dataLayer та функції gtag()
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }

// Відмітити час запуску
gtag('js', new Date());

// Основна конфігурація GA4
gtag('config', 'G-6FXL7YXBM0', {
  linker: {
    domains: ['isrib.shop', 'www.isrib.shop', 'isrib-landing.vercel.app']
  }
});

