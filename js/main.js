// ISRIB Shop - Main JavaScript (Unified)
// v2025-09-26 — header UX, products, quantity, cart, top toasts, dynamic Add-to-Cart labels

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
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
  renderCheckoutCart();
  initCheckoutForm();
  initContactUX();        // показ/приховування product-section, автозаповнення з query string
  initContactFormResend(); // сабміт форми через ваш бекенд/серверлес із Resend
  // Back-compat helpers some code expects:
  try { updateContactLinks(); } catch {}
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
  card.querySelectorAll('.quantity-option').forEach(o => o.classList.remove('active'));
  opt.classList.add('active');

  const qStr = (opt.dataset.quantity || '').trim();                  // "100mg" | "500mg" | "1g"
  const grams = parseFloat(opt.dataset.grams || '0') || parseQtyToMg(qStr);
  const price = parseFloat(opt.dataset.price || '0') || 0;

  const current = card.querySelector('.current-price');
  if (current) current.textContent = fmtUSD(price);

  const ppm = card.querySelector('.price-per-mg');
  if (ppm && grams) ppm.textContent = `($${(price / toMg(grams)).toFixed(4)}/mg)`;

  const label = card.querySelector('.selected-quantity');
  if (label) label.textContent = qStr;

  const btn = card.querySelector('.add-to-cart');
  if (btn) {
    btn.dataset.price = String(price);
    btn.dataset.grams = String(grams);
    btn.dataset.display = qStr;
  }
}

function parseQtyToMg(s) {
  if (!s) return 0;
  const t = String(s).toLowerCase();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  if (t.includes('g')) return n * 1000;
  return n;
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

/* ============================== CART ============================== */

function readCart() {
  try { return JSON.parse(localStorage.getItem('isrib_cart') || '[]') || []; }
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
  const idx = cart.findIndex(i => i.sku === sku && Number(i.grams) === Number(grams) && Number(i.price) === Number(price));
  if (idx >= 0) cart[idx].count = Number(cart[idx].count || 1) + 1;
  else cart.push({ name, sku, grams: Number(grams) || 0, price: Number(price) || 0, display: display || null, count: 1, unit: 'pack' });
  writeCart(cart);
}

function mountAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // важливо: щоб клік по кнопці не запускав перехід по картці
      const card = btn.closest('.product-card');
      const name =
        card?.querySelector('.product-name')?.textContent ||
        card?.querySelector('.product-title')?.textContent ||
        btn.dataset.name || 'Unknown';
      const sku = btn.dataset.sku || card?.dataset.sku || 'sku-unknown';
      const grams = parseFloat(btn.dataset.grams || '0') || 0;
      const price = parseFloat(btn.dataset.price || '0') || 0;
      const display = btn.dataset.display || '';
      addToCart(name, sku, grams, price, display);
      updateCartBadge?.();
      showToast(`Added to cart - ${(display || (grams ? (grams >= 1000 ? (grams/1000)+'g' : grams+'mg') : ''))} for ${price}$`);
      trackEvent('add_to_cart_click', { name, sku, grams, price, display });
    });
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

  recalcTotals(cart);
  bindCheckoutCartEvents();
}

function recalcTotals(cart){
  const subtotal = cart.reduce((s, it) => s + Number(it.price||0) * Number(it.count||1), 0);
  const totals = document.getElementById('summaryTotals');
  if (!totals) return;
  totals.innerHTML = `
    <div class="sum-line"><span>Subtotal</span><b>${fmtUSD(subtotal)}</b></div>
    <!-- delivery/taxes place-holders -->
  `;
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
    });
  });
  wrap.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.target.dataset.idx);
      const arr = readCart(); arr.splice(i,1);
      writeCart(arr);
      updateCartBadge(arr);
      renderCheckoutCart();
    });
  });
}

/* ===================== CHECKOUT FORM SUBMIT ===================== */

function initCheckoutForm(){
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const msg = document.getElementById('checkoutMessage') || form.querySelector('.form-message');
    if (msg) { msg.textContent = ''; msg.style.color = ''; }

    const cart = readCart();
    if (!cart.length){
      msg.textContent = 'Your cart is empty.';
      msg.style.color = '#dc2626';
      return;
    }

    const payload = {
      type: 'checkout',
      customer: {
        firstName: form.firstName.value.trim(),
        lastName:  form.lastName.value.trim(),
        email:     form.email.value.trim(),
        country:   form.country?.value || '',
        city:      form.city?.value || '',
        address:   form.address?.value || '',
        zip:       form.zip?.value || '',
      },
      cart
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Request failed');

      // success
      writeCart([]);
      updateCartBadge([]);
      renderCheckoutCart();
      if (msg) { msg.textContent = 'Order placed! Check your email.'; msg.style.color = '#10b981'; }
    } catch (err) {
      if (msg) { msg.textContent = 'Error. Try again later.'; msg.style.color = '#ef4444'; }
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

    if (res && res.ok) { showToast('Message sent. We will reply soon.', 'success'); form.reset(); }
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
