import { Resend } from 'resend';

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

    // Зберігаємо в локальну "чорну список" базу
    await addToUnsubscribeList(email);

    // Опціонально: видаляємо з Resend Audience (якщо використовуєте)
    try {
      // const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
      // await resend.contacts.remove({
      //   email,
      //   audienceId: AUDIENCE_ID
      // });
    } catch (e) {
      console.log('Resend contact removal failed (expected if not using Audiences):', e.message);
    }

    // Підтверджувальний email (опціонально)
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: 'You have been unsubscribed',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;text-align:center;">
            <h2 style="color:#1e293b;margin:0 0 16px;">Unsubscribed Successfully</h2>
            <p style="color:#64748b;line-height:1.6;margin:0 0 24px;">
              You've been removed from our cart recovery emails.<br>
              You won't receive any more reminders from us.
            </p>
            <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
              Changed your mind? Contact us at 
              <a href="mailto:isrib.shop@protonmail.com" style="color:#0ea5e9;">isrib.shop@protonmail.com</a>
            </p>
          </div>
        `
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

// Проста in-memory база (для production використовуйте DB або KV store)
const unsubscribeList = new Set();

async function addToUnsubscribeList(email) {
  unsubscribeList.add(email);
  
  // TODO: Для production зберігайте в:
  // - Vercel KV (Redis)
  // - Суpabase
  // - MongoDB
  // - або просто файл у /tmp (не рекомендується)
  
  console.log('[Unsubscribe] Added to list:', email);
}

// Експортуємо для використання в cart-recovery.js
export function isUnsubscribed(email) {
  return unsubscribeList.has(email.trim().toLowerCase());
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
