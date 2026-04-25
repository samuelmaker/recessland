// Client-side API for the score leaderboard.
// Run lifecycle:
//   startRun() → server returns { runId, nonce }; cached in this module.
//   submitScore(...) → signs the payload with HMAC(nonce) and POSTs.
//   fetchLeaderboard(limit) → returns top N entries.

let currentRun = null; // { runId, nonce }

async function hmacHex(secret, message) {
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

export async function startRun() {
  try {
    const r = await fetch('/api/start-run', { method: 'POST' });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'start-run-failed');
    currentRun = { runId: data.runId, nonce: data.nonce };
    return currentRun;
  } catch (err) {
    // Network/API offline (e.g. local dev with no Vercel) — store skips submission.
    currentRun = null;
    return null;
  }
}

export function getCurrentRun() {
  return currentRun;
}

export function clearCurrentRun() {
  currentRun = null;
}

export async function submitScore({ name, score, tickets, distance, durationMs }) {
  if (!currentRun) {
    return { ok: false, error: 'no-run' };
  }
  // The nonce is a server-issued, single-use, 30-minute-expiry secret. Both
  // client and server sign the payload with the nonce as the HMAC key, so an
  // attacker who never called /api/start-run can't forge a valid signature.
  const payload = `${currentRun.runId}|${score}|${tickets}|${distance}|${durationMs}`;
  const sig = await hmacHex(currentRun.nonce, payload);

  const body = {
    runId: currentRun.runId,
    name,
    score,
    tickets,
    distance,
    durationMs,
    sig,
  };
  const r = await fetch('/api/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (data.ok) {
    clearCurrentRun(); // single-use
  }
  return data;
}

export async function fetchLeaderboard(limit = 3) {
  try {
    const r = await fetch(`/api/leaderboard?limit=${limit}`);
    const data = await r.json();
    if (!data.ok) return [];
    return data.entries || [];
  } catch {
    return [];
  }
}
