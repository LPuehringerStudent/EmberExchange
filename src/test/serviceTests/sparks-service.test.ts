import { SparksService } from '../../backend/services/sparks-service';
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
  } as unknown as Unit;
}

describe('SparksService', () => {
  it('calculates salvage sparks and re-roll costs', () => {
    const service = new SparksService(mockUnitSequence([]));

    expect(service.calculateSparks('rare', 0.5)).toBe(22);
    expect(service.calculateSparks('unknown', 2)).toBe(3);
    expect(service.calculateReRollCost('common', 2)).toBe(23);
    expect(service.calculateReRollCost('unknown', 1)).toBe(30);
  });

  it('returns current sparks balance', async () => {
    const service = new SparksService(mockUnitSequence([mockStmt({ sparks: 42 })]));

    expect(await service.getSparksBalance(1)).toBe(42);
  });

  it('returns 0 sparks balance when player is missing', async () => {
    const service = new SparksService(mockUnitSequence([mockStmt(undefined)]));

    expect(await service.getSparksBalance(1)).toBe(0);
  });

  it('rejects salvaging missing stove or stove not owned by player', async () => {
    const missing = new SparksService(mockUnitSequence([mockStmt(undefined)]));
    await expect(missing.salvageStove(1, 10)).resolves.toEqual({ success: false, error: 'Stove not found' });

    const notOwned = new SparksService(mockUnitSequence([mockStmt({ currentOwnerId: 2 })]));
    await expect(notOwned.salvageStove(1, 10)).resolves.toEqual({ success: false, error: 'You do not own this stove' });
  });

  it('rejects re-roll when stove is missing, not owned, or player lacks sparks', async () => {
    const missing = new SparksService(mockUnitSequence([mockStmt(undefined)]));
    await expect(missing.reRollHeat(1, 10)).resolves.toEqual({ success: false, error: 'Stove not found' });

    const notOwned = new SparksService(mockUnitSequence([mockStmt({ currentOwnerId: 2 })]));
    await expect(notOwned.reRollHeat(1, 10)).resolves.toEqual({ success: false, error: 'You do not own this stove' });

    const poor = new SparksService(mockUnitSequence([
      mockStmt({ currentOwnerId: 1, rarity: 'legendary', reRollCount: 0, minHeat: 0.1, maxHeat: 0.9 }),
      mockStmt({ count: 0 }),
      mockStmt({ sparks: 1 }),
    ]));
    const result = await poor.reRollHeat(1, 10);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient sparks');
  });
});
