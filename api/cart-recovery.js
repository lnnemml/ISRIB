import { Resend } from 'resend';
import unsubscribeStore from '../lib/unsubscribe-store.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, cartItems, firstName, stage } = JSON.parse(await readBody(req));

    if (!email || !cartItems?.length) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Unsubscribe guard (як у тебе)
    const isUnsubscribed = await unsubscribeStore.has(email);
    if (isUnsubscribed) {
      return res.status(200).json({ ok: true, skipped: true, message: 'Email is unsubscribed' });
    }

    const subtotal = cartItems.reduce((s, i) => s + (i.price * i.count), 0);

    const subjects = {
      immediate: 'Your ISRIB research order is ready',
      '2h': 'Complete your ISRIB order — Free shipping included',
      '24h': 'Your reserved research materials are waiting'
    };

    // ✨ НОВЕ: якщо stage === 'schedule' → плануємо 2 листи
    if (stage === 'schedule') {
      const now = new Date();
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // 2 години
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: subjects['2h'],
        replyTo: 'isrib.shop@protonmail.com',
        headers: {
          'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        html: generateRecoveryEmail(cartItems, subtotal, firstName, '2h', email),
        tags: [{ name: 'category', value: 'cart_recovery' }, { name: 'stage', value: '2h' }],
        scheduledAt: in2h
      });

      // 24 години
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: subjects['24h'],
        replyTo: 'isrib.shop@protonmail.com',
        headers: {
          'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        html: generateRecoveryEmail(cartItems, subtotal, firstName, '24h', email),
        tags: [{ name: 'category', value: 'cart_recovery' }, { name: 'stage', value: '24h' }],
        scheduledAt: in24h
      });

      return res.status(200).json({ ok: true, scheduled: true });
    }

    // ⬇️ Інакше залишаємо твою існуючу поведінку (immediate/2h/24h ручні виклики)
    const subject = subjects[stage] || subjects.immediate;

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject,
      replyTo: 'isrib.shop@protonmail.com',
      headers: {
        'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      },
      html: generateRecoveryEmail(cartItems, subtotal, firstName, stage, email),
      tags: [{ name: 'category', value: 'cart_recovery' }, { name: 'stage', value: stage || 'immediate' }]
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Cart recovery error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function generateRecoveryEmail(cartItems, subtotal, firstName, stage, email) {
  const itemsHtml = cartItems.map(item => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 8px;">
        <span style="font-weight:600;color:#1e293b;">${item.name}</span>
      </td>
      <td style="padding:12px 8px;text-align:center;color:#64748b;">${item.display}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:600;color:#1e293b;">$${item.price.toFixed(2)}</td>
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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order is Waiting</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:20px 0;">
        <tr>
          <td align="center">
            
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 24px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">ISRIB.shop</h1>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">Research Chemicals</p>
                </td>
              </tr>

              <tr>
                <td style="padding:32px 24px;">
                  
                  <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">
                    Hi ${firstName || 'there'},
                  </h2>
                  
                  <p style="margin:0 0 24px;color:#475569;line-height:1.6;font-size:15px;">
                    We noticed you have <strong style="color:#1e293b;">${cartItems.length} item${cartItems.length > 1 ? 's' : ''}</strong> waiting in your cart. 
                    Your research chemicals are reserved and ready for shipment.
                  </p>

                  ${urgencyBlock}

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:24px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th style="padding:12px 8px;text-align:left;font-weight:600;color:#475569;font-size:13px;">Product</th>
                        <th style="padding:12px 8px;text-align:center;font-weight:600;color:#475569;font-size:13px;">Quantity</th>
                        <th style="padding:12px 8px;text-align:right;font-weight:600;color:#475569;font-size:13px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr style="background:#f8fafc;">
                        <td colspan="2" style="padding:16px 8px;font-weight:700;color:#1e293b;">Total:</td>
                        <td style="padding:16px 8px;text-align:right;font-weight:800;color:#10b981;font-size:18px;">$${subtotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:8px;margin:24px 0;border:1px solid #fde047;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 8px;color:#713f12;font-weight:600;font-size:14px;">✨ Special offer:</p>
                        <p style="margin:0;color:#854d0e;font-size:14px;">
                          Use code <span style="background:#ffffff;padding:3px 10px;border-radius:4px;font-family:monospace;font-weight:700;">RETURN15</span> for <strong>15% off</strong>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:32px 0;">
                        <a href="https://isrib.shop/checkout.html?recovery=true&promo=RETURN15" 
                           style="display:inline-block;background:#10b981;color:#ffffff;padding:16px 48px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
                          Complete Your Order →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;">
                    Questions? Reply to this email or contact us at<br>
                    <a href="mailto:isrib.shop@protonmail.com" style="color:#0ea5e9;text-decoration:none;">isrib.shop@protonmail.com</a>
                  </p>

                </td>
              </tr>

              <tr>
                <td style="padding:24px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0 0 12px;color:#64748b;font-size:13px;">
                    <strong>For research use only.</strong><br>
                    Not intended for human consumption.
                  </p>
                  <p style="margin:0;color:#94a3b8;font-size:11px;">
                    <a href="https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> • 
                    <a href="https://isrib.shop/privacy.html" style="color:#64748b;">Privacy</a> • 
                    © 2025 ISRIB.shop
                  </p>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

export const config = { 
  api: { 
    bodyParser: false 
  } 
};
