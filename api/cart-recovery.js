import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, cartItems, stage } = JSON.parse(await readBody(req));

    if (!email || !cartItems?.length) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Формуємо HTML з товарами
    const itemsHtml = cartItems.map(item => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${item.name}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${item.display}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${item.price}</td>
      </tr>
    `).join('');

    const subtotal = cartItems.reduce((s, i) => s + (i.price * i.count), 0);

    const subject = stage === '2h' 
      ? '⏰ Your ISRIB research order is waiting'
      : '🚨 Last chance — Free shipping expires in 24h';

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e293b;">Hi there,</h2>
        <p>You left <strong>${cartItems.length} item(s)</strong> in your cart:</p>
        
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Product</th>
              <th style="padding:8px;border:1px solid #e5e7eb;">Quantity</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <p style="font-size:18px;font-weight:bold;color:#10b981;">
          Total: $${subtotal.toFixed(2)}
        </p>

        <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;font-weight:bold;color:#92400e;">
            ${stage === '2h' 
              ? '🚚 Complete your order in the next 24 hours for FREE worldwide shipping' 
              : '⚠️ This is your last reminder — offer expires soon!'}
          </p>
        </div>

        <a href="https://isrib.shop/checkout.html" 
           style="display:inline-block;background:#1e293b;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;margin:20px 0;">
          Complete Checkout →
        </a>

        <p style="color:#64748b;font-size:13px;margin-top:30px;">
          Research use only. Not for human consumption.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject,
      html
    });

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Cart recovery error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

export const config = { api: { bodyParser: false } };
