import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = 'isrib.shop@protonmail.com'; // або будь-яка твоя пошта
const FROM = 'ISRIB Shop <noreply@isrib.shop>'; // адреса має бути підтверджена в Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { name, email, subject, product, message, researchUse, page } = req.body || {};

  if (!name || !email || !subject || !message || !researchUse) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    ${product ? `<p><strong>Product:</strong> ${product}</p>` : ''}
    <p><strong>Research Use Confirmed:</strong> ${researchUse ? 'Yes' : 'No'}</p>
    <p><strong>Message:</strong><br>${(message || '').replace(/\n/g, '<br>')}</p>
    <hr>
    <p><small>Submitted from: ${page || 'unknown'}</small></p>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `[ISRIB Contact] ${subject} — ${name}`,
      html
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Resend Error]', error);
    return res.status(500).json({ error: 'Failed to send message via Resend' });
  }
}
