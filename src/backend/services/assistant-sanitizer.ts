const BLOCKED_PATTERNS: RegExp[] = [
  /process\.env/i,
  /DATABASE_URL/i,
  /SESSION_SECRET/i,
  /RESEND_API_KEY/i,
  /GITHUB_API_TOKEN/i,
  /TURNSTILE_SECRET_KEY/i,
  /GOOGLE_CLIENT_SECRET/i,
  /honeypot/i,
  /\.__proto__/,
  /\.constructor\b/,
  /\.prototype\b/i,
  /\/api\/db-test/i,
  /\/admin-panel/i,
  /\/phpmyadmin/i,
  /src\/backend/i,
  /node_modules/i,
  /\.env/i,
  /postgres:\/\//i,
  /mongodb:\/\//i,
  /BEGIN (RSA|OPENSSH|PGP) PRIVATE KEY/i,
  /banned.*ip/i,
  /security.*event/i,
];

/**
 * Generic refusal message returned when the assistant output contains a
 * potentially sensitive pattern.
 */
export const SANITIZER_REFUSAL = "I can't share that kind of detail. Let me know how I can help with EmberExchange features!";

/**
 * Checks whether the provided text matches any known sensitive pattern that the
 * assistant should not disclose.
 *
 * @param text - The assistant-generated text to inspect.
 * @returns `true` if a sensitive pattern is found, otherwise `false`.
 */
export function containsSensitivePattern(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Returns the original text if it is safe, or a generic refusal message if it
 * contains a sensitive pattern.
 *
 * @param text - The assistant-generated text to sanitize.
 * @returns The original text, or `SANITIZER_REFUSAL` if a pattern matches.
 */
export function sanitizeAssistantOutput(text: string): string {
  if (containsSensitivePattern(text)) {
    return SANITIZER_REFUSAL;
  }
  return text;
}
