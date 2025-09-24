// api/checkout.js
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  const resend = new Resend(process.env.RESEND_API_KEY);

  // зібрати текст листа
  const lines = Object.entries(body)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  try {
    await resend.emails.send({
      from: 'ISRIB.shop <orders@isrib.shop>', // можна з доменом resend (sandbox) або з верифікованим
      to: 'isrib.shop@protonmail.com',
      subject: `New Order Request — ${body.product || 'Product'}`,
      text: lines
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message });
  }
}
