import { PityService } from '../../backend/services/pity-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
  } as unknown as Unit;
}

const counters = {
  standardOpens: 25,
  goldenOpens: 50,
  legendaryOpens: 0,
  dragonOpens: 0,
  winterOpens: 0,
};

describe('PityService', () => {
  describe('getCounters', () => {
    it('returns stored counters', async () => {
      const service = new PityService(mockUnit(mockStmt(counters)));

      expect(await service.getCounters(1)).toEqual(counters);
    });

    it('returns zero counters when player has no row', async () => {
      const service = new PityService(mockUnit(mockStmt(undefined)));

      expect(await service.getCounters(1)).toEqual({
        standardOpens: 0,
        goldenOpens: 0,
        legendaryOpens: 0,
        dragonOpens: 0,
        winterOpens: 0,
      });
    });
  });

  describe('counter writes', () => {
    it('increments the mapped counter', async () => {
      const stmt = mockStmt();
      const unit = mockUnit(stmt);
      const service = new PityService(unit);

      await service.incrementCounter(1, 2);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('goldenOpens'),
        { playerId: 1 }
      );
      expect(stmt.run).toHaveBeenCalledTimes(1);
    });

    it('resets the mapped counter', async () => {
      const stmt = mockStmt();
      const unit = mockUnit(stmt);
      const service = new PityService(unit);

      await service.resetCounter(1, 3);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('legendaryOpens'),
        { playerId: 1 }
      );
    });
  });

  describe('checkPity', () => {
    it('returns legendary when legendary threshold is reached', async () => {
      const service = new PityService(mockUnit(mockStmt({ ...counters, goldenOpens: 50 })));

      expect(await service.checkPity(1, 2, 'common')).toBe('legendary');
    });

    it('returns epic when epic threshold is reached and rolled rarity is lower', async () => {
      const service = new PityService(mockUnit(mockStmt({ ...counters, standardOpens: 25 })));

      expect(await service.checkPity(1, 1, 'rare')).toBe('epic');
    });

    it('does not override when rolled rarity is already epic or better', async () => {
      const service = new PityService(mockUnit(mockStmt({ ...counters, standardOpens: 25 })));

      expect(await service.checkPity(1, 1, 'epic')).toBeNull();
    });
  });

  describe('getPityProgress', () => {
    it('returns progress and thresholds', async () => {
      const service = new PityService(mockUnit(mockStmt(counters)));

      expect(await service.getPityProgress(1, 1)).toEqual({
        opens: 25,
        epicThreshold: 25,
        legendaryThreshold: 100,
      });
    });
  });
});
