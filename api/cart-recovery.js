// api/cart-recovery.js
// ПРОСТИЙ підхід з direct HTTP calls до QStash
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const config = { api: { bodyParser: false } };

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Функція для створення QStash schedule через HTTP API
async function scheduleEmail(email, stage, delay) {
  const siteUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://isrib.shop';

  const qstashUrl = 'https://qstash.upstash.io/v2/publish';
  const targetUrl = `${siteUrl}/api/followup`;

  console.log(`[QStash] Scheduling ${stage} email...`);
  console.log('  Target URL:', targetUrl);
  console.log('  Delay:', delay, 'seconds');

  const response = await fetch(`${qstashUrl}/${encodeURIComponent(targetUrl)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Delay': `${delay}s`,
      'Upstash-Retries': '0'
    },
    body: JSON.stringify({
      email,
      stage
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[QStash] Schedule failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`QStash failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('[QStash] Success:', result);
  return result;
}

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
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid email'
      });
    }

    try {
      await kv.del(`cart_recovery:${keyEmail}`);
      console.log('[Cart Recovery] ✅ Deleted Redis key');

      return res.status(200).json({ 
        ok: true, 
        cancelled: true
      });

    } catch (error) {
      console.error('[Cart Recovery] ❌ Cancel error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to cancel'
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
      // Зберігаємо в Redis
      await kv.set(`cart_recovery:${keyEmail}`, {
        email: keyEmail,
        cartItems,
        firstName,
        subtotal,
        createdAt: new Date().toISOString(),
      });

      console.log('[Cart Recovery] ✅ Saved to Redis');

      // Плануємо emails через QStash HTTP API
      const TWO_HOURS = 2 * 60 * 60;
      const TWENTYFOUR_HOURS = 24 * 60 * 60;

      // Schedule 2h
      const schedule2h = await scheduleEmail(keyEmail, '2h', TWO_HOURS);
      
      // Schedule 24h
      const schedule24h = await scheduleEmail(keyEmail, '24h', TWENTYFOUR_HOURS);

      return res.status(200).json({
        ok: true,
        scheduled: true,
        qstash: {
          twoH: schedule2h.messageId,
          twentyFourH: schedule24h.messageId
        },
        message: 'Cart recovery scheduled via QStash HTTP API'
      });

    } catch (error) {
      console.error('[Cart Recovery] ❌ Error:', error);
      
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to schedule',
        details: error.message
      });
    }
  }

  return res.status(400).json({ 
    error: 'Invalid action'
  });
}
