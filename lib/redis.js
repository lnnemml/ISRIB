// lib/redis.js
import { createClient } from 'redis';

let redisClient = null;

/**
 * Отримує або створює Redis клієнт
 */
export async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] ✅ Connected successfully');
    });

    await redisClient.connect();
    return redisClient;

  } catch (error) {
    console.error('[Redis] ❌ Connection failed:', error);
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
    const client = await getRedisClient();
    const key = `pending_order:${orderData.order_id}`;
    
    // Додаємо metadata
    const enrichedData = {
      ...orderData,
      created_at: orderData.created_at || Date.now(),
      updated_at: Date.now(),
      status: orderData.status || 'pending_payment'
    };

    // Зберігаємо як JSON з TTL 30 днів
    await client.setEx(
      key, 
      30 * 24 * 60 * 60, // 30 днів
      JSON.stringify(enrichedData)
    );

    // Додаємо в сортований набір для швидкого пошуку
    await client.zAdd('pending_orders_index', {
      score: enrichedData.created_at,
      value: orderData.order_id
    });

    // Індексуємо по email для швидкого пошуку
    if (orderData.email) {
      await client.sAdd(
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
    return false;
  }
}

/**
 * Отримує pending order за ID
 * @param {string} orderId
 * @returns {Promise<Object|null>}
 */
export async function getPendingOrder(orderId) {
  try {
    const client = await getRedisClient();
    const key = `pending_order:${orderId}`;
    const data = await client.get(key);
    
    return data ? JSON.parse(data) : null;

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
    const client = await getRedisClient();
    
    // Отримуємо IDs з сортованого набору (від нових до старих)
    const orderIds = await client.zRange(
      'pending_orders_index', 
      offset, 
      offset + limit - 1,
      { REV: true } // Reverse order (newest first)
    );

    if (!orderIds.length) {
      return [];
    }

    // Отримуємо всі orders одним batch запитом
    const keys = orderIds.map(id => `pending_order:${id}`);
    const orders = await client.mGet(keys);

    return orders
      .filter(o => o !== null)
      .map(o => JSON.parse(o));

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
    const client = await getRedisClient();
    const orderIds = await client.sMembers(`pending_orders_by_email:${email}`);
    
    if (!orderIds.length) {
      return [];
    }

    const keys = orderIds.map(id => `pending_order:${id}`);
    const orders = await client.mGet(keys);

    return orders
      .filter(o => o !== null)
      .map(o => JSON.parse(o));

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
    const client = await getRedisClient();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Отримуємо старі order IDs
    const oldOrderIds = await client.zRangeByScore(
      'pending_orders_index',
      0,
      cutoffTime
    );

    if (!oldOrderIds.length) {
      console.log('[Redis] No old orders to cleanup');
      return 0;
    }

    // Видаляємо orders та індекси
    for (const orderId of oldOrderIds) {
      const order = await getPendingOrder(orderId);
      
      // Видаляємо з email індексу
      if (order?.email) {
        await client.sRem(`pending_orders_by_email:${order.email}`, orderId);
      }

      // Видаляємо order
      await client.del(`pending_order:${orderId}`);
      
      // Видаляємо з основного індексу
      await client.zRem('pending_orders_index', orderId);
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
    const client = await getRedisClient();
    
    const totalCount = await client.zCard('pending_orders_index');
    const allOrders = await getAllPendingOrders(totalCount);

    const stats = {
      total: totalCount,
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
 * Закриває Redis connection (для cleanup)
 */
export async function closeRedisConnection() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}
