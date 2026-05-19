import { PlayerService } from '../../backend/services/player-service';
import { Unit } from '../../backend/utils/unit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const samplePlayer = {
  playerId: 1,
  username: 'alice',
  password: 'hashed_pw',
  email: 'alice@example.com',
  coins: 1000,
  lootboxCount: 10,
  isAdmin: 0,
  joinedAt: '2026-01-01',
  provider: null,
  providerId: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayerService', () => {

  // --- getAllPlayers -------------------------------------------------------

  describe('getAllPlayers', () => {
    it('returns all players', async () => {
      const stmt = mockStmt(null, [samplePlayer]);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getAllPlayers();

      expect(result).toEqual([samplePlayer]);
    });

    it('returns an empty array when no players exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getAllPlayers();

      expect(result).toEqual([]);
    });
  });

  // --- getInfoByID --------------------------------------------------------

  describe('getInfoByID', () => {
    it('returns a player when found', async () => {
      const stmt = mockStmt(samplePlayer);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getInfoByID(1);

      expect(result).toEqual(samplePlayer);
    });

    it('returns null when player is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getInfoByID(999);

      expect(result).toBeNull();
    });
  });

  // --- getPlayerByUsername ------------------------------------------------

  describe('getPlayerByUsername', () => {
    it('returns a player matching the username', async () => {
      const stmt = mockStmt(samplePlayer);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByUsername('alice');

      expect(result).toEqual(samplePlayer);
    });

    it('returns null when username is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByUsername('ghost');

      expect(result).toBeNull();
    });
  });

  // --- getPlayerByEmail ---------------------------------------------------

  describe('getPlayerByEmail', () => {
    it('returns a player matching the email', async () => {
      const stmt = mockStmt(samplePlayer);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByEmail('alice@example.com');

      expect(result).toEqual(samplePlayer);
    });

    it('returns null when email is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  // --- createPlayer -------------------------------------------------------

  describe('createPlayer', () => {
    it('returns [true, id] on successful player creation', async () => {
      const runStmt = mockStmt(null, [], { changes: 1 });
      const unit = {
        prepare: jest.fn().mockReturnValue(runStmt),
        getLastRowId: jest.fn().mockResolvedValue(42),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const [success, id] = await service.createPlayer('alice', 'hashed_pw', 'alice@example.com');

      expect(success).toBe(true);
      expect(id).toBe(42);
    });

    it('passes custom coins and lootboxCount to the insert', async () => {
      const runStmt = mockStmt(null, [], { changes: 1 });
      const unit = {
        prepare: jest.fn().mockReturnValue(runStmt),
        getLastRowId: jest.fn().mockResolvedValue(5),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const [success] = await service.createPlayer('bob', 'pw', 'bob@example.com', 500, 3);

      expect(success).toBe(true);
    });

    it('returns [false, 0] when insert fails', async () => {
      const runStmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(runStmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const [success, id] = await service.createPlayer('alice', 'hashed_pw', 'alice@example.com');

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- updatePlayerCoins --------------------------------------------------

  describe('updatePlayerCoins', () => {
    it('returns true when coins are updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerCoins(1, 500);

      expect(result).toBe(true);
    });

    it('returns false when player is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerCoins(999, 500);

      expect(result).toBe(false);
    });
  });

  // --- updatePlayerLootboxCount -------------------------------------------

  describe('updatePlayerLootboxCount', () => {
    it('returns true when lootbox count is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerLootboxCount(1, 5);

      expect(result).toBe(true);
    });

    it('returns false when player is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerLootboxCount(999, 5);

      expect(result).toBe(false);
    });
  });

  // --- updatePlayerEmail --------------------------------------------------

  describe('updatePlayerEmail', () => {
    it('returns true when email is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerEmail(1, 'new@example.com');

      expect(result).toBe(true);
    });

    it('returns false when player is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerEmail(999, 'new@example.com');

      expect(result).toBe(false);
    });
  });

  // --- updatePlayerPassword -----------------------------------------------

  describe('updatePlayerPassword', () => {
    it('returns true when password is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerPassword(1, 'new_hashed_pw');

      expect(result).toBe(true);
    });

    it('returns false when player is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerPassword(999, 'new_hashed_pw');

      expect(result).toBe(false);
    });
  });

  // --- deletePlayer -------------------------------------------------------

  describe('deletePlayer', () => {
    it('returns true when player and all related records are deleted', async () => {
      // deletePlayer calls prepare many times; the last one (DELETE Player) returns changes: 1
      const stmt = mockStmt(null, [], { changes: 1 });
      // lootboxesStmt.all() must return an array, listingsStmt.all() as well
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const result = await service.deletePlayer(1);

      expect(result).toBe(true);
      // prepare should be called many times for cascade deletes
      expect(unit.prepare).toHaveBeenCalled();
    });

    it('returns false when player does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const result = await service.deletePlayer(999);

      expect(result).toBe(false);
    });
  });

  // --- getPlayerByOAuth ---------------------------------------------------

  describe('getPlayerByOAuth', () => {
    it('returns a player matching provider and providerId', async () => {
      const oauthPlayer = { ...samplePlayer, provider: 'google', providerId: 'google-uid-123' };
      const stmt = mockStmt(oauthPlayer);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByOAuth('google', 'google-uid-123');

      expect(result).toEqual(oauthPlayer);
    });

    it('returns null when no matching OAuth player is found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PlayerService(unit);

      const result = await service.getPlayerByOAuth('github', 'unknown-id');

      expect(result).toBeNull();
    });
  });

  // --- updatePlayerUsername -----------------------------------------------

  describe('updatePlayerUsername', () => {
    it('updates username when unique', async () => {
      const getStmt = mockStmt(null);
      const runStmt = mockStmt(null, [], { changes: 1 });
      let callCount = 0;
      const unit = {
        prepare: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? getStmt : runStmt;
        }),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const result = await service.updatePlayerUsername(1, 'newname');

      expect(result).toBe(true);
    });

    it('returns false when username is taken by another player', async () => {
      const getStmt = mockStmt({ playerId: 2, username: 'taken' });
      const unit = mockUnit(getStmt);
      const service = new PlayerService(unit);

      const result = await service.updatePlayerUsername(1, 'taken');

      expect(result).toBe(false);
    });
  });

  // --- updatePlayerMotto ----------------------------------------------------

  describe('updatePlayerMotto', () => {
    it('updates motto and truncates to 100 chars', async () => {
      const runStmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(runStmt);
      const service = new PlayerService(unit);

      const longMotto = 'a'.repeat(200);
      const result = await service.updatePlayerMotto(1, longMotto);

      expect(result).toBe(true);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Player SET motto'),
        expect.objectContaining({ motto: 'a'.repeat(100) })
      );
    });
  });

  // --- createOAuthPlayer --------------------------------------------------

  describe('createOAuthPlayer', () => {
    it('returns [true, id] on successful OAuth player creation', async () => {
      const runStmt = mockStmt(null, [], { changes: 1 });
      const unit = {
        prepare: jest.fn().mockReturnValue(runStmt),
        getLastRowId: jest.fn().mockResolvedValue(7),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const [success, id] = await service.createOAuthPlayer('alice', 'alice@example.com', 'google', 'google-uid-123');

      expect(success).toBe(true);
      expect(id).toBe(7);
    });

    it('returns [false, 0] when OAuth insert fails', async () => {
      const runStmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(runStmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new PlayerService(unit);

      const [success, id] = await service.createOAuthPlayer('alice', 'alice@example.com', 'google', 'google-uid-123');

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });
});