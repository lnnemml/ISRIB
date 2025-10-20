// /api/cart-recovery.js
import { Resend } from 'resend';
import { Redis } from '@upstash/redis';

const resend = new Resend(process.env.RESEND_API_KEY);
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
    stage,
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
        has2h: !!rec.twoH, 
        has24h: !!rec.day1
      });

      let cancelledCount = 0;

      if (rec?.twoH) {
        try {
          await resend.emails.cancel(rec.twoH);
          console.log('[Cart Recovery] ✅ Canceled 2h email:', rec.twoH);
          cancelledCount++;
        } catch (err) {
          console.error('[Cart Recovery] ❌ Failed to cancel 2h:', err.message);
        }
      }

      if (rec?.day1) {
        try {
          await resend.emails.cancel(rec.day1);
          console.log('[Cart Recovery] ✅ Canceled 24h email:', rec.day1);
          cancelledCount++;
        } catch (err) {
          console.error('[Cart Recovery] ❌ Failed to cancel 24h:', err.message);
        }
      }

      await kv.del(`cart_recovery:${keyEmail}`);
      console.log('[Cart Recovery] ✅ Deleted Redis key for:', keyEmail);

      return res.status(200).json({ 
        ok: true, 
        cancelled: true,
        cancelledCount,
        message: `Successfully cancelled ${cancelledCount} email(s)`
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

  if (!Array.isArray(cartItems) || (cartItems.length === 0 && action !== 'immediate')) {
    return res.status(400).json({ error: 'Missing or empty cartItems' });
  }

  const subtotal = cartItems.reduce((s, i) => 
    s + Number(i.price || 0) * Number(i.count || 1), 0
  );

  const subjects = {
    immediate: 'Your ISRIB research order is ready',
    '2h': 'Complete your ISRIB order — Free shipping included',
    '24h': 'Your reserved research chemicals are waiting',
  };

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
      const now = Date.now();
      const in2hISO  = new Date(now +  2 * 60 * 60 * 1000).toISOString();
      const in24hISO = new Date(now + 24 * 60 * 60 * 1000).toISOString();

      let resp2h = null;

      if (!only24h) {
        try {
          resp2h = await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: rawEmail,
            subject: subjects['2h'],
            replyTo: 'isrib.shop@protonmail.com',
            headers: {
              'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(rawEmail)}>`,
            },
            html: generateRecoveryEmail(cartItems, subtotal, firstName, '2h', rawEmail),
            tags: [
              { name: 'category', value: 'cart_recovery' }, 
              { name: 'stage', value: '2h' }
            ],
            scheduledAt: in2hISO,
          });
          console.log('[Cart Recovery] ✅ Scheduled 2h email:', resp2h.id);
        } catch (err) {
          console.error('[Cart Recovery] ❌ Failed to schedule 2h:', err);
        }
      }

      let resp24 = null;
      try {
        resp24 = await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: rawEmail,
          subject: subjects['24h'],
          replyTo: 'isrib.shop@protonmail.com',
          headers: {
            'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(rawEmail)}>`,
          },
          html: generateRecoveryEmail(cartItems, subtotal, firstName, '24h', rawEmail),
          tags: [
            { name: 'category', value: 'cart_recovery' }, 
            { name: 'stage', value: '24h' }
          ],
          scheduledAt: in24hISO,
        });
        console.log('[Cart Recovery] ✅ Scheduled 24h email:', resp24.id);
      } catch (err) {
        console.error('[Cart Recovery] ❌ Failed to schedule 24h:', err);
      }

      await kv.set(`cart_recovery:${keyEmail}`, {
        twoH: resp2h?.id || null,
        day1: resp24?.id || null,
        createdAt: new Date().toISOString(),
        subtotal,
      });

      console.log('[Cart Recovery] ✅ Saved to Redis:', {
        key: `cart_recovery:${keyEmail}`,
        twoH: resp2h?.id || null,
        day1: resp24?.id || null
      });

      return res.status(200).json({
        ok: true,
        scheduled: true,
        ids: { 
          twoH: resp2h?.id || null, 
          day1: resp24?.id || null 
        },
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
  // ACTION: IMMEDIATE
  // ============================================================================
  try {
    const subj = subjects[stage] || subjects.immediate;
    
    const resp = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: rawEmail,
      subject: subj,
      replyTo: 'isrib.shop@protonmail.com',
      headers: {
        'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(rawEmail)}>`,
      },
      html: generateRecoveryEmail(cartItems, subtotal, firstName, stage || 'immediate', rawEmail),
      tags: [
        { name: 'category', value: 'cart_recovery' }, 
        { name: 'stage', value: stage || 'immediate' }
      ],
    });

    console.log('[Cart Recovery] ✅ Sent immediate email:', resp.id);

    return res.status(200).json({ 
      ok: true, 
      sentId: resp?.id || null
    });

  } catch (err) {
    console.error('[Cart Recovery] ❌ Immediate send error:', err);
    return res.status(500).json({ 
      error: err.message
    });
  }
}

// ============================================================================
// Email template
// ============================================================================
function generateRecoveryEmail(cartItems, subtotal, firstName, stage, email) {
  const itemsHtml = (cartItems || []).map(item => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 8px;">
        <span style="font-weight:600;color:#1e293b;">${item.name}</span>
      </td>
      <td style="padding:12px 8px;text-align:center;color:#64748b;">${item.display}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:600;color:#1e293b;">
        $${Number(item.price || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const urgencyBlock = stage === '24h'
    ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;margin:24px 0;border-radius:4px;">
         <p style="margin:0;font-weight:600;color:#1e3a8a;font-size:15px;">📋 Order reminder</p>
         <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5;">
           Complete your checkout to proceed with shipping. Your items remain reserved.
         </p>
       </div>`
    : `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;margin:24px 0;border-radius:4px;">
         <p style="margin:0;font-weight:600;color:#14532d;font-size:15px;">✓ Ready to ship</p>
         <p style="margin:8px 0 0;color:#475569;font-size:14px;line-height:1.5;">
           All items in stock • Free shipping worldwide
         </p>
       </div>`;

  return `
    <!doctype html>
    <html>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" 
                   style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05);">
              
              <tr>
                <td style="background:#111827;padding:28px 24px;text-align:center;color:#fff;font-weight:800;font-size:20px;">
                  ISRIB.shop
                </td>
              </tr>
              
              <tr>
                <td style="padding:28px 24px;">
                  <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">
                    Hi ${firstName || 'there'},
                  </h2>
                  <p style="margin:0 0 16px;color:#475569;line-height:1.6;font-size:15px;">
                    You have <strong>${cartItems.length}</strong> item${cartItems.length > 1 ? 's' : ''} waiting in your cart.
                  </p>
                  
                  ${urgencyBlock}
                  
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" 
                         style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th style="padding:10px 8px;text-align:left;color:#475569;font-size:13px;">Product</th>
                        <th style="padding:10px 8px;text-align:center;color:#475569;font-size:13px;">Quantity</th>
                        <th style="padding:10px 8px;text-align:right;color:#475569;font-size:13px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr style="background:#f8fafc;">
                        <td colspan="2" style="padding:12px 8px;font-weight:700;color:#1e293b;">Total:</td>
                        <td style="padding:12px 8px;text-align:right;font-weight:800;color:#10b981;font-size:18px;">
                          $${subtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  <div style="text-align:center;margin:24px 0;">
                    <a href="https://isrib.shop/checkout.html?recovery=true&promo=RETURN15" 
                       style="display:inline-block;background:#10b981;color:#fff;padding:14px 36px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">
                      Complete your order →
                    </a>
                  </div>
                  
                  <p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">
                    <a href="https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}" 
                       style="color:#64748b;text-decoration:underline;">Unsubscribe</a> •
                    <a href="https://isrib.shop/privacy.html" 
                       style="color:#64748b;text-decoration:none;">Privacy</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
}
