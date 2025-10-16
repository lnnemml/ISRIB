import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const { secret } = req.query;
    
    // Auth check
    if (secret !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Отримуємо останні 100 emails
    const emails = await resend.emails.list({ limit: 100 });

    // Фільтруємо по вашій кампанії (за останні 24 години)
    const campaignEmails = emails.data.filter(email => {
      const sentAt = new Date(email.created_at);
      const hoursAgo = (Date.now() - sentAt) / (1000 * 60 * 60);
      
      return hoursAgo < 24 && 
             email.subject?.includes('we moved to ISRIB.shop');
    });

    // Рахуємо статистику
    const stats = {
      total: campaignEmails.length,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      sent: 0,
      emails: []
    };

    for (const email of campaignEmails) {
      // Отримуємо детальну інфу по кожному email
      const details = await resend.emails.get(email.id);
      
      if (details.last_event === 'delivered') stats.delivered++;
      if (details.last_event === 'opened') stats.opened++;
      if (details.last_event === 'clicked') stats.clicked++;
      if (details.last_event === 'bounced') stats.bounced++;
      if (details.last_event === 'sent') stats.sent++;

      stats.emails.push({
        to: email.to,
        status: details.last_event,
        opened: details.last_event === 'opened' || details.last_event === 'clicked',
        clicked: details.last_event === 'clicked',
        sentAt: email.created_at
      });
    }

    // Рахуємо rates
    stats.openRate = stats.total > 0 
      ? `${((stats.opened / stats.total) * 100).toFixed(1)}%` 
      : '0%';
    
    stats.clickRate = stats.total > 0 
      ? `${((stats.clicked / stats.total) * 100).toFixed(1)}%` 
      : '0%';

    stats.deliveryRate = stats.total > 0 
      ? `${((stats.delivered / stats.total) * 100).toFixed(1)}%` 
      : '0%';

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
}
