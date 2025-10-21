// /api/cart-recovery.js
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
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
    only24h = false,
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
      const rec = await kv.get(`cart_recovery:${keyEmail}`);
      
      if (!rec) {
        console.log('[Cart Recovery] ⚠️ No scheduled emails found for:', keyEmail);
        return res.status(200).json({ 
          ok: true, 
          cancelled: false, 
          message: 'No scheduled emails found'
        });
      }

      console.log('[Cart Recovery] Found record:', { 
        email: keyEmail,
        sent2h: rec.sent2h || false,
        sent24h: rec.sent24h || false
      });

      // Просто видаляємо з Redis — cron не відправить emails
      await kv.del(`cart_recovery:${keyEmail}`);
      console.log('[Cart Recovery] ✅ Deleted Redis key for:', keyEmail);

      return res.status(200).json({ 
        ok: true, 
        cancelled: true,
        message: 'Successfully cancelled cart recovery emails'
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
      only24h,
      itemCount: cartItems.length,
      subtotal
    });

    try {
      // 🎯 Просто зберігаємо в Redis — cron job відправить emails
      await kv.set(`cart_recovery:${keyEmail}`, {
        email: keyEmail,
        cartItems,
        firstName,
        subtotal,
        only24h,
        sent2h: false,
        sent24h: false,
        createdAt: new Date().toISOString(),
      });

      console.log('[Cart Recovery] ✅ Saved to Redis:', {
        key: `cart_recovery:${keyEmail}`,
        only24h
      });

      return res.status(200).json({
        ok: true,
        scheduled: true,
        message: 'Cart recovery scheduled via cron job'
      });

    } catch (error) {
      console.error('[Cart Recovery] ❌ Schedule error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to schedule emails'
      });
    }
  }

  // ============================================================================
  // Якщо жоден action не підійшов
  // ============================================================================
  return res.status(400).json({ 
    error: 'Invalid action. Use "schedule" or "cancel".' 
  });
}
