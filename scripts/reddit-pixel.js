// Reddit Pixel Base Code
// Pixel ID: a2_hz77nm0joupm

!function(w,d){
  if(!w.rdt){
    var p=w.rdt=function(){
      p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)
    };
    p.callQueue=[];
    var t=d.createElement("script");
    t.src="https://www.redditstatic.com/ads/pixel.js";
    t.async=!0;
    var s=d.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(t,s)
  }
}(window,document);

// Initialize pixel
rdt('init','a2_hz77nm0joupm', {
  "optOut": false,
  "useDecimalCurrencyValues": true
});

// Track page visit
rdt('track', 'PageVisit');

console.log('✅ Reddit Pixel initialized on:', window.location.pathname);
