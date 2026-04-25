import { redis, CAPS, clientIp, hashIp, hmacSign, sanitizeName } from './_lib/redis.js';

const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }

  const secret = process.env.LEADERBOARD_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'server-misconfigured' });
  }

  // Rate limit by hashed IP.
  const ipHash = await hashIp(clientIp(req));
  const rateKey = `ratelimit:submit:${ipHash}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, RATE_LIMIT_WINDOW_S);
  if (count > RATE_LIMIT_MAX) {
    return res.status(429).json({ ok: false, error: 'rate-limited' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { runId, name, score, tickets, distance, durationMs, sig } = body || {};

  if (!runId || !sig) {
    return res.status(400).json({ ok: false, error: 'missing-fields' });
  }

  const run = await redis.hgetall(`run:${runId}`);
  if (!run || run.state !== 'started') {
    return res.status(400).json({ ok: false, error: 'invalid-run' });
  }

  // Coerce numeric fields.
  const s = Number(score);
  const t = Number(tickets);
  const d = Number(distance);
  const dur = Number(durationMs);
  if (![s, t, d, dur].every(Number.isFinite)) {
    return res.status(400).json({ ok: false, error: 'bad-numbers' });
  }

  // Soft caps.
  if (dur < CAPS.MIN_DURATION_MS || dur > CAPS.MAX_DURATION_MS) {
    return res.status(400).json({ ok: false, error: 'duration-out-of-range' });
  }
  if (d < 0 || d > dur * CAPS.MAX_DISTANCE_PER_MS) {
    return res.status(400).json({ ok: false, error: 'distance-impossible' });
  }
  if (t < 0 || t > Math.floor(dur * CAPS.MAX_TICKETS_PER_MS)) {
    return res.status(400).json({ ok: false, error: 'tickets-impossible' });
  }
  // The killer check: score must equal floor(distance) + tickets * 100.
  if (s !== Math.floor(d) + t * CAPS.TICKET_VALUE) {
    return res.status(400).json({ ok: false, error: 'score-mismatch' });
  }
  if (s < 0 || s > 1_000_000) {
    return res.status(400).json({ ok: false, error: 'score-out-of-range' });
  }

  // HMAC verify. Both sides sign with the nonce as the HMAC key — the nonce
  // is a single-use secret issued by /api/start-run.
  const payload = `${runId}|${s}|${t}|${d}|${dur}`;
  const expected = await hmacSign(run.nonce, payload);
  if (expected !== sig) {
    return res.status(400).json({ ok: false, error: 'bad-signature' });
  }

  const cleanName = sanitizeName(name) || 'ANON';

  // Write the run record.
  await redis.hset(`run:${runId}`, {
    state: 'submitted',
    name: cleanName,
    score: s,
    tickets: t,
    distance: d,
    durationMs: dur,
    finishedAt: Date.now(),
  });
  // Keep finished records around for 60 days for cross-referencing screenshots.
  await redis.expire(`run:${runId}`, 60 * 24 * 60 * 60);

  await redis.zadd('leaderboard', { score: s, member: runId });
  await redis.sadd(`runIdsByName:${cleanName.toLowerCase()}`, runId);

  // Compute rank (1-based, descending).
  const rank = (await redis.zrevrank('leaderboard', runId)) + 1;

  return res.status(200).json({ ok: true, rank, name: cleanName });
}
