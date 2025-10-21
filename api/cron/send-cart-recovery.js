import { Resend } from 'resend';
import { Redis } from '@upstash/redis';

const resend = new Resend(process.env.RESEND_API_KEY);
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ============================================================================
// Helper: Generate recovery email HTML
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

// ============================================================================
// Main Cron Handler
// ============================================================================
export default async function handler(req, res) {
  // 🔒 Security: Only allow Vercel Cron to call this
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[Cron] ❌ Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Cron] 🚀 Starting cart recovery check...');

  try {
    const now = Date.now();
    
    // Get all cart recovery keys from Redis
    const keys = await kv.keys('cart_recovery:*');
    
    console.log('[Cron] 📋 Found', keys.length, 'cart recovery records');

    let sent2h = 0;
    let sent24h = 0;
    let cleaned = 0;
    let skipped = 0;

    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const TWENTYFOUR_HOURS = 24 * 60 * 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000; // Grace period для Hobby плану

    for (const key of keys) {
      const rec = await kv.get(key);
      if (!rec) continue;

      const createdAt = new Date(rec.createdAt).getTime();
      const elapsed = now - createdAt;

      // Cleanup old records (>7 days)
      if (elapsed > SEVEN_DAYS) {
        await kv.del(key);
        cleaned++;
        console.log('[Cron] 🗑️ Cleaned up old record:', rec.email);
        continue;
      }

      // Send 2h email (within 5-minute window)
      if (!rec.sent2h && elapsed >= TWO_HOURS && elapsed < (TWO_HOURS + ONE_HOUR)) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: rec.email,
            subject: 'Complete your ISRIB order — Free shipping included',
            replyTo: 'isrib.shop@protonmail.com',
            headers: {
              'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(rec.email)}>`,
            },
            html: generateRecoveryEmail(rec.cartItems || [], rec.subtotal || 0, rec.firstName || '', '2h', rec.email),
            tags: [
              { name: 'category', value: 'cart_recovery' }, 
              { name: 'stage', value: '2h' }
            ]
          });

          // Mark as sent in Redis
          await kv.set(key, { ...rec, sent2h: true, sent2hAt: new Date().toISOString() });
          sent2h++;
          
          console.log('[Cron] ✅ Sent 2h email to:', rec.email);
        } catch (err) {
          console.error('[Cron] ❌ Failed to send 2h email to', rec.email, ':', err.message);
        }
      }

      // Send 24h email (within 5-minute window)
      if (!rec.sent24h && elapsed >= TWENTYFOUR_HOURS && elapsed < (TWENTYFOUR_HOURS + ONE_HOUR)) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: rec.email,
            subject: 'Your reserved research chemicals are waiting',
            replyTo: 'isrib.shop@protonmail.com',
            headers: {
              'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(rec.email)}>`,
            },
            html: generateRecoveryEmail(rec.cartItems || [], rec.subtotal || 0, rec.firstName || '', '24h', rec.email),
            tags: [
              { name: 'category', value: 'cart_recovery' }, 
              { name: 'stage', value: '24h' }
            ]
          });

          // Mark as sent in Redis
          await kv.set(key, { ...rec, sent24h: true, sent24hAt: new Date().toISOString() });
          sent24h++;
          
          console.log('[Cron] ✅ Sent 24h email to:', rec.email);
        } catch (err) {
          console.error('[Cron] ❌ Failed to send 24h email to', rec.email, ':', err.message);
        }
      }

      // Count skipped (not ready to send yet)
      if (!rec.sent2h && elapsed < TWO_HOURS) {
        skipped++;
      }
    }

    const summary = {
      ok: true,
      timestamp: new Date().toISOString(),
      processed: keys.length,
      sent2h,
      sent24h,
      cleaned,
      skipped,
      nextRun: 'in 5 minutes'
    };

    console.log('[Cron] ✅ Completed:', summary);

    return res.status(200).json(summary);

  } catch (error) {
    console.error('[Cron] ❌ Fatal error:', error);
    return res.status(500).json({ 
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
