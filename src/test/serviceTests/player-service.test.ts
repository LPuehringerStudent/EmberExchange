import { PlayerService } from '../../backend/services/player-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { PlayerRow } from '../../shared/model';

describe('PlayerService', () => {
    let mockUnit: MockUnit;
    let service: PlayerService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new PlayerService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllPlayers', () => {
        it('should return all players from database', () => {
            const mockPlayers: PlayerRow[] = [
                { playerId: 1, username: 'player1', password: 'pass1', email: 'p1@test.com', coins: 100, lootboxCount: 5, isAdmin: false, joinedAt: new Date('2024-01-01'), provider: null, providerId: null },
                { playerId: 2, username: 'player2', password: 'pass2', email: 'p2@test.com', coins: 200, lootboxCount: 10, isAdmin: true, joinedAt: new Date('2024-01-02'), provider: null, providerId: null }
            ];
            mockStmt.all.mockReturnValue(mockPlayers);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllPlayers();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Player');
            expect(result).toEqual(mockPlayers);
        });

        it('should return empty array when no players exist', () => {
            mockStmt.all.mockReturnValue([]);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllPlayers();

            expect(result).toEqual([]);
        });
    });

    describe('getInfoByID', () => {
        it('should return player when found', () => {
            const mockPlayer: PlayerRow = { playerId: 1, username: 'player1', password: 'pass1', email: 'p1@test.com', coins: 100, lootboxCount: 5, isAdmin: false, joinedAt: new Date('2024-01-01'), provider: null, providerId: null };
            mockStmt.get.mockReturnValue(mockPlayer);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getInfoByID(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Player WHERE playerId = @id', { id: 1 });
            expect(result).toEqual(mockPlayer);
        });

        it('should return null when player not found', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getInfoByID(999);

            expect(result).toBeNull();
        });
    });

    describe('createPlayer', () => {
        it('should create player with default values', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createPlayer('newplayer', 'hashedpass', 'new@test.com');

            // Verify prepare was called
            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);

            // Check first argument contains INSERT
            const firstArg = mockUnit.prepare.mock.calls[0][0];
            expect(typeof firstArg).toBe('string');
            expect(firstArg as string).toContain('INSERT');

            // Check second argument has correct params
            const secondArg = mockUnit.prepare.mock.calls[0][1];
            expect(secondArg).toMatchObject({
                username: 'newplayer',
                password: 'hashedpass',
                email: 'new@test.com',
                coins: 1000,
                lootboxCount: 10
            });

            expect(success).toBe(true);
            expect(id).toBe(5);
        });

        it('should create player with custom coin and lootbox values', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 6 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createPlayer('custom', 'pass', 'custom@test.com', 500, 20);

            const params = mockUnit.prepare.mock.calls[0][1];
            expect(params).toMatchObject({ coins: 500, lootboxCount: 20 });
            expect(success).toBe(true);
        });

        it('should return false when insert fails', () => {
            mockStmt.run.mockReturnValue({ changes: 0, lastInsertRowid: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createPlayer('fail', 'pass', 'fail@test.com');

            expect(success).toBe(false);
        });
    });

    describe('updatePlayerCoins', () => {
        it('should return true when update succeeds', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updatePlayerCoins(1, 500);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'UPDATE Player SET coins = @coins WHERE playerId = @id',
                { id: 1, coins: 500 }
            );
            expect(result).toBe(true);
        });

        it('should return false when no rows updated', () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updatePlayerCoins(999, 500);

            expect(result).toBe(false);
        });
    });

    describe('updatePlayerLootboxCount', () => {
        it('should update lootbox count successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updatePlayerLootboxCount(1, 15);

            expect(result).toBe(true);
        });
    });

    describe('deletePlayer', () => {
        it('should return true when player deleted', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deletePlayer(1);

            expect(result).toBe(true);
        });

        it('should return false when player not found', () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deletePlayer(999);

            expect(result).toBe(false);
        });
    });

    describe('getPlayerByUsername', () => {
        it('should find player by username', () => {
            const mockPlayer: PlayerRow = { playerId: 1, username: 'testuser', password: 'pass', email: 'test@test.com', coins: 100, lootboxCount: 5, isAdmin: false, joinedAt: new Date('2024-01-01'), provider: null, providerId: null };
            mockStmt.get.mockReturnValue(mockPlayer);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPlayerByUsername('testuser');

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Player WHERE username = @username', { username: 'testuser' });
            expect(result).toEqual(mockPlayer);
        });

        it('should return null for non-existent username', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPlayerByUsername('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getPlayerByEmail', () => {
        it('should find player by email', () => {
            const mockPlayer: PlayerRow = { playerId: 1, username: 'testuser', password: 'pass', email: 'findme@test.com', coins: 100, lootboxCount: 5, isAdmin: false, joinedAt: new Date('2024-01-01'), provider: null, providerId: null };
            mockStmt.get.mockReturnValue(mockPlayer);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPlayerByEmail('findme@test.com');

            expect(result).toEqual(mockPlayer);
        });
    });
});