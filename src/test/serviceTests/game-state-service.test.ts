import { GameStateService } from '../../backend/services/game-state-service';
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
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleState = {
  roomId: 'room-1',
  stateBlob: { phase: 'waiting' },
  version: 0,
  updatedAt: new Date('2026-01-01'),
};

describe('GameStateService', () => {
  describe('createInitialState', () => {
    it('returns true when initial state is inserted', async () => {
      const stmt = mockStmt(null, { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new GameStateService(unit);

      const result = await service.createInitialState('room-1', { phase: 'waiting' });

      expect(result).toBe(true);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO GameState'),
        { roomId: 'room-1', stateBlob: JSON.stringify({ phase: 'waiting' }) }
      );
    });

    it('returns false when conflict prevents insert', async () => {
      const stmt = mockStmt(null, { changes: 0 });
      const service = new GameStateService(mockUnit(stmt));

      const result = await service.createInitialState('room-1', {});

      expect(result).toBe(false);
    });
  });

  describe('getState', () => {
    it('returns state when found', async () => {
      const stmt = mockStmt(sampleState);
      const service = new GameStateService(mockUnit(stmt));

      const result = await service.getState('room-1');

      expect(result).toEqual(sampleState);
    });

    it('returns null when state does not exist', async () => {
      const stmt = mockStmt(undefined);
      const service = new GameStateService(mockUnit(stmt));

      const result = await service.getState('missing');

      expect(result).toBeNull();
    });
  });

  describe('updateState', () => {
    it('returns success and new version when update matches expected version', async () => {
      const stmt = mockStmt({ version: 2 });
      const service = new GameStateService(mockUnit(stmt));

      const result = await service.updateState('room-1', { phase: 'active' }, 1);

      expect(result).toEqual({ success: true, newVersion: 2 });
    });

    it('returns failure when optimistic lock does not match', async () => {
      const stmt = mockStmt(undefined);
      const service = new GameStateService(mockUnit(stmt));

      const result = await service.updateState('room-1', { phase: 'active' }, 99);

      expect(result).toEqual({ success: false, newVersion: -1 });
    });
  });
});
