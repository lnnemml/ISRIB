import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

// ─── helpers ────────────────────────────────────────────────────────────────

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeName(raw) {
  if (!raw) return 'there';
  // strip non-printable chars, trim, cap at 50
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 50);
  return cleaned || 'there';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function redisSet(key, value, exSeconds) {
  const url =
    process.env.UPSTASH_REDIS_REST_URL +
    '/set/' +
    encodeURIComponent(key) +
    '/' +
    encodeURIComponent(value) +
    '/ex/' +
    exSeconds;
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN },
  });
  if (!res.ok) throw new Error('Redis SET failed: ' + (await res.text()));
}

let tableEnsured = false;

async function ensureTable(sql) {
  if (tableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      source TEXT,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'active',
      unsubscribed_at TIMESTAMPTZ,
      email1_sent_at TIMESTAMPTZ,
      email2_sent_at TIMESTAMPTZ,
      email3_sent_at TIMESTAMPTZ,
      email4_sent_at TIMESTAMPTZ
    )
  `;
  tableEnsured = true;
}

const SUBJECTS = {
  1: "Your brain isn't broken — it's stuck",
  2: 'The lab accident that reversed brain damage',
  3: 'What actually happens in the first 72 hours',
  4: 'The complete ISRIB A15 protocol',
};

// ─── QStash signature verification ──────────────────────────────────────────

async function verifyQStashSignature(req, rawBody) {
  const sig = req.headers['upstash-signature'];
  if (!sig) return false;

  const parts = sig.split('.');
  if (parts.length !== 3) return false;

  const [headerB64, payloadB64] = parts;

  // decode payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return false;
  }

  // basic JWT claims
  if (payload.iss !== 'Upstash') return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  if (payload.sub !== 'https://isrib.shop/api/leads?action=send-email') return false;

  // verify HMAC-SHA256 over header.payload with each signing key
  const signingInput = headerB64 + '.' + payloadB64;

  for (const envKey of ['QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY']) {
    const secret = process.env[envKey];
    if (!secret) continue;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');
    if (hmac === parts[2]) return true;
  }

  return false;
}

// ─── actions ────────────────────────────────────────────────────────────────

async function handleSubscribe(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { email, name, source } = body;

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const cleanName = sanitizeName(name);
  const cleanSource = source ? String(source).slice(0, 100) : null;

  const sql = neon(process.env.DATABASE_URL);

  await ensureTable(sql);

  // duplicate check
  const existing = await sql`SELECT id FROM leads WHERE email = ${email}`;
  if (existing.length > 0) {
    res.status(200).json({ success: true, duplicate: true });
    return;
  }

  // insert
  await sql`INSERT INTO leads (email, name, source) VALUES (${email}, ${cleanName}, ${cleanSource})`;

  // Redis fast-status cache
  await redisSet('leads:' + email, 'active', 7776000);

  // enqueue 4 QStash jobs
  const targetUrl = 'https://isrib.shop/api/leads?action=send-email';
  const delays = ['0s', '86400s', '172800s', '259200s'];

  for (let i = 0; i < 4; i++) {
    const emailNumber = i + 1;
    const qstashRes = await fetch('https://qstash.upstash.io/v2/publish/' + targetUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.QSTASH_TOKEN,
        'Content-Type': 'application/json',
        'Upstash-Delay': delays[i],
      },
      body: JSON.stringify({ email, name: cleanName, emailNumber }),
    });
    if (!qstashRes.ok) {
      console.error('[leads] QStash enqueue failed for emailNumber', emailNumber, await qstashRes.text());
    }
  }

  res.status(200).json({ success: true });
}

async function handleSendEmail(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawBody = await readBody(req);

  const valid = await verifyQStashSignature(req, rawBody);
  if (!valid) {
    res.status(401).json({ error: 'Invalid QStash signature' });
    return;
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { email, name, emailNumber } = body;

  if (!email || !emailNumber) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  // check lead status
  const rows = await sql`SELECT status FROM leads WHERE email = ${email}`;
  if (rows.length === 0 || rows[0].status === 'unsubscribed') {
    res.status(200).json({ success: true, skipped: true });
    return;
  }

  // read HTML template
  const templatePath = path.join(process.cwd(), 'lib', 'emails', 'email' + emailNumber + '.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // generate unsubscribe token
  const token = crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(email)
    .digest('hex')
    .slice(0, 24);

  const unsubscribeUrl =
    'https://isrib.shop/api/leads?action=unsubscribe&email=' +
    encodeURIComponent(email) +
    '&token=' +
    token;

  // replace placeholders (plain string replace, no regex)
  html = html.split('{{EMAIL}}').join(email);
  html = html.split('{{NAME}}').join(name || 'there');
  html = html.split('{{UNSUBSCRIBE_URL}}').join(unsubscribeUrl);

  const subject = SUBJECTS[emailNumber];
  if (!subject) {
    res.status(400).json({ error: 'Unknown emailNumber' });
    return;
  }

  // send via Resend
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ISRIB Research <admin@isrib.shop>',
      reply_to: 'isrib.shop@gmail.com',
      to: email,
      subject,
      html,
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    throw new Error('Resend error: ' + err);
  }

  // mark sent in Neon — use explicit branches; dynamic column names can't be
  // parameterised in tagged-template SQL, so a CASE on a bound string value
  // would always/never match depending on the literal used.
  const n = Number(emailNumber);
  if (n === 1) await sql`UPDATE leads SET email1_sent_at = NOW() WHERE email = ${email}`;
  else if (n === 2) await sql`UPDATE leads SET email2_sent_at = NOW() WHERE email = ${email}`;
  else if (n === 3) await sql`UPDATE leads SET email3_sent_at = NOW() WHERE email = ${email}`;
  else if (n === 4) await sql`UPDATE leads SET email4_sent_at = NOW() WHERE email = ${email}`;

  res.status(200).json({ success: true });
}

async function handleUnsubscribe(req, res) {
  const url = new URL(req.url, 'https://isrib.shop');
  const email = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  if (!email || !token) {
    res.status(400).send('<html><body>Invalid unsubscribe link.</body></html>');
    return;
  }

  const expected = crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(email)
    .digest('hex')
    .slice(0, 24);

  if (expected !== token) {
    res
      .status(400)
      .setHeader('Content-Type', 'text/html')
      .send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invalid link</title></head><body style="margin:0;padding:40px;font-family:sans-serif;background:#f5f5f5;"><div style="max-width:480px;margin:80px auto;background:#fff;border-radius:8px;padding:40px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);"><p style="color:#e53e3e;font-size:18px;margin:0 0 10px;">Invalid unsubscribe link.</p></div></body></html>');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`UPDATE leads SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE email = ${email}`;
  await redisSet('leads:' + email, 'unsubscribed', 7776000);

  res
    .status(200)
    .setHeader('Content-Type', 'text/html')
    .send(
      '<!DOCTYPE html>' +
        '<html><head><meta charset="UTF-8"><title>Unsubscribed</title></head>' +
        '<body style="margin:0;padding:40px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;background:#f5f5f5;">' +
        '<div style="max-width:480px;margin:80px auto;background:#fff;border-radius:8px;padding:40px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);">' +
        '<h2 style="margin:0 0 16px;color:#333;">Unsubscribed</h2>' +
        "<p style=\"margin:0 0 24px;color:#555;font-size:16px;line-height:1.6;\">You've been unsubscribed. You won't receive any more emails from us.</p>" +
        '<p style="margin:0;font-size:13px;color:#999;">ISRIB Research</p>' +
        '</div></body></html>'
    );
}

async function handleList(req, res) {
  const url = new URL(req.url, 'https://isrib.shop');
  const secret = url.searchParams.get('secret');

  if (secret !== process.env.CAMPAIGN_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT email, name, source, subscribed_at, status, unsubscribed_at,
           email1_sent_at, email2_sent_at, email3_sent_at, email4_sent_at
    FROM leads
    ORDER BY subscribed_at DESC
  `;

  const format = url.searchParams.get('format');

  if (format === 'csv') {
    const headers = [
      'email',
      'name',
      'source',
      'subscribed_at',
      'status',
      'unsubscribed_at',
      'email1_sent_at',
      'email2_sent_at',
      'email3_sent_at',
      'email4_sent_at',
    ];
    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push(
        headers
          .map((h) => {
            const val = row[h] == null ? '' : String(row[h]);
            return '"' + val.replace(/"/g, '""') + '"';
          })
          .join(',')
      );
    }
    res
      .status(200)
      .setHeader('Content-Type', 'text/csv')
      .setHeader('Content-Disposition', 'attachment; filename="leads.csv"')
      .send(csvLines.join('\n'));
    return;
  }

  const active = rows.filter((r) => r.status === 'active').length;
  const unsubscribed = rows.filter((r) => r.status === 'unsubscribed').length;

  res.status(200).json({ total: rows.length, active, unsubscribed, leads: rows });
}

// ─── main handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://isrib.shop');
  const action = url.searchParams.get('action');

  try {
    if (action === 'subscribe') return await handleSubscribe(req, res);
    if (action === 'send-email') return await handleSendEmail(req, res);
    if (action === 'unsubscribe') return await handleUnsubscribe(req, res);
    if (action === 'list') return await handleList(req, res);

    res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[leads] error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
