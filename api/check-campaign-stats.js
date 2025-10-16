import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const { secret } = req.query;
    
    if (secret !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // ⚡ ВИПРАВЛЕННЯ: Resend не має list() методу
    // Використовуємо альтернативний підхід через batch tracking
    
    // Читаємо результати з Vercel logs або використовуємо tags
    // Для швидкого рішення - перевіримо через Resend Dashboard API
    
    const stats = {
      message: 'Resend API limitations detected',
      solution: 'Use Resend Dashboard for detailed stats',
      dashboardUrl: 'https://resend.com/emails',
      instructions: [
        '1. Open Resend Dashboard',
        '2. Go to Emails section',
        '3. Filter by tag: campaign=1',
        '4. View individual email stats'
      ],
      alternativeMethod: 'Check manual tracking below'
    };

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
