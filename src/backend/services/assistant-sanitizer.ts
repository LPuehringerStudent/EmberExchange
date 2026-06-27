const BLOCKED_PATTERNS: RegExp[] = [
  /process\.env/i,
  /DATABASE_URL/i,
  /SESSION_SECRET/i,
  /RESEND_API_KEY/i,
  /GITHUB_API_TOKEN/i,
  /TURNSTILE_SECRET_KEY/i,
  /GOOGLE_CLIENT_SECRET/i,
  /honeypot/i,
  /__proto__/,
  /constructor/,
  /prototype/i,
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

export function containsSensitivePattern(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeAssistantOutput(text: string): string {
  if (containsSensitivePattern(text)) {
    return "I can't share that kind of detail. Let me know how I can help with EmberExchange features!";
  }
  return text;
}
