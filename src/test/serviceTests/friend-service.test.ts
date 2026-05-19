import { FriendService } from '../../backend/services/friend-service';
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

describe('FriendService', () => {
  const player1 = 1;
  const player2 = 2;

  describe('sendRequest', () => {
    it('sends a friend request successfully', async () => {
      const unit = mockUnitSequence([
        mockStmt(null),          // findRelationship - no existing
        mockStmt(null, [], { changes: 1 }), // insert
      ]);
      const service = new FriendService(unit);

      const [success, id] = await service.sendRequest(player1, player2);
      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('rejects self-request', async () => {
      const unit = mockUnitSequence([]);
      const service = new FriendService(unit);

      const [success, id] = await service.sendRequest(player1, player1);
      expect(success).toBe(false);
      expect(id).toBe(0);
    });

    it('rejects duplicate request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player1, addresseeId: player2, status: 'pending' }),
      ]);
      const service = new FriendService(unit);

      const [success, id] = await service.sendRequest(player1, player2);
      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  describe('respondToRequest', () => {
    it('accepts a pending request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player2, addresseeId: player1, status: 'pending' }),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new FriendService(unit);

      const result = await service.respondToRequest(5, player1, true);
      expect(result).toBe(true);
    });

    it('declines a pending request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player2, addresseeId: player1, status: 'pending' }),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new FriendService(unit);

      const result = await service.respondToRequest(5, player1, false);
      expect(result).toBe(true);
    });

    it('rejects response from wrong player', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player2, addresseeId: player1, status: 'pending' }),
      ]);
      const service = new FriendService(unit);

      const result = await service.respondToRequest(5, 999, true);
      expect(result).toBe(false);
    });

    it('rejects non-pending request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player2, addresseeId: player1, status: 'accepted' }),
      ]);
      const service = new FriendService(unit);

      const result = await service.respondToRequest(5, player1, true);
      expect(result).toBe(false);
    });
  });

  describe('removeFriend', () => {
    it('removes an accepted friendship', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player1, addresseeId: player2, status: 'accepted' }),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new FriendService(unit);

      const result = await service.removeFriend(5, player1);
      expect(result).toBe(true);
    });

    it('allows requester to cancel pending request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player1, addresseeId: player2, status: 'pending' }),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new FriendService(unit);

      const result = await service.removeFriend(5, player1);
      expect(result).toBe(true);
    });

    it('prevents addressee from cancelling pending request', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player2, addresseeId: player1, status: 'pending' }),
      ]);
      const service = new FriendService(unit);

      const result = await service.removeFriend(5, player1);
      expect(result).toBe(false);
    });

    it('rejects removal by unrelated player', async () => {
      const unit = mockUnitSequence([
        mockStmt({ friendId: 5, requesterId: player1, addresseeId: player2, status: 'accepted' }),
      ]);
      const service = new FriendService(unit);

      const result = await service.removeFriend(5, 999);
      expect(result).toBe(false);
    });
  });

  describe('blockPlayer', () => {
    it('blocks a player', async () => {
      const unit = mockUnitSequence([
        mockStmt(null),          // otherPending check
        mockStmt(null),          // findRelationship
        mockStmt(null, [], { changes: 1 }), // insert
      ]);
      const service = new FriendService(unit);

      const [success, id] = await service.blockPlayer(player1, player2);
      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('rejects self-block', async () => {
      const unit = mockUnitSequence([]);
      const service = new FriendService(unit);

      const [success, id] = await service.blockPlayer(player1, player1);
      expect(success).toBe(false);
      expect(id).toBe(0);
    });

    it('updates existing relationship to blocked', async () => {
      const unit = mockUnitSequence([
        mockStmt(null),          // otherPending check
        mockStmt({ friendId: 5, requesterId: player1, addresseeId: player2, status: 'pending' }),
        mockStmt(null, [], { changes: 1 }),
      ]);
      const service = new FriendService(unit);

      const [success, id] = await service.blockPlayer(player1, player2);
      expect(success).toBe(true);
      expect(id).toBe(5);
    });
  });

  describe('getFriends', () => {
    it('returns accepted friends with usernames', async () => {
      const friends = [
        { friendId: 1, requesterId: player1, addresseeId: player2, status: 'accepted', createdAt: new Date(), username: 'Player2' },
      ];
      const unit = mockUnitSequence([mockStmt(null, friends)]);
      const service = new FriendService(unit);

      const result = await service.getFriends(player1);
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('Player2');
    });
  });

  describe('getPendingRequests', () => {
    it('returns incoming pending requests', async () => {
      const requests = [
        { friendId: 1, requesterId: player2, addresseeId: player1, status: 'pending', createdAt: new Date(), username: 'Player2' },
      ];
      const unit = mockUnitSequence([mockStmt(null, requests)]);
      const service = new FriendService(unit);

      const result = await service.getPendingRequests(player1);
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('Player2');
    });
  });

  describe('areFriends', () => {
    it('returns true when friends', async () => {
      const unit = mockUnitSequence([mockStmt({ count: 1 })]);
      const service = new FriendService(unit);

      const result = await service.areFriends(player1, player2);
      expect(result).toBe(true);
    });

    it('returns false when not friends', async () => {
      const unit = mockUnitSequence([mockStmt({ count: 0 })]);
      const service = new FriendService(unit);

      const result = await service.areFriends(player1, player2);
      expect(result).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('returns true when blocked', async () => {
      const unit = mockUnitSequence([mockStmt({ count: 1 })]);
      const service = new FriendService(unit);

      const result = await service.isBlocked(player1, player2);
      expect(result).toBe(true);
    });

    it('returns false when not blocked', async () => {
      const unit = mockUnitSequence([mockStmt({ count: 0 })]);
      const service = new FriendService(unit);

      const result = await service.isBlocked(player1, player2);
      expect(result).toBe(false);
    });
  });
});
