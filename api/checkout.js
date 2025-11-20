import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

// ---------- helpers ----------
const toNum = (v) => (typeof v === 'number' ? v : Number(v || 0));
const norm  = (s) => String(s || '').trim();
const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtAmount = (mg) => (mg >= 1000 ? `${(mg / 1000)} g` : `${mg} mg`);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const parseQtyToMg = (s) => {
  if (!s) return 0;
  const t = String(s).toLowerCase().trim();
  const n = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
  
  if (t.includes('g') && !t.includes('mg')) {
    return Math.round(n * 1000);
  }
  
  return Math.round(n);
};

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

function validatePromoCode(code) {
  const PROMO_CODES = {
    'RETURN15': { discount: 0.15, label: '15% off' },
    'WELCOME15': { discount: 0.15, label: '15% off' }
  };
  
  const upper = norm(code).toUpperCase();
  return PROMO_CODES[upper] || null;
}

async function cancelCartRecoveryEmails(email) {
  const normalizedEmail = normalizeEmail(email);
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    console.warn('[Checkout] Invalid email for cart recovery cancel:', email);
    return false;
  }

  const siteUrl = process.env.SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://isrib.shop');

  try {
    console.log('[Checkout] 🔄 Canceling cart recovery for:', normalizedEmail);
    
    const response = await fetch(`${siteUrl}/api/cart-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'cancel', 
        email: normalizedEmail 
      })
    });

    if (!response.ok) {
      throw new Error(`Cancel failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Checkout] ✅ Cart recovery API response:', data);
    return true;

  } catch (error) {
    console.error('[Checkout] ❌ Cart recovery cancel failed:', error.message);
    throw error;
  }
}

// ============================================
// ✅ НОВА ФУНКЦІЯ: ЗБЕРЕЖЕННЯ PENDING ORDER
// ============================================
async function savePendingOrder(orderData) {
  try {
    // Створюємо директорію якщо не існує
    const dataDir = path.join(process.cwd(), 'data');
    const pendingFile = path.join(dataDir, 'pending-orders.json');
    
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (e) {
      // Директорія вже існує
    }
    
    // Читаємо існуючі pending orders
    let pendingOrders = [];
    try {
      const content = await fs.readFile(pendingFile, 'utf-8');
      pendingOrders = JSON.parse(content);
    } catch (e) {
      // Файл не існує або порожній
      console.log('[Pending] Creating new pending orders file');
    }
    
    // Перевіряємо чи вже є це замовлення
    const existingIndex = pendingOrders.findIndex(
      order => order.order_id === orderData.order_id
    );
    
    if (existingIndex >= 0) {
      // Оновлюємо існуюче
      pendingOrders[existingIndex] = {
        ...pendingOrders[existingIndex],
        ...orderData,
        updated_at: Date.now()
      };
      console.log('[Pending] ✅ Updated existing order:', orderData.order_id);
    } else {
      // Додаємо нове
      pendingOrders.push({
        ...orderData,
        created_at: Date.now(),
        updated_at: Date.now()
      });
      console.log('[Pending] ✅ Added new order:', orderData.order_id);
    }
    
    // Видаляємо старі (>7 днів)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    pendingOrders = pendingOrders.filter(order => 
      (order.created_at || order.timestamp || Date.now()) > sevenDaysAgo
    );
    
    // Зберігаємо
    await fs.writeFile(pendingFile, JSON.stringify(pendingOrders, null, 2));
    console.log('[Pending] 💾 Saved to file, total orders:', pendingOrders.length);
    
    return true;
  } catch (error) {
    console.error('[Pending] ❌ Failed to save:', error);
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
      console.log('[Checkout] Honeypot triggered — ignoring request');
      return res.status(200).json({ ok: true });
    }

    // ============================================
    // ✅ КРИТИЧНО: ОТРИМУЄМО ORDER ID З ФРОНТЕНДУ
    // ============================================
    const orderIdFromClient = norm(data.orderId || data.order_id);
    
    // Генеруємо fallback якщо клієнт не надіслав
    const orderId = orderIdFromClient || 
      `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    console.log('[Checkout] 🆔 Order ID:', {
      fromClient: !!orderIdFromClient,
      orderId: orderId
    });

    // ---- обов'язкові поля ----
    const firstName = norm(data.firstName);
    const lastName  = norm(data.lastName);
    const email     = norm(data.email);
    const country   = norm(data.country);
    const city      = norm(data.city);
    const postal    = norm(data.postal);
    const address   = norm(data.address);

    if (!firstName || !lastName || !email || !country || !city || !postal || !address) {
      console.error('[Checkout] Missing required fields');
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

    console.log('[Checkout] 📦 Order received:', {
      orderId,
      email,
      country,
      promoCode: promoCode || 'none'
    });

    // ---- кошик ----
    const itemsInput = Array.isArray(data.items) ? data.items : [];
    if (itemsInput.length === 0) {
      console.error('[Checkout] Empty cart');
      return res.status(422).json({ code: 'EMPTY_CART', error: 'Cart is empty.' });
    }

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
      console.error('[Checkout] Invalid subtotal');
      return res.status(422).json({ code: 'INVALID_SUBTOTAL', error: 'Cart total invalid.' });
    }

    const discount = promoData ? subtotal * promoData.discount : 0;
    const shipping = 0;
    const total = subtotal - discount + shipping;

    console.log('[Checkout] 💰 Totals:', { 
      orderId,
      subtotal: fmtUSD(subtotal), 
      discount: fmtUSD(discount), 
      total: fmtUSD(total)
    });

    // ============================================
    // ✅ ЗБЕРІГАЄМО PENDING ORDER В ФАЙЛ
    // ============================================
    const pendingOrderData = {
      order_id: orderId,
      email: normalizeEmail(email),
      firstName: firstName,
      lastName: lastName,
      country: country,
      region: region,
      city: city,
      postal: postal,
      address: address,
      messenger: messenger,
      handle: handle,
      notes: notes,
      items: items,
      subtotal: subtotal,
      discount: discount,
      promo: promoCode || '',
      total: total,
      status: 'pending_payment',
      timestamp: Date.now()
    };
    
    await savePendingOrder(pendingOrderData);

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

    // ============================================
    // ✅ ORDER ID В SUBJECT
    // ============================================
    const adminSubject = `Order ${orderId} — ${fullName} (${items.length} items, ${fmtAmount(totalMgAll)} total${promoCode ? `, ${promoCode}` : ''}, ${fmtUSD(total)})`;

    // ---- HTML для адміну ----
    const adminHtml = `
      <!doctype html>
      <html>
      <body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;">
        <h2 style="color:#10b981;margin-bottom:20px;">🎉 New Order Request</h2>
        
        <!-- ✅ ORDER ID BANNER -->
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:0;font-size:18px;">
            <b>Order ID:</b> 
            <span style="background:#fff;padding:6px 14px;border-radius:6px;font-family:monospace;font-weight:700;color:#f59e0b;font-size:20px;">${orderId}</span>
          </p>
        </div>
        
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:20px;">
          <h3 style="margin:0 0 12px;color:#475569;font-size:14px;text-transform:uppercase;">Customer Info</h3>
          <p style="margin:4px 0;"><b>Name:</b> ${fullName}</p>
          <p style="margin:4px 0;"><b>Email:</b> <a href="mailto:${email}" style="color:#3b82f6;">${email}</a></p>
          <p style="margin:4px 0;"><b>Country:</b> ${country}${region ? `, ${region}` : ''}</p>
          <p style="margin:4px 0;"><b>City:</b> ${city}</p>
          <p style="margin:4px 0;"><b>Postal:</b> ${postal}</p>
          <p style="margin:4px 0;"><b>Address:</b> ${address}</p>
        </div>

        ${messenger || handle ? `
        <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-bottom:20px;">
          <h3 style="margin:0 0 12px;color:#475569;font-size:14px;text-transform:uppercase;">Contact Preferences</h3>
          ${messenger ? `<p style="margin:4px 0;"><b>Messenger:</b> ${messenger}</p>` : ''}
          ${handle ? `<p style="margin:4px 0;"><b>Handle/Phone:</b> ${handle}</p>` : ''}
        </div>
        ` : ''}

        ${promoCode ? `
        <div style="background:#dcfdf7;padding:16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #10b981;">
          <p style="margin:0;">
            <b>🎟️ Promo code applied:</b> 
            <span style="background:#fff;padding:4px 12px;border-radius:4px;font-family:monospace;font-weight:700;color:#059669;">${promoCode}</span>
            <span style="color:#065f46;margin-left:8px;">(${promoData.label})</span>
          </p>
        </div>
        ` : ''}

        ${notes ? `
        <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:20px;">
          <h3 style="margin:0 0 12px;color:#475569;font-size:14px;text-transform:uppercase;">Notes</h3>
          <p style="margin:0;white-space:pre-wrap;">${notes.replace(/\n/g,'<br>')}</p>
        </div>
        ` : ''}

        <h3 style="margin:24px 0 12px;">📦 Order Items</h3>
        ${itemsTable}
        ${totalsBlockHtml}

        <hr style="margin:24px 0;border:none;border-top:2px solid #e5e7eb;">
        
        <p style="color:#64748b;font-size:13px;margin:16px 0;">
          <b>Quick reply:</b> <a href="mailto:${email}?subject=Re: Order ${orderId}" style="color:#3b82f6;">Reply to customer</a>
        </p>
      </body>
      </html>
    `;

    const adminText = `New Order Request

Order ID: ${orderId}

Customer Info:
Name: ${fullName}
Email: ${email}
Country: ${country}${region ? `, ${region}` : ''}
City: ${city}
Postal: ${postal}
Address: ${address}

${messenger ? `Messenger: ${messenger}` : ''}
${handle ? `Handle/Phone: ${handle}` : ''}
${promoCode ? `\nPromo code: ${promoCode} (${promoData.label})` : ''}

${notes ? `Notes:\n${notes}\n` : ''}

Order Items:
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
    // ВІДПРАВКА ЛИСТІВ
    // ============================================================================
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      console.log('[Checkout] 📧 Sending admin email to:', process.env.RESEND_TO);
      
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.RESEND_TO,
        reply_to: email,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
        tags: [
          { name: 'type', value: 'order_admin' },
          { name: 'order_id', value: orderId },
          { name: 'promo', value: promoCode || 'none' }
        ]
      });

      console.log('[Checkout] ✅ Admin email sent successfully');

    } catch (emailError) {
      console.error('[Checkout] ❌ CRITICAL: Admin email failed:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send admin notification',
        details: emailError.message,
        code: 'EMAIL_SEND_FAILED'
      });
    }

    // 2. Додатковий адмін email (якщо є)
    if (process.env.RESEND_TO_EXTRA) {
      console.log('[Checkout] 📧 Sending extra admin email');
      
      resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.RESEND_TO_EXTRA,
        reply_to: email,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
        tags: [
          { name: 'type', value: 'order_admin_extra' },
          { name: 'order_id', value: orderId }
        ]
      })
      .then(() => console.log('[Checkout] ✅ Extra admin email sent'))
      .catch(err => console.warn('[Checkout] ⚠️ Extra admin email failed:', err.message));
    }

    // 3. Підтвердження клієнту
    console.log('[Checkout] 📧 Sending customer confirmation');
    
    resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: `Order ${orderId} received — ISRIB.shop`,
      html: `
        <!doctype html>
        <html>
        <body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:20px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#10b981;margin:0;">Thank you, ${firstName}!</h1>
            <p style="color:#64748b;margin:8px 0 0;">We've received your order request.</p>
          </div>

          <!-- ✅ ORDER ID -->
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;color:#92400e;font-size:14px;"><b>Your Order ID:</b></p>
            <p style="margin:8px 0 0;font-family:monospace;font-size:20px;font-weight:700;color:#f59e0b;">${orderId}</p>
          </div>

          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:24px;">
            <p style="margin:0;color:#14532d;font-weight:600;">✓ What happens next?</p>
            <p style="margin:8px 0 0;color:#166534;">We'll review availability and payment options, then get back to you via email${messenger ? ` or ${messenger}` : ''} within 24 hours.</p>
          </div>

          <h3 style="margin:24px 0 12px;color:#475569;">Your Order Summary</h3>
          ${itemsTable}
          ${totalsBlockHtml}

          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:24px;">
            <p style="margin:0;color:#64748b;font-size:13px;">
              <b>Questions?</b> Just reply to this email or contact us at 
              <a href="mailto:isrib.shop@protonmail.com" style="color:#3b82f6;">isrib.shop@protonmail.com</a>
            </p>
          </div>

          <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
            For research use only. Not for human consumption.
          </p>
        </body>
        </html>
      `,
      text: `Hi ${firstName},

Thanks for your order request! 

Your Order ID: ${orderId}

We've received it and will get back to you shortly.

Order Summary:
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

Questions? Reply to this email or contact: isrib.shop@protonmail.com

For research use only. Not for human consumption.`,
      tags: [
        { name: 'type', value: 'order_confirmation' },
        { name: 'order_id', value: orderId }
      ]
    })
    .then(() => console.log('[Checkout] ✅ Customer confirmation sent'))
    .catch(err => console.warn('[Checkout] ⚠️ Customer confirmation failed:', err.message));

    // 4. Скасовуємо cart recovery
    console.log('[Checkout] 🔄 Canceling cart recovery');

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await cancelCartRecoveryEmails(email);
      console.log('[Checkout] ✅ Cart recovery canceled');
    } catch (cancelError) {
      console.warn('[Checkout] ⚠️ Cart recovery cancel failed:', cancelError.message);
    }

    // 5. Формуємо items для URL
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
      total: fmtUSD(total)
    });

    // ---- завершення ----
    return res.status(200).json({ 
      ok: true,
      orderId: orderId,
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
    console.error('[Checkout] ❌ Unexpected error:', e);
    return res.status(500).json({ 
      error: e?.message || 'Internal Error',
      code: e?.code || 'UNKNOWN_ERROR'
    });
  }
}

export const config = { api: { bodyParser: false } };
