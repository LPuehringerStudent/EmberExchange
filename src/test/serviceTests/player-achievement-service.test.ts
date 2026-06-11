import { PlayerAchievementService } from '../../backend/services/player-achievement-service';
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
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleAchievement = {
  playerAchievementId: 7,
  playerId: 1,
  achievementId: 'first-win',
  progress: 1,
  target: 1,
  unlockedAt: new Date('2026-01-01'),
};

describe('PlayerAchievementService', () => {
  describe('queries', () => {
    it('returns achievements by player', async () => {
      const unit = mockUnitSequence([mockStmt(null, [sampleAchievement])]);
      const service = new PlayerAchievementService(unit);

      expect(await service.getByPlayerId(1)).toEqual([sampleAchievement]);
    });

    it('returns achievement by player and id', async () => {
      const unit = mockUnitSequence([mockStmt(sampleAchievement)]);
      const service = new PlayerAchievementService(unit);

      expect(await service.getByPlayerAndId(1, 'first-win')).toEqual(sampleAchievement);
    });

    it('returns null when achievement is not found', async () => {
      const unit = mockUnitSequence([mockStmt(undefined)]);
      const service = new PlayerAchievementService(unit);

      expect(await service.getByPlayerAndId(1, 'missing')).toBeNull();
    });
  });

  describe('unlock', () => {
    it('inserts a new unlocked achievement', async () => {
      const unit = mockUnitSequence([
        mockStmt(undefined),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new PlayerAchievementService(unit);

      expect(await service.unlock(1, 'first-win')).toEqual([true, 1]);
    });

    it('does not re-unlock an already unlocked achievement', async () => {
      const unit = mockUnitSequence([mockStmt(sampleAchievement)]);
      const service = new PlayerAchievementService(unit);

      expect(await service.unlock(1, 'first-win')).toEqual([false, 7]);
    });

    it('updates an existing locked achievement', async () => {
      const locked = { ...sampleAchievement, unlockedAt: null };
      const unit = mockUnitSequence([
        mockStmt(locked),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new PlayerAchievementService(unit);

      expect(await service.unlock(1, 'first-win')).toEqual([true, 7]);
    });
  });

  describe('setProgress', () => {
    it('updates existing progress', async () => {
      const locked = { ...sampleAchievement, unlockedAt: null };
      const unit = mockUnitSequence([
        mockStmt(locked),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new PlayerAchievementService(unit);

      expect(await service.setProgress(1, 'first-win', 1, 1)).toEqual([true, 7]);
    });

    it('inserts new progress row', async () => {
      const unit = mockUnitSequence([
        mockStmt(undefined),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new PlayerAchievementService(unit);

      expect(await service.setProgress(1, 'first-win', 0, 1)).toEqual([true, 1]);
    });
  });

  describe('deleteAllForPlayer', () => {
    it('returns number of deleted rows', async () => {
      const unit = mockUnitSequence([mockStmt(null, [], { changes: 3 })]);
      const service = new PlayerAchievementService(unit);

      expect(await service.deleteAllForPlayer(1)).toBe(3);
    });
  });
});
