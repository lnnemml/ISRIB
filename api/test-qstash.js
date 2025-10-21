// api/test-qstash.js
// Тестовий endpoint для перевірки QStash connection
import { Client } from '@upstash/qstash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('🧪 Testing QStash connection...');

  // Перевірка наявності токену
  const token = process.env.QSTASH_TOKEN;
  
  if (!token) {
    console.error('❌ QSTASH_TOKEN not found in environment');
    return res.status(500).json({ 
      error: 'QSTASH_TOKEN not configured',
      env_check: {
        QSTASH_TOKEN: 'missing',
        VERCEL_URL: process.env.VERCEL_URL || 'missing',
        SITE_URL: process.env.SITE_URL || 'missing'
      }
    });
  }

  console.log('✅ QSTASH_TOKEN found:', token.substring(0, 10) + '...');

  try {
    const qstash = new Client({ token });

    // Тестовий URL для schedule
    const siteUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.SITE_URL || 'https://isrib.shop');

    console.log('📍 Using site URL:', siteUrl);

    // Спроба створити тестовий schedule на 1 хвилину
    const testSchedule = await qstash.publishJSON({
      url: `${siteUrl}/api/test-qstash-receiver`,
      body: {
        test: true,
        timestamp: new Date().toISOString()
      },
      delay: 60, // 1 хвилина
      retries: 0,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Test schedule created:', testSchedule);

    return res.status(200).json({
      success: true,
      message: 'QStash connection successful',
      test_schedule: testSchedule,
      config: {
        site_url: siteUrl,
        token_preview: token.substring(0, 10) + '...'
      }
    });

  } catch (error) {
    console.error('❌ QStash error:', error);
    
    return res.status(500).json({
      error: 'QStash connection failed',
      message: error.message,
      details: error.response?.data || error.toString(),
      config: {
        token_exists: !!token,
        token_preview: token ? token.substring(0, 10) + '...' : 'none'
      }
    });
  }
}
