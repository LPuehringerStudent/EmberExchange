import { sanitizeAssistantOutput, containsSensitivePattern } from '../../backend/services/assistant-sanitizer';

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
});
