import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // без фреймворку — читаємо стрім
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');

    // --- антиспам (honeypot) ---
    if (String(data._gotcha || '').trim()) {
      return res.status(200).json({ ok: true }); // тихо ігноруємо
    }

    // --- обов’язкові поля (мінімум) ---
    const firstName = (data.firstName || '').trim();
    const lastName  = (data.lastName  || '').trim();
    const email     = (data.email     || '').trim();
    const country   = (data.country   || '').trim();
    const city      = (data.city      || '').trim();
    const postal    = (data.postal    || '').trim();
    const address   = (data.address   || '').trim();

    if (!firstName || !lastName || !email || !country || !city || !postal || !address) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // додатково
    const messenger = (data.messenger || '').trim();
    const handle    = (data.handle    || '').trim();
    const notes     = (data.notes     || '').trim();

    // кошик
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total || 0);

    // підстрахуємо від порожнього замовлення
    if (!items.length) {
      // дозволимо порожній кошик, але відмітимо у листі
      // return res.status(400).json({ error: 'Cart is empty.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // HTML-табличка з товарами
    const itemsRows = items.map(it => {
      const name = it.name ?? it.title ?? it.id ?? 'item';
      const qty  = it.qty ?? it.quantity ?? 1;
      const price = (typeof it.price === 'number') ? it.price : Number(it.price || 0);
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${qty}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${price.toFixed(2)}</td>
      </tr>`;
    }).join('');

    const itemsTable = `
      <table style="border-collapse:collapse;border:1px solid #e5e7eb">
        <thead>
          <tr>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left">Item</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Qty</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${itemsRows || `<tr><td colspan="3" style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">No items provided</td></tr>`}</tbody>
      </table>`;

    const fullName = `${firstName} ${lastName}`.trim();

    // 1) Лист адміну (тобі)
    const adminSubject = `Order Request — ${fullName} (${items.length} items, total ${total || 0})`;
    const adminHtml = `
      <h2>New Checkout Request</h2>
      <p><b>Name:</b> ${fullName}<br>
         <b>Email:</b> ${email}<br>
         <b>Country:</b> ${country}<br>
         <b>City:</b> ${city}<br>
         <b>Postal:</b> ${postal}<br>
         <b>Address:</b> ${address}
      </p>
      <p><b>Messenger:</b> ${messenger || '-'}<br>
         <b>Handle/Phone:</b> ${handle || '-'}
      </p>
      <p><b>Notes:</b><br>${(notes || '-').replace(/\n/g,'<br>')}</p>
      <h3>Items</h3>
      ${itemsTable}
      <p style="margin-top:10px"><b>Estimated total:</b> ${Number(total || 0).toFixed(2)}</p>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM,         // тимчасово можна noreply@resend.dev
      to:   [process.env.RESEND_TO],         // твоя поштова скринька
      reply_to: email,                       // щоб відповісти клієнту
      subject: adminSubject,
      html: adminHtml,
      text: `${fullName} — ${email}
Country: ${country}
City: ${city}
Postal: ${postal}
Address: ${address}
Messenger: ${messenger || '-'}
Handle/Phone: ${handle || '-'}

Notes:
${notes || '-'}

Items:
${items.map(it => `- ${it.name || it.title || it.id || 'item'} x${it.qty || it.quantity || 1} @ ${it.price}`).join('\n')}

Estimated total: ${total || 0}
`
    });

    // 2) Підтвердження клієнту (optional, але корисно)
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to:   [email],
      subject: `We received your order request — ISRIB.shop`,
      html: `<p>Hi ${firstName || ''},</p>
             <p>Thanks for your order request. We’ll review availability, shipping options and payment details, then get back to you via email${messenger ? ` or ${messenger}` : ''} shortly.</p>
             <p><b>Summary:</b></p>
             ${itemsTable}
             <p style="margin-top:10px"><b>Estimated total:</b> ${Number(total || 0).toFixed(2)}</p>
             <p style="color:#6b7280">* For research use only. Not for human consumption.</p>`,
      text: `Hi ${firstName || ''},

Thanks for your order request. We'll get back to you shortly.
Estimated total: ${total || 0}

(Research use only)`
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal Error' });
  }
}
