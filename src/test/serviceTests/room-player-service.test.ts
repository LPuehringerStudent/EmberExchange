import { RoomPlayerService } from '../../backend/services/room-player-service';
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

const sampleRoomPlayer = {
  roomPlayerId: 'rp-1',
  roomId: 'room-1',
  playerId: 10,
  username: 'Alice',
  connectionState: 'connected',
  seatIndex: 0,
};

describe('RoomPlayerService', () => {
  describe('addPlayer', () => {
    it('returns created room player row', async () => {
      const stmt = mockStmt(sampleRoomPlayer);
      const service = new RoomPlayerService(mockUnit(stmt));

      const result = await service.addPlayer('room-1', 10, 0);

      expect(result).toEqual(sampleRoomPlayer);
    });

    it('throws when insert returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new RoomPlayerService(mockUnit(stmt));

      await expect(service.addPlayer('room-1', 10, 0)).rejects.toThrow('Failed to add player to room');
    });
  });

  describe('getPlayersInRoom', () => {
    it('maps active title and banner fields', async () => {
      const rawRow = {
        ...sampleRoomPlayer,
        coins: 1000,
        titleId: 'champ',
        titleLabel: 'Champion',
        titleAnimation: 'shine',
        bannerId: 5,
        bannerName: 'Gold',
        bannerCssClass: 'gold-banner',
      };
      const stmt = mockStmt(null, [rawRow]);
      const service = new RoomPlayerService(mockUnit(stmt));

      const result = await service.getPlayersInRoom('room-1');

      expect(result[0]).toEqual(expect.objectContaining({
        activeTitle: { titleId: 'champ', label: 'Champion', animation: 'shine' },
        activeBanner: { bannerId: 5, name: 'Gold', cssClass: 'gold-banner' },
      }));
    });

    it('uses null active title and banner when player has none', async () => {
      const rawRow = {
        ...sampleRoomPlayer,
        titleId: null,
        titleLabel: null,
        titleAnimation: null,
        bannerId: null,
        bannerName: null,
        bannerCssClass: null,
      };
      const stmt = mockStmt(null, [rawRow]);
      const service = new RoomPlayerService(mockUnit(stmt));

      const result = await service.getPlayersInRoom('room-1');

      expect(result[0].activeTitle).toBeNull();
      expect(result[0].activeBanner).toBeNull();
    });
  });

  describe('getPlayerInRoom', () => {
    it('returns room player when found', async () => {
      const stmt = mockStmt(sampleRoomPlayer);
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.getPlayerInRoom('room-1', 10)).toEqual(sampleRoomPlayer);
    });

    it('returns null when player is not in room', async () => {
      const stmt = mockStmt(undefined);
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.getPlayerInRoom('room-1', 99)).toBeNull();
    });
  });

  describe('connection and removal updates', () => {
    it('returns true when connection state is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.updateConnectionState('rp-1', 'disconnected')).toBe(true);
    });

    it('returns false when connection state update changes no row', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.updateConnectionState('missing', 'connected')).toBe(false);
    });

    it('removes a room player by row id', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.removePlayer('rp-1')).toBe(true);
    });

    it('removes a player from a specific room', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.removePlayerFromRoom('room-1', 10)).toBe(true);
    });
  });

  describe('counts and seat indexes', () => {
    it('returns player count in room', async () => {
      const stmt = mockStmt({ cnt: 3 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.countPlayersInRoom('room-1')).toBe(3);
    });

    it('returns 0 when count query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.countPlayersInRoom('room-1')).toBe(0);
    });

    it('returns next seat after current max', async () => {
      const stmt = mockStmt({ maxSeat: 2 });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.findNextSeatIndex('room-1')).toBe(3);
    });

    it('returns 0 when room has no players', async () => {
      const stmt = mockStmt({ maxSeat: null });
      const service = new RoomPlayerService(mockUnit(stmt));

      expect(await service.findNextSeatIndex('room-1')).toBe(0);
    });
  });
});
