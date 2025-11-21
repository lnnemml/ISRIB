// lib/redis.js
import { Redis } from '@upstash/redis';

let redisClient = null;

/**
 * Отримує або створює Redis клієнт (Upstash)
 */
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set');
  }

  try {
    redisClient = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    console.log('[Redis] ✅ Upstash Redis client initialized');
    return redisClient;

  } catch (error) {
    console.error('[Redis] ❌ Initialization failed:', error);
    throw error;
  }
}

/**
 * Зберігає pending order в Redis
 * @param {Object} orderData - Дані замовлення
 * @returns {Promise<boolean>}
 */
export async function savePendingOrder(orderData) {
  try {
    const client = getRedisClient();
    const key = `pending_order:${orderData.order_id}`;
    
    // Додаємо metadata
    const enrichedData = {
      ...orderData,
      created_at: orderData.created_at || orderData.timestamp || Date.now(),
      updated_at: Date.now(),
      status: orderData.status || 'pending_payment'
    };

    // Зберігаємо як JSON з TTL 30 днів
    await client.setex(
      key, 
      30 * 24 * 60 * 60, // 30 днів
      JSON.stringify(enrichedData)
    );

    // Додаємо в сортований набір для швидкого пошуку
    await client.zadd('pending_orders_index', {
      score: enrichedData.created_at,
      member: orderData.order_id
    });

    // Індексуємо по email для швидкого пошуку
    if (orderData.email) {
      await client.sadd(
        `pending_orders_by_email:${orderData.email}`, 
        orderData.order_id
      );
      // TTL для email індексу - 60 днів
      await client.expire(`pending_orders_by_email:${orderData.email}`, 60 * 24 * 60 * 60);
    }

    console.log('[Redis] ✅ Saved pending order:', orderData.order_id);
    return true;

  } catch (error) {
    console.error('[Redis] ❌ Failed to save pending order:', error);
    throw error;
  }
}

/**
 * Отримує pending order за ID
 * @param {string} orderId
 * @returns {Promise<Object|null>}
 */
export async function getPendingOrder(orderId) {
  try {
    const client = getRedisClient();
    const key = `pending_order:${orderId}`;
    const data = await client.get(key);
    
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;

  } catch (error) {
    console.error('[Redis] ❌ Failed to get pending order:', error);
    return null;
  }
}

/**
 * Отримує всі pending orders (з пагінацією)
 * @param {number} limit - Максимальна кількість результатів
 * @param {number} offset - Зсув для пагінації
 * @returns {Promise<Array>}
 */
export async function getAllPendingOrders(limit = 100, offset = 0) {
  try {
    const client = getRedisClient();
    
    // Отримуємо IDs з сортованого набору (від нових до старих)
    const orderIds = await client.zrange(
      'pending_orders_index', 
      offset, 
      offset + limit - 1,
      { rev: true } // Reverse order (newest first)
    );

    if (!orderIds || !orderIds.length) {
      return [];
    }

    // Отримуємо всі orders одним batch запитом
    const keys = orderIds.map(id => `pending_order:${id}`);
    const orders = await client.mget(...keys);

    return orders
      .filter(o => o !== null && o !== undefined)
      .map(o => typeof o === 'string' ? JSON.parse(o) : o);

  } catch (error) {
    console.error('[Redis] ❌ Failed to get all orders:', error);
    return [];
  }
}

/**
 * Отримує pending orders по email
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getPendingOrdersByEmail(email) {
  try {
    const client = getRedisClient();
    const orderIds = await client.smembers(`pending_orders_by_email:${email}`);
    
    if (!orderIds || !orderIds.length) {
      return [];
    }

    const keys = orderIds.map(id => `pending_order:${id}`);
    const orders = await client.mget(...keys);

    return orders
      .filter(o => o !== null && o !== undefined)
      .map(o => typeof o === 'string' ? JSON.parse(o) : o);

  } catch (error) {
    console.error('[Redis] ❌ Failed to get orders by email:', error);
    return [];
  }
}

/**
 * Оновлює статус замовлення
 * @param {string} orderId
 * @param {string} status - 'pending_payment' | 'confirmed' | 'shipped' | 'cancelled'
 * @returns {Promise<boolean>}
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const order = await getPendingOrder(orderId);
    if (!order) {
      console.error('[Redis] Order not found:', orderId);
      return false;
    }

    order.status = status;
    order.updated_at = Date.now();

    // Якщо оплата підтверджена - додаємо timestamp
    if (status === 'confirmed') {
      order.confirmed_at = Date.now();
    }

    return await savePendingOrder(order);

  } catch (error) {
    console.error('[Redis] ❌ Failed to update status:', error);
    return false;
  }
}

/**
 * Видаляє застарілі замовлення (старіші за вказані дні)
 * @param {number} daysOld - Кількість днів
 * @returns {Promise<number>} Кількість видалених
 */
export async function cleanupOldOrders(daysOld = 30) {
  try {
    const client = getRedisClient();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Отримуємо старі order IDs
    const oldOrderIds = await client.zrangebyscore(
      'pending_orders_index',
      0,
      cutoffTime
    );

    if (!oldOrderIds || !oldOrderIds.length) {
      console.log('[Redis] No old orders to cleanup');
      return 0;
    }

    // Видаляємо orders та індекси
    for (const orderId of oldOrderIds) {
      const order = await getPendingOrder(orderId);
      
      // Видаляємо з email індексу
      if (order?.email) {
        await client.srem(`pending_orders_by_email:${order.email}`, orderId);
      }

      // Видаляємо order
      await client.del(`pending_order:${orderId}`);
      
      // Видаляємо з основного індексу
      await client.zrem('pending_orders_index', orderId);
    }

    console.log(`[Redis] ✅ Cleaned up ${oldOrderIds.length} old orders`);
    return oldOrderIds.length;

  } catch (error) {
    console.error('[Redis] ❌ Cleanup failed:', error);
    return 0;
  }
}

/**
 * Отримує статистику по замовленням
 * @returns {Promise<Object>}
 */
export async function getOrdersStats() {
  try {
    const client = getRedisClient();
    
    const totalCount = await client.zcard('pending_orders_index');
    const allOrders = await getAllPendingOrders(totalCount || 1000);

    const stats = {
      total: totalCount || 0,
      by_status: {},
      total_value: 0,
      avg_value: 0
    };

    allOrders.forEach(order => {
      // Count by status
      const status = order.status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;

      // Calculate total value
      stats.total_value += order.total || 0;
    });

    stats.avg_value = totalCount > 0 ? stats.total_value / totalCount : 0;

    return stats;

  } catch (error) {
    console.error('[Redis] ❌ Failed to get stats:', error);
    return {
      total: 0,
      by_status: {},
      total_value: 0,
      avg_value: 0
    };
  }
}

/**
 * Закриває Redis connection (для Upstash це no-op)
 */
export async function closeRedisConnection() {
  // Upstash Redis не потребує явного закриття
  console.log('[Redis] Connection cleanup (no-op for Upstash)');
}
