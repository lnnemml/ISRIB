import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- raw body (без фреймворку) ---
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
    const norm  = (s) => String(s || '').trim();

    for (const it of items) {
      const name  = norm(it.name ?? it.title ?? it.id);
      const qty   = toNum(it.qty ?? it.quantity ?? 0);
      const price = toNum(it.price);
      if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
        return res.status(422).json({ code: 'INVALID_CART_ITEM', error: 'Invalid cart item.' });
      }
    }

    // ---- ПЕРЕОБЧИСЛЕННЯ СУМ НА СЕРВЕРІ (FREE SHIPPING) ----
    const getQty   = (it) => toNum(it.qty ?? it.quantity ?? 1);   // кількість упаковок
    const getPrice = (it) => toNum(it.price);
    const getGrams = (it) => toNum(it.grams || 0);                // mg у 1 упаковці (у твоєму payload це mg)
    const fmtUSD   = (n) => `$${Number(n || 0).toFixed(2)}`;
    const fmtAmount = (mg) => (mg >= 1000 ? `${(mg / 1000)} g` : `${mg} mg`);

    const subtotal = items.reduce((s, it) => s + getQty(it) * getPrice(it), 0);
    if (subtotal <= 0) {
      return res.status(422).json({ code: 'INVALID_SUBTOTAL', error: 'Cart total invalid.' });
    }

    const shipping = 0;
    const total    = subtotal;

    // ====== HTML-таблиця (з відображенням ваги) ======
    const itemsRows = items.map(it => {
      const name     = it.name ?? it.title ?? it.id ?? 'item';
      const packs    = getQty(it);        // кількість упаковок
      const mg       = getGrams(it);      // mg у 1 упаковці
      const packSize = it.display || fmtAmount(mg);
      const totalMg  = mg * packs;

      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${packSize}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${packs}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${fmtAmount(totalMg)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtUSD(getPrice(it))}</td>
      </tr>`;
    }).join('');

    const itemsTable = `
      <table style="border-collapse:collapse;border:1px solid #e5e7eb">
        <thead>
          <tr>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left">Item</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Pack size</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Packs</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Total amount</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">Unit price</th>
          </tr>
        </thead>
        <tbody>${itemsRows || `<tr><td colspan="5" style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">No items provided</td></tr>`}</tbody>
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
    const totalMgAll = items.reduce((s, it) => s + getGrams(it) * getQty(it), 0);

    const adminSubject = `Order Request — ${fullName} (${items.length} items, ${fmtAmount(totalMgAll)} total, total ${fmtUSD(total)})`;

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
${items.map(it => {
  const packs = getQty(it);
  const mg = getGrams(it);
  const totalMg = mg * packs;
  const name = it.name || it.title || it.id || 'item';
  return `- ${name} — ${fmtAmount(mg)} per pack × ${packs} packs = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
}).join('\n')}

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
${items.map(it => {
  const packs = getQty(it);
  const mg = getGrams(it);
  const totalMg = mg * packs;
  const name = it.name || it.title || it.id || 'item';
  return `- ${name} — ${fmtAmount(mg)} per pack × ${packs} packs = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
}).join('\n')}

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
