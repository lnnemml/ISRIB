// api/test-qstash-receiver.js
// Простий receiver для тестування QStash
export default async function handler(req, res) {
  console.log('🎯 Test QStash Receiver called!');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  let body = '';
  await new Promise((resolve) => {
    req.on('data', (c) => body += c);
    req.on('end', resolve);
  });
  
  console.log('Body:', body);
  
  try {
    const data = JSON.parse(body || '{}');
    console.log('Parsed data:', data);
    
    return res.status(200).json({
      received: true,
      timestamp: new Date().toISOString(),
      data
    });
  } catch (e) {
    return res.status(200).json({
      received: true,
      error: 'Parse failed',
      raw_body: body
    });
  }
}

export const config = { api: { bodyParser: false } };
