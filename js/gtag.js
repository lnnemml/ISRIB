<!-- Google tag (gtag.js) — завантажуємо по робочому ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SMCGZ6BPDC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());

  // consent (щоб ЄС не глушив аналітику)
  gtag('consent', 'default', {
    ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    analytics_storage:'granted', functionality_storage:'granted', security_storage:'granted'
  });

  // 1) робочий існуючий тег (щоб той сам збирався, як і раніше)
  gtag('config', 'G-SMCGZ6BPDC', {
    linker:{ domains:['isrib.shop','www.isrib.shop','isrib-landing.vercel.app'] }
  });

  // 2) (опційно) додатково шлемо в новий стрім, навіть якщо його js 404
  //    бібліотека вже завантажена, це легально:
  gtag('config', 'G-XGMHXZNME9', {
    debug_mode:true,
    linker:{ domains:['isrib.shop','www.isrib.shop','isrib-landing.vercel.app'] }
  });
</script>
