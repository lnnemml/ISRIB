// ============================================
// DUAL GA4 TRACKING - isrib.shop + isrib-research
// ============================================

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

// ============================================
// PRIMARY GA4 (isrib.shop)
// ============================================
gtag('config', 'G-SMCGZ6BPDC', {
  linker: { 
    domains: ['isrib.shop', 'www.isrib.shop', 'isrib-research.com', 'isrib-landing-kdmw.vercel.app']
  },
  send_page_view: true,
  cookie_flags: 'SameSite=None;Secure',
  cookie_domain: 'auto'
});

// ============================================
// CROSS-DOMAIN GA4 (з landing site)
// ============================================
gtag('config', 'G-LJEBV5NPCT', {
  linker: { 
    domains: ['isrib.shop', 'www.isrib.shop', 'isrib-research.com', 'isrib-landing-kdmw.vercel.app']
  },
  send_page_view: true,
  cookie_flags: 'SameSite=None;Secure',
  cookie_domain: 'auto'
});

console.log('✅ Dual GA4 initialized:', {
  primary: 'G-SMCGZ6BPDC',
  crossdomain: 'G-LJEBV5NPCT'
});
