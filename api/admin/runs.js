import { redis } from '../_lib/redis.js';

export default async function handler(req, res) {
  if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorised' });
  }

  const name = typeof req.query.name === 'string' ? req.query.name.toLowerCase() : '';
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  let runIds = [];
  if (name) {
    runIds = await redis.smembers(`runIdsByName:${name}`);
  } else {
    const raw = await redis.zrange('leaderboard', 0, limit - 1, { rev: true });
    runIds = raw;
  }

  const runs = [];
  for (const runId of runIds) {
    const run = await redis.hgetall(`run:${runId}`);
    if (run) runs.push({ runId, ...run });
  }

  // Sort newest first when name-filtering, score-desc otherwise.
  if (name) runs.sort((a, b) => Number(b.finishedAt || 0) - Number(a.finishedAt || 0));
  else runs.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return res.status(200).json({ ok: true, runs });
}
