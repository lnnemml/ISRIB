import { cleanupOldOrders, closeRedisConnection } from '../lib/redis.js';

async function main() {
  console.log('[Cleanup] Starting old orders cleanup...');
  
  try {
    // Видаляємо замовлення старіші за 30 днів
    const deleted = await cleanupOldOrders(30);
    
    console.log(`[Cleanup] ✅ Deleted ${deleted} old orders`);
    
  } catch (error) {
    console.error('[Cleanup] ❌ Error:', error);
    process.exit(1);
  } finally {
    await closeRedisConnection();
    process.exit(0);
  }
}

main();
