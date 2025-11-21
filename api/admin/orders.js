// api/admin/orders.js
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
    const format = req.query.format || 'json'; // 'json' | 'html'

    // Отримуємо замовлення та статистику
    const [orders, stats] = await Promise.all([
      getAllPendingOrders(limit, offset),
      getOrdersStats()
    ]);

    // Якщо запитано HTML - повертаємо dashboard
    if (format === 'html') {
      const html = generateDashboardHTML(orders, stats, limit, offset);
      return res.status(200).setHeader('Content-Type', 'text/html').send(html);
    }

    // Інакше повертаємо JSON
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
    console.error('[Admin] ❌ Error fetching orders:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

function generateDashboardHTML(orders, stats, limit, offset) {
  const statusColors = {
    'pending_payment': '#fbbf24',
    'confirmed': '#10b981',
    'shipped': '#3b82f6',
    'cancelled': '#ef4444'
  };

  const statusLabels = {
    'pending_payment': 'Pending Payment',
    'confirmed': 'Confirmed',
    'shipped': 'Shipped',
    'cancelled': 'Cancelled'
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orders Dashboard — ISRIB Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #10b981;
    }

    .subtitle {
      color: #64748b;
      font-size: 14px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 32px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .stat-label {
      color: #64748b;
      font-size: 14px;
    }

    .orders {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .orders-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .orders-title {
      font-size: 18px;
      font-weight: 700;
    }

    .filter-controls {
      display: flex;
      gap: 12px;
    }

    select, input {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f8fafc;
      padding: 12px 24px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }

    td {
      padding: 16px 24px;
      border-top: 1px solid #f1f5f9;
    }

    tr:hover {
      background: #f8fafc;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .order-id {
      font-family: monospace;
      font-weight: 700;
      color: #f59e0b;
      font-size: 13px;
    }

    .customer-name {
      font-weight: 600;
      color: #1e293b;
    }

    .customer-email {
      color: #64748b;
      font-size: 13px;
    }

    .amount {
      font-weight: 700;
      color: #10b981;
      font-size: 16px;
    }

    .action-btn {
      padding: 6px 16px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }

    .action-btn:hover {
      background: #059669;
    }

    .action-btn.secondary {
      background: #3b82f6;
    }

    .action-btn.secondary:hover {
      background: #2563eb;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      padding: 80px 24px;
      text-align: center;
      color: #94a3b8;
    }

    .pagination {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }

    .pagination-info {
      color: #64748b;
      font-size: 14px;
    }

    .refresh-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .refresh-btn:hover {
      background: #059669;
    }

    @media (max-width: 768px) {
      body { padding: 12px; }
      
      .stats {
        grid-template-columns: 1fr;
      }

      table {
        font-size: 13px;
      }

      th, td {
        padding: 12px;
      }

      .actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Orders Dashboard</h1>
      <p class="subtitle">Manage and track all pending orders</p>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">${stats.by_status.pending_payment || 0}</div>
        <div class="stat-label">Pending Payment</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">${stats.by_status.confirmed || 0}</div>
        <div class="stat-label">Confirmed</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">$${stats.total_value.toFixed(2)}</div>
        <div class="stat-label">Total Value</div>
      </div>
    </div>

    <div class="orders">
      <div class="orders-header">
        <h2 class="orders-title">Recent Orders</h2>
        <div class="filter-controls">
          <select id="statusFilter" onchange="filterOrders()">
            <option value="">All Statuses</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      ${orders.length === 0 ? `
        <div class="empty-state">
          <p>No orders found</p>
        </div>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr data-status="${order.status}">
                <td>
                  <span class="order-id">${order.order_id}</span>
                </td>
                <td>
                  <div class="customer-name">${order.firstName} ${order.lastName}</div>
                  <div class="customer-email">${order.email}</div>
                </td>
                <td>
                  <span class="status-badge" style="background: ${statusColors[order.status] || '#94a3b8'}20; color: ${statusColors[order.status] || '#94a3b8'}">
                    ${statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td>
                  <span class="amount">$${order.total.toFixed(2)}</span>
                </td>
                <td>
                  ${new Date(order.created_at || order.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td>
                  <div class="actions">
                    ${order.status === 'pending_payment' ? `
                      <a href="/api/admin/confirm-payment?order_id=${order.order_id}&secret=${process.env.ADMIN_SECRET}" 
                         class="action-btn"
                         onclick="return confirm('Confirm payment for order ${order.order_id}?')">
                        ✓ Confirm
                      </a>
                    ` : ''}
                    <button class="action-btn secondary" onclick="viewOrder('${order.order_id}')">
                      View
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="pagination">
          <div class="pagination-info">
            Showing ${offset + 1} - ${Math.min(offset + limit, stats.total)} of ${stats.total}
          </div>
          <div class="pagination-controls">
            ${offset > 0 ? `
              <a href="?secret=${process.env.ADMIN_SECRET}&format=html&offset=${Math.max(0, offset - limit)}&limit=${limit}" 
                 class="action-btn secondary">
                ← Previous
              </a>
            ` : ''}
            ${offset + limit < stats.total ? `
              <a href="?secret=${process.env.ADMIN_SECRET}&format=html&offset=${offset + limit}&limit=${limit}" 
                 class="action-btn secondary">
                Next →
              </a>
            ` : ''}
          </div>
        </div>
      `}
    </div>
  </div>

  <button class="refresh-btn" onclick="location.reload()" title="Refresh">
    ↻
  </button>

  <script>
    function filterOrders() {
      const filter = document.getElementById('statusFilter').value;
      const rows = document.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        if (!filter || row.dataset.status === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function viewOrder(orderId) {
      // TODO: Implement order detail modal
      alert('Order details for: ' + orderId);
    }

    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
  `;
}
