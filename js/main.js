// ISRIB Shop - Main JavaScript (Unified)
// v2025-09-26 — header UX, products, quantity, cart, top toasts, dynamic Add-to-Cart labels
// ============================================
// TRANSACTION ID MANAGEMENT
// Додайте цей блок НА ПОЧАТКУ main.js
// ============================================

/**
 * Генерує або отримує існуючий Transaction ID
 * Transaction ID використовується для зв'язування всіх ecommerce подій в одну транзакцію
 * 
 * @returns {string} Transaction ID у форматі TXN-{timestamp}-{random}
 */
window.getOrCreateTransactionId = function() {
  const SESSION_KEY = '_txn_id';
  const TIMESTAMP_KEY = '_txn_timestamp';
  const MAX_AGE = 30 * 60 * 1000; // 30 хвилин
  
  try {
    // Спроба отримати існуючий ID з sessionStorage
    const stored = sessionStorage.getItem(SESSION_KEY);
    const timestamp = parseInt(sessionStorage.getItem(TIMESTAMP_KEY) || '0');
    
    // Перевірка актуальності
    if (stored && (Date.now() - timestamp) < MAX_AGE) {
      console.log('[TXN] ♻️ Reusing existing ID:', stored);
      return stored;
    } else if (stored) {
      console.log('[TXN] ⏰ Existing ID expired (age: ' + Math.round((Date.now() - timestamp) / 1000) + 's)');
    }
  } catch(e) {
    console.warn('[TXN] ⚠️ SessionStorage read error:', e);
  }
  
  // Генеруємо новий ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  const txnId = `TXN-${timestamp}-${random}`;
  
  try {
    sessionStorage.setItem(SESSION_KEY, txnId);
    sessionStorage.setItem(TIMESTAMP_KEY, timestamp.toString());
    console.log('[TXN] ✨ Created new ID:', txnId);
  } catch(e) {
    console.warn('[TXN] ⚠️ SessionStorage write error:', e);
  }
  
  return txnId;
};

/**
 * Отримує поточний Transaction ID без створення нового
 * Використовується коли ID повинен вже існувати
 * 
 * @returns {string|null} Transaction ID або null якщо не існує
 */
window.getTransactionId = function() {
  try {
    const stored = sessionStorage.getItem('_txn_id');
    const timestamp = parseInt(sessionStorage.getItem('_txn_timestamp') || '0');
    const MAX_AGE = 30 * 60 * 1000;
    
    if (stored && (Date.now() - timestamp) < MAX_AGE) {
      return stored;
    }
  } catch(e) {
    console.warn('[TXN] ⚠️ Cannot get transaction ID:', e);
  }
  
  return null;
};

/**
 * Очищає Transaction ID (використовується після успішної покупки)
 */
window.clearTransactionId = function() {
  try {
    sessionStorage.removeItem('_txn_id');
    sessionStorage.removeItem('_txn_timestamp');
    console.log('[TXN] 🗑️ Transaction ID cleared');
  } catch(e) {
    console.warn('[TXN] ⚠️ Cannot clear transaction ID:', e);
  }
};

/**
 * Перевіряє чи існує активний Transaction ID
 * 
 * @returns {boolean}
 */
window.hasActiveTransaction = function() {
  return window.getTransactionId() !== null;
};

// ============================================
// CONSOLE INFO (опціонально, для debugging)
// ============================================
console.log('[ISRIB] 🔧 Transaction ID management loaded');
console.log('[ISRIB] Functions available:', {
  getOrCreateTransactionId: 'Generate or retrieve transaction ID',
  getTransactionId: 'Get existing transaction ID',
  clearTransactionId: 'Clear transaction ID',
  hasActiveTransaction: 'Check if transaction ID exists'
});

// Показуємо поточний стан при завантаженні
const currentTxn = window.getTransactionId();
if (currentTxn) {
  console.log('[TXN] 📋 Active transaction:', currentTxn);
} else {
  console.log('[TXN] 💤 No active transaction');
}


(function setupDataLayerDebug() {
  window.dataLayer = window.dataLayer || [];
  
  console.log('[DEBUG] 🔧 DataLayer debug initialized');
  console.log('[DEBUG] Initial dataLayer:', window.dataLayer);
  
  const originalPush = Array.prototype.push;
  window.dataLayer.push = function(...args) {
    console.log('[DEBUG] 📤 dataLayer.push called:', args);
    
    if (args[0] && typeof args[0] === 'object') {
      console.log('[DEBUG] 📋 Event details:', {
        event: args[0].event || 'no event name',
        ecommerce: args[0].ecommerce || 'no ecommerce',
        transaction_id: args[0].transaction_id || 'no txn_id',
        allKeys: Object.keys(args[0])
      });
    }
    
    return originalPush.apply(this, args);
  };
  
  console.log('[DEBUG] ✅ DataLayer interceptor installed');
})();
// ---- GA4 shim: перетворюємо старі gtag(...) у події для GTM ----
// dataLayer вже ініціалізований вище в debug блоці!
window.gtag = window.gtag || function(type, name, params) {
  if (type === 'event') {
    console.log('[GTM shim] 🔔 gtag event called:', name, params || {});
    window.dataLayer.push({
      event: name,
      ...(params || {})
    });
  }
};

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
  prepareAddToCartButtons();
  mountAddToCartButtons();
  renderCheckoutCart();
  initBundleWidget();
  initCheckoutUpsell(); 
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
// ============================================================================
// ВИПРАВЛЕНА функція скасування cart recovery (НЕ БЛОКУЄ відправку листів)
// ============================================================================
// ✅ ASYNC функція для скасування cart recovery
async function cancelCartRecovery(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    console.warn('[Cart Recovery] Invalid email for cancel:', email);
    return false;
  }

  try {
    console.log('[Cart Recovery] 🔄 Canceling for:', normalizedEmail);
    
    const response = await fetch('/api/cart-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'cancel', 
        email: normalizedEmail 
      })
    });

    if (!response.ok) {
      throw new Error(`Cancel failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Cart Recovery] ✅ Canceled:', data);
    return true;

  } catch (error) {
    console.error('[Cart Recovery] ❌ Cancel failed:', error.message);
    throw error;
  }
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

/* ========================= BUNDLE WIDGET (Dynamic) ========================= */

function initBundleWidget() {
  const bundleSection = document.querySelector('.bundle-section');
  if (!bundleSection) return;

  const card = bundleSection.closest('.product-card, .product-card--order') 
    || document.querySelector('.product-card--order');
  
  if (!card) return;

  const mainSku = card.dataset.sku; // 'isrib-a15' або 'isrib'
  
  // Відстежуємо зміну кількості
  card.addEventListener('click', (e) => {
    const opt = e.target.closest('.quantity-option');
    if (!opt) return;
    
    // Короткий таймаут щоб datasets встигли оновитися
    setTimeout(() => updateBundleOffer(card, mainSku), 50);
  });

  // Початкове відображення
  updateBundleOffer(card, mainSku);
}

function updateBundleOffer(card, mainSku) {
  const activeOpt = card.querySelector('.quantity-option.active');
  if (!activeOpt) return;

  const mainQty = parseFloat(activeOpt.dataset.grams) || 100;
  const mainPrice = parseFloat(activeOpt.dataset.price) || 0;
  const mainDisplay = activeOpt.dataset.quantity || '100mg';

  // Матриця upsell-пропозицій
  const bundleMatrix = {
    'isrib-a15': {
      100: { sku: 'zzl7', name: 'ZZL-7', qty: 100, price: 50, display: '100mg', img: 'images/zzl7-formula.svg' },
      500: { sku: 'zzl7', name: 'ZZL-7', qty: 500, price: 130, display: '500mg', img: 'images/zzl7-formula.svg' },
      1000: { sku: 'zzl7', name: 'ZZL-7', qty: 500, price: 130, display: '500mg', img: 'images/zzl7-formula.svg' }
    },
    'isrib': {
      100: { sku: 'isrib-a15', name: 'ISRIB A15', qty: 100, price: 50, display: '100mg', img: 'images/isrib-a15-formula.svg' },
      500: { sku: 'isrib-a15', name: 'ISRIB A15', qty: 500, price: 130, display: '500mg', img: 'images/isrib-a15-formula.svg' },
      1000: { sku: 'isrib-a15', name: 'ISRIB A15', qty: 1000, price: 200, display: '1g', img: 'images/isrib-a15-formula.svg' }
    }
  };

  const upsell = bundleMatrix[mainSku]?.[mainQty];
  if (!upsell) return;

  const regularTotal = mainPrice + upsell.price;
  const discount = Math.round(regularTotal * 0.15);
  const bundleTotal = regularTotal - discount;

  // Оновлюємо DOM
  const bundleCard = document.querySelector('.bundle-card');
  if (!bundleCard) return;

  // Головний продукт
  const currentItem = bundleCard.querySelector('.bundle-item.current');
  if (currentItem) {
    currentItem.querySelector('strong').textContent = getProductName(mainSku);
    currentItem.querySelector('.bundle-qty').textContent = mainDisplay;
    currentItem.querySelector('.bundle-price').textContent = `$${mainPrice.toFixed(2)}`;
  }

  // Upsell продукт
  const upsellItem = bundleCard.querySelector('.bundle-item.upsell');
  if (upsellItem) {
    const img = upsellItem.querySelector('img');
    img.src = upsell.img;
    img.alt = upsell.name;
    
    upsellItem.querySelector('strong').textContent = upsell.name;
    upsellItem.querySelector('.bundle-qty').textContent = upsell.display;
    upsellItem.querySelector('.bundle-price').textContent = `$${upsell.price.toFixed(2)}`;
  }

  // Total секція
  const totalSection = bundleCard.querySelector('.bundle-total');
  if (totalSection) {
    totalSection.querySelector('.strike').textContent = `$${regularTotal.toFixed(2)}`;
    const totalEl = document.getElementById('bundleTotal');
    if (totalEl) totalEl.textContent = `$${bundleTotal.toFixed(2)}`;
    
    const savingsEl = totalSection.querySelector('.bundle-savings');
    if (savingsEl) savingsEl.textContent = `Save $${discount} (15% off)`;
  }

  // Кнопка
  const addBtn = document.getElementById('addBundleBtn');
  if (addBtn) {
    addBtn.textContent = `🛒 Add Bundle to Cart — $${bundleTotal}`;
    
    // Оновлюємо обробник
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    
    newBtn.addEventListener('click', () => {
      const checkbox = document.getElementById('bundle-zzl7');
      
      // Додаємо головний продукт
      addToCart(getProductName(mainSku), mainSku, mainQty, mainPrice, mainDisplay);
      
      // Додаємо upsell якщо вибрано
      if (checkbox && checkbox.checked) {
        addToCart(upsell.name, upsell.sku, upsell.qty, upsell.price, upsell.display);
        showToast('Bundle added to cart! 🎉', 'success');
        
        try {
          if (typeof gtag === 'function') {
            gtag('event', 'upsell_accepted', {
              event_category: 'ecommerce',
              event_label: `bundle_${mainSku}_${upsell.sku}_${mainDisplay}`,
              value: bundleTotal
            });
          }
        } catch(e) {}
      } else {
        showToast('Added to cart! 🛒', 'success');
      }
      
      updateCartBadge();
    });
  }

  // ⭐ НОВИЙ КОД: Кастомний checkbox
  const checkbox = bundleCard.querySelector('#bundle-zzl7');
  const checkMark = bundleCard.querySelector('.bundle-item.upsell .bundle-check');

  if (checkbox && checkMark) {
    // Початковий стан
    if (checkbox.checked) {
      checkMark.classList.add('checked');
    } else {
      checkMark.classList.remove('checked');
    }
    
    // Видаляємо старі listeners (clone trick)
    const newCheckbox = checkbox.cloneNode(true);
    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    
    // Оновлюємо посилання на checkMark після можливої заміни DOM
    const freshCheckMark = bundleCard.querySelector('.bundle-item.upsell .bundle-check');
    
    // Event listener для toggle
    newCheckbox.addEventListener('change', () => {
      freshCheckMark.classList.toggle('checked', newCheckbox.checked);
      
      // Динамічне оновлення ціни та кнопки
      const currentTotal = newCheckbox.checked ? bundleTotal : mainPrice;
      const currentDiscount = newCheckbox.checked ? discount : 0;
      
      const freshTotalEl = document.getElementById('bundleTotal');
      if (freshTotalEl) {
        freshTotalEl.textContent = `$${currentTotal.toFixed(2)}`;
      }
      
      const freshBtn = document.getElementById('addBundleBtn');
      if (freshBtn) {
        const btnText = newCheckbox.checked 
          ? `🛒 Add Bundle to Cart — $${bundleTotal}`
          : `🛒 Add ${getProductName(mainSku)} to Cart — $${mainPrice}`;
        freshBtn.textContent = btnText;
      }
      
      // Оновлюємо savings badge
      const freshSavings = bundleCard.querySelector('.bundle-savings');
      if (freshSavings) {
        if (newCheckbox.checked) {
          freshSavings.textContent = `Save $${discount} (15% off)`;
          freshSavings.style.display = 'inline-block';
        } else {
          freshSavings.style.display = 'none';
        }
      }
    });
  }
}

function getProductName(sku) {
  const names = {
    'isrib-a15': 'ISRIB A15',
    'isrib': 'ISRIB',
    'zzl7': 'ZZL-7'
  };
  return names[sku] || sku;
}



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

// Оновіть існуючу функцію mountAddToCartButtons():

function mountAddToCartButtons() {
  document.querySelectorAll('.add-to-cart:not([disabled])').forEach(btn => {
    if (btn._bound) return; 
    btn._bound = true;
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      const name = card?.querySelector('.product-name')?.textContent || btn.dataset.name || 'Unknown';
      const sku = btn.dataset.sku || card?.dataset.sku || 'sku-unknown';
      
      let grams = parseFloat(btn.dataset.grams || '0') || 0;
      const display = btn.dataset.display || '';
      
      if (display) {
        const mgFromDisplay = parseQtyToMg(display);
        if (mgFromDisplay) grams = mgFromDisplay;
      }
      
      const price = parseFloat(btn.dataset.price || '0') || 0;

      addToCart(name, sku, grams, price, display);
      updateCartBadge?.();
      showToast?.(`Added to cart — ${display || (grams >= 1000 ? (grams/1000)+'g' : grams+'mg')} for $${price}`);

      setTimeout(() => showUpsellPopup(sku), 800);

      // ============================================
      // GA4 EVENT: ADD_TO_CART_BROWSE
      // ============================================
      try {
        const txnId = window.getTransactionId?.() || null;
        
        // ✅ ВИПРАВЛЕНИЙ КОД - правильний формат для GTM
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'add_to_cart_browse',
          ecommerce: {
            currency: 'USD',
            value: price,
            items: [{
              item_id: sku,
              item_name: name,
              item_variant: display,
              item_category: 'Research Compounds',
              price: price,
              quantity: 1
            }]
          },
          transaction_id: txnId || undefined,  // ← undefined замість null
          purchase_intent: txnId ? 'high' : 'medium',
          event_category: 'ecommerce',
          event_label: `Browse Add to Cart: ${name} ${display}`
        });
        
        console.log('[GA4] ✅ add_to_cart_browse pushed to dataLayer:', {
          product: `${name} ${display}`,
          value: price,
          transaction_id: txnId || 'none',
          intent: txnId ? 'high' : 'medium'
        });
      } catch(e) {
        console.error('[GA4] ❌ add_to_cart_browse failed:', e);
      }
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
  const cart = readCart();
  const addedItem = cart[cart.length - 1]; // останній доданий товар
  const addedQty = addedItem?.grams || 0;   // в мг
  
  // Логіка вибору upsell залежно від SKU та кількості
  const upsellMap = {
    'isrib-a15': {
      100: { 
        name: 'ZZL-7', sku: 'zzl7', price: 50, grams: 100, display: '100mg',
        reason: 'Popular stack with ISRIB A15'
      },
      500: {
        primary: { name: 'ZZL-7', sku: 'zzl7', price: 130, grams: 500, display: '500mg',
                   reason: 'Match your ISRIB commitment with ZZL-7' },
        alternative: { name: 'ISRIB Original', sku: 'isrib', price: 27, grams: 100, display: '100mg',
                       reason: 'Try the original ISRIB compound' }
      },
      1000: {
        primary: { name: 'ZZL-7', sku: 'zzl7', price: 130, grams: 500, display: '500mg',
                   reason: 'Start your ZZL-7 protocol — half-gram pack' },
        alternative: { name: 'ISRIB Original', sku: 'isrib', price: 60, grams: 500, display: '500mg',
                       reason: 'Compare both ISRIB analogs side-by-side' }
      }
    },
    'zzl7': {
      100: { name: 'ISRIB A15', sku: 'isrib-a15', price: 50, grams: 100, display: '100mg',
             reason: 'Enhance effects with ISRIB A15' },
      500: {
        primary: { name: 'ISRIB A15', sku: 'isrib-a15', price: 130, grams: 500, display: '500mg',
                   reason: 'Complete your cognitive stack' },
        alternative: { name: 'ISRIB Original', sku: 'isrib', price: 27, grams: 100, display: '100mg',
                       reason: 'Add original ISRIB to your protocol' }
      },
      1000: {
        primary: { name: 'ISRIB A15', sku: 'isrib-a15', price: 130, grams: 500, display: '500mg',
                   reason: 'Boost your stack with ISRIB A15' },
        alternative: { name: 'ISRIB Original', sku: 'isrib', price: 60, grams: 500, display: '500mg',
                       reason: 'Try the original ISRIB compound' }
      }
    },
    'isrib': {
      100: { name: 'ISRIB A15', sku: 'isrib-a15', price: 50, grams: 100, display: '100mg',
             reason: 'Upgrade to more potent A15 analog' },
      500: {
        primary: { name: 'ISRIB A15', sku: 'isrib-a15', price: 130, grams: 500, display: '500mg',
                   reason: 'Upgrade to A15 — 3x more potent' },
        alternative: { name: 'ZZL-7', sku: 'zzl7', price: 50, grams: 100, display: '100mg',
                       reason: 'Add rapid-acting ZZL-7 to your stack' }
      },
      1000: {
        primary: { name: 'ISRIB A15', sku: 'isrib-a15', price: 200, grams: 1000, display: '1g',
                   reason: 'Full upgrade to ultra-potent A15' },
        alternative: { name: 'ZZL-7', sku: 'zzl7', price: 130, grams: 500, display: '500mg',
                       reason: 'Build a complete cognitive stack' }
      }
    }
  };

  // Знаходимо правильний upsell
  let upsell = null;
  const skuMap = upsellMap[justAddedSku];
  
  if (!skuMap) return;
  
  if (addedQty === 100) {
    upsell = skuMap[100];
  } else if (addedQty === 500) {
    upsell = skuMap[500]?.primary || skuMap[500];
  } else if (addedQty >= 1000) {
    upsell = skuMap[1000]?.primary || skuMap[1000];
  }
  
  if (!upsell) return;
  
  // Перевірка чи вже є в кошику
  if (cart.some(i => i.sku === upsell.sku && i.grams === upsell.grams)) return;

  // Створюємо popup (HTML залишається той самий)...
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

/* ========================= CHECKOUT UPSELL ========================= */

function initCheckoutUpsell() {
  const widget = document.getElementById('checkoutUpsell');
  if (!widget) return;

  const cart = readCart();
  const cartSkus = cart.map(i => i.sku);
  
  // Аналіз кошика для визначення найбільшої покупки
  const largestQty = Math.max(...cart.map(i => i.grams || 0), 0);
  const hasA15 = cartSkus.includes('isrib-a15');
  const hasZZL7 = cartSkus.includes('zzl7');
  const hasISRIB = cartSkus.includes('isrib');

  // 🎯 Матриця upsell з ЗНИЖКОЮ 15%
  const UPSELL_DISCOUNT = 0.15; // 15% знижка на upsell
  
  const upsellOptions = [];

  // --- Логіка для ISRIB A15 в кошику ---
  if (hasA15 && !hasZZL7) {
    if (largestQty >= 1000) {
      // Купив 1g A15 → пропонуємо 500mg ZZL-7
      const basePrice = 130;
      upsellOptions.push({
        sku: 'zzl7', name: 'ZZL-7', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Start your ZZL-7 protocol — half-gram pack',
        img: 'images/zzl7-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else if (largestQty >= 500) {
      // Купив 500mg A15 → пропонуємо 500mg ZZL-7
      const basePrice = 130;
      upsellOptions.push({
        sku: 'zzl7', name: 'ZZL-7', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Match your ISRIB commitment with ZZL-7',
        img: 'images/zzl7-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else {
      // Купив 100mg A15 → пропонуємо 100mg ZZL-7
      const basePrice = 50;
      upsellOptions.push({
        sku: 'zzl7', name: 'ZZL-7', grams: 100, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '100mg',
        desc: 'Popular stack with ISRIB A15',
        img: 'images/zzl7-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    }
  }

  // Другий варіант: ISRIB Original (ТІЛЬКИ якщо його ще немає)
  if (hasA15 && !hasISRIB) {
    if (largestQty >= 1000) {
      const basePrice = 60;
      upsellOptions.push({
        sku: 'isrib', name: 'ISRIB Original', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Compare both ISRIB analogs side-by-side',
        img: 'images/isrib-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else if (largestQty >= 500) {
      const basePrice = 27;
      upsellOptions.push({
        sku: 'isrib', name: 'ISRIB Original', grams: 100, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '100mg',
        desc: 'Try the original ISRIB compound',
        img: 'images/isrib-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    }
  }

  // --- Логіка для ZZL-7 в кошику ---
  if (hasZZL7 && !hasA15) {
    if (largestQty >= 1000) {
      const basePrice = 130;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Boost your stack with ISRIB A15',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else if (largestQty >= 500) {
      const basePrice = 130;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Complete your cognitive stack',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else {
      const basePrice = 50;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 100, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '100mg',
        desc: 'Enhance effects with ISRIB A15',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    }
  }

  // ISRIB Original ТІЛЬКИ якщо немає ZZL7 + великі пакети
  if (hasZZL7 && !hasISRIB && largestQty >= 500) {
    const basePrice = largestQty >= 1000 ? 60 : 27;
    upsellOptions.push({
      sku: 'isrib', name: 'ISRIB Original', 
      grams: largestQty >= 1000 ? 500 : 100,
      originalPrice: basePrice,
      price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
      display: largestQty >= 1000 ? '500mg' : '100mg',
      desc: 'Add original ISRIB to your protocol',
      img: 'images/isrib-formula.svg',
      savings: Math.round(basePrice * UPSELL_DISCOUNT)
    });
  }

  // --- Логіка для ISRIB Original в кошику ---
  if (hasISRIB && !hasA15) {
    if (largestQty >= 1000) {
      const basePrice = 200;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 1000, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '1g',
        desc: 'Full upgrade to ultra-potent A15',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else if (largestQty >= 500) {
      const basePrice = 130;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 500, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '500mg',
        desc: 'Upgrade to A15 — 3x more potent',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    } else {
      const basePrice = 50;
      upsellOptions.push({
        sku: 'isrib-a15', name: 'ISRIB A15', grams: 100, 
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
        display: '100mg',
        desc: 'Upgrade to more potent A15 analog',
        img: 'images/isrib-a15-formula.svg',
        savings: Math.round(basePrice * UPSELL_DISCOUNT)
      });
    }
  }

  if (hasISRIB && !hasZZL7 && largestQty >= 500) {
    const basePrice = largestQty >= 1000 ? 130 : 50;
    upsellOptions.push({
      sku: 'zzl7', name: 'ZZL-7', 
      grams: largestQty >= 1000 ? 500 : 100,
      originalPrice: basePrice,
      price: Math.round(basePrice * (1 - UPSELL_DISCOUNT)), 
      display: largestQty >= 1000 ? '500mg' : '100mg',
      desc: largestQty >= 1000 ? 'Build a complete cognitive stack' : 'Add rapid-acting ZZL-7',
      img: 'images/zzl7-formula.svg',
      savings: Math.round(basePrice * UPSELL_DISCOUNT)
    });
  }

  // 🚫 КРИТИЧНО: Фільтруємо товари що вже є в кошику + ОДИН upsell на SKU
  const seenSkus = new Set();
  const filteredUpsells = upsellOptions.filter(u => {
    // Перевірка 1: чи вже є цей товар у кошику з такою ж кількістю?
    const alreadyInCart = cart.some(c => c.sku === u.sku && c.grams === u.grams);
    if (alreadyInCart) return false;
    
    // Перевірка 2: чи вже додали upsell з цього SKU?
    if (seenSkus.has(u.sku)) return false;
    seenSkus.add(u.sku);
    
    return true;
  });

  // 🎨 Рендеримо тільки перші 2 опції
  const topTwo = filteredUpsells.slice(0, 2);

  if (topTwo.length === 0) {
    widget.style.display = 'none';
    return;
  }

  const body = widget.querySelector('.card-body');
  if (!body) return;

  body.innerHTML = `
    <h3 class="upsell-title">💡 Complete your order</h3>
    <p class="upsell-subtitle">Researchers also added <strong>with 15% discount:</strong></p>
  `;

  topTwo.forEach(u => {
    const itemHTML = `
      <div class="upsell-item" 
           data-sku="${u.sku}" 
           data-name="${u.name}" 
           data-price="${u.price}" 
           data-grams="${u.grams}" 
           data-display="${u.display}">
        <img src="${u.img}" alt="${u.name}" class="upsell-img">
        <div class="upsell-content">
          <strong class="upsell-name">${u.name} (${u.display})</strong>
          <p class="upsell-desc">${u.desc}</p>
          <div class="upsell-footer">
            <div class="upsell-pricing">
              <span class="upsell-price-original" style="text-decoration:line-through; color:#94a3b8; font-size:14px; margin-right:8px;">$${u.originalPrice}</span>
              <span class="upsell-price" style="color:#10b981; font-weight:800;">$${u.price}</span>
              <span class="upsell-savings" style="background:#dcfdf7; color:#059669; font-size:11px; padding:2px 8px; border-radius:8px; margin-left:8px; font-weight:700;">Save $${u.savings}</span>
            </div>
            <button class="btn btn-sm btn-outline add-upsell">+ Add</button>
          </div>
        </div>
      </div>
    `;
    body.insertAdjacentHTML('beforeend', itemHTML);
  });

  // 🔄 Прив'язуємо event listeners
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
      
      item.classList.add('added');
      btn.textContent = '✓ Added';
      showToast(`${name} (${display}) added with 15% discount!`, 'success');

      try {
        if (typeof gtag === 'function') {
          gtag('event', 'upsell_accepted', {
            event_category: 'ecommerce',
            event_label: `checkout_upsell_${sku}_${display}_discount`,
            value: price
          });
        }
      } catch(e) {}

      setTimeout(() => initCheckoutUpsell(), 100);
    });
  });

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
  
  let isSubmitting = false;
  
  // Email збір для cart recovery
  const emailInput = form.querySelector('input[name="email"], #email');
  if (emailInput) {
    let debounceTimer;

    const scheduleCartRecoveryOnce = async (only24h = false) => {
      const email = (emailInput.value || '').trim().toLowerCase();
      if (!email) return;

      const cart = readCart();
      if (!cart.length) return;

      try {
        const state = JSON.parse(localStorage.getItem('cart_recovery_state') || '{}') || {};
        state.email = email;
        localStorage.setItem('cart_recovery_state', JSON.stringify(state));
      } catch {}

      const key = `cart_recovery_scheduled:${email}`;
      if (localStorage.getItem(key) === '1') return;

      try {
        await fetch('/api/cart-recovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'schedule',
            email,
            cartItems: cart,
            firstName: form.firstName?.value.trim() || '',
            only24h
          })
        });
        localStorage.setItem(key, '1');
        console.log('[Cart Recovery] scheduled for', email);
      } catch (err) {
        console.error('[Cart Recovery] schedule failed:', err);
      }
    };

    emailInput.addEventListener('blur', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => scheduleCartRecoveryOnce(false), 400);
    });
  }

  // ============================================
  // ✅ ГОЛОВНИЙ SUBMIT HANDLER
  // ============================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      console.warn('[Checkout] ⚠️ Already submitting');
      return;
    }

    isSubmitting = true;

    const msg = document.getElementById('formMsg') || form.querySelector('.form-status');
    if (msg) { 
      msg.textContent = ''; 
      msg.style.color = ''; 
    }

    const gotcha = form.querySelector('input[name="_gotcha"]')?.value || '';
    if (gotcha) {
      isSubmitting = false;
      return;
    }

    const cartNow = readCart();
    
    console.log('[Checkout] 📦 Cart check:', {
      length: cartNow.length,
      items: cartNow
    });

    if (!cartNow.length) {
      if (msg) {
        msg.textContent = 'Your cart is empty.';
        msg.style.color = '#dc2626';
      }
      try { 
        showToast?.('Cart is empty', 'error'); 
      } catch {}
      isSubmitting = false;
      return;
    }

    // Збираємо дані форми
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

    if (!firstName || !lastName || !email || !country || !city || !postal || !address) {
      if (msg) {
        msg.textContent = 'Please fill all required fields.';
        msg.style.color = '#dc2626';
      }
      isSubmitting = false;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isRecovery = urlParams.get('recovery') === 'true';
    const promoFromURL = (urlParams.get('promo') || '').toUpperCase();
    const promoInputEl = document.getElementById('promoCode');

    if (isRecovery && promoFromURL === 'RETURN15' && promoInputEl && !promoInputEl.value) {
      promoInputEl.value = 'RETURN15';
      document.getElementById('applyPromoBtn')?.click?.();
    }

    const appliedPromoCode = (promoInputEl?.value || '').trim().toUpperCase();
    const cart = normalizeCartUnits(readCart());
    
    const items = cart.map(i => {
      const mgFromLabel = parseQtyToMgLabel(i.display);
      const mgPerPack = mgFromLabel || Number(i.grams || 0);
      return {
        name: i.name,
        sku: i.sku || i.id || '',
        qty: Number(i.count || 1),
        price: Number(i.price || 0),
        grams: mgPerPack,
        display: i.display || (mgPerPack ? (mgPerPack >= 1000 ? (mgPerPack / 1000) + 'g' : mgPerPack + 'mg') : '')
      };
    });

    const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
    let discount = 0;
    let discountPercent = 0;
    if (appliedPromoCode) {
      const PROMO_CODES = { 'RETURN15': 0.15, 'WELCOME15': 0.15 };
      discountPercent = PROMO_CODES[appliedPromoCode] || 0;
      discount = subtotal * discountPercent;
    }
    const total = subtotal - discount;

    // ============================================
    // ✅ КРИТИЧНО: ВИКОРИСТОВУЄМО ІСНУЮЧИЙ ORDER ID
    // ============================================
    const orderIdFinal = window._generatedOrderId || 
      `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    console.log('[Checkout] 🆔 Using Order ID:', orderIdFinal);

    // ============================================
    // ✅ СТВОРЮЄМО АБО ОНОВЛЮЄМО PENDING ORDER
    // ============================================
    const pendingOrderData = {
      order_id: orderIdFinal,
      email: email.trim().toLowerCase(),
      timestamp: Date.now(),
      amount: total,
      subtotal: subtotal,
      discount: discount,
      promo: appliedPromoCode || '',
      product: items.map(i => `${i.name} ${i.display}`).join(', '),
      items: items,
      utm_source: urlParams.get('utm_source') || 'direct',
      utm_campaign: urlParams.get('utm_campaign') || 'none',
      firstName: firstName,
      lastName: lastName,
      country: country,
      city: city,
      region: region,
      postal: postal,
      address: address,
      messenger: messenger,
      handle: handle,
      notes: notes,
      checkout_submitted_at: Date.now()
    };

    // ============================================
    // ✅ ЗБЕРІГАЄМО PENDING ORDER ПЕРЕД ВІДПРАВКОЮ
    // ============================================
    try {
      const pendingKey = 'pending_order_' + orderIdFinal;
      localStorage.setItem(pendingKey, JSON.stringify(pendingOrderData));
      console.log('[Checkout] 💾 Pending order saved/updated:', pendingKey);
      console.log('[Checkout] 📦 Order data:', pendingOrderData);
      
      // Verification
      const verification = localStorage.getItem(pendingKey);
      if (verification) {
        console.log('[Checkout] ✅ Pending order verified in localStorage');
      } else {
        console.error('[Checkout] ❌ Pending order NOT saved!');
      }
    } catch (saveErr) {
      console.error('[Checkout] ❌ Failed to save pending order:', saveErr);
    }

    // ============================================
    // ✅ PAYLOAD З ORDER ID
    // ============================================
    const payload = {
      orderId: orderIdFinal,
      firstName, lastName, email, country, region, city, postal, address,
      messenger, handle, notes,
      _gotcha: gotcha,
      items,
      promoCode: appliedPromoCode
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
    }

    try {
      console.log('[Checkout] 📤 Sending order to backend...');
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMsg = 'Could not submit. Please check your cart.';
        if (msg) { 
          msg.textContent = errMsg; 
          msg.style.color = '#dc2626'; 
        }
        isSubmitting = false;
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Order Request';
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
        }
        return;
      }

      // ============================================
      // ✅ SUCCESS FLOW
      // ============================================
      console.log('[Checkout] ✅ Order sent successfully');
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Cart recovery cancel
      try {
        await cancelCartRecovery(normalizedEmail);
        console.log('[Checkout] ✅ Cart recovery canceled');
      } catch (cancelErr) {
        console.warn('[Checkout] ⚠️ Cart recovery cancel failed:', cancelErr);
      }

      localStorage.removeItem('cart_recovery_state');
      localStorage.removeItem(`cart_recovery_scheduled:${normalizedEmail}`);
      localStorage.removeItem('pending_promo');

      // Збереження даних для success page
      const orderData = {
        order_id: orderIdFinal,
        subtotal: subtotal,
        discount: discount,
        promo: appliedPromoCode || '',
        total: total,
        items: items,
        timestamp: Date.now()
      };

      console.log('[Checkout] 💾 Saving order data for success page');

      try {
        const dataString = JSON.stringify(orderData);
        localStorage.setItem('_order_success_data', dataString);
        
        const verification = localStorage.getItem('_order_success_data');
        if (verification === dataString) {
          console.log('[Checkout] ✅ Order data saved for success page');
        }
      } catch (saveErr) {
        console.error('[Checkout] ❌ Save failed:', saveErr);
      }

      // Очищаємо кошик
      writeCart([]);
      updateCartBadge([]);

      // Редірект
      console.log('[Checkout] 🔄 Redirecting to success page...');
      window.location.href = '/success.html';

    } catch (err) {
      console.error('[Checkout] ❌ Error:', err);
      
      if (msg) { 
        msg.textContent = 'Network error. Please try again.'; 
        msg.style.color = '#ef4444'; 
      }
      
      isSubmitting = false;
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Order Request';
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    }
  });
}

// Helper function
function parseQtyToMgLabel(s) {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  return t.includes('g') && !t.includes('mg') ? Math.round(n * 1000) : Math.round(n);
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
  const MEASUREMENT_ID = 'G-SMCGZ6BPDC';  // ← правильний ID
  const API_SECRET = '3M-EAt53Q9uAtyM35gx8Xg';  // ← правильний secret
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
    const seenConfig = dl.some(e => Array.isArray(e) && e[0]==='config' && e[1]==='G-SMCGZ6BPDC');
    const seenPV = dl.some(e => Array.isArray(e) && e[0]==='event' && e[1]==='page_view');
    if(!seenConfig && !seenPV) { mpPageView(); }
  }, 1500);
})();


/* ===================== CART RECOVERY SYSTEM ===================== */

(function initCartRecovery() {
  const RECOVERY_KEY = 'cart_recovery_state';
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const TWENTYFOUR_HOURS = 24 * 60 * 60 * 1000;

  // Читаємо стан recovery
  function getRecoveryState() {
    try {
      const stored = localStorage.getItem(RECOVERY_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Зберігаємо стан
  function setRecoveryState(state) {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
  }

  // Очищаємо стан
  function clearRecoveryState() {
    localStorage.removeItem(RECOVERY_KEY);
  }

  // Надсилаємо запит на бекенд
  async function sendRecoveryEmail(email, cartItems, stage) {
    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cartItems, stage })
      });

      if (res.ok) {
        console.log(`[Cart Recovery] ${stage} email sent to ${email}`);
        
        // Analytics
        try {
          if (typeof gtag === 'function') {
            gtag('event', 'cart_recovery_sent', {
              event_category: 'retention',
              event_label: stage,
              value: cartItems.reduce((s, i) => s + (i.price * i.count), 0)
            });
          }
        } catch {}
      }
    } catch (error) {
      console.error('[Cart Recovery] Send failed:', error);
    }
  }

  // Головна логіка
  function checkCartRecovery() {
    const cart = readCart();
    const state = getRecoveryState();
    const now = Date.now();

    // Якщо кошик порожній — очищаємо tracking
    if (cart.length === 0) {
      if (state) clearRecoveryState();
      return;
    }

    // Якщо ми на сторінці checkout — не тригеримо recovery
    if (window.location.pathname.includes('checkout.html')) {
      return;
    }

    // Якщо немає збереженого стану — ініціалізуємо
    if (!state) {
      setRecoveryState({
        startTime: now,
        email: null,
        sent2h: false,
        sent24h: false,
        cartSnapshot: cart
      });
      return;
    }

    // Перевіряємо чи змінився кошик (користувач додав/видалив товари)
    const cartChanged = JSON.stringify(cart) !== JSON.stringify(state.cartSnapshot);
    if (cartChanged) {
      // Скидаємо tracking якщо кошик змінився
      setRecoveryState({
        startTime: now,
        email: state.email, // зберігаємо email якщо був
        sent2h: false,
        sent24h: false,
        cartSnapshot: cart
      });
      return;
    }

    const elapsed = now - state.startTime;

    // Перевірка email (шукаємо в формі checkout або зберігаємо з попереднього разу)
    let userEmail = state.email;
    if (!userEmail) {
      const emailInput = document.getElementById('email');
      if (emailInput && emailInput.value.includes('@')) {
        userEmail = emailInput.value.trim();
        state.email = userEmail;
        setRecoveryState(state);
      }
    }

    // Якщо немає email — не можемо надіслати
    if (!userEmail) return;

    // Надсилаємо 2h reminder
    if (!state.sent2h && elapsed >= TWO_HOURS) {
      sendRecoveryEmail(userEmail, cart, '2h');
      state.sent2h = true;
      setRecoveryState(state);
    }

    // Надсилаємо 24h reminder
    if (!state.sent24h && elapsed >= TWENTYFOUR_HOURS) {
      sendRecoveryEmail(userEmail, cart, '24h');
      state.sent24h = true;
      setRecoveryState(state);
    }
  }

  // Запускаємо перевірку кожні 5 хвилин
  setInterval(checkCartRecovery, 5 * 60 * 1000);

  // Перша перевірка через 10 секунд після завантаження
  setTimeout(checkCartRecovery, 10000);

  // Перевіряємо при зміні кошика
  const originalAddToCart = window.addToCart;
  window.addToCart = function(...args) {
    originalAddToCart?.apply(this, args);
    setTimeout(checkCartRecovery, 1000);
  };

  // Очищаємо tracking після успішного checkout
  if (window.location.pathname.includes('success.html')) {
    clearRecoveryState();
  }
})();



window.trackPurchase = function(orderId, total, items) {
  if (typeof gtag === 'function') {
    gtag('event', 'purchase', {
      transaction_id: orderId,
      value: total,
      currency: 'USD',
      items: items
    });
  }
};
