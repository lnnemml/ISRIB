// api/btcpay-callback.js - BTCPay payment confirmation callback
import { getPendingOrder, updateOrderStatus } from '../lib/redis.js';
import { Resend } from 'resend';

const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtAmount = (mg) => (mg >= 1000 ? `${(mg / 1000)} g` : `${mg} mg`);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Читаємо raw body
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}');

    const { orderId, invoiceId, status, amountPaid, currency } = data;

    console.log('[BTCPay Callback] 📥 Received payment confirmation:', {
      orderId,
      invoiceId,
      status,
      amountPaid,
      currency
    });

    if (!orderId || !invoiceId) {
      return res.status(400).json({ error: 'orderId and invoiceId are required' });
    }

    // Перевіряємо статус - має бути confirmed або complete
    if (status !== 'confirmed' && status !== 'complete') {
      console.warn('[BTCPay Callback] ⚠️ Invalid status:', status);
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Отримуємо pending order з Redis
    const order = await getPendingOrder(orderId);

    if (!order) {
      console.error('[BTCPay Callback] ❌ Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Перевіряємо чи order вже підтверджений
    if (order.status === 'confirmed') {
      console.log('[BTCPay Callback] ℹ️ Order already confirmed');
      return res.status(200).json({
        success: true,
        message: 'Order was already confirmed',
        alreadyConfirmed: true
      });
    }

    // Оновлюємо статус в Redis
    const updated = await updateOrderStatus(orderId, 'confirmed', {
      bitcoin_invoice_id: invoiceId,
      bitcoin_paid_amount: amountPaid,
      bitcoin_currency: currency,
      bitcoin_status: status,
      confirmed_at: Date.now(),
      payment_method: 'bitcoin_btcpay'
    });

    if (!updated) {
      console.error('[BTCPay Callback] ❌ Failed to update order status');
      return res.status(500).json({ error: 'Failed to update order status' });
    }

    console.log('[BTCPay Callback] ✅ Order status updated to confirmed');

    // ============================================
    // ВІДПРАВКА "PAYMENT CONFIRMED" EMAIL КЛІЄНТУ
    // ============================================
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const firstName = order.firstName || 'Customer';
      const lastName = order.lastName || '';
      const email = order.email;
      const fullName = `${firstName} ${lastName}`.trim();

      // Розраховуємо totals
      const subtotal = Number(order.subtotal || 0);
      const bitcoinDiscount = Number(order.bitcoin_discount || 0);
      const finalTotal = Number(order.bitcoin_final_total || order.total || 0);

      // Формуємо items table
      const items = order.items || [];

      const itemsRows = items.map(it => {
        const packs = Number(it.qty || it.count || 1);
        const mg = Number(it.grams || 0);
        const totalMg = mg * packs;
        const packSize = it.display || fmtAmount(mg);
        const price = Number(it.price || 0);

        return `<tr>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${it.name}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${packSize}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${packs}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${fmtAmount(totalMg)}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${fmtUSD(price)}</td>
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

      // HTML email
      const htmlEmail = `
        <!doctype html>
        <html>
        <body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:20px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#10b981;margin:0;">✅ Payment Confirmed!</h1>
            <p style="color:#64748b;margin:8px 0 0;">Thank you for your Bitcoin payment, ${firstName}!</p>
          </div>

          <!-- ✅ ORDER ID -->
          <div style="background:#dcfdf7;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:24px;text-align:center;">
            <p style="margin:0;color:#14532d;font-size:14px;"><b>Your Order ID:</b></p>
            <p style="margin:8px 0 0;font-family:monospace;font-size:20px;font-weight:700;color:#10b981;">${orderId}</p>
          </div>

          <!-- Bitcoin Transaction Info -->
          <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;border-radius:8px;margin-bottom:24px;">
            <p style="margin:0;color:#1e3a8a;font-weight:600;">₿ Bitcoin Payment Confirmed</p>
            <p style="margin:8px 0 0;color:#475569;font-size:14px;">
              <b>Invoice ID:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">${invoiceId}</code><br>
              <b>Amount Paid:</b> ${fmtUSD(amountPaid)} ${currency}<br>
              <b>Confirmation:</b> Automatic (No manual approval needed)
            </p>
          </div>

          <!-- What happens next -->
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:24px;">
            <p style="margin:0;color:#14532d;font-weight:600;">✓ What happens next?</p>
            <p style="margin:8px 0 0;color:#166534;">
              Your order is confirmed and will be prepared for shipping.<br>
              We'll send you tracking information once your package is dispatched.
            </p>
          </div>

          <h3 style="margin:24px 0 12px;color:#475569;">Order Summary</h3>
          ${itemsTable}

          <!-- Totals -->
          <div style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Subtotal</span><b>${fmtUSD(subtotal)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#10b981;">
              <span>Bitcoin Discount (10%)</span><b>−${fmtUSD(bitcoinDiscount)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Shipping</span><b>FREE</b>
            </div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px;font-size:16px;">
              <span><strong>Total Paid</strong></span><b>${fmtUSD(finalTotal)}</b>
            </div>
          </div>

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
      `;

      // Text email
      const textEmail = `Hi ${firstName},

Your Bitcoin payment has been confirmed!

Order ID: ${orderId}

Bitcoin Payment Details:
- Invoice ID: ${invoiceId}
- Amount Paid: ${fmtUSD(amountPaid)} ${currency}
- Confirmation: Automatic

Your order is confirmed and will be prepared for shipping. We'll send you tracking information once your package is dispatched.

Order Summary:
${items.map(it => {
  const packs = Number(it.qty || it.count || 1);
  const mg = Number(it.grams || 0);
  const totalMg = mg * packs;
  return `- ${it.name} — ${it.display || fmtAmount(mg)} × ${packs} = ${fmtAmount(totalMg)} @ ${fmtUSD(it.price)}`;
}).join('\n')}

Subtotal: ${fmtUSD(subtotal)}
Bitcoin Discount (10%): −${fmtUSD(bitcoinDiscount)}
Shipping: FREE
Total Paid: ${fmtUSD(finalTotal)}

Questions? Reply to this email or contact: isrib.shop@protonmail.com

For research use only. Not for human consumption.`;

      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email,
        subject: `Payment Confirmed — Order ${orderId}`,
        html: htmlEmail,
        text: textEmail,
        tags: [
          { name: 'type', value: 'bitcoin_payment_confirmed' },
          { name: 'order_id', value: orderId },
          { name: 'payment_method', value: 'bitcoin' }
        ]
      });

      console.log('[BTCPay Callback] ✅ Payment confirmation email sent to:', email);

    } catch (emailError) {
      console.error('[BTCPay Callback] ⚠️ Failed to send confirmation email:', emailError);
      // Не блокуємо відповідь навіть якщо email не відправився
    }

    // ============================================
    // ВІДПРАВКА NOTIFICATION АДМІНАМ
    // ============================================
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const adminEmails = [
        process.env.RESEND_TO,
        process.env.RESEND_TO_EXTRA
      ].filter(Boolean);

      for (const adminEmail of adminEmails) {
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: adminEmail,
          subject: `Bitcoin Payment Confirmed — Order ${orderId}`,
          html: `
            <!doctype html>
            <html>
            <body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;">
              <h2 style="color:#10b981;">✅ Bitcoin Payment Confirmed (Automatic)</h2>

              <div style="background:#dcfdf7;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:20px;">
                <p style="margin:0;font-size:18px;">
                  <b>Order ID:</b>
                  <span style="background:#fff;padding:6px 14px;border-radius:6px;font-family:monospace;font-weight:700;color:#10b981;">${orderId}</span>
                </p>
              </div>

              <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px;border-radius:8px;margin-bottom:20px;">
                <h3 style="margin:0 0 12px;">Bitcoin Payment Info</h3>
                <p style="margin:4px 0;"><b>Invoice ID:</b> ${invoiceId}</p>
                <p style="margin:4px 0;"><b>Amount Paid:</b> ${fmtUSD(amountPaid)} ${currency}</p>
                <p style="margin:4px 0;"><b>Status:</b> ${status}</p>
                <p style="margin:4px 0;"><b>Payment Method:</b> Bitcoin (BTCPay)</p>
                <p style="margin:4px 0;"><b>Confirmation:</b> ✅ Automatic</p>
              </div>

              <div style="background:#f8fafc;padding:16px;border-radius:8px;">
                <p style="margin:4px 0;"><b>Customer:</b> ${order.firstName} ${order.lastName}</p>
                <p style="margin:4px 0;"><b>Email:</b> ${order.email}</p>
                <p style="margin:4px 0;"><b>Total:</b> ${fmtUSD(finalTotal)}</p>
              </div>

              <p style="margin-top:20px;color:#64748b;">
                This order was automatically confirmed after Bitcoin payment. No manual action required.
              </p>
            </body>
            </html>
          `,
          tags: [
            { name: 'type', value: 'bitcoin_admin_notification' },
            { name: 'order_id', value: orderId }
          ]
        });

        console.log('[BTCPay Callback] ✅ Admin notification sent to:', adminEmail);
      }

    } catch (adminEmailError) {
      console.error('[BTCPay Callback] ⚠️ Admin notification failed:', adminEmailError);
    }

    // Повертаємо успішну відповідь
    return res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      orderId: orderId,
      invoiceId: invoiceId,
      status: 'confirmed'
    });

  } catch (error) {
    console.error('[BTCPay Callback] ❌ Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

export const config = { api: { bodyParser: false } };
