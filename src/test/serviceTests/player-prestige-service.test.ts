import { PlayerPrestigeService } from '../../backend/services/player-prestige-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue([]),
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
    savepoint: jest.fn().mockRejectedValue(new Error('skip side effects')),
    rollbackToSavepoint: jest.fn().mockResolvedValue(undefined),
  } as unknown as Unit;
}

const prestige = {
  playerId: 1,
  totalXP: 90,
  currentLevel: 4,
  prestigeCount: 0,
  updatedAt: '2026-01-01',
};

describe('PlayerPrestigeService', () => {
  describe('static helpers', () => {
    it('calculates XP for level and level from XP', () => {
      expect(PlayerPrestigeService.xpForLevel(1)).toBe(0);
      expect(PlayerPrestigeService.xpForLevel(4)).toBe(90);
      expect(PlayerPrestigeService.levelFromXP(90)).toBe(4);
    });
  });

  describe('getPrestige', () => {
    it('returns prestige row', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([mockStmt(prestige)]));

      expect(await service.getPrestige(1)).toEqual(prestige);
    });

    it('returns null when missing', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([mockStmt(undefined)]));

      expect(await service.getPrestige(1)).toBeNull();
    });
  });

  describe('addXP', () => {
    it('adds XP to existing prestige data', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([
        mockStmt(prestige),
        mockStmt(),
        mockStmt(),
      ]));

      const result = await service.addXP(1, 70, 'test', 'Testing');

      expect(result.totalXP).toBe(160);
      expect(result.currentLevel).toBe(5);
      expect(result.prestigeCount).toBe(0);
    });

    it('initializes prestige when missing', async () => {
      const unit = mockUnitSequence([
        mockStmt(undefined),
        mockStmt(),
        mockStmt(),
        mockStmt(),
      ]);
      const service = new PlayerPrestigeService(unit);

      const result = await service.addXP(1, 10, 'test');

      expect(result.totalXP).toBe(10);
      expect(result.currentLevel).toBe(2);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PlayerPrestige'),
        expect.objectContaining({ playerId: 1 })
      );
    });
  });

  describe('prestige eligibility', () => {
    it('returns true when level is at least 100', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([
        mockStmt({ ...prestige, currentLevel: 100 }),
      ]));

      expect(await service.canPrestige(1)).toBe(true);
    });

    it('throws when player is not eligible', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([
        mockStmt({ ...prestige, currentLevel: 50 }),
      ]));

      await expect(service.doPrestige(1)).rejects.toThrow('Player is not eligible for prestige');
    });

    it('resets level and increments prestige count', async () => {
      const service = new PlayerPrestigeService(mockUnitSequence([
        mockStmt({ ...prestige, currentLevel: 100, prestigeCount: 2 }),
        mockStmt({ ...prestige, currentLevel: 100, prestigeCount: 2 }),
        mockStmt(),
      ]));

      const result = await service.doPrestige(1);

      expect(result).toEqual(expect.objectContaining({
        playerId: 1,
        totalXP: 0,
        currentLevel: 1,
        prestigeCount: 3,
      }));
    });
  });
});
