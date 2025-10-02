import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // зчитуємо тіло без залежності від конкретного фреймворку
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');

    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();
    const subject = String(data.subject || '').trim();
    const honeypot = String(data.website || '').trim(); // антиспам

    if (honeypot) return res.status(200).json({ ok: true }); // бота ігноруємо
    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const sent = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: [process.env.RESEND_TO],
      reply_to: email,
      subject: `New contact: ${subject || 'General'} — ${name || 'No name'}`,
      text:
`Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`,
      html: `<h2>New contact</h2>
             <p><b>Name:</b> ${name || '-'}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Subject:</b> ${subject || '-'}</p>
             <p><b>Message:</b><br>${message.replace(/\n/g,'<br>')}</p>`
    });

    return res.status(200).json({ ok: true, id: sent?.id || null });

  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal Error' });
  }
}
