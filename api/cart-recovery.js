import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory unsubscribe list (для production використовуйте DB)
const unsubscribeList = new Set();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, cartItems, firstName, stage } = JSON.parse(await readBody(req));

    if (!email || !cartItems?.length) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // ⚡ КРИТИЧНО: Перевірка чи користувач не відписався
    if (isUnsubscribed(email)) {
      console.log('[Cart Recovery] Email is unsubscribed:', email);
      return res.status(200).json({ 
        ok: true, 
        skipped: true,
        message: 'Email is unsubscribed' 
      });
    }

    const subtotal = cartItems.reduce((s, i) => s + (i.price * i.count), 0);

    const subjects = {
      immediate: 'Your ISRIB research order is ready',
      '2h': 'Complete your ISRIB order — Free shipping included',
      '24h': 'Your reserved research materials are waiting'
    };

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
      tags: [
        { name: 'category', value: 'cart_recovery' },
        { name: 'stage', value: stage }
      ]
    });

    console.log('[Cart Recovery] Email sent:', email, stage);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Cart recovery error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function isUnsubscribed(email) {
  const normalized = email.trim().toLowerCase();
  return unsubscribeList.has(normalized);
}

// Функція для додавання в unsubscribe list (викликається з /api/unsubscribe)
export function addToUnsubscribeList(email) {
  const normalized = email.trim().toLowerCase();
  unsubscribeList.add(normalized);
  console.log('[Unsubscribe] Added:', normalized, 'Total:', unsubscribeList.size);
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
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>Your Order is Waiting</title>
      <style>
        @media only screen and (max-width: 600px) {
          .mobile-padding { padding: 16px !important; }
          .mobile-text { font-size: 14px !important; }
          .button { padding: 14px 32px !important; font-size: 15px !important; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f8fafc;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:20px 0;">
        <tr>
          <td align="center">
            
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 24px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">ISRIB.shop</h1>
                  <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;font-weight:500;">Research Chemicals</p>
                </td>
              </tr>

              <tr>
                <td class="mobile-padding" style="padding:32px 24px;">
                  
                  <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;line-height:1.3;">
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
                        <th style="padding:12px 8px;text-align:left;font-weight:600;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Product</th>
                        <th style="padding:12px 8px;text-align:center;font-weight:600;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Quantity</th>
                        <th style="padding:12px 8px;text-align:right;font-weight:600;color:#475569;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr style="background:#f8fafc;">
                        <td colspan="2" style="padding:16px 8px;font-weight:700;color:#1e293b;border-top:2px solid #e5e7eb;">Total:</td>
                        <td style="padding:16px 8px;text-align:right;font-weight:800;color:#10b981;font-size:18px;border-top:2px solid #e5e7eb;">$${subtotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:8px;margin:24px 0;border:1px solid #fde047;overflow:hidden;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 8px;color:#713f12;font-weight:600;font-size:14px;">✨ Special offer for you:</p>
                        <p style="margin:0;color:#854d0e;font-size:14px;line-height:1.5;">
                          Use code <span style="background:#ffffff;padding:3px 10px;border-radius:4px;font-family:'Courier New',monospace;font-weight:700;color:#92400e;">RETURN15</span> for <strong>15% off</strong> your order
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:32px 0;">
                        <a href="https://isrib.shop/checkout.html?recovery=true&promo=RETURN15" 
                           class="button"
                           style="display:inline-block;background:#10b981;color:#ffffff;padding:16px 48px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;box-shadow:0 4px 6px rgba(16,185,129,0.2);transition:background 0.2s;">
                          Complete Your Order →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;line-height:1.5;">
                    Questions about your order? Reply to this email or contact us at<br>
                    <a href="mailto:isrib.shop@protonmail.com" style="color:#0ea5e9;text-decoration:none;font-weight:500;">isrib.shop@protonmail.com</a>
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
                    <tr>
                      <td style="padding:20px;">
                        <p style="margin:0 0 12px;font-weight:600;color:#1e293b;font-size:14px;">What's included:</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:6px 0;color:#475569;font-size:14px;line-height:1.6;">✓ Certificate of Analysis (COA) per batch</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;color:#475569;font-size:14px;line-height:1.6;">✓ Free worldwide shipping</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;color:#475569;font-size:14px;line-height:1.6;">✓ Discreet, secure packaging</td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;color:#475569;font-size:14px;line-height:1.6;">✓ Email & messenger support</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <tr>
                <td style="padding:24px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">
                    <strong>For research use only.</strong><br>
                    Not intended for human consumption, clinical or veterinary use.
                  </p>
                  <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
                    <a href="https://isrib.shop/unsubscribe?email=${encodeURIComponent(email)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> • 
                    <a href="https://isrib.shop/privacy.html" style="color:#64748b;text-decoration:underline;">Privacy</a> • 
                    <a href="https://isrib.shop/terms.html" style="color:#64748b;text-decoration:underline;">Terms</a><br>
                    © 2025 ISRIB.shop • All rights reserved
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
