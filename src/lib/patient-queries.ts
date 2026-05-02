/**
 * Shared paginated reads against the `patients` table.
 *
 * Supabase PostgREST silently caps un-ranged queries at ~1000 rows. Anywhere
 * the UI needs the FULL contact list (segment evaluation, analytics
 * breakdowns, recipient pickers) the request must batch via `.range()` until
 * a short page comes back. Use these helpers instead of writing a one-off
 * fetch in each component.
 *
 * For places that only need a count, use `getPatientCount()` — a `head: true`
 * count query with no row payload.
 */
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_PAGE_SIZE = 1000;

interface FetchOptions {
  /** PostgREST select string. Default `"*"`. */
  select?: string;
  /** Restrict to contacts that have an email address. */
  emailOnly?: boolean;
  /** Order column (single column only — extend if you need multi-column). */
  orderBy?: { column: string; ascending?: boolean };
  /** Page size for each batch. Default 1000 (PostgREST default cap). */
  pageSize?: number;
  /** Hard ceiling so a runaway loop can't fetch millions. */
  maxRows?: number;
}

/**
 * Fetch ALL rows from `patients` by paging through `.range()` until a short
 * page is returned. Use sparingly — pages with thousands of contacts produce
 * large payloads. Prefer `getPatientCount()` if you only need a number.
 */
export async function fetchAllPatients<T = Record<string, unknown>>(
  options: FetchOptions = {},
): Promise<T[]> {
  const {
    select = "*",
    emailOnly = false,
    orderBy,
    pageSize = DEFAULT_PAGE_SIZE,
    maxRows = 100_000,
  } = options;

  const out: T[] = [];
  let from = 0;

  // Loop bounded by maxRows so a misbehaving server can't spin forever.
  while (out.length < maxRows) {
    const to = from + pageSize - 1;
    let q = supabase.from("patients").select(select).range(from, to);
    if (emailOnly) q = q.not("email", "is", null);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);

    if (rows.length < pageSize) break; // last page
    from += pageSize;
  }

  return out;
}

/**
 * Exact count of rows in `patients`, with an optional email-only filter.
 * Uses a HEAD request (no row payload) so it's cheap regardless of table size.
 */
export async function getPatientCount(
  options: { emailOnly?: boolean } = {},
): Promise<number> {
  let q = supabase.from("patients").select("id", { count: "exact", head: true });
  if (options.emailOnly) q = q.not("email", "is", null);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
