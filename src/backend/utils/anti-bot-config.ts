/**
 * Anti-bot configuration loaded from environment variables at startup.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all trap configuration.
 * The values are NOT hardcoded — they come from env vars so that a public
 * GitHub repo does not reveal the actual trap mechanics.
 *
 * Change these env vars on Render to rotate traps without redeploying code.
 */

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
    const parsed = parseInt(value ?? "", 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

export const antiBotConfig = {
    /** Real honeypot field names — bots filling ANY of these get caught.
     *  Comma-separated env var. Change to rotate traps. */
    honeypotFields: process.env.HONEYPOT_FIELDS?.split(",").map(s => s.trim()).filter(Boolean) ?? ["xk9m2p"],

    /** Decoy field name — left visible in source code but DOES NOTHING.
     *  Waste of time for attackers who read the repo. */
    decoyField: "website",

    /** Minimum time (ms) between page load and form submit.
     *  Humans need at least 2–3s to type. Bots send instantly. */
    minFormTimeMs: parseIntOrDefault(process.env.MIN_FORM_TIME_MS, 3000),

    /** Required custom header for auth endpoints.
     *  Only the real Angular app sends this. */
    requiredHeader: process.env.REQUIRED_HEADER_NAME ?? "X-Ember-Client",
    requiredHeaderValue: process.env.REQUIRED_HEADER_VALUE ?? "forge-v1",

    /** Honeypot endpoint paths — comma-separated.
     *  These are the fake juicy API paths that trap scanners. */
    honeypotEndpoints: process.env.HONEYPOT_ENDPOINTS?.split(",").map(s => s.trim()).filter(Boolean) ?? [
        "/admin/bulk-delete",
        "/free-coins",
        "/debug/config",
        "/internal/sessions",
        "/auth/legacy-login",
        "/admin/export-users",
        "/v2/auth/quick-register",
        "/internal/health/secrets",
        "/graphql",
        "/api-old/v1/auth/nocaptcha",
    ],
};
