/**
 * Per-campaign processing lock used by both the manual queue trigger and
 * the daily cron to prevent double-sends. See migration
 * 20260502000002_campaign_processing_lock.sql for the schema rationale.
 *
 * Pre-migration safety: if the `last_processed_at` column doesn't exist on
 * the live DB yet, both `tryClaimCampaignLock` and `releaseCampaignLock`
 * detect the column-missing error from PostgREST and return / no-op. This
 * keeps sends working without the lock until the migration is applied.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const LOCK_STALE_MS = 5 * 60 * 1000; // 5 minutes

interface ColumnAwareTable {
  update: (vals: Record<string, unknown>) => {
    eq: (col: string, val: string) => {
      or: (filter: string) => {
        select: (cols: string) => Promise<{ data: { id: string }[] | null; error: { message: string; code?: string } | null }>;
      };
    };
  };
}

/**
 * Atomically grab the processing lock on `campaign_id`. Returns true if we
 * own the lock, false if another worker has it (we should skip this campaign
 * for this run).
 */
export async function tryClaimCampaignLock(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const now = new Date().toISOString();
  const tbl = supabase.from("campaigns") as unknown as ColumnAwareTable;
  const { data, error } = await tbl
    .update({ last_processed_at: now })
    .eq("id", campaignId)
    // Lock is free if the column is null or the timestamp is older than the
    // staleness cutoff. Postgres evaluates UPDATE...WHERE atomically per-row,
    // so concurrent workers can't both succeed.
    .or(`last_processed_at.is.null,last_processed_at.lt.${cutoff}`)
    .select("id");
  if (error) {
    if (error.code === "42703" || /column .* does not exist/i.test(error.message)) {
      console.warn("[campaign-lock] last_processed_at column missing — skipping lock. Run migration 20260502000002.");
      return true; // fail-open so sends still happen pre-migration
    }
    console.error("[campaign-lock] claim failed", { campaignId, error: error.message });
    return true; // fail-open on transient errors so sends keep flowing
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Release the lock by clearing `last_processed_at`. Best-effort — if the
 * release fails, the lock will time out after LOCK_STALE_MS regardless.
 */
export async function releaseCampaignLock(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<void> {
  const tbl = supabase.from("campaigns") as unknown as {
    update: (vals: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string; code?: string } | null }> };
  };
  const { error } = await tbl.update({ last_processed_at: null }).eq("id", campaignId);
  if (error && error.code !== "42703") {
    console.warn("[campaign-lock] release failed (will time out)", { campaignId, error: error.message });
  }
}
