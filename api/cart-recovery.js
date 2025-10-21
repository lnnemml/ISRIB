// api/cart-recovery.js
import { Redis } from '@upstash/redis';
import { Client } from '@upstash/qstash';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
});

export const config = { api: { bodyParser: false } };

// ============================================================================
// Нормалізація email
// ============================================================================
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// ============================================================================
// Основний handler
// ============================================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let raw = '';
  await new Promise((resolve) => {
    req.on('data', (c) => raw += c);
    req.on('end', resolve);
  });

  let payload = {};
  try { 
    payload = JSON.parse(raw || '{}'); 
  } catch (parseError) {
    console.error('[Cart Recovery] JSON parse error:', parseError);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const {
    action = 'schedule',
    email = '',
    cartItems = [],
    firstName = '',
  } = payload;

  const rawEmail = String(email || '');
  const keyEmail = normalizeEmail(rawEmail);

  // ============================================================================
  // ACTION: CANCEL
  // ============================================================================
  if (action === 'cancel') {
    console.log('[Cart Recovery] 🔴 Cancel request for:', keyEmail);
    
    if (!keyEmail || !keyEmail.includes('@')) {
      console.warn('[Cart Recovery] Invalid email for cancel:', rawEmail);
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid email'
      });
    }

    try {
      // Просто видаляємо ключ з Redis
      // QStash endpoints перевірять і не надішлють
      const deleted = await kv.del(`cart_recovery:${keyEmail}`);
      
      console.log('[Cart Recovery] ✅ Deleted Redis key for:', keyEmail);

      return res.status(200).json({ 
        ok: true, 
        cancelled: true,
        message: 'Cart recovery cancelled (key deleted from Redis)'
      });

    } catch (error) {
      console.error('[Cart Recovery] ❌ Cancel error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to cancel emails'
      });
    }
  }

  // ============================================================================
  // Валідація
  // ============================================================================
  if (!keyEmail || !keyEmail.includes('@')) {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Missing or empty cartItems' });
  }

  const subtotal = cartItems.reduce((s, i) => 
    s + Number(i.price || 0) * Number(i.count || 1), 0
  );

  // ============================================================================
  // ACTION: SCHEDULE
  // ============================================================================
  if (action === 'schedule') {
    console.log('[Cart Recovery] 📅 Schedule request:', {
      email: keyEmail,
      itemCount: cartItems.length,
      subtotal
    });

    try {
      // 🔧 Правильне визначення siteUrl
      const siteUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : (process.env.SITE_URL || 'https://isrib.shop');

      console.log('[Cart Recovery] 🌐 Site URL:', siteUrl);
      console.log('[Cart Recovery] 🔑 QStash token exists:', !!process.env.QSTASH_TOKEN);
      console.log('[Cart Recovery] 🔑 Token preview:', process.env.QSTASH_TOKEN?.substring(0, 20) + '...');

      // 🎯 Зберігаємо дані в Redis
      await kv.set(`cart_recovery:${keyEmail}`, {
        email: keyEmail,
        cartItems,
        firstName,
        subtotal,
        createdAt: new Date().toISOString(),
      });

      console.log('[Cart Recovery] ✅ Saved to Redis:', keyEmail);

      // 🚀 Плануємо 2 QStash виклики
      const TWO_HOURS = 2 * 60 * 60; // seconds
      const TWENTYFOUR_HOURS = 24 * 60 * 60; // seconds

      console.log('[Cart Recovery] 📤 Attempting to schedule 2h followup...');
      
      // Schedule 2h followup
      const schedule2h = await qstash.publishJSON({
        url: `${siteUrl}/api/followup`,
        body: {
          email: keyEmail,
          stage: '2h'
        },
        delay: TWO_HOURS,
        retries: 0,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[Cart Recovery] ✅ Scheduled 2h:', JSON.stringify(schedule2h, null, 2));

      console.log('[Cart Recovery] 📤 Attempting to schedule 24h followup...');

      // Schedule 24h followup
      const schedule24h = await qstash.publishJSON({
        url: `${siteUrl}/api/followup`,
        body: {
          email: keyEmail,
          stage: '24h'
        },
        delay: TWENTYFOUR_HOURS,
        retries: 0,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[Cart Recovery] ✅ Scheduled 24h:', JSON.stringify(schedule24h, null, 2));

      return res.status(200).json({
        ok: true,
        scheduled: true,
        qstash: {
          twoH: schedule2h.messageId,
          twentyFourH: schedule24h.messageId
        },
        debug: {
          site_url: siteUrl,
          followup_endpoint: `${siteUrl}/api/followup`
        },
        message: 'Cart recovery scheduled via QStash'
      });

    } catch (error) {
      console.error('[Cart Recovery] ❌ Schedule error:', error);
      console.error('[Cart Recovery] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to schedule emails',
        details: error.message,
        response: error.response?.data || 'No response data'
      });
    }
  }

  return res.status(400).json({ 
    error: 'Invalid action. Use "schedule" or "cancel".' 
  });
}
