import { RoomService } from '../../backend/services/room-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
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

const sampleRoom = {
  roomId: 'room-1',
  status: 'waiting',
  maxPlayers: 4,
  gameType: 'poker',
  settings: {},
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('RoomService', () => {
  describe('createRoom', () => {
    it('returns created room', async () => {
      const stmt = mockStmt(sampleRoom);
      const unit = mockUnit(stmt);
      const service = new RoomService(unit);

      const result = await service.createRoom(4, 'poker', { blinds: 10 });

      expect(result).toEqual(sampleRoom);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Room'),
        { maxPlayers: 4, gameType: 'poker', settings: JSON.stringify({ blinds: 10 }) }
      );
    });

    it('throws when insert returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new RoomService(mockUnit(stmt));

      await expect(service.createRoom(4, 'poker')).rejects.toThrow('Failed to create room');
    });
  });

  describe('getRoomById', () => {
    it('returns room when found', async () => {
      const stmt = mockStmt(sampleRoom);
      const service = new RoomService(mockUnit(stmt));

      expect(await service.getRoomById('room-1')).toEqual(sampleRoom);
    });

    it('returns null when room is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new RoomService(mockUnit(stmt));

      expect(await service.getRoomById('missing')).toBeNull();
    });
  });

  describe('getRoomByIdForUpdate', () => {
    it('returns room selected for update', async () => {
      const stmt = mockStmt(sampleRoom);
      const service = new RoomService(mockUnit(stmt));

      expect(await service.getRoomByIdForUpdate('room-1')).toEqual(sampleRoom);
    });
  });

  describe('updateRoomStatus', () => {
    it('returns true when status is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new RoomService(mockUnit(stmt));

      expect(await service.updateRoomStatus('room-1', 'active')).toBe(true);
    });

    it('returns false when room is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new RoomService(mockUnit(stmt));

      expect(await service.updateRoomStatus('missing', 'active')).toBe(false);
    });
  });

  describe('listRoomsByGameType', () => {
    it('lists rooms by game type', async () => {
      const stmt = mockStmt(null, [sampleRoom]);
      const service = new RoomService(mockUnit(stmt));

      expect(await service.listRoomsByGameType('poker')).toEqual([sampleRoom]);
    });

    it('lists rooms by game type and status', async () => {
      const stmt = mockStmt(null, [sampleRoom]);
      const unit = mockUnit(stmt);
      const service = new RoomService(unit);

      await service.listRoomsByGameType('poker', 'waiting');

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND status = @status'),
        { gameType: 'poker', status: 'waiting' }
      );
    });
  });

  describe('deleteRoom', () => {
    it('returns true when room is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new RoomService(mockUnit(stmt));

      expect(await service.deleteRoom('room-1')).toBe(true);
    });

    it('returns false when room does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new RoomService(mockUnit(stmt));

      expect(await service.deleteRoom('missing')).toBe(false);
    });
  });
});
