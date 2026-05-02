/**
 * Single source of truth for email variable substitution.
 *
 * Templates and emails in this app use TWO syntaxes interchangeably:
 *   - `{first_name}` — used by AI-generated copy, the rich editor's variable
 *     button, and the campaign queue's legacy substitution.
 *   - `{{first_name}}` — used by the Gmail send route and Resend convention.
 *
 * Different routes used to handle one or the other, which silently produced
 * literal `{first_name}` in some recipients' inboxes when the path didn't
 * recognise the syntax. This helper accepts both and is used by every send
 * path (campaign queue, cron, send-email, send-gmail, send-inquiry-reply).
 *
 * Behaviour for missing variables:
 *   - If a key has a non-empty value → substitute.
 *   - If a key is missing or empty → leave the placeholder as-is so the
 *     recipient sees the raw `{first_name}` rather than an empty string,
 *     making bad data obvious during review.
 */

export type Vars = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /(\{\{|\{)([a-z_][a-z0-9_]*)(\}\}|\})/gi;

export function applyEmailVars(input: string, vars?: Vars): string {
  if (!input || !vars) return input;
  return input.replace(PLACEHOLDER, (match, openBrace, key, closeBrace) => {
    // Only substitute if braces are balanced (`{x}` or `{{x}}`, not `{{x}` or `{x}}`).
    const balanced = (openBrace === "{" && closeBrace === "}") || (openBrace === "{{" && closeBrace === "}}");
    if (!balanced) return match;
    const raw = vars[key as string];
    if (raw == null) return match;
    const str = String(raw);
    if (!str.trim()) return match;
    return str;
  });
}

/**
 * Build a variables map from a patient row + extras, with fallbacks so
 * `{name}` works even when only first/last is set.
 */
export function buildPatientVars(opts: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  fallbackName?: string | null;
  extra?: Vars;
}): Vars {
  const firstName = opts.firstName?.trim() ?? "";
  const lastName = opts.lastName?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
    || opts.fallbackName?.trim()
    || "";
  return {
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    full_name: fullName,
    email: opts.email ?? "",
    ...(opts.extra ?? {}),
  };
}
