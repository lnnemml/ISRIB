import unsubscribeStore from '../lib/unsubscribe-store.js';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // AUTH: перевірка secret key в query параметрах
    const { secret } = req.query;
    if (secret !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Отримуємо всі ключі
    const keys = await redis.keys('unsub:*');
    
    if (keys.length === 0) {
      return res.status(200).json({
        total: 0,
        recent24h: 0,
        emails: []
      });
    }

    // Отримуємо дані для кожного email
    const emailsData = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        return {
          email: data.email,
          timestamp: data.timestamp,
          unsubscribed: data.unsubscribed
        };
      })
    );

    // Фільтруємо тільки активні unsubscribe
    const activeUnsubscribes = emailsData.filter(item => item.unsubscribed);

    // Рахуємо за останні 24 години
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recent24h = activeUnsubscribes.filter(
      item => item.timestamp > oneDayAgo
    ).length;

    // Сортуємо за датою (найновіші спочатку)
    const sorted = activeUnsubscribes.sort((a, b) => b.timestamp - a.timestamp);

    return res.status(200).json({
      total: sorted.length,
      recent24h,
      emails: sorted
    });

  } catch (error) {
    console.error('[Unsubscribe List] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch unsubscribe list',
      details: error.message 
    });
  }
}
