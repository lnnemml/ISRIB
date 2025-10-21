// api/cart-recovery.js (з максимальним логуванням)
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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
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
      console.warn('[Cart Recovery] Invalid email for cancel:', rawEmail);
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid email'
      });
    }

    try {
      const deleted = await kv.del(`cart_recovery:${keyEmail}`);
      console.log('[Cart Recovery] ✅ Deleted Redis key for:', keyEmail);

      return res.status(200).json({ 
        ok: true, 
        cancelled: true,
        message: 'Cart recovery cancelled'
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
      const siteUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : (process.env.SITE_URL || 'https://isrib.shop');

      console.log('═══════════════════════════════════════');
      console.log('[DEBUG] Environment Check:');
      console.log('  VERCEL_URL:', process.env.VERCEL_URL);
      console.log('  SITE_URL:', process.env.SITE_URL);
      console.log('  Using:', siteUrl);
      console.log('  QStash Token exists:', !!process.env.QSTASH_TOKEN);
      console.log('  Token length:', process.env.QSTASH_TOKEN?.length);
      console.log('  Token preview:', process.env.QSTASH_TOKEN?.substring(0, 30) + '...');
      console.log('═══════════════════════════════════════');

      // Зберігаємо в Redis
      await kv.set(`cart_recovery:${keyEmail}`, {
        email: keyEmail,
        cartItems,
        firstName,
        subtotal,
        createdAt: new Date().toISOString(),
      });

      console.log('[Cart Recovery] ✅ Saved to Redis');

      const TWO_HOURS = 2 * 60 * 60;
      const TWENTYFOUR_HOURS = 24 * 60 * 60;

      // ========== 2H SCHEDULE ==========
      console.log('\n[DEBUG] 🚀 Scheduling 2h followup...');
      console.log('  URL:', `${siteUrl}/api/followup`);
      console.log('  Delay:', TWO_HOURS, 'seconds');
      console.log('  Body:', JSON.stringify({ email: keyEmail, stage: '2h' }));

      let schedule2h;
      try {
        // Спроба 1: publishJSON
        schedule2h = await qstash.publishJSON({
          url: `${siteUrl}/api/followup`,
          body: { email: keyEmail, stage: '2h' },
          delay: TWO_HOURS,
          retries: 0,
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('[DEBUG] ✅ 2h Response:', JSON.stringify(schedule2h, null, 2));
        
      } catch (error2h) {
        console.error('[DEBUG] ❌ 2h publishJSON failed:', error2h.message);
        console.error('[DEBUG] Error details:', {
          name: error2h.name,
          message: error2h.message,
          status: error2h.response?.status,
          statusText: error2h.response?.statusText,
          data: error2h.response?.data
        });
        
        // Спроба 2: publish
        console.log('[DEBUG] 🔄 Trying with publish() instead...');
        try {
          schedule2h = await qstash.publish({
            url: `${siteUrl}/api/followup`,
            body: JSON.stringify({ email: keyEmail, stage: '2h' }),
            delay: TWO_HOURS,
            retries: 0,
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('[DEBUG] ✅ 2h Response (publish):', JSON.stringify(schedule2h, null, 2));
        } catch (error2) {
          console.error('[DEBUG] ❌ 2h publish also failed:', error2.message);
          throw error2h; // кидаємо першу помилку
        }
      }

      // ========== 24H SCHEDULE ==========
      console.log('\n[DEBUG] 🚀 Scheduling 24h followup...');
      console.log('  URL:', `${siteUrl}/api/followup`);
      console.log('  Delay:', TWENTYFOUR_HOURS, 'seconds');

      let schedule24h;
      try {
        schedule24h = await qstash.publishJSON({
          url: `${siteUrl}/api/followup`,
          body: { email: keyEmail, stage: '24h' },
          delay: TWENTYFOUR_HOURS,
          retries: 0,
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('[DEBUG] ✅ 24h Response:', JSON.stringify(schedule24h, null, 2));
        
      } catch (error24h) {
        console.error('[DEBUG] ❌ 24h publishJSON failed:', error24h.message);
        
        console.log('[DEBUG] 🔄 Trying with publish() instead...');
        try {
          schedule24h = await qstash.publish({
            url: `${siteUrl}/api/followup`,
            body: JSON.stringify({ email: keyEmail, stage: '24h' }),
            delay: TWENTYFOUR_HOURS,
            retries: 0,
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('[DEBUG] ✅ 24h Response (publish):', JSON.stringify(schedule24h, null, 2));
        } catch (error2) {
          console.error('[DEBUG] ❌ 24h publish also failed:', error2.message);
          throw error24h;
        }
      }

      console.log('═══════════════════════════════════════');
      console.log('[DEBUG] ✅ Both schedules created');
      console.log('═══════════════════════════════════════\n');

      return res.status(200).json({
        ok: true,
        scheduled: true,
        qstash: {
          twoH: schedule2h?.messageId || schedule2h,
          twentyFourH: schedule24h?.messageId || schedule24h
        },
        debug: {
          site_url: siteUrl,
          followup_endpoint: `${siteUrl}/api/followup`,
          token_length: process.env.QSTASH_TOKEN?.length,
          redis_url: process.env.UPSTASH_REDIS_REST_URL
        },
        message: 'Cart recovery scheduled via QStash'
      });

    } catch (error) {
      console.error('\n═══════════════════════════════════════');
      console.error('[DEBUG] ❌ CRITICAL ERROR');
      console.error('  Message:', error.message);
      console.error('  Name:', error.name);
      console.error('  Stack:', error.stack);
      
      if (error.response) {
        console.error('  HTTP Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Response Data:', JSON.stringify(error.response.data, null, 2));
        console.error('  Response Headers:', error.response.headers);
      }
      console.error('═══════════════════════════════════════\n');
      
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to schedule emails',
        details: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  }

  return res.status(400).json({ 
    error: 'Invalid action. Use "schedule" or "cancel".' 
  });
}
