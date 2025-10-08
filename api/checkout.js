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
    const region    = (data.region    || '').trim();
    const messenger = (data.messenger || '').trim();
    const handle    = (data.handle    || '').trim();
    const notes     = (data.notes     || '').trim();

    // кошик
    const items = Array.isArray(data.items) ? data.items : [];

    // ===== 🔒 ВАЛІДАЦІЯ КОШИКА =====
    if (items.length === 0) {
      return res.status(422).json({ code: 'EMPTY_CART', error: 'Cart is empty.' });
    }

    const toNum = (v) => (typeof v === 'number' ? v : Number(v || 0));
    const norm = (s) => String(s || '').trim();

    for (const it of items) {
      const name = norm(it.name ?? it.title ?? it.id);
      const qty = toNum(it.qty ?? it.quantity ?? 0);
      const price = toNum(it.price);
      if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
        return res.status(422).json({ code: 'INVALID_CART_ITEM', error: 'Invalid cart item.' });
      }
    }

    // ---- ПЕРЕОБЧИСЛЕННЯ СУМ НА СЕРВЕРІ (FREE SHIPPING) ----
    const getQty = (it) => toNum(it.qty ?? it.quantity ?? 1);
    const getPrice = (it) => toNum(it.price);
    const subtotal = items.reduce((s, it) => s + getQty(it) * getPrice(it), 0);
    if (subtotal <= 0) {
      return res.status(422).json({ code: 'INVALID_SUBTOTAL', error: 'Cart total invalid.' });
    }

    const shipping = 0;
    const total    = subtotal;
    const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;

    // HTML-табличка з товарами (unit price)
    const itemsRows = items.map(it => {
      const name  = it.name ?? it.title ?? it.id ?? 'item';
      const qty   = getQty(it);
      const price = getPrice(it);
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${qty}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtUSD(price)}</td>
      </tr>`;
    }).join('');

    const itemsTable = `
      <table style="border-collapse:collapse;border:1px solid #e5e7eb">
        <thead>
          <tr>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left">Item</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Qty</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">Unit price</th>
          </tr>
        </thead>
        <tbody>${itemsRows || `<tr><td colspan="3" style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">No items provided</td></tr>`}</tbody>
      </table>`;

    // Блок підсумків із FREE SHIPPING
    const totalsBlockHtml = `
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><b>${fmtUSD(subtotal)}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Shipping</span><b>FREE</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px"><span>Total</span><b>${fmtUSD(total)}</b></div>
        <div style="color:#6b7280;margin-top:4px;font-size:12px">* Free shipping — limited-time launch offer.</div>
      </div>`;

    const fullName = `${firstName} ${lastName}`.trim();
    const adminSubject = `Order Request — ${fullName} (${items.length} items, total ${fmtUSD(total)})`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1) Лист адміну (тобі)
    const adminHtml = `
      <h2>New Checkout Request</h2>
      <p><b>Name:</b> ${fullName}<br>
         <b>Email:</b> ${email}<br>
         <b>Country:</b> ${country}${region ? `, ${region}` : ''}<br>
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
      ${totalsBlockHtml}
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to:   [process.env.RESEND_TO],
      reply_to: email,
      subject: adminSubject,
      html: adminHtml,
      text:
`New Checkout Request

Name: ${fullName}
Email: ${email}
Country: ${country}${region ? `, ${region}` : ''}
City: ${city}
Postal: ${postal}
Address: ${address}
Messenger: ${messenger || '-'}
Handle/Phone: ${handle || '-'}

Notes:
${notes || '-'}

Items:
${items.map(it => `- ${(it.name || it.title || it.id || 'item')} x${getQty(it)} @ ${fmtUSD(getPrice(it))}`).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
Shipping: FREE
Total: ${fmtUSD(total)}
* Free shipping — limited-time launch offer.`
    });

    // 2) Підтвердження клієнту
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to:   [email],
      subject: `We received your order request — ISRIB.shop`,
      html: `<p>Hi ${firstName || ''},</p>
             <p>Thanks for your order request. We’ll review availability and payment options and get back to you via email${messenger ? ` or ${messenger}` : ''} shortly.</p>
             <p><b>Summary:</b></p>
             ${itemsTable}
             ${totalsBlockHtml}
             <p style="color:#6b7280;margin-top:10px">For research use only. Not for human consumption.</p>`,
      text:
`Hi ${firstName || ''},

Thanks for your order request. We’ll get back to you shortly.

Summary:
${items.map(it => `- ${(it.name || it.title || it.id || 'item')} x${getQty(it)} @ ${fmtUSD(getPrice(it))}`).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
Shipping: FREE
Total: ${fmtUSD(total)}
* Free shipping — limited-time launch offer.

For research use only. Not for human consumption.`
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Checkout error:', e);
    return res.status(500).json({ error: e?.message || 'Internal Error' });
  }
}
