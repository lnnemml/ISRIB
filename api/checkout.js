import { Resend } from 'resend';

// ---------- helpers ----------
const toNum = (v) => (typeof v === 'number' ? v : Number(v || 0));
const norm  = (s) => String(s || '').trim();
const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtAmount = (mg) => (mg >= 1000 ? `${(mg / 1000)} g` : `${mg} mg`);

// "100mg" | "500 mg" | "1g" -> mg (number)
const parseQtyToMg = (s) => {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  
  // "1g" або "1000mg" → перевіряємо, чи є "g" БЕЗ "mg"
  if (t.includes('g') && !t.includes('mg')) {
    return Math.round(n * 1000); // грами → міліграми
  }
  
  return Math.round(n); // вже в міліграмах
};

// Нормалізуємо одиниці для item: приводимо grams строго до mg.
// Працює навіть якщо прилетів "старий" формат або тільки display.
function normalizeItem(it) {
  let grams = toNum(it.grams || 0);          // очікуємо mg у 1 упаковці
  const display = it.display || it.quantity || it.qtyLabel || ''; // будь-яка людська мітка

  if (display) {
    const mg = parseQtyToMg(display);
    if (mg) grams = mg;
  } else {
    // fallback: якщо явно бачимо "мільйонні" значення (старий формат) — ділимо на 1000
    if (grams >= 100000) grams = Math.round(grams / 1000);
  }
  return {
    ...it,
    grams,                                  // mg у 1 упаковці
    display: it.display || fmtAmount(grams) // гарантуємо наявність лейбла
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ---- читаємо raw body (щоб не залежати від фреймворку) ----
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');

    // ---- антиспам (honeypot) ----
    if (String(data._gotcha || '').trim()) {
      return res.status(200).json({ ok: true });
    }

    // ---- обов'язкові поля ----
    const firstName = norm(data.firstName);
    const lastName  = norm(data.lastName);
    const email     = norm(data.email);
    const country   = norm(data.country);
    const city      = norm(data.city);
    const postal    = norm(data.postal);
    const address   = norm(data.address);

    if (!firstName || !lastName || !email || !country || !city || !postal || !address) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // додатково
    const region    = norm(data.region);
    const messenger = norm(data.messenger);
    const handle    = norm(data.handle);
    const notes     = norm(data.notes);

    // ---- кошик ----
    const itemsInput = Array.isArray(data.items) ? data.items : [];
    if (itemsInput.length === 0) {
      return res.status(422).json({ code: 'EMPTY_CART', error: 'Cart is empty.' });
    }

    // валідація базових полів та нормалізація одиниць
    const items = itemsInput.map((it) => {
      const name  = norm(it.name ?? it.title ?? it.id);
      const qty   = toNum(it.qty ?? it.quantity ?? 0);
      const price = toNum(it.price);
      if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
        throw new Error('INVALID_CART_ITEM');
      }
      return normalizeItem({ ...it, name, qty, price });
    });

    // ---- суми (FREE SHIPPING) ----
    const getQty   = (it) => toNum(it.qty ?? it.quantity ?? 1);   // кількість упаковок
    const getPrice = (it) => toNum(it.price);
    const getMgPerPack = (it) => toNum(it.grams || 0);            // mg у 1 упаковці (вже нормалізовано)

    const subtotal = items.reduce((s, it) => s + getQty(it) * getPrice(it), 0);
    if (subtotal <= 0) {
      return res.status(422).json({ code: 'INVALID_SUBTOTAL', error: 'Cart total invalid.' });
    }
    const shipping = 0;
    const total    = subtotal;

    // ---- рендер таблиці ----
    const itemsRows = items.map(it => {
      const packs    = getQty(it);
      const mg       = getMgPerPack(it);
      const totalMg  = mg * packs;
      const packSize = it.display || fmtAmount(mg);

      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${it.name}</td>
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

    const totalsBlockHtml = `
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><b>${fmtUSD(subtotal)}</b></div>
        <div style="display:flex;justify-content:space-between"><span>Shipping</span><b>FREE</b></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px"><span>Total</span><b>${fmtUSD(total)}</b></div>
        <div style="color:#6b7280;margin-top:4px;font-size:12px">* Free shipping — limited-time launch offer.</div>
      </div>`;

    const fullName = `${firstName} ${lastName}`.trim();
    const totalMgAll = items.reduce((s, it) => s + getMgPerPack(it) * getQty(it), 0);

    const adminSubject = `Order Request — ${fullName} (${items.length} items, ${fmtAmount(totalMgAll)} total, total ${fmtUSD(total)})`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ---- лист адміну ----
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
  const mg = getMgPerPack(it);
  const totalMg = mg * packs;
  return `- ${it.name} — ${fmtAmount(mg)} per pack × ${packs} packs = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
}).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
Shipping: FREE
Total: ${fmtUSD(total)}
* Free shipping — limited-time launch offer.`
    });

    // ---- підтвердження клієнту ----
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
  const mg = getMgPerPack(it);
  const totalMg = mg * packs;
  return `- ${it.name} — ${fmtAmount(mg)} per pack × ${packs} packs = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
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

// Використовуємо raw-body вище
export const config = { api: { bodyParser: false } };
