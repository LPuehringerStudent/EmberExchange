import { PlayerSettingsService } from '../../backend/services/player-settings-service';
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
  } as unknown as Unit;
}

describe('PlayerSettingsService', () => {
  describe('getSettings', () => {
    it('returns settings when they exist', async () => {
      const dbRow = { playerid: 1, notifyfriendrequests: 1, notifychatmessages: 0, notifytradeoffers: 1, notifydailyreward: 0, notifyshoppurchases: 1, hascompletedonboarding: 0 };
      const stmt = mockStmt(dbRow);
      const unit = mockUnit(stmt);
      const service = new PlayerSettingsService(unit);

      const result = await service.getSettings(1);

      expect(result).toEqual({
        playerId: 1,
        notifyFriendRequests: true,
        notifyChatMessages: false,
        notifyTradeOffers: true,
        notifyDailyReward: false,
        notifyShopPurchases: true,
        hasCompletedOnboarding: false
      });
    });

    it('returns null when settings do not exist', async () => {
      const stmt = mockStmt(null);
      const unit = mockUnit(stmt);
      const service = new PlayerSettingsService(unit);

      const result = await service.getSettings(999);

      expect(result).toBeNull();
    });
  });

  describe('ensureSettings', () => {
    it('returns existing settings if found', async () => {
      const dbRow = { playerid: 1, notifyfriendrequests: 1, notifychatmessages: 1, notifytradeoffers: 1, notifydailyreward: 1, notifyshoppurchases: 1, hascompletedonboarding: 1 };
      const stmt = mockStmt(dbRow);
      const unit = mockUnit(stmt);
      const service = new PlayerSettingsService(unit);

      const result = await service.ensureSettings(1);

      expect(result).toEqual({
        playerId: 1,
        notifyFriendRequests: true,
        notifyChatMessages: true,
        notifyTradeOffers: true,
        notifyDailyReward: true,
        notifyShopPurchases: true,
        hasCompletedOnboarding: true
      });
    });

    it('creates default settings if not found', async () => {
      const getStmt = mockStmt(null);
      const runStmt = mockStmt(null, [], { changes: 1 });
      let callCount = 0;
      const unit = {
        prepare: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? getStmt : runStmt;
        }),
      } as unknown as Unit;
      const service = new PlayerSettingsService(unit);

      const result = await service.ensureSettings(2);

      expect(result).toEqual({
        playerId: 2,
        notifyFriendRequests: true,
        notifyChatMessages: true,
        notifyTradeOffers: true,
        notifyDailyReward: true,
        notifyShopPurchases: true,
        hasCompletedOnboarding: false
      });
    });
  });

  describe('updateSettings', () => {
    it('updates specified fields', async () => {
      const getStmt = mockStmt({ playerid: 1, notifyfriendrequests: 1, notifychatmessages: 1, notifytradeoffers: 1, notifydailyreward: 1, notifyshoppurchases: 1, hascompletedonboarding: 1 });
      const runStmt = mockStmt(null, [], { changes: 1 });
      let callCount = 0;
      const unit = {
        prepare: jest.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? getStmt : runStmt;
        }),
      } as unknown as Unit;
      const service = new PlayerSettingsService(unit);

      const result = await service.updateSettings(1, { notifyFriendRequests: false });

      expect(result).toBe(true);
    });

    it('returns false when no fields provided', async () => {
      const getStmt = mockStmt({ playerid: 1, notifyfriendrequests: 1, notifychatmessages: 1, notifytradeoffers: 1, notifydailyreward: 1, notifyshoppurchases: 1, hascompletedonboarding: 1 });
      const unit = mockUnit(getStmt);
      const service = new PlayerSettingsService(unit);

      const result = await service.updateSettings(1, {});

      expect(result).toBe(false);
    });
  });
});
