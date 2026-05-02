/**
 * HMAC-signed unsubscribe tokens.
 *
 * Without a signature an attacker who guessed or harvested a tracking_id
 * could unsubscribe any recipient. UUIDs are unguessable in theory but they
 * leak through email forwards, mailing-list archives, and corporate
 * filtering systems — tying the link to a server-side secret prevents
 * tampering.
 *
 * Each unsubscribe URL becomes `?t=<trackingId>&s=<signature>`. The
 * signature is HMAC-SHA256(secret, trackingId), truncated to 16 hex chars
 * (64 bits — plenty for a single-purpose unsubscribe token, keeps the URL
 * short).
 *
 * Tokens issued before this code shipped (no `s` parameter) remain valid:
 * `verifyUnsubToken` accepts a missing signature so existing in-flight
 * emails don't break their unsubscribe links overnight. New emails always
 * include the signature.
 */

import crypto from "crypto";

function getSecret(): string {
  // SECRET_KEY is the Supabase service-role key — already required for the
  // queue routes, so reusing it means no new env var to provision. If a
  // dedicated UNSUBSCRIBE_SECRET is set, prefer it.
  return (
    process.env.UNSUBSCRIBE_SECRET
    ?? process.env.SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? "fit-logic-unsub-fallback-do-not-use-in-prod"
  );
}

export function signUnsubToken(trackingId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(trackingId)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Returns true when the signature matches the trackingId, OR when no
 * signature was provided (legacy in-flight emails). Falsy when both are
 * present and don't match.
 */
export function verifyUnsubToken(trackingId: string, signature?: string | null): boolean {
  if (!signature) return true; // legacy compatibility
  const expected = signUnsubToken(trackingId);
  // Constant-time compare to avoid timing oracles.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Build the full unsub URL for a tracking_id. */
export function buildUnsubUrl(baseUrl: string, trackingId: string): string {
  return `${baseUrl}/api/campaign-unsubscribe?t=${trackingId}&s=${signUnsubToken(trackingId)}`;
}
