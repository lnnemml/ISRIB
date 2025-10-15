import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates (inline для простоти)
const TEMPLATES = {
  '1': {
    subject: 'ISRIB.shop — new platform now available',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#1e293b;padding:32px 24px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#0ea5e9;letter-spacing:1px;margin-bottom:12px;">ISRIB.SHOP</div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0;">We've moved</h1>
    </div>
    
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
        We've moved to a new platform: <strong style="color:#1e293b;">ISRIB.shop</strong>
      </p>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Everything rebuilt — cleaner checkout, faster shipping updates, same compounds you know.
      </p>
      
      <!-- ✅ Shipping benefit (знижений aggressive tone) -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:18px 20px;margin:0 0 24px;text-align:center;">
        <div style="font-size:24px;line-height:1;margin-bottom:8px;">🚚</div>
        <div style="color:#166534;font-size:16px;font-weight:600;margin-bottom:4px;">Worldwide shipping included</div>
        <div style="color:#15803d;font-size:13px;">Launch week offer</div>
      </div>
      
      <!-- Products -->
      <div style="background:#f8fafc;border-left:3px solid #0ea5e9;padding:16px 20px;margin:0 0 24px;border-radius:6px;">
        <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 10px;">Available now:</p>
        <ul style="color:#475569;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
          <li>ISRIB A15 — 98%+ purity</li>
          <li>ZZL-7 — rapid acting</li>
          <li>ISRIB — original compound</li>
        </ul>
      </div>
      
      <!-- ✅ Discount code (м'якший тон) -->
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        As a previous customer, use code <strong>RETURN15</strong> for 15% off your order.
      </p>
      
      <div style="background:#fef3c7;border:1px solid #fbbf24;padding:18px;text-align:center;border-radius:8px;margin:0 0 24px;">
        <div style="font-family:Monaco,Courier,monospace;font-size:22px;font-weight:bold;color:#92400e;letter-spacing:1px;">RETURN15</div>
        <p style="color:#92400e;font-size:13px;margin:8px 0 0 0;">Valid for 72 hours</p>
      </div>
      
      <!-- CTA -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch" 
           style="display:inline-block;background:#000000;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Visit ISRIB.shop
        </a>
      </div>
      
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">
        Research-grade compounds, verified analysis, discreet packaging.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
        Research compounds • Verified COA • Worldwide shipping
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 12px;">
        ISRIB Shop | <a href="https://isrib.shop" style="color:#64748b;text-decoration:none;">isrib.shop</a>
      </p>
      <p style="margin:0;">
        <a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" 
           style="color:#94a3b8;font-size:12px;text-decoration:underline;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
</body>
</html>`
  },

  '2': {
    subject: 'RETURN15 code expires tonight — ISRIB.shop',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <div style="background:#1e293b;padding:32px 24px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#0ea5e9;letter-spacing:1px;margin-bottom:12px;">ISRIB.SHOP</div>
      <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0;">Last call</h1>
    </div>
    
    <div style="padding:32px 24px;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{firstName}},</p>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Your <strong style="color:#1e293b;">RETURN15</strong> code expires at midnight GMT.
      </p>
      
      <!-- Shipping -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:18px 20px;margin:0 0 24px;text-align:center;">
        <div style="font-size:24px;line-height:1;margin-bottom:8px;">🚚</div>
        <div style="color:#166534;font-size:16px;font-weight:600;margin-bottom:4px;">Worldwide shipping included</div>
        <div style="color:#15803d;font-size:13px;">Still active through launch week</div>
      </div>
      
      <!-- Popular items -->
      <div style="background:#f8fafc;padding:18px 20px;margin:0 0 24px;border-radius:6px;border-left:3px solid #10b981;">
        <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 10px;">Popular orders:</p>
        <ul style="color:#475569;font-size:14px;line-height:1.7;margin:0;padding-left:18px;">
          <li>ISRIB A15 (most ordered)</li>
          <li>ZZL-7 + A15 stacks</li>
        </ul>
      </div>
      
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        If you're planning experiments this quarter, this is the window.
      </p>
      
      <!-- Urgency (м'який) -->
      <div style="background:#fef2f2;border-left:3px solid #ef4444;padding:16px 20px;margin:0 0 24px;border-radius:6px;">
        <p style="color:#991b1b;font-size:14px;font-weight:600;margin:0 0 4px;">Code expires tonight</p>
        <p style="color:#b91c1c;font-size:13px;margin:0;font-family:Monaco,Courier,monospace;">
          <strong>RETURN15</strong> — valid until midnight GMT
        </p>
      </div>
      
      <!-- CTA -->
      <div style="text-align:center;margin:0 0 28px;">
        <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch" 
           style="display:inline-block;background:#000000;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Order now
        </a>
      </div>
      
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;text-align:center;font-style:italic;">
        If you're not ordering this round, no problem — we'll be here when you need us.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid:#e5e7eb;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;">
        Research compounds • Worldwide shipping • Verified COA
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 12px;">
        ISRIB Shop | <a href="https://isrib.shop" style="color:#64748b;text-decoration:none;">isrib.shop</a>
      </p>
      <p style="margin:0;">
        <a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" 
           style="color:#94a3b8;font-size:12px;text-decoration:underline;">
          Unsubscribe
        </a>
      </p>
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
