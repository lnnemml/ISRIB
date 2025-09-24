// api/checkout.js
const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  const resend = new Resend(process.env.RESEND_API_KEY);
  const lines = Object.entries(body).map(([k,v]) => `${k}: ${v}`).join('\n');

  try {
    await resend.emails.send({
      from: 'ISRIB.shop <orders@isrib.shop>',
      to: 'isrib.shop@protonmail.com',
      subject: `New Order Request — ${body.product || 'Product'}`,
      text: lines
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
};
