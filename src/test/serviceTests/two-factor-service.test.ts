jest.mock('speakeasy', () => ({
  __esModule: true,
  default: {
    generateSecret: jest.fn(() => ({ base32: 'BASE32', ascii: 'ASCII' })),
    otpauthURL: jest.fn(() => 'otpauth://totp/test'),
    totp: {
      verify: jest.fn(() => true),
    },
  },
}));

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
  },
}));

import speakeasy from 'speakeasy';
import { TwoFactorService } from '../../backend/services/two-factor-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[]) {
  let callIndex = 0;
  return {
    prepare: jest.fn().mockImplementation(() => {
      const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
      callIndex++;
      return stmt;
    }),
  } as unknown as Unit;
}

describe('TwoFactorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
  });

  it('generates and stores a secret with QR code URL', async () => {
    const unit = mockUnitSequence([mockStmt()]);
    const service = new TwoFactorService(unit);

    const result = await service.generateSecret(1, 'alice', 'alice@test.com');

    expect(result).toEqual({ secret: 'BASE32', otpauthUrl: 'otpauth://totp/test', qrCodeDataUrl: 'data:image/png;base64,qr' });
    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Player SET totpSecret'),
      { playerId: 1, secret: 'BASE32' }
    );
  });

  it('rejects confirm setup when no secret exists or token is invalid', async () => {
    const noSecret = new TwoFactorService(mockUnitSequence([mockStmt(undefined)]));
    await expect(noSecret.confirmSetup(1, '123')).resolves.toEqual({ success: false, message: 'No 2FA setup in progress' });

    (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
    const invalid = new TwoFactorService(mockUnitSequence([mockStmt({ totpSecret: 'BASE32' })]));
    await expect(invalid.confirmSetup(1, '123')).resolves.toEqual({ success: false, message: 'Invalid verification code' });
  });

  it('confirms setup and creates backup codes', async () => {
    const unit = mockUnitSequence([
      mockStmt({ totpSecret: 'BASE32' }),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
      mockStmt(),
    ]);
    const service = new TwoFactorService(unit);

    await expect(service.confirmSetup(1, '123456')).resolves.toEqual({ success: true, message: '2FA enabled successfully' });
  });

  it('verifies enabled token and rejects disabled token', async () => {
    const enabled = new TwoFactorService(mockUnitSequence([mockStmt({ totpSecret: 'BASE32', totpEnabled: 1 })]));
    await expect(enabled.verifyToken(1, '123456')).resolves.toEqual({ success: true, message: 'Verified' });

    const disabled = new TwoFactorService(mockUnitSequence([mockStmt({ totpSecret: 'BASE32', totpEnabled: 0 })]));
    await expect(disabled.verifyToken(1, '123456')).resolves.toEqual({ success: false, message: '2FA is not enabled' });
  });

  it('disables 2FA and reports enabled state', async () => {
    const service = new TwoFactorService(mockUnitSequence([
      mockStmt(),
      mockStmt(),
      mockStmt({ totpEnabled: 1 }),
    ]));

    await service.disable(1);
    expect(await service.isEnabled(1)).toBe(true);
  });

  it('returns unused backup code count', async () => {
    const service = new TwoFactorService(mockUnitSequence([
      mockStmt(null, [{ usedAt: null }, { usedAt: 'used' }]),
    ]));

    expect(await service.getBackupCodes(1)).toEqual(['1 unused backup code(s) remaining']);
  });

  it('creates, validates and consumes challenges', async () => {
    const future = new Date(Date.now() + 10000).toISOString();
    const service = new TwoFactorService(mockUnitSequence([
      mockStmt(),
      mockStmt({ playerId: 1, expiresAt: future }),
      mockStmt(),
    ]));

    const challengeId = await service.createChallenge(1);
    expect(challengeId).toBeDefined();
    expect(await service.validateChallenge('challenge')).toBe(1);
    await service.consumeChallenge('challenge');
  });

  it('returns null and deletes expired challenges', async () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const service = new TwoFactorService(mockUnitSequence([
      mockStmt({ playerId: 1, expiresAt: past }),
      mockStmt(),
    ]));

    expect(await service.validateChallenge('expired')).toBeNull();
  });
});
