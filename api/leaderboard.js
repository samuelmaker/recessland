import { redis } from './_lib/redis.js';

export default async function handler(req, res) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  // ZRANGE with rev=true + withScores returns alternating [member, score] pairs.
  const raw = await redis.zrange('leaderboard', 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const runId = raw[i];
    const score = Number(raw[i + 1]);
    const name = (await redis.hget(`run:${runId}`, 'name')) || 'ANON';
    entries.push({ rank: entries.length + 1, name, score });
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  return res.status(200).json({ ok: true, entries });
}
