// ============================================
// BTCPay Server Integration Module
// ============================================
// Handles Bitcoin payments via BTCPay Server
// Uses Legacy API for invoice creation and polling
// ============================================

(function(window) {
  'use strict';

  // Перевіряємо чи завантажена конфігурація
  // Примітка: btcpay-config.js завантажується async, тому конфіг може бути ще не готовий
  // Це нормально - конфіг буде готовий до моменту використання
  if (typeof window.BTCPAY_CONFIG === 'undefined') {
    console.log('[BTCPay] ⏳ BTCPay config is loading asynchronously...');
  }

  // ============================================
  // BTCPay API Client
  // ============================================
  class BTCPayClient {
    constructor() {
      // Отримуємо конфіг динамічно (може завантажитись async)
      const CONFIG = window.BTCPAY_CONFIG;

      if (!CONFIG) {
        throw new Error('BTCPAY_CONFIG not loaded. Please wait for config to load.');
      }

      this.serverUrl = CONFIG.serverUrl;
      this.apiKey = CONFIG.apiKey;
      this.storeId = CONFIG.storeId;
      this.polling = CONFIG.polling;
      this.discount = CONFIG.discount;
      this.pollingInterval = null;
      this.pollingAttempts = 0;
    }

    /**
     * Створює новий BTCPay invoice
     * @param {Object} options - Invoice options
     * @returns {Promise<Object>} Invoice data
     */
    async createInvoice(options) {
      const {
        orderId,
        price,
        currency = 'USD',
        buyerEmail,
        redirectURL,
        notificationURL,
        metadata = {}
      } = options;

      console.log('[BTCPay] 📤 Creating invoice:', {
        orderId,
        price,
        currency,
        buyerEmail
      });

      try {
        // Greenfield API endpoint (новий формат BTCPay)
        const apiUrl = `${this.serverUrl}/api/v1/stores/${this.storeId}/invoices`;

        const payload = {
          amount: Number(price).toFixed(2),
          currency: currency,
          metadata: {
            orderId: orderId,
            buyerEmail: buyerEmail,
            ...metadata
          },
          checkout: {
            redirectURL: redirectURL || `${window.location.origin}/success.html`,
            redirectAutomatically: false
          }
        };

        console.log('[BTCPay] 🔧 API Request:', {
          url: apiUrl,
          method: 'POST',
          hasAuth: !!this.apiKey,
          storeId: this.storeId,
          payload: payload
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${this.apiKey}`
          },
          body: JSON.stringify(payload)
        });

        console.log('[BTCPay] 📥 Response:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[BTCPay] ❌ API error response:', errorText.substring(0, 500));
          throw new Error(`BTCPay API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
        }

        const responseText = await response.text();
        console.log('[BTCPay] 📄 Response text (first 200 chars):', responseText.substring(0, 200));

        const data = JSON.parse(responseText);
        console.log('[BTCPay] ✅ Invoice created:', data.id);

        // Greenfield API response format
        return {
          id: data.id,
          checkoutLink: data.checkoutLink,
          status: data.status,
          price: data.amount,
          currency: data.currency,
          createdTime: data.createdTime
        };

      } catch (error) {
        console.error('[BTCPay] ❌ Create invoice failed:', error);
        throw error;
      }
    }

    /**
     * Перевіряє статус invoice
     * @param {string} invoiceId - BTCPay invoice ID
     * @returns {Promise<Object>} Invoice status
     */
    async checkInvoiceStatus(invoiceId) {
      try {
        const response = await fetch(`${this.serverUrl}/api/v1/stores/${this.storeId}/invoices/${invoiceId}`, {
          headers: {
            'Authorization': `token ${this.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }

        const data = await response.json();

        return {
          id: data.id,
          status: data.status,
          exceptionStatus: data.additionalStatus,
          price: data.amount,
          amountPaid: data.amount,
          currency: data.currency,
          invoiceTime: data.createdTime,
          expirationTime: data.expirationTime,
          currentTime: Date.now()
        };

      } catch (error) {
        console.error('[BTCPay] ❌ Check status failed:', error);
        throw error;
      }
    }

    /**
     * Починає polling статусу invoice
     * @param {string} invoiceId - BTCPay invoice ID
     * @param {Function} onStatusChange - Callback для зміни статусу
     * @returns {Promise<Object>} Final invoice status
     */
    async pollInvoiceStatus(invoiceId, onStatusChange) {
      console.log('[BTCPay] 🔄 Starting invoice polling:', invoiceId);

      this.pollingAttempts = 0;
      const maxAttempts = this.polling.maxAttempts;
      const interval = this.polling.interval;

      return new Promise((resolve, reject) => {
        this.pollingInterval = setInterval(async () => {
          this.pollingAttempts++;

          console.log(`[BTCPay] 🔍 Polling attempt ${this.pollingAttempts}/${maxAttempts}`);

          try {
            const status = await this.checkInvoiceStatus(invoiceId);

            // Повідомляємо про зміну статусу
            if (onStatusChange) {
              onStatusChange(status);
            }

            // Статуси BTCPay Greenfield API:
            // - New: нова транзакція
            // - Processing: отримана оплата, чекаємо confirmations
            // - Expired: прострочена
            // - Invalid: невалідна
            // - Settled: підтверджена та завершена

            const statusLower = (status.status || '').toLowerCase();

            if (statusLower === 'settled') {
              console.log('[BTCPay] ✅ Payment confirmed and settled!');
              this.stopPolling();
              resolve(status);
            } else if (statusLower === 'processing') {
              console.log('[BTCPay] 💰 Payment received, waiting for confirmations...');
              // Продовжуємо чекати confirmations
            } else if (statusLower === 'expired' || statusLower === 'invalid') {
              console.log('[BTCPay] ⚠️ Invoice expired or invalid');
              this.stopPolling();
              reject(new Error(`Invoice ${status.status}`));
            } else if (statusLower === 'new') {
              console.log('[BTCPay] ⏳ Waiting for payment...');
              // Продовжуємо чекати
            }

            // Timeout after max attempts
            if (this.pollingAttempts >= maxAttempts) {
              console.log('[BTCPay] ⏱️ Polling timeout reached');
              this.stopPolling();
              reject(new Error('Polling timeout'));
            }

          } catch (error) {
            console.error('[BTCPay] ❌ Polling error:', error);
            this.stopPolling();
            reject(error);
          }
        }, interval);
      });
    }

    /**
     * Зупиняє polling
     */
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
        console.log('[BTCPay] 🛑 Polling stopped');
      }
    }

    /**
     * Відкриває BTCPay checkout в новому вікні або modal
     * @param {string} checkoutLink - BTCPay checkout URL
     * @param {string} mode - 'window' або 'modal'
     */
    openCheckout(checkoutLink, mode = 'window') {
      if (mode === 'window') {
        // Відкрити в новому вікні
        const width = 600;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        window.open(
          checkoutLink,
          'BTCPay Invoice',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
      } else {
        // Відкрити в iframe modal (альтернативний спосіб)
        // TODO: Implement modal UI
        window.open(checkoutLink, '_blank');
      }
    }
  }

  // ============================================
  // UI Helpers
  // ============================================

  /**
   * Показує loading state для Bitcoin payment
   */
  function showBitcoinLoading(message) {
    const submitBtn = document.getElementById('submitOrderBtn');
    const formMsg = document.getElementById('formMsg');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `₿ ${message}...`;
      submitBtn.style.opacity = '0.6';
    }

    if (formMsg) {
      formMsg.textContent = `⏳ ${message}...`;
      formMsg.style.color = '#3b82f6';
    }
  }

  /**
   * Показує success state для Bitcoin payment
   */
  function showBitcoinSuccess(message) {
    const formMsg = document.getElementById('formMsg');

    if (formMsg) {
      formMsg.textContent = `✓ ${message}`;
      formMsg.style.color = '#10b981';
    }
  }

  /**
   * Показує error state для Bitcoin payment
   */
  function showBitcoinError(message) {
    const submitBtn = document.getElementById('submitOrderBtn');
    const formMsg = document.getElementById('formMsg');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Order Request';
      submitBtn.style.opacity = '1';
    }

    if (formMsg) {
      formMsg.textContent = `❌ ${message}`;
      formMsg.style.color = '#dc2626';
    }
  }

  /**
   * Розраховує ціну з Bitcoin знижкою
   */
  function calculateBitcoinPrice(originalPrice) {
    const discount = window.BTCPAY_CONFIG?.discount || 0.10;
    const discountedPrice = originalPrice * (1 - discount);
    const savedAmount = originalPrice - discountedPrice;

    return {
      original: originalPrice,
      discounted: discountedPrice,
      saved: savedAmount,
      discountPercent: discount * 100
    };
  }

  // ============================================
  // Export to window
  // ============================================
  window.BTCPayClient = BTCPayClient;
  window.BTCPayHelpers = {
    showLoading: showBitcoinLoading,
    showSuccess: showBitcoinSuccess,
    showError: showBitcoinError,
    calculatePrice: calculateBitcoinPrice
  };

  console.log('[BTCPay] ✅ Module loaded');

})(window);
