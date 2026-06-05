import { Unit } from "../../backend/utils/unit";

jest.mock("../../backend/services/notification-service", () => ({
  NotificationService: jest.fn(() => ({
    create: jest.fn().mockResolvedValue([true, 1]),
  })),
}));

jest.mock("../../backend/services/achievement-engine", () => ({
  AchievementEngine: jest.fn(() => ({
    checkShopAchievements: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { ShopService } from "../../backend/services/shop-service";

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
    getLastRowId: jest.fn().mockResolvedValue(11),
  } as unknown as Unit;
}

describe("Shop purchase integration flow", () => {
  test("buying a lootbox deducts coins, creates the lootbox, updates count, and logs the purchase", async () => {
    const deductCoinsStmt = mockStmt(null, [], { changes: 1 });
    const coinTransactionStmt = mockStmt(null, [], { changes: 1 });
    const createLootboxStmt = mockStmt({ lootboxId: 77 });
    const updateLootboxCountStmt = mockStmt(null, [], { changes: 1 });
    const shopPurchaseStmt = mockStmt(null, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt({ playerId: 1, username: "buyer", coins: 1000, lootboxCount: 2 }),
      mockStmt(null),
      mockStmt({
        listingId: 5,
        itemType: "lootbox",
        itemId: 1,
        price: 300,
        stock: -1,
        name: "Standard Lootbox",
        imageUrl: "assets/animation/chest-idle.gif",
        rarity: "common",
      }),
      mockStmt(null, [{ lootboxTypeId: 1, dailyLimit: 2 }]),
      mockStmt(null, []),
      mockStmt({ dailyLimit: 2 }),
      mockStmt({ count: 0 }),
      deductCoinsStmt,
      coinTransactionStmt,
      createLootboxStmt,
      updateLootboxCountStmt,
      shopPurchaseStmt,
    ]);

    const result = await new ShopService(unit).purchaseItem(1, 5);

    expect(result).toEqual({ success: true, itemId: 77 });
    expect(deductCoinsStmt.run).toHaveBeenCalledTimes(1);
    expect(coinTransactionStmt.run).toHaveBeenCalledTimes(1);
    expect(createLootboxStmt.get).toHaveBeenCalledTimes(1);
    expect(updateLootboxCountStmt.run).toHaveBeenCalledTimes(1);
    expect(shopPurchaseStmt.run).toHaveBeenCalledTimes(1);
    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE Player SET lootboxCount"),
      { id: 1, lootboxCount: 3 }
    );
  });

  test("daily lootbox limit stops the flow before coins are deducted", async () => {
    const deductCoinsStmt = mockStmt(null, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt({ playerId: 1, username: "buyer", coins: 1000, lootboxCount: 2 }),
      mockStmt(null),
      mockStmt({
        listingId: 5,
        itemType: "lootbox",
        itemId: 1,
        price: 300,
        stock: 0,
        name: "Standard Lootbox",
        imageUrl: "assets/animation/chest-idle.gif",
        rarity: "common",
      }),
      mockStmt(null, [{ lootboxTypeId: 1, dailyLimit: 2 }]),
      mockStmt(null, [{ listingId: 5, count: 2 }]),
      mockStmt({ dailyLimit: 2 }),
      mockStmt({ count: 2 }),
      deductCoinsStmt,
    ]);

    const result = await new ShopService(unit).purchaseItem(1, 5);

    expect(result).toEqual({
      success: false,
      error: "Daily purchase limit reached",
    });
    expect(deductCoinsStmt.run).not.toHaveBeenCalled();
  });
});
