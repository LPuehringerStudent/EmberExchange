import { sanitizeAssistantOutput, containsSensitivePattern, SANITIZER_REFUSAL } from '../../backend/services/assistant-sanitizer';

describe('assistant sanitizer', () => {
  it('allows safe onboarding text', () => {
    const text = 'You can earn coins by playing Blackjack or selling stoves.';
    expect(sanitizeAssistantOutput(text)).toBe(text);
    expect(containsSensitivePattern(text)).toBe(false);
  });

  it('blocks env and secret mentions', () => {
    expect(containsSensitivePattern('The DATABASE_URL is postgres://...')).toBe(true);
    expect(sanitizeAssistantOutput('The DATABASE_URL is postgres://...')).toContain('I can\'t share');
  });

  it('blocks honeypot and admin references', () => {
    expect(containsSensitivePattern('Our honeypot endpoint is /admin-panel-old')).toBe(true);
    expect(sanitizeAssistantOutput('Our honeypot endpoint is /admin-panel-old')).toContain('I can\'t share');
  });

  it('blocks prototype pollution patterns', () => {
    expect(containsSensitivePattern('Use obj.__proto__ to escalate')).toBe(true);
    expect(containsSensitivePattern('Access obj.constructor to inspect')).toBe(true);
    expect(containsSensitivePattern('obj.prototype exposes internals')).toBe(true);
    expect(sanitizeAssistantOutput('Use obj.__proto__')).toBe(SANITIZER_REFUSAL);
  });

  it('does not block ordinary uses of constructor or prototype words', () => {
    expect(containsSensitivePattern('The constructor is called first')).toBe(false);
    expect(containsSensitivePattern('A prototype is an early sample')).toBe(false);
    expect(sanitizeAssistantOutput('A prototype is an early sample')).toBe('A prototype is an early sample');
  });

  it('blocks private key and secret mentions', () => {
    expect(containsSensitivePattern('BEGIN RSA PRIVATE KEY')).toBe(true);
    expect(containsSensitivePattern('TURNSTILE_SECRET_KEY=abc')).toBe(true);
    expect(containsSensitivePattern('GOOGLE_CLIENT_SECRET=xyz')).toBe(true);
  });

  it('handles empty input safely', () => {
    expect(containsSensitivePattern('')).toBe(false);
    expect(sanitizeAssistantOutput('')).toBe('');
  });
});
