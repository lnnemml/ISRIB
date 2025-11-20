import { promises as fs } from 'fs';
import path from 'path';

// ============================================
// API ENDPOINT: GET /api/pending-orders
// Читає pending orders з файлу
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const pendingFile = path.join(process.cwd(), 'data', 'pending-orders.json');
  
  // ============================================
  // GET: Отримати всі pending orders
  // ============================================
  if (req.method === 'GET') {
    try {
      // Перевірка авторизації (опціонально)
      const authHeader = req.headers.authorization;
      const expectedAuth = 'Bearer ' + (process.env.CAMPAIGN_SECRET || 'YFHDNBR6TR746hfgdyepjd');
      
      if (authHeader !== expectedAuth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Читаємо файл
      let pendingOrders = [];
      try {
        const content = await fs.readFile(pendingFile, 'utf-8');
        pendingOrders = JSON.parse(content);
      } catch (e) {
        // Файл не існує або порожній
        console.log('[Pending API] No pending orders file found');
      }
      
      // Фільтруємо тільки pending (не confirmed)
      const pending = pendingOrders.filter(order => 
        order.status !== 'confirmed' && order.status !== 'cancelled'
      );
      
      // Сортуємо за датою (нові перші)
      pending.sort((a, b) => {
        const timeA = a.updated_at || a.created_at || a.timestamp || 0;
        const timeB = b.updated_at || b.created_at || b.timestamp || 0;
        return timeB - timeA;
      });
      
      console.log('[Pending API] ✅ Retrieved', pending.length, 'pending orders');
      
      return res.status(200).json({
        ok: true,
        orders: pending,
        total: pending.length
      });
      
    } catch (error) {
      console.error('[Pending API] ❌ GET error:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve orders',
        details: error.message 
      });
    }
  }
  
  // ============================================
  // POST: Оновити статус замовлення
  // ============================================
  if (req.method === 'POST') {
    try {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const data = JSON.parse(raw || '{}');
      
      const { order_id, status, action } = data;
      
      if (!order_id) {
        return res.status(400).json({ error: 'order_id required' });
      }
      
      // Перевірка авторизації
      const authHeader = req.headers.authorization;
      const expectedAuth = 'Bearer ' + (process.env.CAMPAIGN_SECRET || 'YFHDNBR6TR746hfgdyepjd');
      
      if (authHeader !== expectedAuth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Читаємо файл
      let pendingOrders = [];
      try {
        const content = await fs.readFile(pendingFile, 'utf-8');
        pendingOrders = JSON.parse(content);
      } catch (e) {
        return res.status(404).json({ error: 'No pending orders found' });
      }
      
      // Знаходимо замовлення
      const orderIndex = pendingOrders.findIndex(o => o.order_id === order_id);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Обробка action
      if (action === 'confirm') {
        // Підтверджуємо оплату
        pendingOrders[orderIndex].status = 'confirmed';
        pendingOrders[orderIndex].confirmed_at = Date.now();
        
        console.log('[Pending API] ✅ Order confirmed:', order_id);
        
      } else if (action === 'delete') {
        // Видаляємо замовлення
        pendingOrders.splice(orderIndex, 1);
        
        console.log('[Pending API] ✅ Order deleted:', order_id);
        
      } else if (status) {
        // Оновлюємо статус
        pendingOrders[orderIndex].status = status;
        pendingOrders[orderIndex].updated_at = Date.now();
        
        console.log('[Pending API] ✅ Order status updated:', order_id, '->', status);
      }
      
      // Зберігаємо
      await fs.writeFile(pendingFile, JSON.stringify(pendingOrders, null, 2));
      
      return res.status(200).json({ 
        ok: true,
        message: action === 'delete' ? 'Order deleted' : 'Order updated',
        order_id: order_id
      });
      
    } catch (error) {
      console.error('[Pending API] ❌ POST error:', error);
      return res.status(500).json({ 
        error: 'Failed to update order',
        details: error.message 
      });
    }
  }
  
  // ============================================
  // DELETE: Видалити замовлення
  // ============================================
  if (req.method === 'DELETE') {
    try {
      const order_id = req.query.order_id;
      
      if (!order_id) {
        return res.status(400).json({ error: 'order_id required' });
      }
      
      // Перевірка авторизації
      const authHeader = req.headers.authorization;
      const expectedAuth = 'Bearer ' + (process.env.CAMPAIGN_SECRET || 'YFHDNBR6TR746hfgdyepjd');
      
      if (authHeader !== expectedAuth) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Читаємо файл
      let pendingOrders = [];
      try {
        const content = await fs.readFile(pendingFile, 'utf-8');
        pendingOrders = JSON.parse(content);
      } catch (e) {
        return res.status(404).json({ error: 'No pending orders found' });
      }
      
      // Видаляємо
      const filtered = pendingOrders.filter(o => o.order_id !== order_id);
      
      if (filtered.length === pendingOrders.length) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Зберігаємо
      await fs.writeFile(pendingFile, JSON.stringify(filtered, null, 2));
      
      console.log('[Pending API] ✅ Order deleted:', order_id);
      
      return res.status(200).json({ 
        ok: true,
        message: 'Order deleted',
        order_id: order_id
      });
      
    } catch (error) {
      console.error('[Pending API] ❌ DELETE error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete order',
        details: error.message 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
