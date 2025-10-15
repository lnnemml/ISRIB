// ISRIB Shop - Main JavaScript (Unified)
// v2025-09-26 — header UX, products, quantity, cart, top toasts, dynamic Add-to-Cart labels

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
   // ⚡ НОВИЙ КОД: Зберігаємо promo з URL в localStorage
  (function savePromoFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const promoFromURL = urlParams.get('promo');
    
    if (promoFromURL) {
      // Зберігаємо на 72 години (відповідає терміну дії промокоду)
      const expiryTime = Date.now() + (72 * 60 * 60 * 1000);
      localStorage.setItem('pending_promo', JSON.stringify({
        code: promoFromURL.toUpperCase(),
        expiry: expiryTime,
        source: 'email_campaign'
      }));
      
      console.log('[PROMO] Saved from URL:', promoFromURL);
    }
  })();
  bindBurgerMenu?.();
  initHeaderBehavior();
  initSmoothScrolling();
  initFadeInAnimations();
  initProductInteractions();
  initQuantitySelectors();     // calculates price + $/mg + syncs dataset
  bindQtyLabelUpdates(); // keeps "Add to cart 1g/100mg" label in sync
  if (typeof initA15OrderCard === 'function') { initA15OrderCard(); }
  initProductFilters();
  initMobileOptimizations();
  initAnalytics();
  initContactForms();
  initPerformanceOptimizations();
  initFAQAccordion();       // FAQ акордеон (a11y + аналітика)
  initAnchorHighlight();    // підсвічування при переході за якорями
  updateCartBadge();
  mountAddToCartButtons();
  prepareAddToCartButtons();
  renderCheckoutCart();
  initBundleWidget();
  initCheckoutForm();
  initPromoCode();
  initContactUX();        // показ/приховування product-section, автозаповнення з query string
  initContactFormResend(); // сабміт форми через ваш бекенд/серверлес із Resend
  // Back-compat helpers some code expects:
  try { updateContactLinks(); } catch {}
  try {
  const raw = JSON.parse(localStorage.getItem('isrib_cart') || '[]');
  if (Array.isArray(raw) && raw.some(i => Number(i.grams) > 100000)) {
    localStorage.removeItem('isrib_cart');
  }
} catch {}

}

/* ========================= HEADER / NAV ========================= */

function bindBurgerMenu() {
  const btn = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
    btn.classList.toggle('open');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
  });
  nav.querySelectorAll('.nav a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open'); btn.classList.remove('open'); document.body.style.overflow = '';
    });
  });
}

function initHeaderBehavior() {
  const header = document.querySelector('header.site-header');
  if (!header) return;
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    if (y > 10) header.classList.add('is-sticky'); else header.classList.remove('is-sticky');
    if (y > lastY && y > 80) header.classList.add('hide'); else header.classList.remove('hide');
    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

function initFadeInAnimations() {
  const els = document.querySelectorAll('.will-fade-in');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } });
  }, { rootMargin: '120px' });
  els.forEach(el => io.observe(el));
}

function initFAQAccordion() {
  // НОВИЙ FAQ: .faq-item > .faq-button + .faq-answer
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length) {
    faqItems.forEach(item => {
      const btn = item.querySelector('.faq-button');
      const ans = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');
      if (!btn || !ans) return;

      // початковий стан
      btn.setAttribute('aria-expanded', 'false');
      ans.hidden = true;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Якщо треба, зробити акумулятивне відкриття — прибери цикл нижче
        document.querySelectorAll('.faq-item.open').forEach(i => {
          if (i !== item) {
            i.classList.remove('open');
            const a = i.querySelector('.faq-answer'); if (a) a.hidden = true;
            const b = i.querySelector('.faq-button'); if (b) b.setAttribute('aria-expanded', 'false');
            const ic = i.querySelector('.faq-icon'); if (ic) ic.textContent = '+';
          }
        });

        item.classList.toggle('open', !isOpen);
        ans.hidden = isOpen;
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (icon) icon.textContent = isOpen ? '+' : '–';
      });
    });
    return; // не чіпаємо старий акордеон, якщо використовуємо новий
  }

  // СТАРИЙ FAQ: .accordion .accordion-item > .accordion-head/.accordion-body (беккомпат)
  document.querySelectorAll('.accordion .accordion-item').forEach(item => {
    const head = item.querySelector('.accordion-head');
    const body = item.querySelector('.accordion-body');
    if (!head || !body) return;
    head.addEventListener('click', () => {
      const opened = item.classList.contains('open');
      document.querySelectorAll('.accordion .accordion-item.open').forEach(i => i.classList.remove('open'));
      if (!opened) item.classList.add('open');
    });
  });
}


function initAnchorHighlight() {
  function flash() {
    const id = location.hash;
    if (!id || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    target.classList.add('anchor-hit');
    setTimeout(() => target.classList.remove('anchor-hit'), 1200);
  }
  window.addEventListener('hashchange', flash);
  flash();
}

/* ============================ UTILS ============================ */

function showToast(msg, type = 'info') {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.style.position = 'fixed';
    host.style.left = '50%';
    host.style.transform = 'translateX(-50%)';
    host.style.zIndex = '9999';
    host.style.top = '16px';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.gap = '8px';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.style.padding = '10px 14px';
  t.style.borderRadius = '10px';
  t.style.boxShadow = '0 8px 24px rgba(0,0,0,.15)';
  t.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#111827';
  t.style.color = '#fff';
  t.style.fontSize = '14px';
  t.textContent = msg;
  host.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => t.style.opacity = '0', 2000);
  setTimeout(() => t.remove(), 2600);
}

function fmtUSD(x) {
  const n = Number(x || 0);
  return `$${n.toFixed(2)}`;
}

/* ===================== PRODUCTS / QUANTITY ===================== */

function initProductInteractions() {
  // клік по фону картки -> перехід
  document.addEventListener('click', (e) => {
    const card = e.target.closest?.('.product-card');
    if (!card) return;
    if (e.target.closest('a,button,.quantity-row,.quantity-option,.product-footer,.price-line,.card-controls')) return;
    const href = card.dataset.href || card.querySelector('.stretched-link')?.getAttribute('href');
    if (href) window.location.href = href;
  }, { passive: false });

  // клавіатура
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest?.('.product-card');
    if (!card) return;
    if (e.target.closest('a,button,.quantity-row,.quantity-option,.product-footer,.price-line,.card-controls')) return;
    const href = card.dataset.href || card.querySelector('.stretched-link')?.getAttribute('href');
    if (href) { e.preventDefault(); window.location.href = href; }
  });
}

function initQuantitySelectors() {
  document.querySelectorAll('.product-card, .product-card--order').forEach(card => {
    const initial = card.querySelector('.quantity-option.active') || card.querySelector('.quantity-option');
    if (!initial) return;
    setActiveOption(card, initial);
  });

  document.addEventListener('click', (e) => {
    const opt = e.target.closest('.quantity-option');
    if (!opt) return;
    const card = opt.closest('.product-card, .product-card--order');
    if (!card) return;
    setActiveOption(card, opt);
  });
}

function setActiveOption(card, opt) {
  // 1) Активуємо вибрану опцію
  card.querySelectorAll('.quantity-option').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');

  // 2) Зчитуємо значення
  const qStr  = (opt.dataset.quantity || '').trim(); // "100mg" | "500mg" | "1g"
  const mg    = parseQtyToMg(qStr) || Number(opt.dataset.grams || 0);
  const price = Number(opt.dataset.price || 0) || 0;


  // 3) Оновлюємо відображення ціни
  const current = card.querySelector('.current-price');
  if (current) current.textContent = fmtUSD(price);

  // 4) Оновлюємо підпис, якщо є
  const label = card.querySelector('.selected-quantity');
  if (label) label.textContent = qStr;

  // 5) Оновлюємо кнопку
  const btn = card.querySelector('.add-to-cart');
  if (btn) {
    // datasets для кошика
    btn.dataset.price   = String(price);
    btn.dataset.grams   = String(mg);
    btn.dataset.display = qStr;

    // базовий напис фіксуємо в data-base-label (без кількості)
    if (!btn.dataset.baseLabel) {
      const raw  = (btn.querySelector('.btn-text')?.textContent || btn.textContent || 'Add to Cart').trim();
      const base = raw
        .replace(/\s*[–—-]\s*.*$/, '')              // прибрати все після " — "
        .replace(/\s*\d+(\.\d+)?\s*(mg|g).*$/i, '') // прибрати "100mg/1g" в кінці
        .trim() || 'Add to Cart';
      btn.dataset.baseLabel = base;
    }

    const base = (btn.dataset.baseLabel || 'Add to Cart').trim();
    const newText = `${base} — ${qStr}`;

    // якщо є внутрішній .btn-text — оновлюємо його, інакше весь текст
    const span = btn.querySelector('.btn-text');
    if (span) span.textContent = newText;
    else btn.textContent = newText;
  }
}




function parseQtyToMg(s) {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  
  // "1g" або "1000mg" → перевіряємо, чи є "g" БЕЗ "mg"
  if (t.includes('g') && !t.includes('mg')) {
    return Math.round(n * 1000); // грами → міліграми
  }
  
  return Math.round(n); // вже в міліграмах
}

function toMg(v) {
  const n = Number(v || 0);
  return n >= 1 ? n * 1000 : n;
}

function bindQtyLabelUpdates() {
  // Нічого додаткового: лейбл оновлюється в setActiveOption()
}

function initA15OrderCard() {
  const card = document.getElementById('orderCardA15') || document.querySelector('.product-card--order[data-sku="isrib-a15"]');
  const active = card && (card.querySelector('.quantity-option.active') || card.querySelector('.quantity-option'));
  if (active) setActiveOption(card, active);
}

function initProductFilters() { /* no-op */ }
function initMobileOptimizations() { /* no-op */ }


/* ========================= BUNDLE WIDGET ========================= */

function initBundleWidget() {
  const bundleBtn = document.getElementById('addBundleBtn');
  const checkbox = document.getElementById('bundle-zzl7');
  
  if (!bundleBtn) return;

  // Динамічне оновлення ціни при toggle checkbox
  if (checkbox) {
    checkbox.addEventListener('change', () => {
      const total = checkbox.checked ? '$85.00' : '$50.00';
      const btnText = checkbox.checked 
        ? '🛒 Add Bundle to Cart — $85' 
        : '🛒 Add ISRIB A15 to Cart — $50';
      
      document.getElementById('bundleTotal').textContent = total;
      bundleBtn.textContent = btnText;
    });
  }

  bundleBtn.addEventListener('click', () => {
    // Додаємо основний продукт
    addToCart('ISRIB A15', 'isrib-a15', 100, 50, '100mg');
    
    // Додаємо upsell якщо вибрано
    if (checkbox && checkbox.checked) {
      addToCart('ZZL-7', 'zzl7', 100, 50, '100mg');
      showToast('Bundle added to cart! 🎉', 'success');
      
      // Analytics
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'upsell_accepted', {
            event_category: 'ecommerce',
            event_label: 'bundle_isrib_zzl7',
            value: 85
          });
        }
      } catch(e) {}
    } else {
      showToast('Added to cart! 🛒', 'success');
    }
    
    updateCartBadge();
  });
}

/* ============================== CART ============================== */

/* ============================== CART ============================== */

// Глобальна функція нормалізації одиниць виміру
function normalizeCartUnits(arr) {
  return (arr || []).map((i) => {
    let grams = Number(i.grams || 0);
    // якщо є людський лейбл "100mg/1g" — він найнадійніший
    if (i.display) {
      const mgFromLabel = parseQtyToMg(i.display);
      if (mgFromLabel) grams = mgFromLabel;
    } else {
      // fallback: якщо явно бачимо "1000×" — це старий формат, ділимо на 1000
      if (grams >= 100000) grams = Math.round(grams / 1000);
    }
    return { 
      ...i, 
      grams,
      count: Number(i.count || 1),
      price: Number(i.price || 0)
    };
  });
}

function readCart() {
  try { 
    const raw = JSON.parse(localStorage.getItem('isrib_cart') || '[]') || [];
    return normalizeCartUnits(raw);
  }
  catch { return []; }
}

function writeCart(arr) {
  localStorage.setItem('isrib_cart', JSON.stringify(arr || []));
}

function updateCartBadge(arr) {
  const cart = Array.isArray(arr) ? arr : readCart();
  const total = cart.reduce((n, i) => n + (Number(i.count) || 0), 0);
  const ids = ['cartCount', 'cartCountMobile'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = String(total); });
}

function addToCart(name, sku, grams, price, display) {
  const cart = readCart();
  
  // КРИТИЧНО: grams має бути в мг (не множити на 1000!)
  const gramsInMg = Number(grams) || 0;
  
  const idx = cart.findIndex(i => 
    i.sku === sku && 
    Number(i.grams) === gramsInMg && 
    Number(i.price) === Number(price)
  );
  
  if (idx >= 0) {
    cart[idx].count = Number(cart[idx].count || 1) + 1;
  } else {
    cart.push({ 
      name, 
      sku, 
      grams: gramsInMg,  // ← вже в мг
      price: Number(price) || 0, 
      display: display || null, 
      count: 1, 
      unit: 'pack' 
    });
  }
  
  writeCart(cart);
}

function mountAddToCartButtons() {
  document.querySelectorAll('.add-to-cart:not([disabled])').forEach(btn => {
    if (btn._bound) return; 
    btn._bound = true;
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      const name =
        card?.querySelector('.product-name')?.textContent ||
        card?.querySelector('.product-title')?.textContent ||
        btn.dataset.name || 'Unknown';
      const sku = btn.dataset.sku || card?.dataset.sku || 'sku-unknown';
      
      // Зчитуємо grams і display
      let grams = parseFloat(btn.dataset.grams || '0') || 0;
      const display = btn.dataset.display || '';
      
      // Якщо display є "100mg", використовуємо його як джерело правди
      if (display) {
        const mgFromDisplay = parseQtyToMg(display);
        if (mgFromDisplay) grams = mgFromDisplay;
      }
      
      const price = parseFloat(btn.dataset.price || '0') || 0;

      // Логіка кошика
      addToCart(name, sku, grams, price, display);
      updateCartBadge?.();
      showToast?.(`Added to cart — ${(display || (grams ? (grams >= 1000 ? (grams/1000)+'g' : grams+'mg') : ''))} for $${price}`);

      // Аналітика
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'add_to_cart', {
            event_category: 'ecommerce',
            event_label: name,
            value: price,
            currency: 'USD'
          });
        }
      } catch(_) {}

      try { trackEvent?.('add_to_cart_click', { name, sku, grams, price, display }); } catch(_) {}
    }, { passive: false });
  });
}

function prepareAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    // якщо немає внутрішнього контейнера — створюємо
    let span = btn.querySelector('.btn-text');
    if (!span) {
      span = document.createElement('span');
      span.className = 'btn-text';
      // переносимо лише текстову частину, не чіпаємо іконки
      span.textContent = btn.textContent.trim();
      btn.innerHTML = btn.innerHTML.replace(btn.textContent, '');
      btn.appendChild(span);
    }
    // зберігаємо базовий напис без кількостей
    if (!btn.dataset.baseLabel) {
      const raw = span.textContent.trim();
      const base = raw
        .replace(/\s*[–—-]\s*.*$/, '')         // обрізати все після " — "
        .replace(/\s*\d+(\.\d+)?\s*(mg|g).*$/i, '') // і будь-які "100mg/1g" в кінці
        .trim() || 'Add to Cart';
      btn.dataset.baseLabel = base;
      span.textContent = base;
    }
  });
}



/* ========================= POST-ADD UPSELL POPUP ========================= */

function showUpsellPopup(justAddedSku) {
  // Логіка: якщо додали ISRIB A15 → пропонуємо ZZL-7
  const upsellMap = {
    'isrib-a15': { name: 'ZZL-7', sku: 'zzl7', price: 50, grams: 100, display: '100mg', reason: 'Popular stack with ISRIB A15' },
    'zzl7': { name: 'ISRIB A15', sku: 'isrib-a15', price: 50, grams: 100, display: '100mg', reason: 'Enhance effects with ISRIB' },
    'isrib': { name: 'ISRIB A15', sku: 'isrib-a15', price: 50, grams: 100, display: '100mg', reason: 'Upgrade to more potent A15' }
  };

  const upsell = upsellMap[justAddedSku];
  if (!upsell) return;

  // Перевірка: чи вже є в кошику
  const cart = readCart();
  if (cart.some(i => i.sku === upsell.sku)) return;

  // Створюємо popup
  const popup = document.createElement('div');
  popup.className = 'upsell-popup';
  popup.innerHTML = `
    <div class="upsell-popup-overlay"></div>
    <div class="upsell-popup-content">
      <button class="upsell-popup-close" aria-label="Close">×</button>
      <h3>🔥 Complete your stack</h3>
      <p class="upsell-popup-reason">${upsell.reason}</p>
      <div class="upsell-popup-product">
        <strong>${upsell.name}</strong>
        <span>${upsell.display} • $${upsell.price}</span>
      </div>
      <div class="upsell-popup-actions">
        <button class="btn btn-primary upsell-popup-accept">Add ${upsell.name} for $${upsell.price}</button>
        <button class="btn btn-outline upsell-popup-decline">No thanks</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  document.body.style.overflow = 'hidden';

  // Анімація появи
  setTimeout(() => popup.classList.add('show'), 10);

  // Закриття
  const close = () => {
    popup.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => popup.remove(), 300);
  };

  popup.querySelector('.upsell-popup-close').addEventListener('click', close);
  popup.querySelector('.upsell-popup-overlay').addEventListener('click', close);
  popup.querySelector('.upsell-popup-decline').addEventListener('click', () => {
    close();
    
    // Analytics
    try {
      if (typeof gtag === 'function') {
        gtag('event', 'upsell_declined', {
          event_category: 'ecommerce',
          event_label: `post_add_${upsell.sku}`
        });
      }
    } catch(e) {}
  });

  popup.querySelector('.upsell-popup-accept').addEventListener('click', () => {
    addToCart(upsell.name, upsell.sku, upsell.grams, upsell.price, upsell.display);
    updateCartBadge();
    showToast(`${upsell.name} added to cart! 🎉`, 'success');
    close();

    // Analytics
    try {
      if (typeof gtag === 'function') {
        gtag('event', 'upsell_accepted', {
          event_category: 'ecommerce',
          event_label: `post_add_${upsell.sku}`,
          value: upsell.price
        });
      }
    } catch(e) {}
  });
}

/* ============================ CHECKOUT ============================ */


function renderCheckoutCart(){
  const wrap = document.getElementById('cartList');
  if (!wrap) return;

  const cart = readCart();
  updateCartBadge(cart);

  if (!cart.length){
    wrap.innerHTML = `<p class="muted">Your cart is empty. Go to <a class="link" href="products.html">Products</a>.</p>`;
    const totals = document.getElementById('summaryTotals');
    if (totals) totals.innerHTML = '';
    updateCheckoutSubmitState();
    return;
  }

  wrap.innerHTML = cart.map((it, idx) => `
    <div class="cart-row">
      <div class="cart-title">
        <strong>${it.name}</strong>
        <span class="muted">(${it.display || (it.grams ? (it.grams>=1000 ? (it.grams/1000)+'g' : it.grams+'mg') : '')})</span>
      </div>
      <div class="cart-ctrl">
        <span class="price">${fmtUSD(it.price)}</span>
        ×
        <input type="number" min="1" value="${Number(it.count||1)}" data-idx="${idx}" class="cart-qty" />
        <button class="link danger cart-remove" data-idx="${idx}">Remove</button>
      </div>
    </div>
  `).join('');

  // ⚡ Передаємо збережений promo якщо є
  recalcTotals(cart, window._appliedPromo || null);
  
  bindCheckoutCartEvents();
  updateCheckoutSubmitState();
}

function updateCheckoutSubmitState() {
  const btn = document.getElementById('submitOrderBtn');
  const msg = document.getElementById('formMsg') || document.querySelector('#checkoutForm .form-status');

  // головне — читаємо з localStorage (через наш reader)
  const empty = (readCart().length === 0);

  if (btn) {
    btn.disabled = empty;
    btn.setAttribute('aria-disabled', String(empty));
  }
  if (msg) {
    msg.textContent = empty ? 'Your cart is empty. Add at least one product before submitting.' : '';
    msg.style.color = empty ? '#dc2626' : '';
  }
}



function bindCheckoutCartEvents(){
  const wrap = document.getElementById('cartList');
  if (!wrap) return;
  wrap.querySelectorAll('.cart-qty').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const i = Number(e.target.dataset.idx);
      const arr = readCart();
      arr[i].count = Math.max(1, Number(e.target.value||1));
      writeCart(arr);
      updateCartBadge(arr);
      renderCheckoutCart();
      updateCheckoutSubmitState();
    });
  });
  wrap.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.target.dataset.idx);
      const arr = readCart(); arr.splice(i,1);
      writeCart(arr);
      updateCartBadge(arr);
      renderCheckoutCart();
      updateCheckoutSubmitState();
    });
  });
}

/* ===================== CHECKOUT FORM SUBMIT ===================== */

// --- Promo code logic ---
function initPromoCode() {
  const input = document.getElementById('promoCode');
  const btn = document.getElementById('applyPromoBtn');
  const msg = document.getElementById('promoMsg');
  
  if (!input || !btn) return;

  let appliedPromo = null;

  const PROMO_CODES = {
    'RETURN15': { discount: 0.15, label: '15% off' },
    'WELCOME15': { discount: 0.15, label: '15% off' }
  };

  // ⚡ АВТОМАТИЧНА АКТИВАЦІЯ З LOCALSTORAGE
  (function autoApplyPromo() {
    try {
      const stored = localStorage.getItem('pending_promo');
      if (!stored) return;
      
      const { code, expiry, source } = JSON.parse(stored);
      
      // Перевіряємо термін дії
      if (Date.now() > expiry) {
        localStorage.removeItem('pending_promo');
        return;
      }
      
      // Перевіряємо чи код валідний
      if (PROMO_CODES[code]) {
        input.value = code;
        
        // Застосовуємо автоматично
        appliedPromo = { code, ...PROMO_CODES[code] };
        msg.textContent = `✓ ${appliedPromo.label} applied from email`;
        msg.style.color = '#10b981';
        input.disabled = true;
        btn.textContent = 'Applied';
        btn.disabled = true;
        
        recalcTotals(readCart(), appliedPromo);
        
        // Видаляємо з localStorage після активації
        localStorage.removeItem('pending_promo');
        
        // Analytics
        try {
          if (typeof gtag === 'function') {
            gtag('event', 'promo_auto_applied', {
              event_category: 'checkout',
              event_label: code,
              promo_source: source
            });
          }
        } catch(e) {}
        
        console.log('[PROMO] Auto-applied:', code);
      }
    } catch(e) {
      console.error('[PROMO] Auto-apply error:', e);
    }
  })();

  // Решта коду для manual apply залишається без змін...
  btn.addEventListener('click', () => {
    const code = (input.value || '').trim().toUpperCase();
    
    if (!code) {
      msg.textContent = 'Enter a promo code';
      msg.style.color = '#ef4444';
      return;
    }

    if (PROMO_CODES[code]) {
      appliedPromo = { code, ...PROMO_CODES[code] };
      msg.textContent = `✓ ${appliedPromo.label} applied`;
      msg.style.color = '#10b981';
      input.disabled = true;
      btn.textContent = 'Applied';
      btn.disabled = true;
      
      recalcTotals(readCart(), appliedPromo);
      
    } else {
      msg.textContent = 'Invalid code';
      msg.style.color = '#ef4444';
      appliedPromo = null;
    }
  });

  // Зберігаємо appliedPromo для використання в checkout
  window._appliedPromo = appliedPromo;
}

// Оновлена функція recalcTotals з підтримкою знижки
function recalcTotals(cart, promo = null) {
  const subtotal = cart.reduce((s, it) => s + Number(it.price || 0) * Number(it.count || 1), 0);
  
  let discount = 0;
  if (promo && promo.discount) {
    discount = subtotal * promo.discount;
  }

  const shipping = 0;
  const total = subtotal - discount + shipping;

  const totals = document.getElementById('summaryTotals');
  if (!totals) return;

  let html = `
    <div class="sum-line"><span>Subtotal</span><b>${fmtUSD(subtotal)}</b></div>
  `;
  
  if (discount > 0) {
    html += `<div class="sum-line" style="color:#10b981;">
      <span>Discount (${promo.label})</span><b>−${fmtUSD(discount)}</b>
    </div>`;
  }
  
  html += `
    <div class="sum-line"><span>Shipping</span><b>FREE</b></div>
    <div class="sum-line grand"><span>Total</span><b>${fmtUSD(total)}</b></div>
    <div class="sum-note">* Free shipping — limited-time launch offer.</div>
  `;

  totals.innerHTML = html;
}



/* ========================= CHECKOUT UPSELL ========================= */

function initCheckoutUpsell() {
  const widget = document.getElementById('checkoutUpsell');
  if (!widget) return;

  //Ховаємо товари, що вже в кошику
  const cart = readCart();
  const cartSkus = cart.map(i => i.sku);

  widget.querySelectorAll('.upsell-item').forEach(item => {
    const sku = item.dataset.sku;
    
    if (cartSkus.includes(sku)) {
      item.classList.add('added');
      item.querySelector('.add-upsell').textContent = 'Added';
    }
  });

  // Додавання upsell товару
  widget.querySelectorAll('.add-upsell').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.upsell-item');
      
      const name = item.dataset.name;
      const sku = item.dataset.sku;
      const price = parseFloat(item.dataset.price);
      const grams = parseFloat(item.dataset.grams);
      const display = item.dataset.display;

      addToCart(name, sku, grams, price, display);
      updateCartBadge();
      renderCheckoutCart();
      
      // UI feedback
      item.classList.add('added');
      btn.textContent = '✓ Added';
      showToast(`${name} added to cart!`, 'success');

      // Analytics
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'upsell_accepted', {
            event_category: 'ecommerce',
            event_label: `checkout_upsell_${sku}`,
            value: price
          });
        }
      } catch(e) {}

      // Оновлюємо widget
      setTimeout(() => initCheckoutUpsell(), 100);
    });
  });

  // Клік по всьому item
  widget.querySelectorAll('.upsell-item').forEach(item => {
    item.addEventListener('click', () => {
      const btn = item.querySelector('.add-upsell');
      if (!item.classList.contains('added')) {
        btn.click();
      }
    });
  });
}



function initCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitOrderBtn');

  // helper: "100mg" | "1 g" → mg (number)
  function parseQtyToMgLabel(s) {
    const t = String(s || '').toLowerCase();
    const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
    return t.includes('g') ? Math.round(n * 1000) : Math.round(n);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const msg = document.getElementById('formMsg') || form.querySelector('.form-status');
    if (msg) { msg.textContent = ''; msg.style.color = ''; }

    // honeypot
    const gotcha = form.querySelector('input[name="_gotcha"]')?.value || '';
    if (gotcha) return;

    // заборона сабміту з пустим кошиком
    const cartNow = readCart();
    if (!cartNow.length) {
      if (msg) {
        msg.textContent = 'Your cart is empty. Add at least one product before submitting.';
        msg.style.color = '#dc2626';
      }
      try { showToast?.('Cart is empty', 'error'); } catch {}
      document.querySelector('.order-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateCheckoutSubmitState?.();
      return;
    }

    // дані з форми
    const firstName = form.firstName.value.trim();
    const lastName  = form.lastName.value.trim();
    const email     = form.email.value.trim();
    const country   = form.country.value.trim();
    const region    = form.region?.value.trim() || '';
    const city      = form.city.value.trim();
    const postal    = form.postal.value.trim();
    const address   = form.address.value.trim();
    const messenger = form.messenger?.value || '';
    const handle    = form.handle?.value || '';
    const notes     = form.notes?.value || '';

    // валідація
    if (!firstName || !lastName || !email || !country || !city || !postal || !address) {
      if (msg) {
        msg.textContent = 'Please fill all required fields.';
        msg.style.color = '#dc2626';
      }
      return;
    }

    // ⚡ КРИТИЧНО: зчитуємо promo code (включаючи збережений з localStorage)
    const promoInput = document.getElementById('promoCode');
    const applyBtn = document.getElementById('applyPromoBtn');
    
    // Перевіряємо чи промокод застосований (через UI або автоматично)
    const isPromoApplied = applyBtn && applyBtn.disabled;
    const appliedPromoCode = isPromoApplied 
      ? (promoInput?.value?.trim().toUpperCase() || '') 
      : (window._appliedPromo?.code || '');

    console.log('[FRONTEND DEBUG] Promo code:', appliedPromoCode, 'Applied:', isPromoApplied);

    // кошик → нормалізовані items
    const cart = normalizeCartUnits(readCart());
    const items = cart.map(i => {
      const mgFromLabel = parseQtyToMgLabel(i.display);
      const mgPerPack   = mgFromLabel || Number(i.grams || 0);
      return {
        name:    i.name,
        sku:     i.sku || i.id || '',
        qty:     Number(i.count || 1),
        price:   Number(i.price || 0),
        grams:   mgPerPack,
        display: i.display || (mgPerPack ? (mgPerPack >= 1000 ? (mgPerPack / 1000) + 'g' : mgPerPack + 'mg') : '')
      };
    });

    // суми з урахуванням знижки
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    
    let discount = 0;
    let discountPercent = 0;
    if (appliedPromoCode) {
      const PROMO_CODES = {
        'RETURN15': 0.15,
        'WELCOME15': 0.15
      };
      discountPercent = PROMO_CODES[appliedPromoCode] || 0;
      discount = subtotal * discountPercent;
    }

    const shipping = 0;
    const total = subtotal - discount + shipping;

    // payload
    const payload = {
      firstName, lastName, email, country, region, city, postal, address,
      messenger, handle, notes,
      _gotcha: gotcha,
      items, 
      subtotal, 
      discount,
      discountPercent,
      promoCode: appliedPromoCode,
      shipping, 
      total
    };

    console.log('[FRONTEND DEBUG] Payload:', JSON.stringify(payload, null, 2));

    // блокування кнопки
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-disabled', 'true');
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMsg = 'Could not submit. Please check your cart.';
        try {
          const j = await res.json();
          if (j?.error) errMsg = j.error;
          if (j?.code === 'EMPTY_CART') errMsg = 'Your cart is empty. Add at least one product before submitting.';
          if (j?.code === 'INVALID_CART_ITEM') errMsg = 'One of items in your cart is invalid.';
          if (j?.code === 'INVALID_SUBTOTAL') errMsg = 'Cart total invalid.';
        } catch {}
        if (msg) { msg.textContent = errMsg; msg.style.color = '#dc2626'; }
        try { showToast?.(errMsg, 'error'); } catch {}
        updateCheckoutSubmitState?.();
        return;
      }

      // GA intent
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'purchase_intent', {
            event_category: 'checkout',
            event_label: 'checkout form submitted',
            value: total,
            currency: 'USD',
            coupon: appliedPromoCode || undefined
          });
        }
      } catch {}

      // success URL
      const orderId = 'ORD-' + Date.now();

      const successUrl = `/success.html`
        + `?order_id=${encodeURIComponent(orderId)}`
        + `&items=${encodeURIComponent(JSON.stringify(items))}`
        + `&subtotal=${encodeURIComponent(subtotal.toFixed(2))}`
        + `&discount=${encodeURIComponent(discount.toFixed(2))}`
        + `&promo=${encodeURIComponent(appliedPromoCode || '')}`
        + `&total=${encodeURIComponent(total.toFixed(2))}`;

      // очистка кошика + редірект
      writeCart([]);
      try {
        localStorage.removeItem('cart');
        localStorage.removeItem('cartItems');
        localStorage.removeItem('pending_promo'); // ⚡ Очищаємо збережений promo
      } catch {}
      updateCartBadge([]);
      window.location.href = successUrl;

    } catch (err) {
      const human = 'Error. Try again later.';
      if (msg) { msg.textContent = human; msg.style.color = '#ef4444'; }
      try { showToast?.(human, 'error'); } catch {}
      console.error('[CHECKOUT_ERROR]', err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.setAttribute('aria-disabled', 'false');
      }
    }
  });
}

/* ============================ CONTACT ============================ */

function initContactForms() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.honeypot) { showToast('Sent', 'success'); form.reset(); return; }
    if (!data.email || !data.message) { showToast('Please fill required fields', 'error'); return; }

    const res = await fetch(form.action || '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    }).catch(()=>null);

    if (res && res.ok) {
      // 🔻 КАСТОМНА ПОДІЯ ДЛЯ GOOGLE ANALYTICS
          gtag('event', 'contact_form_sent', {
           event_category: 'lead',
           event_label: 'contact form submitted'
         });
      
      showToast('Message sent. We will reply soon.', 'success'); form.reset(); }
    else { showToast('Error. Try later.', 'error'); }
  });
}

function initContactUX() { /* no-op */ }
function initContactFormResend() { /* no-op (реалізовано у initContactForms) */ }
function updateContactLinks(){ /* no-op */ }

/* ======================== PERF / ANALYTICS ======================= */

function initAnalytics(){ /* події викликаються точково; тут можна додати ще */ }

function initPerformanceOptimizations(){
  // Lazy images
  const imgs = document.querySelectorAll('img[data-src]');
  if (imgs.length) {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(en => {
        if (en.isIntersecting) {
          const img = en.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          io.unobserve(img);
        }
      });
    }, { rootMargin:'200px' });
    imgs.forEach(i => io.observe(i));
  }
}

function trackEvent(name, data){
  if (window.gtag) window.gtag('event', name, data || {});
  if (window.fbq) window.fbq('trackCustom', name, data || {});
}

// --- Mobile burger/menu wiring (robust) ---
(function () {
  const btn  = document.getElementById('burgerBtn') || document.querySelector('[data-nav-toggle]');
  const menu = document.getElementById('mobileMenu') || document.querySelector('[data-nav]');
  if (!btn || !menu) return;

  const toggle = () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('nav-open', open);
    document.body.style.overflow = open ? 'hidden' : ''; // блокуємо скрол під меню
  };

  btn.addEventListener('click', toggle);

  // Закривати меню при кліку по пункту меню
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
      document.body.style.overflow = '';
    }
  });

  // Підстраховка: закривати при ресайзі в десктоп
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && menu.classList.contains('open')) {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
      document.body.style.overflow = '';
    }
  });
})();

(function () {
  const MEASUREMENT_ID = 'G-6FXL7YXBM0';
  const API_SECRET = '3M-EAt53Q9uAtyM35gx8Xg';
  const cidKey = '_ga4_cid';

  // простий client_id, збережений у localStorage
  function getCid(){
    let cid = localStorage.getItem(cidKey);
    if(!cid){
      cid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+'-'+Math.random());
      localStorage.setItem(cidKey, cid);
    }
    return cid;
  }

  // якщо gtag не відпрацював — шлемо MP
  function mpPageView(){
    const url = 'https://www.google-analytics.com/mp/collect?measurement_id='
      + MEASUREMENT_ID + '&api_secret=' + API_SECRET;

    const payload = {
      client_id: getCid(),
      events: [{
        name: 'page_view',
        params: {
          page_location: location.href,
          page_title: document.title,
          page_path: location.pathname + location.search
        }
      }]
    };

    navigator.sendBeacon(url, JSON.stringify(payload));
  }

  // чекаємо 1500 мс: якщо немає dataLayer push від gtag — шлемо фолбек
  setTimeout(() => {
    const dl = window.dataLayer || [];
    const seenConfig = dl.some(e => Array.isArray(e) && e[0]==='config' && e[1]===MEASUREMENT_ID);
    const seenPV = dl.some(e => Array.isArray(e) && e[0]==='event' && e[1]==='page_view');
    if(!seenConfig && !seenPV) { mpPageView(); }
  }, 1500);
})();
(function () {
  const MEASUREMENT_ID = 'G-6FXL7YXBM0';
  const API_SECRET = 'PASTE_YOUR_API_SECRET';
  const cidKey = '_ga4_cid';

  // простий client_id, збережений у localStorage
  function getCid(){
    let cid = localStorage.getItem(cidKey);
    if(!cid){
      cid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+'-'+Math.random());
      localStorage.setItem(cidKey, cid);
    }
    return cid;
  }

  // якщо gtag не відпрацював — шлемо MP
  function mpPageView(){
    const url = 'https://www.google-analytics.com/mp/collect?measurement_id='
      + MEASUREMENT_ID + '&api_secret=' + API_SECRET;

    const payload = {
      client_id: getCid(),
      events: [{
        name: 'page_view',
        params: {
          page_location: location.href,
          page_title: document.title,
          page_path: location.pathname + location.search
        }
      }]
    };

    navigator.sendBeacon(url, JSON.stringify(payload));
  }

  // чекаємо 1500 мс: якщо немає dataLayer push від gtag — шлемо фолбек
  setTimeout(() => {
    const dl = window.dataLayer || [];
    const seenConfig = dl.some(e => Array.isArray(e) && e[0]==='config' && e[1]===MEASUREMENT_ID);
    const seenPV = dl.some(e => Array.isArray(e) && e[0]==='event' && e[1]==='page_view');
    if(!seenConfig && !seenPV) { mpPageView(); }
  }, 1500);
})();



