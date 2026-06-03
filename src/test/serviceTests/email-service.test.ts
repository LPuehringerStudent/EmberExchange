describe('email-service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    process.env.FRONTEND_URL = 'https://example.test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs verification email in mock mode when RESEND_API_KEY is missing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendVerificationEmail } = await import('../../backend/services/email-service');

    await sendVerificationEmail('alice@test.com', 'token with spaces');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MOCK EMAIL'));
    logSpy.mockRestore();
  });

  it('logs password reset email in mock mode when RESEND_API_KEY is missing', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendPasswordResetEmail } = await import('../../backend/services/email-service');

    await sendPasswordResetEmail('alice@test.com', 'reset-token');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('MOCK EMAIL'));
    logSpy.mockRestore();
  });
});
