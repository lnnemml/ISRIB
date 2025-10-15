import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TEMPLATES = {
  '1': {
    subject: '{{firstName}}, we moved to ISRIB.shop',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Quick update — we've moved ISRIB to a new platform: <strong>isrib.shop</strong></p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Everything's rebuilt: cleaner checkout, faster shipping updates, same research-grade compounds.</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Since you ordered before, here's <strong>RETURN15</strong> for 15% off (valid 72 hours).</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Plus: <strong>worldwide shipping included</strong> on all orders.</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 24px;">→ <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content={{firstName}}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">Visit isrib.shop</a></p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 8px;">Available now:</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;padding-left:20px;">• ISRIB A15 (98%+ purity)<br>• ZZL-7 (rapid acting)<br>• ISRIB (original compound)</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">Thanks for being a customer,</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 32px;">Danylo<br><span style="color:#64748b;font-size:14px;">ISRIB Shop</span></p>
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:40px;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">Research compounds • Verified COA • Worldwide shipping</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  '2': {
    subject: 'Re: {{firstName}}, we moved to ISRIB.shop',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Quick reminder — your <strong>RETURN15</strong> code expires at midnight GMT tonight.</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">If you're planning experiments this quarter, this is the window (15% off + worldwide shipping included).</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 24px;">→ <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content={{firstName}}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">Order on isrib.shop</a></p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;font-style:italic;">Not ordering this round? No problem — we'll be here when you need us.</p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">Alex<br><span style="color:#64748b;font-size:14px;">ISRIB Shop</span></p>
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:40px;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">Research compounds • Worldwide shipping • Verified COA</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  }
};

function personalizeEmail(html, customer) {
  return html
    .replace(/{{firstName}}/g, customer.firstName || 'there')
    .replace(/{{email}}/g, customer.email || '');
}

function personalizeSubject(subject, customer) {
  return subject
    .replace(/{{firstName}}/g, customer.firstName || 'there');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ ДОДАТКОВА ФУНКЦІЯ: shuffle для рандомізації порядку
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const { campaignId, customers, secretKey, shuffle } = JSON.parse(raw || '{}');

    if (secretKey !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!campaignId || !['1', '2'].includes(campaignId)) {
      return res.status(400).json({ error: 'Invalid campaignId. Use "1" or "2"' });
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'No customers provided' });
    }

    if (customers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 emails per batch (free tier limit)' });
    }

    const template = TEMPLATES[campaignId];
    
    // ✅ ОПЦІЯ: рандомізація порядку (ще один anti-spam сигнал)
    const customerList = shuffle ? shuffleArray(customers) : customers;
    
    const results = {
      total: customerList.length,
      sent: 0,
      failed: 0,
      errors: [],
      startTime: new Date().toISOString()
    };

    console.log(`\n🚀 Starting campaign ${campaignId} for ${customerList.length} customers`);
    console.log(`⏱️  Estimated time: ~${Math.round(customerList.length * 4 / 60)} minutes\n`);

    for (let i = 0; i < customerList.length; i++) {
      const customer = customerList[i];
      
      try {
        const personalizedHtml = personalizeEmail(template.html, customer);
        const personalizedSubject = personalizeSubject(template.subject, customer);

        const result = await resend.emails.send({
          from: 'Danylo from ISRIB <danylo@isrib.shop>',
          to: customer.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          
          // ✅ Replies приходять на danylo@isrib.shop
          replyTo: 'danylo@isrib.shop',
          
          headers: {
            'List-Unsubscribe': '<mailto:isrib.shop@protonmail.com?subject=unsubscribe>',
            'X-Entity-Ref-ID': `campaign-${campaignId}-${Date.now()}`,
            // ✅ Додатковий header для уникнення спаму
            'X-Campaign-Type': 'transactional',
          },
          
          tags: [
            { name: 'campaign', value: campaignId },
            { name: 'batch', value: 'relaunch' }
          ]
        });

        console.log(`✓ [${i+1}/${customerList.length}] Sent to ${customer.email} (${customer.firstName}) - ID: ${result.id}`);
        results.sent++;

        // ✅ КРИТИЧНО: Рандомна затримка 3-5 секунд
        if (i < customerList.length - 1) {
          const delay = 3000 + Math.random() * 2000; // 3000-5000ms
          console.log(`   ⏱️  Waiting ${(delay/1000).toFixed(1)}s before next email...`);
          await sleep(delay);
        }

      } catch (error) {
        console.error(`✗ [${i+1}/${customerList.length}] Failed ${customer.email}: ${error.message}`);
        results.failed++;
        results.errors.push({ 
          email: customer.email,
          firstName: customer.firstName,
          error: error.message 
        });
        
        // ✅ Якщо помилка - збільшуємо затримку
        if (i < customerList.length - 1) {
          console.log(`   ⚠️  Error detected, waiting 10s before retry...`);
          await sleep(10000);
        }
      }
    }

    results.endTime = new Date().toISOString();
    const duration = Math.round((new Date(results.endTime) - new Date(results.startTime)) / 1000);
    
    console.log(`\n✅ Campaign complete!`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Sent: ${results.sent}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Duration: ${Math.floor(duration/60)}m ${duration%60}s\n`);

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Campaign error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: false } };
