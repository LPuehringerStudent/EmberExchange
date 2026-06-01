export function isNullOrWhiteSpace(value: string | string[] | null | undefined): boolean {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0 || value.every(v => v.trim() === '');
    return value.trim() === '';
}
