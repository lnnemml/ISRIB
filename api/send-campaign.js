import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates (inline для простоти)
const TEMPLATES = {
  '1': {
    subject: 'New site — ISRIB.shop is live + FREE shipping',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    /* Force light mode */
    :root {
      color-scheme: light only;
      supported-color-schemes: light;
    }
    /* Prevent dark mode overrides */
    [data-ogsc] .header-title,
    [data-ogsb] .header-title {
      color: #ffffff !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header with dark mode protection -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 24px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#0ea5e9;letter-spacing:1px;margin-bottom:12px;">ISRIB.SHOP</div>
      <!--[if !mso]><!-->
      <h1 class="header-title" style="color:#ffffff !important;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px;-webkit-text-fill-color:#ffffff;">We've moved</h1>
      <!--<![endif]-->
      <!--[if mso]>
      <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px;">We've moved</h1>
      <![endif]-->
    </div>
    
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">We've moved to a new platform: <strong style="color:#1e293b;">ISRIB.shop</strong></p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">Everything rebuilt — cleaner checkout, faster shipping updates, same compounds you know.</p>
      
      <!-- FREE SHIPPING BANNER -->
      <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px;padding:18px 20px;margin:0 0 24px;text-align:center;box-shadow:0 4px 12px rgba(16,185,129,0.2);">
        <div style="font-size:28px;line-height:1;margin-bottom:8px;">🚚</div>
        <div style="color:#ffffff !important;font-size:17px;font-weight:700;margin-bottom:4px;letter-spacing:0.5px;-webkit-text-fill-color:#ffffff;">FREE WORLDWIDE SHIPPING</div>
        <div style="color:#d1fae5;font-size:13px;font-weight:500;">on all orders — limited-time launch offer</div>
      </div>
      
      <div style="background:#f8fafc;border-left:3px solid #0ea5e9;padding:16px 20px;margin:0 0 24px;border-radius:6px;">
        <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 10px;">What's available:</p>
        <ul style="color:#475569;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
          <li>ISRIB A15 — most popular, 98%+ purity</li>
          <li>ZZL-7 — rapid acting antidepressant</li>
          <li>ISRIB — original research compound</li>
        </ul>
      </div>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">Since you were a previous customer, here's your code:</p>
      
      <div style="background:#fef3c7;border:2px dashed #f59e0b;padding:20px;text-align:center;border-radius:8px;margin:0 0 24px;">
        <div style="font-family:Monaco,Courier,monospace;font-size:24px;font-weight:bold;color:#92400e;letter-spacing:2px;">RETURN15</div>
        <p style="color:#92400e;font-size:13px;margin:8px 0 0 0;">15% off — valid 72 hours</p>
      </div>
      
      <div style="text-align:center;margin:0 0 28px;">
        <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content=email1" style="display:inline-block;background:#000000;color:#ffffff !important;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Visit ISRIB.shop</a>
      </div>
      
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">All compounds fresh-synthesized, <strong>free worldwide shipping</strong>, discreet packaging.</p>
    </div>
    
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Research-grade compounds • Verified analysis • Free shipping worldwide</p>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 12px;">ISRIB Shop | <a href="https://isrib.shop" style="color:#64748b;text-decoration:none;">isrib.shop</a></p>
      <p style="margin:0;"><a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  '2': {
    subject: 'RETURN15 + FREE shipping expires tonight',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    /* Force light mode */
    :root {
      color-scheme: light only;
      supported-color-schemes: light;
    }
    /* Prevent dark mode overrides */
    [data-ogsc] .header-title,
    [data-ogsb] .header-title {
      color: #ffffff !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header with dark mode protection -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 24px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#0ea5e9;letter-spacing:1px;margin-bottom:12px;">ISRIB.SHOP</div>
      <!--[if !mso]><!-->
      <h1 class="header-title" style="color:#ffffff !important;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;-webkit-text-fill-color:#ffffff;">Last call</h1>
      <!--<![endif]-->
      <!--[if mso]>
      <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px;">Last call</h1>
      <![endif]-->
    </div>
    
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">Last call — <strong style="color:#1e293b;">RETURN15</strong> closes at midnight (GMT).</p>
      
      <!-- FREE SHIPPING BANNER -->
      <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px;padding:18px 20px;margin:0 0 24px;text-align:center;box-shadow:0 4px 12px rgba(16,185,129,0.2);">
        <div style="font-size:28px;line-height:1;margin-bottom:8px;">🚚</div>
        <div style="color:#ffffff !important;font-size:17px;font-weight:700;margin-bottom:4px;letter-spacing:0.5px;-webkit-text-fill-color:#ffffff;">FREE WORLDWIDE SHIPPING</div>
        <div style="color:#d1fae5;font-size:13px;font-weight:500;">still active — limited-time launch offer</div>
      </div>
      
      <div style="background:#f8fafc;padding:18px 20px;margin:0 0 24px;border-radius:6px;border-left:3px solid #10b981;">
        <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 10px;">Researchers have been restocking:</p>
        <ul style="color:#475569;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
          <li>ISRIB A15 (most ordered)</li>
          <li>ZZL-7 + A15 stacks</li>
        </ul>
      </div>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">If you're planning experiments this quarter, this is the window — <strong>15% off + free shipping</strong>.</p>
      
      <div style="background:#fef2f2;border-left:3px solid #ef4444;padding:16px 20px;margin:0 0 24px;border-radius:6px;">
        <p style="color:#991b1b;font-size:14px;font-weight:600;margin:0 0 4px;">⏰ Code expires tonight</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;font-family:Monaco,Courier,monospace;letter-spacing:1px;"><strong>RETURN15</strong> — valid until midnight GMT</p>
      </div>
      
      <div style="text-align:center;margin:0 0 28px;">
        <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content=email2" style="display:inline-block;background:#000000;color:#ffffff !important;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Order now</a>
      </div>
      
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;text-align:center;font-style:italic;">If you're not ordering this round, no problem — we'll be here when you need us.</p>
    </div>
    
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Research-grade compounds • Free shipping worldwide • Verified analysis</p>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 12px;">ISRIB Shop | <a href="https://isrib.shop" style="color:#64748b;text-decoration:none;">isrib.shop</a></p>
      <p style="margin:0;"><a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  }
};

function personalizeEmail(html, customer) {
  return html.replace(/{{firstName}}/g, customer.firstName || 'there');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  // Security: only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const { campaignId, customers, secretKey } = JSON.parse(raw || '{}');

    // Security check
    if (secretKey !== process.env.CAMPAIGN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validation
    if (!campaignId || !['1', '2'].includes(campaignId)) {
      return res.status(400).json({ error: 'Invalid campaignId. Use "1" or "2"' });
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'No customers provided' });
    }

    if (customers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 emails per batch (free tier limit)' });
    }

    // Get template
    const template = TEMPLATES[campaignId];
    
    const results = {
      total: customers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send emails with delay between each
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        const personalizedHtml = personalizeEmail(template.html, customer);

        const result = await resend.emails.send({
          from: 'ISRIB Shop <alex@isrib.shop>',
          to: customer.email,
          subject: template.subject,
          html: personalizedHtml,
          headers: {
            'List-Unsubscribe': '<mailto:isrib.shop@protonmail.com?subject=unsubscribe>',
            'X-Priority': '1',
            'Importance': 'high'
          }
        });

        console.log(`✓ Sent to ${customer.email} (ID: ${result.id})`);
        results.sent++;

        // Small delay between emails (1 second)
        if (i < customers.length - 1) {
          await sleep(1000);
        }

      } catch (error) {
        console.error(`✗ Failed ${customer.email}: ${error.message}`);
        results.failed++;
        results.errors.push({ email: customer.email, error: error.message });
      }
    }

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
