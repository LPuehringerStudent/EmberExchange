import { EventLogService } from '../../backend/services/event-log-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleEvent = {
  eventId: 'event-1',
  roomId: 'room-1',
  playerId: 10,
  type: 'player_action',
  payload: { action: 'hit' },
  sequenceNumber: 2,
  clientTimestamp: 123,
  serverTimestamp: new Date('2026-01-01'),
};

describe('EventLogService', () => {
  describe('logEvent', () => {
    it('inserts a serialized event payload', async () => {
      const stmt = mockStmt();
      const unit = mockUnit(stmt);
      const service = new EventLogService(unit);

      await service.logEvent('room-1', 'player_action', { action: 'hit' }, 10, 2, 123);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO EventLog'),
        {
          roomId: 'room-1',
          type: 'player_action',
          payload: JSON.stringify({ action: 'hit' }),
          playerId: 10,
          sequenceNumber: 2,
          clientTimestamp: 123,
        }
      );
      expect(stmt.run).toHaveBeenCalledTimes(1);
    });

    it('uses nullable metadata defaults', async () => {
      const stmt = mockStmt();
      const unit = mockUnit(stmt);
      const service = new EventLogService(unit);

      await service.logEvent('room-1', 'sync', {});

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          playerId: null,
          sequenceNumber: null,
          clientTimestamp: null,
        })
      );
    });
  });

  describe('getEventsAfter', () => {
    it('returns events after a sequence number', async () => {
      const stmt = mockStmt([sampleEvent]);
      const service = new EventLogService(mockUnit(stmt));

      const result = await service.getEventsAfter('room-1', 1);

      expect(result).toEqual([sampleEvent]);
    });
  });

  describe('getEventsForRoom', () => {
    it('returns events for a room', async () => {
      const stmt = mockStmt([sampleEvent]);
      const service = new EventLogService(mockUnit(stmt));

      const result = await service.getEventsForRoom('room-1');

      expect(result).toEqual([sampleEvent]);
    });

    it('passes custom limit', async () => {
      const stmt = mockStmt([]);
      const unit = mockUnit(stmt);
      const service = new EventLogService(unit);

      await service.getEventsForRoom('room-1', 25);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT @limit'),
        { roomId: 'room-1', limit: 25 }
      );
    });
  });
});
