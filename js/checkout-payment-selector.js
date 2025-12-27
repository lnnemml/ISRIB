// ============================================
// Payment Method Selector & Price Updater
// ============================================
// Handles payment method selection and dynamic price updates
// ============================================

(function() {
  'use strict';

  console.log('[Payment Selector] Initializing...');

  // Чекаємо поки DOM готовий
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const paymentManual = document.getElementById('paymentManual');
    const paymentBitcoin = document.getElementById('paymentBitcoin');

    if (!paymentManual || !paymentBitcoin) {
      console.warn('[Payment Selector] Payment method inputs not found');
      return;
    }

    // Додаємо event listeners
    paymentManual.addEventListener('change', handlePaymentMethodChange);
    paymentBitcoin.addEventListener('change', handlePaymentMethodChange);

    // Додаємо listener для змін в кошику (через MutationObserver)
    observeCartChanges();

    // Початкове оновлення (manual payment за замовчуванням)
    updatePriceDisplay('manual');

    console.log('[Payment Selector] ✅ Initialized');
  }

  /**
   * Обробка зміни payment method
   */
  function handlePaymentMethodChange(e) {
    const selectedMethod = e.target.value;
    console.log('[Payment Selector] Payment method changed:', selectedMethod);

    // Оновлюємо відображення цін
    updatePriceDisplay(selectedMethod);

    // GTM dataLayer event
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'payment_method_selected',
        payment_method: selectedMethod,
        discount_applied: selectedMethod === 'bitcoin' ? '10%' : 'none'
      });
      console.log('[GTM] payment_method_selected event pushed');
    }
  }

  // Флаг для запобігання infinite loop
  let isUpdating = false;

  /**
   * Оновлює відображення ціни в залежності від вибраного методу
   */
  function updatePriceDisplay(paymentMethod) {
    // Запобігаємо повторним викликам під час оновлення
    if (isUpdating) {
      return;
    }

    isUpdating = true;

    try {
      // Отримуємо subtotal з кошика
      const cart = readCartFromLocalStorage();
      const subtotal = calculateSubtotal(cart);

      console.log('[Payment Selector] Updating price display:', {
        method: paymentMethod,
        subtotal: subtotal
      });

      // Розраховуємо ціни
      let finalPrice = subtotal;
      let discount = 0;
      let discountLabel = '';

      if (paymentMethod === 'bitcoin') {
        // 10% знижка для Bitcoin
        discount = subtotal * 0.10;
        finalPrice = subtotal - discount;
        discountLabel = 'Bitcoin 10%';
      }

      // Оновлюємо Order Summary
      updateOrderSummaryTotals(subtotal, discount, discountLabel, finalPrice);

      // Показуємо/ховаємо savings message
      updateBitcoinSavingsMessage(discount);

    } finally {
      // Знімаємо флаг після завершення
      isUpdating = false;
    }
  }

  /**
   * Оновлює totals в Order Summary
   */
  function updateOrderSummaryTotals(subtotal, discount, discountLabel, finalPrice) {
    const summaryTotals = document.getElementById('summaryTotals');
    if (!summaryTotals) return;

    let html = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748b;">Subtotal</span>
        <span style="font-weight:600;">$${subtotal.toFixed(2)}</span>
      </div>
    `;

    // Додаємо Bitcoin discount якщо є
    if (discount > 0) {
      html += `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#10b981;">
          <span>Discount (${discountLabel})</span>
          <span style="font-weight:600;">−$${discount.toFixed(2)}</span>
        </div>
      `;
    }

    html += `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748b;">Shipping</span>
        <span style="font-weight:600;color:#10b981;">FREE</span>
      </div>
      <hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb;">
      <div style="display:flex;justify-content:space-between;font-size:18px;">
        <span style="font-weight:700;">Total</span>
        <span style="font-weight:700;color:#1e293b;">$${finalPrice.toFixed(2)}</span>
      </div>
    `;

    summaryTotals.innerHTML = html;
  }

  /**
   * Показує/ховає savings message під Bitcoin option
   */
  function updateBitcoinSavingsMessage(discount) {
    const savingsDiv = document.getElementById('bitcoinSavings');
    if (!savingsDiv) return;

    if (discount > 0) {
      savingsDiv.innerHTML = `<span style="font-size:20px;margin-right:8px;">🎉</span>You save $${discount.toFixed(2)} with Bitcoin!`;
      savingsDiv.style.display = 'block';
    } else {
      savingsDiv.style.display = 'none';
    }
  }

  /**
   * Читає кошик з localStorage
   */
  function readCartFromLocalStorage() {
    try {
      const cartData = localStorage.getItem('isrib_cart');
      if (!cartData) return [];
      return JSON.parse(cartData);
    } catch (e) {
      console.error('[Payment Selector] Error reading cart:', e);
      return [];
    }
  }

  /**
   * Розраховує subtotal з кошика
   */
  function calculateSubtotal(cart) {
    if (!Array.isArray(cart) || cart.length === 0) return 0;

    return cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const count = Number(item.count || 1);
      return sum + (price * count);
    }, 0);
  }

  /**
   * Спостерігає за змінами в кошику
   */
  function observeCartChanges() {
    // Ініціалізуємо lastSubtotal поточним значенням
    const cart = readCartFromLocalStorage();
    let lastSubtotal = calculateSubtotal(cart);

    // Слухаємо storage events (коли кошик змінюється в іншій вкладці)
    window.addEventListener('storage', (e) => {
      if (e.key === 'isrib_cart') {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'manual';
        updatePriceDisplay(selectedMethod);
      }
    });

    // Custom event для оновлення з main.js (коли кошик змінюється програмно)
    window.addEventListener('cart-updated', () => {
      const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'manual';
      updatePriceDisplay(selectedMethod);
    });

    // Перевірка змін кошика через setInterval (fallback)
    // Перевіряємо тільки якщо subtotal змінився
    setInterval(() => {
      const cart = readCartFromLocalStorage();
      const currentSubtotal = calculateSubtotal(cart);

      if (currentSubtotal !== lastSubtotal) {
        lastSubtotal = currentSubtotal;
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'manual';
        updatePriceDisplay(selectedMethod);
      }
    }, 2000); // Перевіряємо кожні 2 секунди
  }

  // Експортуємо функції для використання в main.js
  window.PaymentSelector = {
    updatePriceDisplay: updatePriceDisplay,
    getSelectedMethod: function() {
      return document.querySelector('input[name="paymentMethod"]:checked')?.value || 'manual';
    },
    getBitcoinDiscount: function() {
      const cart = readCartFromLocalStorage();
      const subtotal = calculateSubtotal(cart);
      return subtotal * 0.10;
    },
    getFinalPrice: function() {
      const cart = readCartFromLocalStorage();
      const subtotal = calculateSubtotal(cart);
      const method = this.getSelectedMethod();
      return method === 'bitcoin' ? subtotal * 0.90 : subtotal;
    }
  };

})();
