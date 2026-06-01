/**
 * Basic HTML escape to prevent stored XSS.
 * Escapes &, <, >, ", and ' characters.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

/**
 * Sanitizes user-provided text for safe storage and display.
 * Trims whitespace and escapes HTML entities.
 */
export function sanitizeText(input: unknown, maxLength = 5000): string | null {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > maxLength) return null;
    return escapeHtml(trimmed);
}
