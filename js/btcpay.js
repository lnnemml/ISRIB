// ============================================
// BTCPay Server Integration Module
// ============================================
// Handles Bitcoin payments via BTCPay Server
// Uses Legacy API for invoice creation and polling
// ============================================

(function(window) {
  'use strict';

  // Перевіряємо чи завантажена конфігурація
  if (typeof window.BTCPAY_CONFIG === 'undefined') {
    console.error('[BTCPay] ❌ BTCPAY_CONFIG not loaded! Include btcpay-config.js first.');
    return;
  }

  const CONFIG = window.BTCPAY_CONFIG;

  // ============================================
  // BTCPay API Client
  // ============================================
  class BTCPayClient {
    constructor() {
      this.serverUrl = CONFIG.serverUrl;
      this.apiKey = CONFIG.apiKey;
      this.storeId = CONFIG.storeId;
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
        const response = await fetch(`${this.serverUrl}/api/v1/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`
          },
          body: JSON.stringify({
            price: Number(price).toFixed(2),
            currency: currency,
            orderId: orderId,
            buyerEmail: buyerEmail,
            redirectURL: redirectURL || `${window.location.origin}/success.html`,
            notificationURL: notificationURL,
            posData: JSON.stringify(metadata)
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[BTCPay] ❌ API error:', response.status, errorText);
          throw new Error(`BTCPay API error: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        console.log('[BTCPay] ✅ Invoice created:', data.data.id);

        return {
          id: data.data.id,
          checkoutLink: data.data.checkoutLink,
          status: data.data.status,
          price: data.data.price,
          currency: data.data.currency,
          createdTime: data.data.invoiceTime
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
        const response = await fetch(`${this.serverUrl}/api/v1/invoices/${invoiceId}`, {
          headers: {
            'Authorization': `Basic ${this.apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to check status: ${response.status}`);
        }

        const data = await response.json();

        return {
          id: data.data.id,
          status: data.data.status,
          exceptionStatus: data.data.exceptionStatus,
          price: data.data.price,
          amountPaid: data.data.amountPaid,
          currency: data.data.currency,
          invoiceTime: data.data.invoiceTime,
          expirationTime: data.data.expirationTime,
          currentTime: data.data.currentTime
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
      const maxAttempts = CONFIG.polling.maxAttempts;
      const interval = CONFIG.polling.interval;

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

            // Статуси BTCPay:
            // - new: нова транзакція
            // - paid: оплачена (0 confirmations)
            // - confirmed: підтверджена (достатньо confirmations)
            // - complete: завершена
            // - expired: прострочена
            // - invalid: невалідна

            if (status.status === 'confirmed' || status.status === 'complete') {
              console.log('[BTCPay] ✅ Payment confirmed!');
              this.stopPolling();
              resolve(status);
            } else if (status.status === 'paid') {
              console.log('[BTCPay] 💰 Payment received, waiting for confirmation...');
              // Продовжуємо чекати confirmations
            } else if (status.status === 'expired' || status.status === 'invalid') {
              console.log('[BTCPay] ⚠️ Invoice expired or invalid');
              this.stopPolling();
              reject(new Error(`Invoice ${status.status}`));
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
    const discount = CONFIG.discount;
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
