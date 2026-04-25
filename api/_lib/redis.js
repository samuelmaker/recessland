import { Redis } from '@upstash/redis';

// Vercel injects KV_REST_API_URL + KV_REST_API_TOKEN when an Upstash KV store
// is attached. Locally, copy them into a .env.local.
export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Soft caps used to reject impossible submissions.
export const CAPS = {
  MIN_DURATION_MS: 5_000,
  MAX_DURATION_MS: 180_000,
  MAX_DISTANCE_PER_MS: 0.13,    // ~120s * 120 m/s ≈ 14400 m
  MAX_TICKETS_PER_MS: 1 / 500,  // 1 ticket per 500ms ceiling
  TICKET_VALUE: 100,
};

export function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Hash an IP so we don't store raw addresses.
export async function hashIp(ip) {
  const data = new TextEncoder().encode(ip + (process.env.LEADERBOARD_SECRET || ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  // Strip control chars, collapse whitespace, allow letters/digits/space/dash/underscore.
  let s = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  s = s.replace(/[^A-Za-z0-9 _\-]/g, '').replace(/\s+/g, ' ');
  return s.slice(0, 16).toUpperCase();
}
