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
  subject: '🔥 Black Friday: 25% off ISRIB — 48h only',
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000000;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    
    <!-- Hero Banner -->
    <div style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;box-shadow:0 8px 24px rgba(220,38,38,0.3);">
      <div style="font-size:48px;margin-bottom:8px;">🔥</div>
      <h1 style="color:#fff;font-size:32px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">BLACK FRIDAY</h1>
      <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin-top:16px;">
        <div style="color:#fca5a5;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Exclusive Offer</div>
        <div style="color:#fff;font-size:42px;font-weight:900;line-height:1;">25% OFF</div>
        <div style="color:#fecaca;font-size:16px;margin-top:8px;font-weight:600;">All Research Compounds</div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="background:#111827;border-radius:16px;padding:32px 24px;margin-bottom:24px;">
      <p style="color:#f3f4f6;font-size:18px;line-height:1.6;margin:0 0 16px;font-weight:600;">Hi {{firstName}},</p>
      
      <p style="color:#d1d5db;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Black Friday is here. For the next <strong style="color:#fff;">48 hours only</strong>, take 25% off your entire order with code <strong style="color:#fca5a5;">BLACK25</strong>.
      </p>

      <!-- Product Grid -->
      <div style="background:#1f2937;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#f9fafb;margin:0 0 16px;font-size:18px;">In Stock Now:</h3>
        
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #374151;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#e5e7eb;font-weight:600;">ISRIB A15</span>
            <span style="color:#9ca3af;font-size:14px;">98%+ purity</span>
          </div>
        </div>
        
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #374151;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#e5e7eb;font-weight:600;">ZZL-7</span>
            <span style="color:#9ca3af;font-size:14px;">Rapid acting</span>
          </div>
        </div>
        
        <div style="margin-bottom:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#e5e7eb;font-weight:600;">ISRIB Original</span>
            <span style="color:#9ca3af;font-size:14px;">Lab grade</span>
          </div>
        </div>
      </div>

      <!-- Promo Code Box -->
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="color:#fecaca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Code</div>
        <div style="background:#991b1b;border-radius:8px;padding:16px;border:2px dashed #fca5a5;">
          <div style="color:#fff;font-size:32px;font-weight:900;font-family:monospace;letter-spacing:2px;">BLACK25</div>
        </div>
        <div style="color:#fecaca;font-size:13px;margin-top:12px;font-weight:600;">Valid until Sunday, midnight GMT</div>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://isrib.shop/products.html?promo=BLACK25&utm_source=email&utm_campaign=black_friday&utm_content={{firstName}}" 
           style="display:inline-block;background:#dc2626;color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:800;font-size:18px;box-shadow:0 4px 12px rgba(220,38,38,0.4);">
          🛒 Shop Black Friday Sale
        </a>
      </div>

      <!-- Benefits -->
      <div style="background:#1f2937;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#10b981;font-size:14px;margin-bottom:12px;display:flex;align-items:center;">
          <span style="margin-right:8px;">✓</span>
          <span>Free worldwide shipping on all orders</span>
        </div>
        <div style="color:#10b981;font-size:14px;margin-bottom:12px;display:flex;align-items:center;">
          <span style="margin-right:8px;">✓</span>
          <span>Verified COA with every purchase</span>
        </div>
        <div style="color:#10b981;font-size:14px;display:flex;align-items:center;">
          <span style="margin-right:8px;">✓</span>
          <span>Discrete packaging, fast processing</span>
        </div>
      </div>

      <!-- Urgency -->
      <div style="background:#7c2d12;border-left:4px solid #dc2626;padding:16px;border-radius:8px;">
        <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">
          <strong>⏰ Limited time:</strong> This is our biggest discount of the year. Ends Sunday, November 30 at midnight GMT.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #374151;padding-top:20px;margin-top:40px;">
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0 0 8px;">
        Research compounds • Worldwide shipping • Verified COA
      </p>
      <p style="color:#6b7280;font-size:12px;margin:0;">
        <a href="https://isrib.shop/unsubscribe?email={{email}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
      </p>
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
        // ⚡ КРИТИЧНО: ПЕРЕВІРКА UNSUBSCRIBE ПЕРЕД ВІДПРАВКОЮ
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
          
          // ⚠️ ВАЖЛИВО: пропускаємо ітерацію БЕЗ затримки
          continue;
        }

        // Тільки якщо НЕ unsubscribed - персоналізуємо та відправляємо
        const personalizedHtml = personalizeEmail(template.html, customer);
        const personalizedSubject = personalizeSubject(template.subject, customer);

        const result = await resend.emails.send({
          from: 'Danylo from ISRIB <noreply@isrib.shop>',
          to: customer.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          
          replyTo: 'isrib.shop@protonmail.com',
          
          headers: {
            'List-Unsubscribe': `<https://isrib.shop/unsubscribe?email=${encodeURIComponent(customer.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Entity-Ref-ID': `campaign-${campaignId}-${Date.now()}`,
            'X-Campaign-Type': 'transactional',
          },
          
          tags: [
            { name: 'campaign', value: campaignId },
            { name: 'batch', value: 'relaunch' }
          ]
        });

        console.log(`✓ [${i+1}/${customerList.length}] Sent to ${customer.email} (${customer.firstName}) - ID: ${result.id}`);
        results.sent++;

        // Затримка ТІЛЬКИ для відправлених emails
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
