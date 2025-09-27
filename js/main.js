// ISRIB Shop - Main JavaScript (Unified)
// v2025-09-26 — header UX, products, quantity, cart, top toasts, dynamic Add-to-Cart labels

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  initHeaderBehavior();
  initSmoothScrolling();
  initFadeInAnimations();
  initProductInteractions();
  initQuantitySelectors();     // calculates price + $/mg + syncs dataset
  bindQtyLabelUpdates();       // keeps "Add to cart 1g/100mg" label in sync
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
  initContactUX();        // показ/приховування product-section, автозаповнення з query string
  initContactFormResend(); // сабміт форми через ваш бекенд/серверлес із Resend
  // Back-compat helpers some code expects:
  try { updateContactLinks(); } catch {}
}

/* ===================== HEADER ===================== */
function initHeaderBehavior() {
  const burger = document.getElementById('burgerBtn');
  const panel  = document.getElementById('mobileMenu');

  if (burger && panel) {
    const closeMenu = () => {
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-open');
    };
    const toggleMenu = () => {
      const open = !burger.classList.contains('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    };
    burger.addEventListener('click', toggleMenu);
    panel.addEventListener('click', (e) => { if (e.target.matches('a')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  const header = document.getElementById('siteHeader');
  if (!header) return;

  header.addEventListener('click', (e) => e.stopPropagation(), true);

  let lastY = window.scrollY;
  const compactThreshold = 24;
  const hideThreshold    = 12;
  const startHideAt      = 20;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const run = () => {
      header.classList.toggle('scrolled', y > 1);
      header.classList.toggle('compact', y > compactThreshold);

      const dy = y - lastY;
      const goingDown = dy > hideThreshold && y > startHideAt;
      const goingUp   = dy < -hideThreshold;
      if (goingDown) header.classList.add('scrolling-down');
      else if (goingUp) header.classList.remove('scrolling-down');

      lastY = y;
      ticking = false;
    };
    if (!ticking) { requestAnimationFrame(run); ticking = true; }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const desktop = document.getElementById('cartCount');
  const mobile  = document.getElementById('cartCountMobile');
  if (desktop && mobile) {
    const sync = () => { mobile.textContent = desktop.textContent; };
    const mo = new MutationObserver(sync);
    mo.observe(desktop, { childList: true, characterData: true, subtree: true });
    sync();
  }
}

/* ===================== SMOOTH SCROLL ===================== */
function initSmoothScrolling() {
  const header = document.getElementById('siteHeader');
  const headerH = () => (header ? header.offsetHeight : 0);
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - headerH() - 20);
      window.scrollTo({ top: y, behavior: 'smooth' });
      history.pushState(null, '', id);
    });
  });
}

/* ===================== FADE-IN ===================== */
function initFadeInAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.product-card, .faq-item, .about-text').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .8s ease-out, transform .8s ease-out';
    obs.observe(el);
  });
}

/* ===================== PRODUCT INTERACTIONS ===================== */
function initProductInteractions() {
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button, .quantity-option')) return;
      const header = document.getElementById('siteHeader');
      if (header) {
        const hb = header.getBoundingClientRect();
        if (e.clientY <= hb.bottom) return;
      }
      if (e.target.closest('#siteHeader, .header-slim, .nav-slim')) return;
      const href = card.dataset.href;
      if (href) window.location.href = href;
    });
    if (card.dataset.href) {
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const href = card.dataset.href;
          if (href) window.location.href = href;
        }
      });
    }
  });
}

/* ===================== QUANTITY SELECTORS ===================== */
function initQuantitySelectors() {
  const options = document.querySelectorAll('.quantity-option');
  options.forEach(opt => {
    opt.addEventListener('click', function () {
      const card = this.closest('.product-card');
      if (!card) return;

      const quantity = String(this.dataset.quantity || '').trim(); // "100mg", "1g"
      const priceNum = parseFloat(this.dataset.price || '0');

      card.querySelectorAll('.quantity-option').forEach(o => o.classList.remove('active'));
      this.classList.add('active');

      const selQty = card.querySelector('.selected-quantity');
      if (selQty) selQty.textContent = quantity;

      const curPrice = card.querySelector('.current-price');
      if (curPrice) curPrice.textContent = `$${priceNum.toFixed(2)}`;

      const ppm = card.querySelector('.price-per-mg');
      if (ppm) {
        const qRaw = quantity.toLowerCase();
        const num = parseFloat(qRaw.replace(/[^0-9.]/g, '')) || 0;
        let mg = 0;
        if (qRaw.includes('mg')) mg = num;
        else if (qRaw.includes('g')) mg = num * 1000;
        else mg = num;
        const perMg = mg > 0 ? priceNum / mg : 0;
        ppm.textContent = `($${perMg >= 0.01 ? perMg.toFixed(2) : perMg.toFixed(3)}/mg)`;
      }

      // Sync add-to-cart dataset for cart operations
      const addBtn = card.querySelector('.add-to-cart');
      if (addBtn) {
        addBtn.dataset.price   = String(priceNum);
        addBtn.dataset.display = quantity;
        const qLower = quantity.toLowerCase();
        const gramsMg = qLower.includes('g')
          ? (parseFloat(qLower) || 0) * 1000
          : (parseFloat(qLower.replace('mg', '')) || 0);
        addBtn.dataset.grams = String(gramsMg);
      }

      // Update Add-to-Cart button label (no price inside)
      updateAddToCartLabel(card);
    });
  });

  // Auto-init default selection
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach(card => {
      const active = card.querySelector('.quantity-option.active') || card.querySelector('.quantity-option');
      if (active) active.click();
    });
  }, 100);
}

/* === Dynamic Add-to-Cart label === */
function formatQtyLabel(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase();
  const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
  if (s.includes('mg')) return `${num}mg`;
  if (s.includes('g'))  return `${num}g`;
  return `${num}mg`;
}
function updateAddToCartLabel(card) {
  const btn = card.querySelector('.add-to-cart');
  if (!btn) return;
  // remove nested price span if present
  const priceSpan = btn.querySelector('.add-price'); if (priceSpan) priceSpan.remove();
  const sel = card.querySelector('.quantity-option.active');
  const raw = sel?.dataset.quantity || '';
  const label = formatQtyLabel(raw);
  btn.textContent = label ? `Add to cart ${label}` : 'Add to cart';
}
function bindQtyLabelUpdates() {
  document.querySelectorAll('.product-card').forEach(card => {
    updateAddToCartLabel(card);
    card.querySelectorAll('.quantity-option').forEach(q => {
      q.addEventListener('click', () => updateAddToCartLabel(card));
    });
  });
}

/* ===================== FILTERS ===================== */
function initProductFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.product-card').forEach(card => {
        const show = (filter === 'all' || card.dataset.category === filter);
        card.style.display = show ? 'block' : 'none';
      });
      trackEvent('product_filter', { filter_type: filter });
    });
  });
}

/* ===================== MOBILE ===================== */
function initMobileOptimizations() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.addEventListener('touchstart', function(){}, { passive: true });
  }
  // Prevent iOS double-tap zoom on quick taps and nudge layout on orientation changes
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, false);

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      window.scrollTo(0, window.pageYOffset + 1);
      window.scrollTo(0, window.pageYOffset - 1);
    }, 100);
  });
}

/* ===================== ANALYTICS ===================== */
function initAnalytics() {
  trackEvent('page_view', { page_title: document.title, page_location: window.location.href });
}

/* ===================== CONTACT FORMS ===================== */
function initContactForms() {
  document.querySelectorAll('form[name="contact"]').forEach(form => {
    form.addEventListener('submit', function() {
      const btn = this.querySelector('button[type="submit"]');
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = 'Sending...'; btn.disabled = true;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
    });
  });
}

/* ===================== PERF ===================== */
function initPerformanceOptimizations() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
      obs.unobserve(img);
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
}

/* ===================== CART ===================== */
const CART_KEY = 'isrib_cart';
function migrate(it) {
  if (it && it.count == null && it.qty != null) {
    it.grams = it.grams ?? it.qty;
    delete it.qty;
    it.count = 1;
  }
  return it;
}
function readCart() {
  try { return (JSON.parse(localStorage.getItem(CART_KEY) || '[]') || []).map(migrate); }
  catch { return []; }
}
function writeCart(arr) {
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
  updateCartBadge(arr);
}
function updateCartBadge(arr) {
  const el = document.getElementById('cartCount');
  if (!el) return;
  const cart = Array.isArray(arr) ? arr : readCart();
  const total = cart.reduce((n, i) => n + (Number(i.count) || 0), 0);
  el.textContent = total;
}
function addToCart(name, sku, grams, price, display) {
  const cart = readCart();
  const key = JSON.stringify([sku, display || grams, price]);
  const found = cart.find(i => JSON.stringify([i.sku, i.display || i.grams, i.price]) === key);
  if (found) found.count = (found.count || 0) + 1;
  else cart.push({ name, sku, grams: parseFloat(grams) || 0, price: parseFloat(price), display: display || null, count: 1, unit: 'pack' });
  writeCart(cart);
  trackEvent('add_to_cart', { name, sku, grams: parseFloat(grams) || 0, price: parseFloat(price), display: display || grams + 'mg' });
}
function mountAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
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
function renderCheckoutCart() {
  const wrap = document.getElementById('cartList');
  if (!wrap) return;
  const cart = readCart();
  if (!cart.length) {
    wrap.innerHTML = `<p class="muted">Your cart is empty. Go to <a href="products.html">Products</a>.</p>`;
    updateCartBadge(cart);
    return;
  }
  const rows = cart.map((it, idx) => `
    <div class="cart-row">
      <div class="cart-title"><strong>${it.name}</strong> <span class="muted">(${it.display || (it.grams + 'mg')})</span></div>
      <div class="cart-ctrl">
        <span class="price">$${Number(it.price || 0).toFixed(2)}</span>
        ×
        <input type="number" min="1" value="${Number(it.count || 1)}" data-idx="${idx}" class="cart-qty" />
        <button class="link danger cart-remove" data-idx="${idx}">Remove</button>
      </div>
    </div>
  `).join('');
  const subtotal = cart.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.count || 1), 0);
  wrap.innerHTML = rows + `
    <div class="cart-total">
      <div class="line"></div>
      <div class="sum"><b>Subtotal:</b> $${subtotal.toFixed(2)}</div>
    </div>
  `;
  wrap.querySelectorAll('.cart-qty').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const i = Number(e.target.dataset.idx);
      const arr = readCart();
      arr[i].count = Math.max(1, Number(e.target.value || 1));
      writeCart(arr);
      renderCheckoutCart();
    });
  });
  wrap.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.target.dataset.idx);
      const arr = readCart();
      arr.splice(i, 1);
      writeCart(arr);
      renderCheckoutCart();
    });
  });
}

/* ===================== UTILS ===================== */
function trackEvent(eventName, parameters = {}) {
  try { console.log('Analytics Event:', eventName, parameters); } catch {}
}
function showToast(message = 'Done', type = 'info') {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  host.style.top = '20px';     // top-right
  host.style.bottom = 'auto';

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.add('hide'), 2200);
  setTimeout(() => toast.remove(), 2800);
}

/* === Restored: debounce === */
function debounce(fn, wait = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* === Restored: onDepth === */
function onDepth(selector, cb, options = {}) {
  const root = options.root || null;
  const threshold = options.threshold || 0.6;
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) cb(e.target); });
  }, { root, threshold });
  document.querySelectorAll(selector).forEach(el => obs.observe(el));
}

/* === Restored: quickOrder === */
function quickOrder(sku, quantityLabel, price) {
  const grams = (() => {
    const s = String(quantityLabel || '').toLowerCase();
    const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
    if (s.includes('g')) return num * 1000;
    return num;
  })();
  addToCart('Quick Order', sku || 'sku-quick', grams, parseFloat(price) || 0, quantityLabel || '');
  showToast('Added to cart');
}

/* === Restored: showNotification === */
function showNotification(message = 'Done', type = 'info') {
  // Backward-compatible wrapper to new showToast
  try { showToast(message, type); } catch (e) { console && console.log(message); }
}

/* === Restored: throttle === */
function throttle(fn, wait = 200) {
  let last = 0, timer;
  return function(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, wait - (now - last));
    }
  };
}

/* === Restored: trackCTA === */
function trackCTA(name, meta = {}) {
  trackEvent('cta_click', Object.assign({ name }, meta));
}

/* === Restored: updateContactLinks === */
function updateContactLinks() {
  // Ensure mailto and tg links reflect current page for context
  document.querySelectorAll('a[data-append-ref]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const ref = encodeURIComponent(window.location.href);
    if (href.startsWith('mailto:')) {
      const sep = href.includes('?') ? '&' : '?';
      a.setAttribute('href', href + sep + 'body=' + ref);
    } else if (href.includes('t.me')) {
      const sep = href.includes('?') ? '&' : '?';
      a.setAttribute('href', href + sep + 'start=' + ref);
    }
  });
}
// === FAQ accordion (accessible + analytics) ===
function initFAQAccordion(){
  document.querySelectorAll('.faq-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(btn.getAttribute('aria-controls'));

      // toggle current
      btn.setAttribute('aria-expanded', String(!expanded));
      if (panel) expanded ? panel.setAttribute('hidden','') : panel.removeAttribute('hidden');

      // update +/– icon
      const icon = btn.querySelector('.faq-icon');
      if (icon) icon.textContent = expanded ? '+' : '–';

      // OPTIONAL: відкрите тільки одне питання
      // if (!expanded) {
      //   document.querySelectorAll('.faq-button[aria-expanded="true"]').forEach(b => {
      //     if (b !== btn) {
      //       b.setAttribute('aria-expanded','false');
      //       const p = document.getElementById(b.getAttribute('aria-controls'));
      //       if (p) p.setAttribute('hidden','');
      //       const ic = b.querySelector('.faq-icon'); if (ic) ic.textContent = '+';
      //     }
      //   });
      // }

      // analytics
      if (typeof trackEvent === 'function') {
        const q = btn.querySelector('.faq-question')?.textContent?.trim();
        trackEvent('faq_toggle', { question: q, expanded: !expanded });
      }
    });
  });
}

// === Smooth highlight on deep links (#anchor) ===
function initAnchorHighlight(){
  const paint = (el) => {
    if (!el) return;
    const prev = el.style.background;
    el.style.background = '#eff6ff';
    setTimeout(() => { el.style.background = prev || ''; }, 1600);
  };
  if (window.location.hash) paint(document.querySelector(window.location.hash));
  window.addEventListener('hashchange', () => paint(document.querySelector(window.location.hash)));
}
// === Global FAQ click delegation (no init required) ===
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.faq-button');
  if (!btn) return;

  // знайдемо відповідну панель
  const panelId = btn.getAttribute('aria-controls');
  const panel = panelId ? document.getElementById(panelId) : null;

  // toggle state
  const wasExpanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!wasExpanded));

  if (panel) {
    if (wasExpanded) panel.setAttribute('hidden', '');
    else panel.removeAttribute('hidden');
  }

  // оновлюємо іконку +/–
  const icon = btn.querySelector('.faq-icon');
  if (icon) icon.textContent = wasExpanded ? '+' : '–';

  // OPTIONAL: тримати відкритим лише одне питання
  // if (!wasExpanded) {
  //   document.querySelectorAll('.faq-button[aria-expanded="true"]').forEach(other => {
  //     if (other === btn) return;
  //     other.setAttribute('aria-expanded', 'false');
  //     const pid = other.getAttribute('aria-controls');
  //     const p = pid ? document.getElementById(pid) : null;
  //     if (p) p.setAttribute('hidden', '');
  //     const ic = other.querySelector('.faq-icon'); if (ic) ic.textContent = '+';
  //   });
  // }

  // аналітика (не обов'язково)
  if (typeof trackEvent === 'function') {
    const q = btn.querySelector('.faq-question')?.textContent?.trim();
    trackEvent('faq_toggle', { question: q, expanded: !wasExpanded });
  }
});
// === Global FAQ click delegation — class-based, id-agnostic ===
document.addEventListener('click', function(e) {
  // клік десь усередині одного FAQ-блоку?
  const item = e.target.closest('.faq-item');
  if (!item) return;

  // тригер — кнопка/заголовок/іконка
  const trigger = e.target.closest('.faq-button, .faq-question, .faq-icon');
  if (!trigger) return;

  // не даємо посиланню чи кнопці «стрибати» сторінкою
  e.preventDefault();
  e.stopPropagation();

  // знаходимо кнопку та іконку (якщо є)
  const btn  = item.querySelector('.faq-button') || trigger;
  const icon = item.querySelector('.faq-icon');

  // перемикаємо стан через клас .open (без hidden/id)
  const isOpen = item.classList.toggle('open');

  // aria для доступності
  btn.setAttribute('aria-expanded', String(isOpen));

  // плюс/мінус у іконці
  if (icon) icon.textContent = isOpen ? '–' : '+';

  // OPTIONAL: лише одне відкрите питання
  // if (isOpen) {
  //   document.querySelectorAll('.faq-item.open').forEach(other => {
  //     if (other === item) return;
  //     other.classList.remove('open');
  //     const ob = other.querySelector('.faq-button');
  //     const oi = other.querySelector('.faq-icon');
  //     if (ob) ob.setAttribute('aria-expanded', 'false');
  //     if (oi) oi.textContent = '+';
  //   });
  // }

  // аналітика
  if (typeof trackEvent === 'function') {
    const q = (item.querySelector('.faq-question')?.textContent || '').trim();
    trackEvent('faq_toggle', { question: q, expanded: isOpen });
  }
}, false);
// === Contact page UX (subject → product section; autofill from URL) ===
function initContactUX(){
  const subject = document.getElementById('subject');
  const prodSec = document.getElementById('product-section');
  if (!subject || !prodSec) return;

  const toggleProd = () => {
    const v = subject.value;
    const show = (v === 'product-order' || v === 'bulk-order');
    prodSec.classList.toggle('hidden', !show);
  };
  subject.addEventListener('change', toggleProd);

  // Query-string autofill
  const qp = new URLSearchParams(window.location.search);
  const inquiry = qp.get('inquiry');
  if (inquiry === 'order') subject.value = 'product-order';
  toggleProd();

  const product = qp.get('product');
  const price = qp.get('price');
  if (product) {
    const productSelect = document.getElementById('product');
    if (productSelect) {
      [...productSelect.options].some(o => {
        if (o.value.includes(product)) { o.selected = true; return true; }
        return false;
      });
    }
    const msg = document.getElementById('message');
    if (msg) {
      msg.value = `I would like to order ${String(product).replace(/-/g,' ').toUpperCase()}${price ? ` (${price})` : ''}. Please provide payment and shipping details.`;
    }
  }
}

// === Contact form submit via serverless endpoint using Resend ===
function initContactFormResend(){
  const form = document.getElementById('contactForm');
  const btn  = document.getElementById('submitBtn');
  const note = document.getElementById('formNote');
  if (!form || !btn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name:   fd.get('name')?.toString().trim(),
      email:  fd.get('email')?.toString().trim(),
      subject:fd.get('subject')?.toString(),
      product:fd.get('product')?.toString() || '',
      message:fd.get('message')?.toString(),
      researchUse: !!fd.get('research-use'),
      page: window.location.href
    };

    // Basic validation
    if (!payload.name || !payload.email || !payload.subject || !payload.message || !payload.researchUse){
      showToast('Please fill all required fields', 'error');
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Sending...';
    note.textContent = '';

    try {
      const res = await fetch('https://isrib-api.vercel.app/api/contact', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText}`);
      }

      showToast('Message sent! We will reply shortly.', 'success');
      trackEvent?.('contact_form_submit', {
        subject: payload.subject,
        product: payload.product || null
      });
      form.reset();
      document.getElementById('product-section')?.classList.add('hidden');
    } catch (err) {
      console.error('[Contact Form Error]', err);
      showToast('Could not send message. Please try again or email us directly.', 'error');
      note.textContent = 'If this keeps happening, email: isrib.shop@protonmail.com';
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// Optional: Live chat toggle (Tawk.to)
function openLiveChat(){
  if (typeof Tawk_API !== 'undefined') Tawk_API.toggle();
  else window.location.href = 'mailto:isrib.shop@protonmail.com?subject=Live Chat Request';
}
