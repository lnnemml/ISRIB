// ============================================
// BTCPay Public Configuration API
// ============================================
// Повертає публічну конфігурацію BTCPay з environment variables
// ============================================

export default function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Читаємо конфігурацію з environment variables
    const config = {
      serverUrl: process.env.BTCPAY_SERVER_URL || '',
      apiKey: process.env.BTCPAY_API_KEY || '',
      storeId: process.env.BTCPAY_STORE_ID || '',
      discount: 0.10, // 10% Bitcoin discount
      polling: {
        interval: 5000,      // 5 seconds
        maxAttempts: 360,    // 30 minutes max
        timeout: 1800000     // 30 minutes
      }
    };

    // Перевірка що всі необхідні змінні встановлені
    if (!config.serverUrl || !config.apiKey || !config.storeId) {
      console.error('[BTCPay Config] Missing environment variables:', {
        serverUrl: !!config.serverUrl,
        apiKey: !!config.apiKey,
        storeId: !!config.storeId
      });

      return res.status(500).json({
        error: 'BTCPay configuration incomplete',
        message: 'Please configure BTCPAY_SERVER_URL, BTCPAY_API_KEY, and BTCPAY_STORE_ID in Vercel environment variables'
      });
    }

    console.log('[BTCPay Config] ✅ Configuration loaded successfully');

    return res.status(200).json(config);

  } catch (error) {
    console.error('[BTCPay Config] ❌ Error:', error);
    return res.status(500).json({
      error: 'Failed to load configuration',
      message: error.message
    });
  }
}
