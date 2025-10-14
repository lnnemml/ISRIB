import { Resend } from 'resend';

export default async function handler(req, res) {
  try {
    // Перевірка наявності API ключа
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'RESEND_API_KEY not found in environment variables' 
      });
    }

    console.log('[TEST] API Key exists');
    console.log('[TEST] API Key starts with:', process.env.RESEND_API_KEY.substring(0, 8));
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'ISRIB Orders <noreply@isrib.shop>',
      to: 'lnnemml@gmail.com',
      subject: 'Test Email - ' + new Date().toISOString(),
      html: '<h1>✅ Test Email</h1><p>If you see this, Resend integration works!</p>',
      text: 'Test email from Vercel + Resend'
    });
    
    console.log('[TEST] Email sent successfully:', result);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email sent!',
      emailId: result.id 
    });
    
  } catch (error) {
    console.error('[TEST] Error details:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      statusCode: error.statusCode,
      name: error.name
    });
  }
}
