import unsubscribeStore from '../lib/unsubscribe-store.js';

export default async function handler(req, res) {
  try {
    const testEmail = 'test@example.com';
    
    console.log('[TEST] Adding test email...');
    await unsubscribeStore.add(testEmail);
    
    console.log('[TEST] Checking if exists...');
    const exists = await unsubscribeStore.has(testEmail);
    
    console.log('[TEST] Getting total count...');
    const total = await unsubscribeStore.size();
    
    console.log('[TEST] Getting all emails...');
    const all = await unsubscribeStore.getAll();
    
    console.log('[TEST] Removing test email...');
    await unsubscribeStore.remove(testEmail);
    
    console.log('[TEST] Verifying removal...');
    const existsAfter = await unsubscribeStore.has(testEmail);
    
    return res.status(200).json({
      success: true,
      results: {
        added: true,
        existsBefore: exists,
        totalCount: total,
        allEmails: all.slice(0, 5), // показати перші 5
        removed: true,
        existsAfter: existsAfter
      },
      message: '✅ Redis working correctly!'
    });
    
  } catch (error) {
    console.error('[TEST] Redis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
