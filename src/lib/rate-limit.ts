import "server-only";
import { headers } from "next/headers";

// A stopgap on top of the per-account/per-house lockout in lockout.ts: that
// lockout only engages once an attempt has matched a *real* email or house
// code, so guessing against ones that don't exist is otherwise unthrottled.
// This is a per-process in-memory sliding window, keyed by IP — it works
// correctly on a single long-running server, but does NOT share state across
// multiple serverless instances (e.g. Vercel functions scaled out). Same
// "honest MVP stand-in" pattern as the local-disk proof storage in
// src/lib/storage.ts: fine for this scale, but note it before a
// higher-traffic production deploy and prefer a platform-level rate limiter
// (Vercel Firewall, Upstash Ratelimit) if one becomes available.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 20;

const attemptsByKey = new Map<string, number[]>();

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

// Returns true if this call is within the allowed rate, false if it should
// be rejected. Recording happens on every call (including rejected ones) so
// a client can't reset their window by retrying.
export function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (attemptsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attemptsByKey.set(key, recent);

  // Opportunistic cleanup so the map doesn't grow unbounded over the
  // process's lifetime — cheap enough to run on every call at this scale.
  if (attemptsByKey.size > 500) {
    for (const [k, timestamps] of attemptsByKey) {
      if (timestamps.every((t) => now - t >= WINDOW_MS)) {
        attemptsByKey.delete(k);
      }
    }
  }

  return recent.length <= MAX_ATTEMPTS_PER_WINDOW;
}
