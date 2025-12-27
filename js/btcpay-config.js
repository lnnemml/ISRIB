// ============================================
// BTCPay Server Configuration Loader
// ============================================
// Завантажує конфігурацію з Vercel environment variables через API
// ============================================

(async function loadBTCPayConfig() {
  'use strict';

  console.log('[BTCPay Config] 🔄 Loading configuration...');

  // Fallback конфігурація (без credentials для безпеки)
  // Для локальної розробки використовуй: vercel dev
  const FALLBACK_CONFIG = {
    serverUrl: '',
    apiKey: '',
    storeId: '',
    discount: 0.10,
    polling: {
      interval: 5000,
      maxAttempts: 360,
      timeout: 1800000
    }
  };

  let config;

  try {
    // Спробуємо завантажити з API (production на Vercel)
    const response = await fetch('/api/btcpay-config');

    if (response.ok) {
      config = await response.json();
      console.log('[BTCPay Config] ✅ Loaded from environment variables');
    } else {
      throw new Error(`API returned ${response.status}`);
    }

  } catch (error) {
    // Fallback для локальної розробки
    console.warn('[BTCPay Config] ⚠️ Failed to load from API');
    console.warn('[BTCPay Config] Error:', error.message);
    console.error('[BTCPay Config] ❌ ВАЖЛИВО: Environment variables не налаштовані в Vercel!');
    console.error('[BTCPay Config] 📋 Додайте в Vercel: BTCPAY_SERVER_URL, BTCPAY_API_KEY, BTCPAY_STORE_ID');

    // Перевіряємо що fallback також має все необхідне
    if (!FALLBACK_CONFIG.serverUrl || !FALLBACK_CONFIG.apiKey || !FALLBACK_CONFIG.storeId) {
      console.error('[BTCPay Config] ❌ Fallback config також порожній - Bitcoin платежі недоступні!');

      // Створюємо порожній конфіг з помилкою
      config = {
        ...FALLBACK_CONFIG,
        _error: 'Bitcoin payment not configured. Please contact support.'
      };
    } else {
      console.log('[BTCPay Config] 💡 Використовую fallback config (для локальної розробки)');
      config = FALLBACK_CONFIG;
    }
  }

  // Експортуємо глобально
  if (typeof window !== 'undefined') {
    window.BTCPAY_CONFIG = config;
    console.log('[BTCPay Config] ✅ Configuration ready:', {
      serverUrl: config.serverUrl,
      hasApiKey: !!config.apiKey,
      hasStoreId: !!config.storeId,
      discount: config.discount
    });
  }

  // Для Node.js (якщо потрібно)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
  }

  // Dispatch подію що конфіг готовий
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('btcpay-config-ready', { detail: config }));
  }
})();
