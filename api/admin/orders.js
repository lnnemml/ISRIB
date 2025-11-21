// api/admin/get-orders.js
import { getAllPendingOrders, getOrdersStats } from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Базова авторизація через secret key
    const secret = req.query.secret || req.headers['x-admin-secret'];
    
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Параметри пагінації
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log('[Admin API] Fetching orders from Redis...');

    // Отримуємо замовлення та статистику з Redis
    const [orders, stats] = await Promise.all([
      getAllPendingOrders(limit, offset),
      getOrdersStats()
    ]);

    console.log('[Admin API] ✅ Found orders:', orders.length);

    // Повертаємо JSON
    return res.status(200).json({
      success: true,
      stats: stats,
      orders: orders,
      pagination: {
        limit: limit,
        offset: offset,
        count: orders.length,
        total: stats.total
      }
    });

  } catch (error) {
    console.error('[Admin API] ❌ Error fetching orders:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
