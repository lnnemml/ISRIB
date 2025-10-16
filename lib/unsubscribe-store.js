// lib/unsubscribe-store.js
import { Redis } from '@upstash/redis';

// Ініціалізація Redis client з env змінних Vercel
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.REDIS_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN,
});

class UnsubscribeStore {
  
  async add(email) {
    const normalized = email.trim().toLowerCase();
    
    try {
      await redis.set(`unsub:${normalized}`, {
        unsubscribed: true,
        timestamp: Date.now(),
        email: normalized
      });
      
      console.log('[Unsubscribe Store] Added to Redis:', normalized);
      return true;
    } catch (error) {
      console.error('[Unsubscribe Store] Redis add failed:', error);
      return false;
    }
  }

  async has(email) {
    const normalized = email.trim().toLowerCase();
    
    try {
      const data = await redis.get(`unsub:${normalized}`);
      return data?.unsubscribed === true;
    } catch (error) {
      console.error('[Unsubscribe Store] Redis check failed:', error);
      return false;
    }
  }

  async remove(email) {
    const normalized = email.trim().toLowerCase();
    
    try {
      await redis.del(`unsub:${normalized}`);
      console.log('[Unsubscribe Store] Removed from Redis:', normalized);
      return true;
    } catch (error) {
      console.error('[Unsubscribe Store] Redis remove failed:', error);
      return false;
    }
  }

  async getAll() {
    try {
      const keys = await redis.keys('unsub:*');
      const emails = keys.map(key => key.replace('unsub:', ''));
      return emails;
    } catch (error) {
      console.error('[Unsubscribe Store] Redis getAll failed:', error);
      return [];
    }
  }

  async size() {
    try {
      const keys = await redis.keys('unsub:*');
      return keys.length;
    } catch (error) {
      console.error('[Unsubscribe Store] Redis size failed:', error);
      return 0;
    }
  }
}

const store = new UnsubscribeStore();

export default store;
