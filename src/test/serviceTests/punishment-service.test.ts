import { PunishmentService } from '../../backend/services/punishment-service';
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

describe('PunishmentService', () => {
  describe('recordViolation', () => {
    it('returns none when thresholds are not met', async () => {
      const service = new PunishmentService(mockUnitSequence([
        mockStmt(), // insert violation
        mockStmt(), // update player
        mockStmt({ count: 1 }), // ip recent
        mockStmt({ count: 1 }), // player recent
      ]));

      expect(await service.recordViolation('1.2.3.4', 1, 'timing_guard_failed')).toEqual({ action: 'none' });
    });

    it('bans account for hard player exploit', async () => {
      const service = new PunishmentService(mockUnitSequence([
        mockStmt(),
        mockStmt(),
        mockStmt({ count: 1 }),
        mockStmt({ count: 1 }),
        mockStmt(), // ban player
        mockStmt(), // ban ip
      ]));

      const result = await service.recordViolation('1.2.3.4', 1, 'coin_tampering');

      expect(result.action).toBe('account_ban');
    });

    it('bans IP after repeated turnstile failures', async () => {
      const service = new PunishmentService(mockUnitSequence([
        mockStmt(),
        mockStmt({ count: 3 }),
        mockStmt(), // ban ip
      ]));

      const result = await service.recordViolation('1.2.3.4', null, 'turnstile_failed');

      expect(result.action).toBe('ip_ban');
    });
  });

  describe('ban queries and writes', () => {
    it('returns not banned when no IP row exists', async () => {
      const service = new PunishmentService(mockUnitSequence([mockStmt(undefined)]));

      expect(await service.isIpBanned('1.2.3.4')).toEqual({ banned: false });
    });

    it('returns banned IP details', async () => {
      const service = new PunishmentService(mockUnitSequence([
        mockStmt({ ip: '1.2.3.4', reason: 'bad', expiresAt: null }),
      ]));

      expect(await service.isIpBanned('1.2.3.4')).toEqual({ banned: true, reason: 'bad', expiresAt: undefined });
    });

    it('writes IP and player bans', async () => {
      const unit = mockUnitSequence([mockStmt(), mockStmt()]);
      const service = new PunishmentService(unit);

      await service.banIp('1.2.3.4', 'bad');
      await service.banPlayer(1, 'bad');

      expect(unit.prepare).toHaveBeenCalledTimes(2);
    });
  });

  describe('logs and unban operations', () => {
    it('returns violation log and banned IPs', async () => {
      const violation = { violationId: 1, ip: '1.2.3.4', playerId: null, type: 'x', details: null, createdAt: 'now' };
      const banned = { ip: '1.2.3.4', reason: 'bad', bannedAt: 'now', expiresAt: null, violationType: null };
      const service = new PunishmentService(mockUnitSequence([
        mockStmt(null, [violation]),
        mockStmt(null, [banned]),
      ]));

      expect(await service.getViolationLog()).toEqual([violation]);
      expect(await service.getBannedIPs()).toEqual([banned]);
    });

    it('returns true when IP is unbanned', async () => {
      const service = new PunishmentService(mockUnitSequence([mockStmt(null, [], { changes: 1 })]));

      expect(await service.unbanIp('1.2.3.4')).toBe(true);
    });

    it('returns false when player unban changes no rows', async () => {
      const service = new PunishmentService(mockUnitSequence([mockStmt(null, [], { changes: 0 })]));

      expect(await service.unbanPlayer(1)).toBe(false);
    });
  });
});
