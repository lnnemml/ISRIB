import { Resend } from 'resend';
import unsubscribeStore from '../lib/unsubscribe-store.js'; 
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
      <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://isrib.shop/unsubscribe?email={{email}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
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
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">Danylo<br><span style="color:#64748b;font-size:14px;">ISRIB Shop</span></p>
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:40px;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">Research compounds • Worldwide shipping • Verified COA</p>
      <p style="color:#94a3b8;font-size:12px;margin:0;"><a href="https://isrib.shop/unsubscribe?email={{email}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  '3': {
    name: 'Black Friday - Consultative',
    subject: '{{firstName}}, a brief update',`
     html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brief Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #1a1a1a;">
  
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header: Simple, professional -->
    <div style="padding: 40px 30px 30px 30px; border-bottom: 1px solid #e5e5e5;">
      <div style="font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500;">
        ISRIB Research
      </div>
      <div style="font-size: 11px; color: #999; letter-spacing: 0.5px;">
        Research-Grade Compounds
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
        Hi ${customer.firstName},
      </p>
      
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
        I wanted to reach out personally about our Black Friday offering this year.
      </p>
      
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
        For the next few days, we're offering 25% off all compounds to our existing customers. I thought this might be a good opportunity if you were considering restocking or trying one of our other products.
      </p>
      
      <!-- Promo Code Box: Clean, minimal -->
      <div style="background: #f8f8f8; border-left: 3px solid #1a1a1a; padding: 20px 25px; margin: 30px 0;">
        <div style="font-size: 13px; color: #666; margin-bottom: 6px; letter-spacing: 0.5px;">
          Discount Code
        </div>
        <div style="font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: 1px; font-family: 'Courier New', monospace;">
          BLACK25
        </div>
        <div style="font-size: 13px; color: #666; margin-top: 6px;">
          25% off • Valid through Sunday
        </div>
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
        The code works on all our current inventory:
      </p>
      
      <!-- Product List: Clean, no hype -->
      <div style="margin: 20px 0 30px 0;">
        <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <div style="font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">
            ISRIB A15
          </div>
          <div style="font-size: 13px; color: #666;">
            98%+ purity, 500mg or 1000mg options
          </div>
        </div>
        
        <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <div style="font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">
            ZZL-7
          </div>
          <div style="font-size: 13px; color: #666;">
            Rapid-acting analog, 100mg
          </div>
        </div>
        
        <div style="padding: 12px 0;">
          <div style="font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px;">
            ISRIB Original
          </div>
          <div style="font-size: 13px; color: #666;">
            Lab-grade reference standard
          </div>
        </div>
      </div>
      
      <!-- CTA: Subtle, not aggressive -->
      <div style="margin: 30px 0;">
        <a href="https://isrib.shop/products.html?promo=BLACK25&utm_source=email&utm_campaign=bf_consultative&utm_content=${customer.firstName}" 
           style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 500; letter-spacing: 0.5px; border-radius: 4px;">
          View Products
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
        Best regards,<br>
        Danylo
      </p>
      
    </div>
    
    <!-- Footer: Professional -->
    <div style="padding: 30px; border-top: 1px solid #e5e5e5; background: #fafafa;">
      <div style="font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 15px;">
        <strong style="color: #1a1a1a;">ISRIB Research</strong><br>
        Research-grade compounds for qualified researchers<br>
        COA verification available upon request
      </div>
      
      <div style="font-size: 11px; color: #999; margin-bottom: 10px;">
        This email was sent to ${customer.email} because you previously ordered from ISRIB Shop.
      </div>
      
      <div style="font-size: 11px;">
        <a href="https://isrib.shop/unsubscribe?email=${customer.email}" 
           style="color: #666; text-decoration: underline;">
          Unsubscribe
        </a>
      </div>
    </div>
    
  </div>
  
</body>
</html>
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

    if (!campaignId || !['1', '2', '3'].includes(campaignId)) {
      return res.status(400).json({ error: 'Invalid campaignId. Use "1", "2", or "3"' });
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'No customers provided' });
    }

    if (customers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 emails per batch (free tier limit)' });
    }

    const template = TEMPLATES[campaignId];
    const customerList = shuffle ? shuffleArray(customers) : customers;
    
    const results = {
      total: customerList.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      skippedEmails: [],
      startTime: new Date().toISOString()
    };

    console.log(`\n🚀 Starting campaign ${campaignId} for ${customerList.length} customers`);
    console.log(`⏱️  Estimated time: ~${Math.round(customerList.length * 4 / 60)} minutes\n`);

    for (let i = 0; i < customerList.length; i++) {
  const customer = customerList[i];
  
  try {
    // ⚡ ПЕРЕВІРКА UNSUBSCRIBE
    const normalizedEmail = customer.email.trim().toLowerCase();
    const isUnsubscribed = await unsubscribeStore.has(normalizedEmail);
    
    if (isUnsubscribed) {
      console.log(`⊘ [${i+1}/${customerList.length}] SKIPPED (unsubscribed): ${customer.email}`);
      results.skipped++;
      results.skippedEmails.push({
        email: customer.email,
        firstName: customer.firstName,
        reason: 'unsubscribed'
      });
      continue;
    }

    // ✅ ПЕРСОНАЛІЗАЦІЯ КОНТЕНТУ
    const personalizedHtml = personalizeEmail(template.html, customer);
    
    // ✅ ПЕРСОНАЛІЗАЦІЯ SUBJECT (спеціально для Black Friday)
    let finalSubject = template.subject;
    
    // Для Black Friday (campaignId === '3') - використовуємо персоналізований subject
    if (campaignId === '3' && customer.firstName) {
      finalSubject = `${customer.firstName}, your BLACK25 code expires in 48h 🔥`;
    }
    
    const personalizedSubject = personalizeSubject(finalSubject, customer);

    // ✅ ВІДПРАВКА З HIGH PRIORITY HEADERS
    const result = await resend.emails.send({
      from: 'Danylo from ISRIB <noreply@isrib.shop>',
      to: customer.email,
      subject: personalizedSubject,
      html: personalizedHtml,
      
      replyTo: 'isrib.shop@protonmail.com',
      
      // ✅ КРИТИЧНО: HEADERS ДЛЯ ПОТРАПЛЯННЯ У ВАЖЛИВІ
      headers: {
        // Priority headers (Gmail, Outlook, Apple Mail)
        'Importance': 'high',
        'Priority': 'urgent',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        
        // Unsubscribe
        'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(customer.email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        
        // Entity reference
        'X-Entity-Ref-ID': `campaign-${campaignId}-${Date.now()}`,
        
        // ✅ ДОДАТКОВІ HEADERS ДЛЯ ENGAGEMENT
        'X-Campaign-Name': campaignId === '3' ? 'Black Friday 2024' : 'Relaunch',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
      },
      
      // ✅ TAGS ДЛЯ ANALYTICS
      tags: [
        { name: 'campaign', value: campaignId },
        { name: 'batch', value: campaignId === '3' ? 'black_friday' : 'relaunch' },
        { name: 'priority', value: campaignId === '3' ? 'high' : 'normal' },
        { name: 'personalized', value: customer.firstName ? 'yes' : 'no' }
      ]
    });

    console.log(`✓ [${i+1}/${customerList.length}] Sent to ${customer.email} (${customer.firstName}) - ID: ${result.id}`);
    results.sent++;

    // ⏱️ ЗАТРИМКА МІЖ ВІДПРАВКАМИ
    if (i < customerList.length - 1) {
      const delay = 3000 + Math.random() * 2000; // 3-5 секунд
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
    console.log(`   Skipped (unsubscribed): ${results.skipped}`);
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
