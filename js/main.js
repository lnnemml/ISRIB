// ISRIB Shop - Main JavaScript (Unified, no per-page script snippets)
// All header logic (burger + hide-on-scroll) and cart live here.

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

/* ===================== INIT ===================== */
function initializeApp() {
  initHeaderBehavior();           // burger + hide-on-scroll + compact + mobile badge sync
  initSmoothScrolling();          // anchor scroll offset by header height
  initFadeInAnimations();         // IO-based reveal
  initProductInteractions();      // card hovers + analytics
  initQuantitySelectors();        // per-card qty/price selection + contact link update
  initProductFilters();           // filter buttons
  initMobileOptimizations();      // touch tweaks
  initAnalytics();                // GA + depth/time tracking
  initContactForms();             // contact form UX
  initPerformanceOptimizations(); // lazy images

  // Cart (packs model)
  updateCartBadge();
  mountAddToCartButtons();
  renderCheckoutCart();
}

/* ===================== HEADER (STICKY + HIDE-ON-SCROLL + BURGER) ===================== */
function initHeaderBehavior() {
  // Burger
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

  // Hide-on-scroll + compact
  const header = document.getElementById('siteHeader');
  if (!header) return;

  let lastY = window.scrollY;
  const compactThreshold = 24; // px
  const hideThreshold    = 12; // px delta to decide direction
  const startHideAt      = 20; // px from top to allow hiding
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

    if (!ticking) {
      requestAnimationFrame(run);
      ticking = true;
    }
  }

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Sync cart badge to mobile badge if present
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

/* ===================== FADE-IN ON VIEW ===================== */
function initFadeInAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const opts = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      obs.unobserve(entry.target);
    });
  }, opts);

  const els = document.querySelectorAll('.product-card, .faq-item, .about-text');
  els.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .8s ease-out, transform .8s ease-out';
    obs.observe(el);
  });
}

/* ===================== PRODUCT INTERACTIONS ===================== */
function initProductInteractions() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card) => {
    // Зробити всю картку посиланням (крім кліків по <a>, <button>, .quantity-option)
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button, .quantity-option')) return;

      const name =
        card.querySelector('.product-name')?.textContent ||
        card.querySelector('.product-title')?.textContent ||
        'Unknown';

      window.trackEvent?.('product_view', {
        product_name: name,
        interaction_type: 'card_click',
      });

      const href = card.dataset.href;
      if (href) window.location.href = href;
    });

    // Доступність з клавіатури
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


/* ===================== QUANTITY SELECTORS (per card) ===================== */
function initQuantitySelectors() {
  const options = document.querySelectorAll('.quantity-option');

  options.forEach(opt => {
    opt.addEventListener('click', function () {
      const card = this.closest('.product-card');
      if (!card) return;

      const quantity = String(this.dataset.quantity || '').trim(); // e.g. "100mg", "1g"
      const priceNum = parseFloat(this.dataset.price || '0');

      // Toggle active
      card.querySelectorAll('.quantity-option').forEach(o => o.classList.remove('active'));
      this.classList.add('active');

      // UI: selected quantity (optional)
      const selQty = card.querySelector('.selected-quantity');
      if (selQty) selQty.textContent = quantity;

      // UI: price and price per mg
      const curPrice = card.querySelector('.current-price');
      if (curPrice) curPrice.textContent = `$${priceNum.toFixed(2)}`;

      const ppm = card.querySelector('.price-per-mg');
      if (ppm) {
        const q = quantity.toLowerCase();
        const isG = /\bg\b/.test(q);
        const num = parseFloat(q.replace(/[^0-9.]/g, '')) || 0; // take numeric part
        const mg = isG ? num * 1000 : num; // convert g → mg
        const perMg = mg > 0 ? (priceNum / mg).toFixed(3) : '0.000';
        ppm.textContent = `($${perMg}/mg)`;
      }

      // Sync "Add to Cart" button data + label
      const addBtn = card.querySelector('.add-to-cart');
      if (addBtn) {
        addBtn.dataset.price = String(priceNum);
        addBtn.dataset.display = quantity;

        // grams in mg numeric
        const qLower = quantity.toLowerCase();
        const gramsMg = qLower.includes('g')
          ? (parseFloat(qLower) || 0) * 1000
          : (parseFloat(qLower.replace('mg', '')) || 0);

        addBtn.dataset.grams = String(gramsMg);

        const addLabel = addBtn.querySelector('.add-label');
        const addPrice = addBtn.querySelector('.add-price');
        if (addLabel) addLabel.textContent = quantity;
        if (addPrice) addPrice.textContent = `$${Math.round(priceNum).toString()}`;
      }

      // Update contact links (safe-guarded call)
      if (typeof updateContactLinks === 'function') {
        updateContactLinks(card, quantity, priceNum);
      }

      // Track
      const name =
        card.querySelector('.product-name')?.textContent ||
        card.querySelector('.product-title')?.textContent ||
        'Unknown';

      window.trackEvent?.('quantity_selected', { product: name, quantity, price: priceNum });
    });
  });

  // auto-init defaults
  setTimeout(() => {
    const active = document.querySelectorAll('.product-card .quantity-option.active');
    if (active.length) {
      active.forEach(o => o.click());
    } else {
      // якщо ніде не позначено .active — ініціалізуємо перший варіант у кожній картці
      document.querySelectorAll('.product-card').forEach(card => {
        const first = card.querySelector('.quantity-option');
        if (first) first.click();
      });
    }
  }, 100);
}

function updateContactLinks(card, quantity, price) {
  const rawName =
    card.querySelector('.product-name')?.textContent ||
    card.querySelector('.product-title')?.textContent ||
    '';
  const slug = rawName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')       // замінюємо все, що не [a-z0-9], на '-'
    .replace(/^-+|-+$/g, '');          // прибираємо дефіси з країв

  card.querySelectorAll('a[href*="contact.html"]').forEach(link => {
    const params = new URLSearchParams({
      product: `${slug}-${quantity}`,
      price: String(price),
      inquiry: 'order',
    });
    link.href = `contact.html?${params.toString()}`;
  });
}


/* ===================== FILTERS ===================== */
function initProductFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = btn.dataset.filter;

      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active'); b.style.background='white'; b.style.color='#1e40af';
      });
      btn.classList.add('active'); btn.style.background='#1e40af'; btn.style.color='white';

      document.querySelectorAll('.product-card').forEach(card => {
        const show = (filter === 'all' || card.dataset.category === filter);
        if (show) {
          card.style.display='block'; card.style.opacity='0';
          setTimeout(()=>{ card.style.opacity='1'; }, 100);
        } else {
          card.style.opacity='0'; setTimeout(()=>{ card.style.display='none'; }, 300);
        }
      });

      trackEvent('product_filter', { filter_type: filter });
    });
  });
}

/* ===================== MOBILE TWEAKS ===================== */
function initMobileOptimizations() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.addEventListener('touchstart', function(){}, { passive: true });
  }
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
    }, 500);
  });
}

/* ===================== ANALYTICS ===================== */
function initAnalytics() {
  trackEvent('page_view', { page_title: document.title, page_location: window.location.href });

  let maxScrollDepth = 0;
  const tracked = {25:false,50:false,75:false,100:false};
  const onDepth = () => {
    const top = window.pageYOffset;
    const doc = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.round((top / Math.max(1, doc)) * 100);
    maxScrollDepth = Math.max(maxScrollDepth, pct);
    Object.keys(tracked).forEach(depth => {
      if (pct >= depth && !tracked[depth]) {
        tracked[depth] = true;
        trackEvent('scroll_depth', { depth_percent: depth });
      }
    });
  };
  window.addEventListener('scroll', throttle(onDepth, 1000), { passive: true });

  // time on page
  let secs = 0;
  setInterval(() => { secs += 10; if (secs % 60 === 0) trackEvent('time_on_page', { seconds: secs }); }, 10000);

  window.addEventListener('beforeunload', () => {
    trackEvent('page_exit', { time_on_page: secs, max_scroll_depth: maxScrollDepth });
  });
}

/* ===================== CONTACT FORMS ===================== */
function initContactForms() {
  document.querySelectorAll('form[name="contact"]').forEach(form => {
    form.addEventListener('submit', function() {
      const btn = this.querySelector('button[type="submit"]');
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = 'Sending...'; btn.disabled = true;

      trackEvent('contact_form_submit', {
        form_name: 'contact',
        subject: this.subject?.value,
        product: this.product?.value
      });

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

/* ===================== CART (PACKS MODEL) ===================== */
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

// Unified addToCart(name, sku, grams, price, display)
function addToCart(name, sku, grams, price, display) {
  const cart = readCart();
  const key = JSON.stringify([sku, display || grams, price]);

  const found = cart.find(
    i => JSON.stringify([i.sku, i.display || i.grams, i.price]) === key
  );

  if (found) {
    found.count = (found.count || 0) + 1;
  } else {
    cart.push({
      name: name,
      sku: sku,
      grams: parseFloat(grams) || 0,
      price: parseFloat(price),
      display: display || null,
      count: 1,
      unit: 'pack'
    });
  }

  writeCart(cart);

  // Трекінг
  window.trackEvent?.('add_to_cart', {
    name,
    sku,
    grams: parseFloat(grams) || 0,
    price: parseFloat(price),
    display: display || grams + 'mg'
  });
}

function mountAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b = e.currentTarget;
      addToCart(
        b.dataset.name || b.dataset.product || 'Unknown',
        b.dataset.sku  || 'SKU',
        Number(b.dataset.grams || 0),
        Number(b.dataset.price || 0),
        b.dataset.display || b.dataset.qty || ''
      );
      // Redirect to checkout (keep behavior — change if needed)
      window.location.href = 'checkout.html';
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

/* ===================== UTILITIES ===================== */
function trackEvent(eventName, parameters = {}) {
  if (typeof gtag !== 'undefined') gtag('event', eventName, parameters);
  if (typeof fbq  !== 'undefined' && eventName.includes('contact')) {
    fbq('track', 'Contact', {
      content_name: parameters.product_name || parameters.product || 'General Inquiry',
      content_category: 'Research Chemicals'
    });
  }
  if (typeof rdt  !== 'undefined' && eventName.includes('contact')) {
    rdt('track', 'Contact', { item_name: parameters.product_name || parameters.product || 'General Inquiry' });
  }
  try { console.log('Analytics Event:', eventName, parameters); } catch {}
}

function throttle(func, delay) {
  let timeoutId, lastExecTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastExecTime > delay) {
      func.apply(this, args); lastExecTime = now;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { func.apply(this, args); lastExecTime = Date.now(); }, delay - (now - lastExecTime));
    }
  };
}
function debounce(func, delay) {
  let t; return function (...args) { clearTimeout(t); t = setTimeout(() => func.apply(this, args), delay); };
}
function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification notification-${type}`;
  const styles = {
    info:'background:linear-gradient(135deg,#3b82f6,#1d4ed8);',
    success:'background:linear-gradient(135deg,#10b981,#059669);',
    error:'background:linear-gradient(135deg,#ef4444,#dc2626);',
    warning:'background:linear-gradient(135deg,#f59e0b,#d97706);'
  };
  n.textContent = message;
  n.style.cssText = `
    position:fixed; top:20px; right:20px; color:#fff; padding:16px 24px; border-radius:8px; z-index:10000;
    transform:translateX(100%); transition:transform .3s ease; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,.2);
    max-width:400px; word-wrap:break-word; ${styles[type]||styles.info}
  `;
  document.body.appendChild(n);
  setTimeout(()=>{ n.style.transform='translateX(0)'; },100);
  setTimeout(()=>{ n.style.transform='translateX(100%)'; setTimeout(()=>{ n.remove(); },300); },5000);
  n.addEventListener('click', ()=>{ n.style.transform='translateX(100%)'; setTimeout(()=>{ n.remove(); },300); });
}
function quickOrder(productName, quantity, price) {
  const slug = productName.toLowerCase().replace(/\s+/g,'-');
  const url = `contact.html?product=${slug}-${quantity}&price=${price}&inquiry=order`;
  trackEvent('quick_order_click', { product: productName, quantity, price });
  window.location.href = url;
}
function trackCTA(location, product = null, action = null) {
  const eventData = { event_category: 'engagement', event_label: location };
  if (product) eventData.product = product;
  if (action)  eventData.action  = action;

  if (typeof gtag !== 'undefined') gtag('event', 'contact_intent', eventData);
  const descriptor = product || action || 'General Inquiry';
  if (typeof fbq !== 'undefined') fbq('track','Contact',{ content_name:descriptor, content_category:'Research Chemicals', event_label:location });
  if (typeof rdt !== 'undefined') rdt('track','Contact',{ item_name:descriptor, event_label:location });

  trackEvent('cta_click', { location, product, action });
}

// Global exports
window.ISRIBShop = { trackEvent, showNotification, quickOrder, trackCTA, addToCart, readCart, writeCart };

/* ===================== ERROR/PERF MONITORING ===================== */
window.addEventListener('error', (e) => {
  try {
    trackEvent('javascript_error', { error_message: e.message, error_filename: e.filename, error_lineno: e.lineno });
  } catch {}
});
window.addEventListener('load', () => {
  if (!('PerformanceObserver' in window)) return;
  // LCP
  try {
    new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => trackEvent('core_web_vitals', { metric:'LCP', value: Math.round(entry.startTime) }));
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  } catch {}
  // CLS
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => { if (!entry.hadRecentInput) clsValue += entry.value; });
      trackEvent('core_web_vitals', { metric:'CLS', value: Math.round(clsValue*1000)/1000 });
    }).observe({ entryTypes: ['layout-shift'] });
  } catch {}
});
