import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ ФІНАЛЬНІ TEMPLATES (Primary Tab optimized + Free Shipping)
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
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Hi {{firstName}},
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Quick update — we've moved ISRIB to a new platform: <strong>isrib.shop</strong>
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Everything's rebuilt: cleaner checkout, faster shipping updates, same research-grade compounds.
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Since you ordered before, here's <strong>RETURN15</strong> for 15% off (valid 72 hours).
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Plus: <strong>worldwide shipping included</strong> on all orders.
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 24px;">
      → <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content={{firstName}}" 
         style="color:#0ea5e9;text-decoration:none;font-weight:600;">Visit isrib.shop</a>
    </p>
    
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Available now:
    </p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;padding-left:20px;">
      • ISRIB A15 (98%+ purity)<br>
      • ZZL-7 (rapid acting)<br>
      • ISRIB (original compound)
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">
      Thanks for being a customer,
    </p>
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 32px;">
      Alex<br>
      <span style="color:#64748b;font-size:14px;">ISRIB Shop</span>
    </p>
    
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:40px;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
        Research compounds • Verified COA • Worldwide shipping
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" 
           style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>`
  },
  
  '2': {
    subject: '{{firstName}}, RETURN15 expires tonight',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;">
  <div style="max-width:600px;margin:40px auto;padding:0 20px;">
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Hi {{firstName}},
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Just a heads up — your <strong>RETURN15</strong> code expires at midnight GMT tonight.
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 16px;">
      If you're planning experiments this quarter, this is the window (15% off + worldwide shipping included).
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 24px;">
      → <a href="https://isrib.shop/products.html?promo=RETURN15&utm_source=email&utm_campaign=relaunch&utm_content={{firstName}}" 
         style="color:#0ea5e9;text-decoration:none;font-weight:600;">Order on isrib.shop</a>
    </p>
    
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;font-style:italic;">
      Not ordering this round? No problem — we'll be here when you need us.
    </p>
    
    <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 8px;">
      Alex<br>
      <span style="color:#64748b;font-size:14px;">ISRIB Shop</span>
    </p>
    
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:40px;">
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
        Research compounds • Worldwide shipping • Verified COA
      </p>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        <a href="mailto:isrib.shop@protonmail.com?subject=Unsubscribe" 
           style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>`
  }
};

// ✅ Персоналізація HTML
function personalizeEmail(html, customer) {
  return html
    .replace(/{{firstName}}/g, customer.firstName || 'there')
    .replace(/{{email}}/g, customer.email || '');
}

// ✅ Персоналізація Subject
function personalizeSubject(subject, customer) {
  return subject
    .replace(/{{firstName}}/g, customer.firstName || 'there');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    const template = TEMPLATES[campaignId];
    
    const results = {
      total: customers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send emails with delay
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        const personalizedHtml = personalizeEmail(template.html, customer);
        const personalizedSubject = personalizeSubject(template.subject, customer);

        const result = await resend.emails.send({
          from: 'Alex from ISRIB <alex@isrib.shop>',
          to: customer.email,
          subject: personalizedSubject,
          html: personalizedHtml,
          
          // ✅ Headers для deliverability
          headers: {
            'List-Unsubscribe': '<mailto:isrib.shop@protonmail.com?subject=unsubscribe>',
            'X-Entity-Ref-ID': `campaign-${campaignId}-${Date.now()}`,
          },
          
          // ✅ Tags для analytics
          tags: [
            { name: 'campaign', value: campaignId },
            { name: 'batch', value: 'relaunch' }
          ]
        });

        console.log(`✓ Sent to ${customer.email} (${customer.firstName}) - ID: ${result.id}`);
        results.sent++;

        // Delay 1 second between emails
        if (i < customers.length - 1) {
          await sleep(1000);
        }

      } catch (error) {
        console.error(`✗ Failed ${customer.email}: ${error.message}`);
        results.failed++;
        results.errors.push({ 
          email: customer.email, 
          error: error.message 
        });
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

export const config = { api: { bodyParser: false }
