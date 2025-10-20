import { Resend } from 'resend';

// ---------- helpers ----------
const toNum = (v) => (typeof v === 'number' ? v : Number(v || 0));
const norm  = (s) => String(s || '').trim();
const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtAmount = (mg) => (mg >= 1000 ? `${(mg / 1000)} g` : `${mg} mg`);

// ✅ КРИТИЧНО: Ідентична функція нормалізації email
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// "100mg" | "500 mg" | "1g" -> mg (number)
const parseQtyToMg = (s) => {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  
  if (t.includes('g') && !t.includes('mg')) {
    return Math.round(n * 1000);
  }
  
  return Math.round(n);
};

// Нормалізуємо одиниці для item
function normalizeItem(it) {
  let grams = toNum(it.grams || 0);
  const display = it.display || it.quantity || it.qtyLabel || '';

  if (display) {
    const mg = parseQtyToMg(display);
    if (mg) grams = mg;
  } else {
    if (grams >= 100000) grams = Math.round(grams / 1000);
  }
  return {
    ...it,
    grams,
    display: it.display || fmtAmount(grams)
  };
}

// Валідація promo code
function validatePromoCode(code) {
  const PROMO_CODES = {
    'RETURN15': { discount: 0.15, label: '15% off' },
    'WELCOME15': { discount: 0.15, label: '15% off' }
  };
  
  const upper = norm(code).toUpperCase();
  return PROMO_CODES[upper] || null;
}

// ============================================================================
// Скасування cart recovery emails
// ============================================================================
async function cancelCartRecoveryEmails(email) {
  const normalizedEmail = normalizeEmail(email);
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    console.warn('[Checkout] Invalid email for cart recovery cancel:', email);
    return false;
  }

  try {
    console.log('[Checkout] 🔴 Canceling cart recovery for:', normalizedEmail);
    
    const response = await fetch(`${process.env.SITE_URL || 'https://isrib.shop'}/api/cart-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'cancel', 
        email: normalizedEmail 
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Checkout] ✅ Cart recovery canceled:', data);
      return true;
    } else {
      console.error('[Checkout] ❌ Cart recovery cancel failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Checkout] ❌ Cart recovery cancel error:', error);
    return false;
  }
}

// ============================================================================
// Main handler
// ============================================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ---- читаємо raw body ----
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

    // ---- promo code ----
    const promoCodeInput = norm(data.promoCode);
    const promoData = promoCodeInput ? validatePromoCode(promoCodeInput) : null;
    const promoCode = promoData ? promoCodeInput.toUpperCase() : null;

    console.log('[Checkout] Order received:', {
      email,
      promoCode,
      hasPromo: !!promoCode
    });

    // ---- кошик ----
    const itemsInput = Array.isArray(data.items) ? data.items : [];
    if (itemsInput.length === 0) {
      return res.status(422).json({ code: 'EMPTY_CART', error: 'Cart is empty.' });
    }

    // валідація та нормалізація
    const items = itemsInput.map((it) => {
      const name  = norm(it.name ?? it.title ?? it.id);
      const qty   = toNum(it.qty ?? it.quantity ?? 0);
      const price = toNum(it.price);
      if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price) || price < 0) {
        throw new Error('INVALID_CART_ITEM');
      }
      return normalizeItem({ ...it, name, qty, price });
    });

    // ---- суми ----
    const getQty       = (it) => toNum(it.qty ?? it.quantity ?? 1);
    const getPrice     = (it) => toNum(it.price);
    const getMgPerPack = (it) => toNum(it.grams || 0);

    const subtotal = items.reduce((s, it) => s + getQty(it) * getPrice(it), 0);
    if (subtotal <= 0) {
      return res.status(422).json({ code: 'INVALID_SUBTOTAL', error: 'Cart total invalid.' });
    }

    const discount = promoData ? subtotal * promoData.discount : 0;
    const shipping = 0;
    const total = subtotal - discount + shipping;

    console.log('[Checkout] Totals:', { 
      subtotal, 
      discount, 
      total,
      promoApplied: !!promoCode 
    });

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
      <table style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%;">
        <thead>
          <tr>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left">Item</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Pack size</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Packs</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">Total amount</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">Unit price</th>
          </tr>
        </thead>
        <tbody>${itemsRows || `<tr><td colspan="5" style="padding:6px 10px;border:1px solid #e5e7eb;color:#6b7280">No items</td></tr>`}</tbody>
      </table>`;

    const totalsBlockHtml = `
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>Subtotal</span><b>${fmtUSD(subtotal)}</b>
        </div>
        ${discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#10b981;">
            <span>Discount (${promoCode})</span><b>−${fmtUSD(discount)}</b>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>Shipping</span><b>FREE</b>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px;font-size:16px;">
          <span><strong>Total</strong></span><b>${fmtUSD(total)}</b>
        </div>
        <div style="color:#6b7280;margin-top:4px;font-size:12px;">
          * Free shipping — limited-time launch offer.
        </div>
      </div>`;

    const fullName = `${firstName} ${lastName}`.trim();
    const totalMgAll = items.reduce((s, it) => s + getMgPerPack(it) * getQty(it), 0);

    const adminSubject = `Order Request — ${fullName} (${items.length} items, ${fmtAmount(totalMgAll)} total${promoCode ? `, ${promoCode} applied` : ''}, total ${fmtUSD(total)})`;

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ---- HTML для адміну ----
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
      ${promoCode ? `<p><b>Promo code:</b> <span style="background:#fef3c7;padding:2px 8px;border-radius:4px;font-family:monospace;font-weight:600;">${promoCode}</span> (${promoData.label})</p>` : ''}
      <p><b>Notes:</b><br>${(notes || '-').replace(/\n/g,'<br>')}</p>
      <h3>Items</h3>
      ${itemsTable}
      ${totalsBlockHtml}
    `;

    const adminText = `New Checkout Request

Name: ${fullName}
Email: ${email}
Country: ${country}${region ? `, ${region}` : ''}
City: ${city}
Postal: ${postal}
Address: ${address}
Messenger: ${messenger || '-'}
Handle/Phone: ${handle || '-'}
${promoCode ? `Promo code: ${promoCode} (${promoData.label})` : ''}

Notes:
${notes || '-'}

Items:
${items.map(it => {
  const packs = getQty(it);
  const mg = getMgPerPack(it);
  const totalMg = mg * packs;
  return `- ${it.name} — ${fmtAmount(mg)} × ${packs} = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
}).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
${discount > 0 ? `Discount (${promoCode}): −${fmtUSD(discount)}` : ''}
Shipping: FREE
Total: ${fmtUSD(total)}
* Free shipping — limited-time launch offer.`;

    // ============================================================================
    // ✅ КРИТИЧНО: Відправка листів + скасування cart recovery
    // ============================================================================

    // 1. Відправляємо лист адміну (основний)
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: process.env.RESEND_TO,
      reply_to: email,
      subject: adminSubject,
      html: adminHtml,
      text: adminText,
      tags: [
        { name: 'type', value: 'order_admin' },
        { name: 'promo', value: promoCode || 'none' }
      ]
    });

    console.log('[Checkout] ✅ Admin email sent to:', process.env.RESEND_TO);

    // 2. Відправляємо лист адміну (додатковий, якщо є)
    if (process.env.RESEND_TO_EXTRA) {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.RESEND_TO_EXTRA,
        reply_to: email,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
        tags: [
          { name: 'type', value: 'order_admin_extra' },
          { name: 'promo', value: promoCode || 'none' }
        ]
      });
      console.log('[Checkout] ✅ Extra admin email sent to:', process.env.RESEND_TO_EXTRA);
    }

    // 3. Відправляємо підтвердження клієнту
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: `We received your order request — ISRIB.shop`,
      html: `<p>Hi ${firstName || ''},</p>
             <p>Thanks for your order request. We'll review availability and payment options and get back to you via email${messenger ? ` or ${messenger}` : ''} shortly.</p>
             <p><b>Summary:</b></p>
             ${itemsTable}
             ${totalsBlockHtml}
             <p style="color:#6b7280;margin-top:10px;font-size:13px;">For research use only. Not for human consumption.</p>
             <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">
             <p style="color:#94a3b8;font-size:12px;text-align:center;">
               Need help? Reply to this email or contact us at 
               <a href="mailto:isrib.shop@protonmail.com" style="color:#3b82f6;">isrib.shop@protonmail.com</a>
             </p>`,
      text: `Hi ${firstName || ''},

Thanks for your order request. We'll get back to you shortly.

Summary:
${items.map(it => {
  const packs = getQty(it);
  const mg = getMgPerPack(it);
  const totalMg = mg * packs;
  return `- ${it.name} — ${fmtAmount(mg)} × ${packs} = ${fmtAmount(totalMg)} @ ${fmtUSD(getPrice(it))}`;
}).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
${discount > 0 ? `Discount (${promoCode}): −${fmtUSD(discount)}` : ''}
Shipping: FREE
Total: ${fmtUSD(total)}
* Free shipping — limited-time launch offer.

For research use only. Not for human consumption.`,
      tags: [
        { name: 'type', value: 'order_confirmation' },
        { name: 'promo', value: promoCode || 'none' }
      ]
    });

    console.log('[Checkout] ✅ Confirmation email sent to customer:', email);

    // ============================================================================
    // 4. ✅ КРИТИЧНО: Скасовуємо cart recovery emails ПІСЛЯ успішної відправки
    // ============================================================================
    await cancelCartRecoveryEmails(email);

    // 5. Генеруємо Order ID для редіректу
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 6. Формуємо items для URL (для success page)
    const itemsForUrl = items.map(it => ({
      name: it.name,
      sku: it.sku || it.id || 'unknown',
      qty: getQty(it),
      price: getPrice(it),
      grams: getMgPerPack(it),
      display: it.display || fmtAmount(getMgPerPack(it))
    }));

    console.log('[Checkout] ✅ Order processed successfully:', {
      orderId,
      email: normalizeEmail(email),
      total,
      itemCount: items.length
    });

    // ---- завершення ----
    return res.status(200).json({ 
      ok: true,
      orderId,
      // Дані для success page
      redirect: {
        items: itemsForUrl,
        subtotal,
        discount,
        total,
        promo: promoCode || '',
        order_id: orderId
      }
    });

  } catch (e) {
    console.error('[Checkout] ❌ Error:', e);
    return res.status(500).json({ 
      error: e?.message || 'Internal Error',
      code: e?.code || 'UNKNOWN_ERROR'
    });
  }
}

// Використовуємо raw-body
export const config = { api: { bodyParser: false } };
