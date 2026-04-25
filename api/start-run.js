import { redis, clientIp, hashIp } from './_lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  const runId = crypto.randomUUID();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const ip = clientIp(req);
  const ipHash = await hashIp(ip);

  await redis.hset(`run:${runId}`, {
    state: 'started',
    nonce,
    startedAt: Date.now(),
    ip: ipHash,
    ua: (req.headers['user-agent'] || '').slice(0, 200),
  });
  await redis.expire(`run:${runId}`, 30 * 60);

  return res.status(200).json({ ok: true, runId, nonce });
}
