import { GameService } from '../../backend/services/game-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = []) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleGame = {
  gameId: 1,
  name: 'Blackjack',
  slug: 'blackjack',
  gameType: 'blackjack',
  minPlayers: 1,
  maxPlayers: 6,
  ruleset: '',
  description: null,
  genre: 'cards',
  tags: [],
  isActive: 1,
};

describe('GameService', () => {
  describe('getAllGames', () => {
    it('returns active games', async () => {
      const stmt = mockStmt(null, [sampleGame]);
      const service = new GameService(mockUnit(stmt));

      const result = await service.getAllGames();

      expect(result).toEqual([sampleGame]);
    });

    it('passes limit and offset to the query', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new GameService(unit);

      await service.getAllGames(20, 40);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT @limit OFFSET @offset'),
        { limit: 20, offset: 40 }
      );
    });
  });

  describe('getGameByType', () => {
    it('returns game when found', async () => {
      const stmt = mockStmt(sampleGame);
      const service = new GameService(mockUnit(stmt));

      const result = await service.getGameByType('blackjack');

      expect(result).toEqual(sampleGame);
    });

    it('returns null when game is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new GameService(mockUnit(stmt));

      const result = await service.getGameByType('missing');

      expect(result).toBeNull();
    });
  });
});
