// api/followup.js
import { Resend } from 'resend';
import { Redis } from '@upstash/redis';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

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

  const subject = stage === '24h' 
    ? 'Your reserved research chemicals are waiting'
    : 'Complete your ISRIB order — Free shipping included';

  return {
    subject,
    html: `
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
      </html>`
  };
}

// ============================================================================
// Main Handler (БЕЗ signature verification для діагностики)
// ============================================================================
async function handler(req, res) {
  console.log('\n═══════════════════════════════════════');
  console.log('[Followup] 📨 Received request');
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Headers:', JSON.stringify(req.headers, null, 2));
  console.log('═══════════════════════════════════════\n');
  
  if (req.method !== 'POST') {
    console.error('[Followup] ❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 🔧 ВИПРАВЛЕНО: Parse body правильно
    let raw = '';
    await new Promise((resolve) => {
      req.on('data', (c) => raw += c);
      req.on('end', resolve);
    });

    console.log('[Followup] Raw body:', raw);

    const { email, stage } = JSON.parse(raw || '{}');

    console.log('[Followup] Processing:', { email, stage });

    if (!email || !stage) {
      console.error('[Followup] Missing email or stage');
      return res.status(400).json({ error: 'Missing email or stage' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 🔍 Перевіряємо чи ключ ще існує в Redis
    const record = await kv.get(`cart_recovery:${normalizedEmail}`);

    if (!record) {
      console.log('[Followup] ✅ User completed checkout — skipping email');
      return res.status(200).json({ 
        ok: true, 
        sent: false,
        reason: 'User completed checkout'
      });
    }

    console.log('[Followup] 📧 Sending', stage, 'email to:', normalizedEmail);

    // 📧 Надсилаємо email
    const emailTemplate = generateRecoveryEmail(
      record.cartItems || [],
      record.subtotal || 0,
      record.firstName || '',
      stage,
      normalizedEmail
    );

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: normalizedEmail,
      subject: emailTemplate.subject,
      replyTo: 'isrib.shop@protonmail.com',
      headers: {
        'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(normalizedEmail)}>`,
      },
      html: emailTemplate.html,
      tags: [
        { name: 'category', value: 'cart_recovery' }, 
        { name: 'stage', value: stage }
      ]
    });

    console.log('[Followup] ✅ Email sent successfully');

    // Оновлюємо запис в Redis (позначаємо що відправили)
    await kv.set(`cart_recovery:${normalizedEmail}`, {
      ...record,
      [`sent${stage === '2h' ? '2h' : '24h'}`]: true,
      [`sent${stage === '2h' ? '2h' : '24h'}At`]: new Date().toISOString()
    });

    return res.status(200).json({ 
      ok: true, 
      sent: true,
      email: normalizedEmail,
      stage
    });

  } catch (error) {
    console.error('[Followup] ❌ Error:', error);
    return res.status(500).json({ 
      ok: false,
      error: error.message 
    });
  }
}

// 🔧 ТИМЧАСОВО БЕЗ SIGNATURE VERIFICATION (для тестування)
export default handler;

export const config = { api: { bodyParser: false } };
