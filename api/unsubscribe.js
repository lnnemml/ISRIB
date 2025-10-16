import { Resend } from 'resend';
import { addToUnsubscribeList } from './cart-recovery.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Підтримка GET (для link clicks) та POST (для форми)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let email = '';

    if (req.method === 'GET') {
      // З URL параметрів (one-click unsubscribe)
      const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
      email = searchParams.get('email') || '';
    } else {
      // З POST body (форма)
      const body = JSON.parse(await readBody(req));
      email = body.email || '';
    }

    email = email.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        error: 'Invalid email address' 
      });
    }

    // ⚡ Додаємо в unsubscribe list (shared з cart-recovery)
    addToUnsubscribeList(email);

    // ⚡ Опціонально: видаляємо з Resend Audience (якщо використовуєте)
    try {
      const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
      if (AUDIENCE_ID) {
        await resend.contacts.remove({
          email,
          audienceId: AUDIENCE_ID
        });
      }
    } catch (e) {
      console.log('Resend contact removal skipped:', e.message);
    }

    // Підтверджувальний email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: 'You have been unsubscribed — ISRIB.shop',
        html: generateUnsubscribeConfirmation(email),
        tags: [
          { name: 'category', value: 'unsubscribe' }
        ]
      });
    } catch (e) {
      console.error('Confirmation email failed:', e);
      // Не блокуємо unsubscribe через помилку email
    }

    // Редірект на success page (для GET requests)
    if (req.method === 'GET') {
      return res.redirect(302, `/unsubscribe.html?success=true&email=${encodeURIComponent(email)}`);
    }

    // JSON response для POST
    return res.status(200).json({ 
      ok: true, 
      message: 'Successfully unsubscribed',
      email 
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({ 
      error: 'Failed to process unsubscribe request' 
    });
  }
}

function generateUnsubscribeConfirmation(email) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed Successfully</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
        <tr>
          <td align="center">
            
            <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">ISRIB.shop</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px 32px;text-align:center;">
                  
                  <!-- Success icon -->
                  <div style="width:64px;height:64px;margin:0 auto 24px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:32px;color:#ffffff;">✓</span>
                  </div>

                  <h2 style="margin:0 0 16px;color:#1e293b;font-size:24px;font-weight:700;">
                    Unsubscribed Successfully
                  </h2>
                  
                  <p style="margin:0 0 24px;color:#64748b;line-height:1.6;font-size:15px;">
                    You've been removed from our cart recovery emails.<br>
                    You won't receive any more reminders from us.
                  </p>

                  <!-- Divider -->
                  <div style="height:1px;background:#e5e7eb;margin:32px 0;"></div>

                  <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                    Changed your mind?<br>
                    Contact us at 
                    <a href="mailto:isrib.shop@protonmail.com" style="color:#0ea5e9;text-decoration:none;font-weight:600;">isrib.shop@protonmail.com</a>
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:24px;background:#f8fafc;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0;color:#94a3b8;font-size:11px;">
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
