import unsubscribeStore from '../lib/unsubscribe-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const { email, secret } = JSON.parse(raw || '{}');

    // AUTH: перевірка secret key
    if (secret !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Перевірка чи email існує в unsubscribe списку
    const exists = await unsubscribeStore.has(normalizedEmail);
    
    if (!exists) {
      return res.status(404).json({ 
        error: 'Email not found in unsubscribe list',
        email: normalizedEmail 
      });
    }

    // Видаляємо з Redis
    await unsubscribeStore.remove(normalizedEmail);

    console.log('[Resubscribe] Email removed from unsubscribe list:', normalizedEmail);

    return res.status(200).json({
      success: true,
      message: 'Email resubscribed successfully',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('[Resubscribe] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to resubscribe email',
      details: error.message 
    });
  }
}

export const config = { 
  api: { 
    bodyParser: false 
  } 
};
