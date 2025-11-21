// api/admin.js - Unified admin endpoint
import { getAllPendingOrders, getOrdersStats, updateOrderStatus, getPendingOrder } from '../lib/redis.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  // Auth check
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action } = req.query;

  // ============================================
  // GET ORDERS LIST
  // ============================================
  if (action === 'get-orders' || req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const [orders, stats] = await Promise.all([
        getAllPendingOrders(limit, offset),
        getOrdersStats()
      ]);

      return res.status(200).json({
        success: true,
        stats: stats,
        orders: orders,
        pagination: { limit, offset, count: orders.length, total: stats.total }
      });
    } catch (error) {
      console.error('[Admin API] Error:', error);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  // ============================================
  // CONFIRM PAYMENT
  // ============================================
  if (action === 'confirm-payment') {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const orderId = req.method === 'GET' ? req.query.order_id : req.body?.order_id;
      if (!orderId) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      const order = await getPendingOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'confirmed') {
        if (req.method === 'GET') {
          return res.status(200).send(generateAlreadyConfirmedHTML(order, orderId));
        }
        return res.status(200).json({
          success: true,
          message: 'Order was already confirmed',
          order: order,
          already_confirmed: true
        });
      }

      const updated = await updateOrderStatus(orderId, 'confirmed');
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      console.log('[Admin] ✅ Payment confirmed for order:', orderId);

      // Send confirmation email
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: order.email,
          subject: `Payment Confirmed — Order ${orderId}`,
          html: generateConfirmationEmail(order, orderId),
          tags: [
            { name: 'type', value: 'payment_confirmed' },
            { name: 'order_id', value: orderId }
          ]
        });
        console.log('[Admin] ✅ Confirmation email sent');
      } catch (emailError) {
        console.error('[Admin] ⚠️ Failed to send confirmation email:', emailError);
      }

      if (req.method === 'GET') {
        return res.status(200).send(generateSuccessHTML(order, orderId));
      }

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        order: {
          order_id: orderId,
          status: 'confirmed',
          confirmed_at: Date.now(),
          customer: { name: `${order.firstName} ${order.lastName}`, email: order.email },
          total: order.total
        }
      });

    } catch (error) {
      console.error('[Admin] Error:', error);
      if (req.method === 'GET') {
        return res.status(500).send(generateErrorHTML(error.message));
      }
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  // Unknown action
  return res.status(400).json({ error: 'Invalid action. Use ?action=get-orders or ?action=confirm-payment' });
}

// ============================================
// HTML GENERATORS
// ============================================

function generateAlreadyConfirmedHTML(order, orderId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Already Confirmed</title>
      <style>
        body { font-family: system-ui; display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card { background: white; padding: 48px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
                max-width: 500px; text-align: center; }
        .icon { font-size: 64px; margin-bottom: 24px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .order-id { background: #fef3c7; padding: 12px 24px; border-radius: 8px; font-family: monospace; 
                    font-weight: 700; color: #f59e0b; margin-bottom: 24px; }
        .info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✅</div>
        <h1>Already Confirmed</h1>
        <div class="order-id">${orderId}</div>
        <p>This order was already confirmed on ${new Date(order.confirmed_at).toLocaleString()}</p>
        <div class="info">
          <p><strong>Customer:</strong> ${order.firstName} ${order.lastName}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSuccessHTML(order, orderId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Confirmed</title>
      <style>
        body { font-family: system-ui; display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card { background: white; padding: 48px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
                max-width: 500px; text-align: center; }
        .icon { font-size: 64px; margin-bottom: 24px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .order-id { background: #fef3c7; padding: 12px 24px; border-radius: 8px; font-family: monospace; 
                    font-weight: 700; color: #f59e0b; margin-bottom: 24px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 32px; 
               border-radius: 8px; text-decoration: none; font-weight: 600; }
        .info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; 
                text-align: left; margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✅</div>
        <h1>Payment Confirmed!</h1>
        <div class="order-id">${orderId}</div>
        <p>Order status updated. Customer notified via email.</p>
        <div class="info">
          <p><strong>Customer:</strong> ${order.firstName} ${order.lastName}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          <p><strong>Confirmed at:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateErrorHTML(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Error</title>
      <style>
        body { font-family: system-ui; display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; background: #fee; }
        .card { background: white; padding: 48px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); 
                text-align: center; }
        h1 { color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>❌ Error</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}

function generateConfirmationEmail(order, orderId) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#10b981;margin:0;">Payment Confirmed! 🎉</h1>
      </div>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;color:#92400e;font-size:14px;"><b>Order ID:</b></p>
        <p style="margin:8px 0 0;font-family:monospace;font-size:20px;font-weight:700;color:#f59e0b;">${orderId}</p>
      </div>
      <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;color:#14532d;font-weight:600;">✓ What's next?</p>
        <p style="margin:8px 0 0;color:#166534;">
          Your order is confirmed and will be prepared for shipping. We'll send tracking info once dispatched.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;">
        <p style="margin:0;color:#475569;"><strong>Order Total:</strong> $${order.total.toFixed(2)}</p>
        <p style="margin:8px 0 0;color:#64748b;font-size:13px;">
          Questions? Reply to this email or contact 
          <a href="mailto:isrib.shop@protonmail.com" style="color:#3b82f6;">isrib.shop@protonmail.com</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
