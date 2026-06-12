import { Unit } from "../../backend/utils/unit";

jest.mock("../../backend/services/player-prestige-service", () => ({
  PlayerPrestigeService: jest.fn(() => ({
    addXP: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../backend/services/achievement-engine", () => ({
  AchievementEngine: jest.fn(() => ({
    checkLootboxAchievements: jest.fn().mockResolvedValue(undefined),
    checkWealthAchievements: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../backend/services/pity-service", () => ({
  PityService: jest.fn(() => ({
    checkPity: jest.fn().mockResolvedValue(null),
    resetCounter: jest.fn().mockResolvedValue(undefined),
    incrementCounter: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../backend/services/quest-service", () => ({
  QuestService: jest.fn(() => ({
    trackProgress: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { LootboxService } from "../../backend/services/lootbox-service";

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
    getLastRowId: jest.fn(),
    savepoint: jest.fn().mockResolvedValue(undefined),
    rollbackToSavepoint: jest.fn().mockResolvedValue(undefined),
  } as unknown as Unit;
}

function collectionSchemaStmts() {
  return [mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt()];
}

describe("Lootbox opening integration flow", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("opening an owned unlisted lootbox creates a stove, marks the box opened, creates a drop, and decrements count", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const insertStoveStmt = mockStmt({ stoveId: 501 }, [], { changes: 1 });
    const collectionSchema = collectionSchemaStmts();
    const insertCollectionStmt = mockStmt(null, [], { changes: 1 });
    const openLootboxStmt = mockStmt(null, [], { changes: 1 });
    const insertDropStmt = mockStmt({ dropId: 900 }, [], { changes: 1 });
    const decrementCountStmt = mockStmt(null, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt({ lootboxId: 10, lootboxTypeId: 1, playerId: 1, openedAt: null, acquiredHow: "free" }),
      mockStmt({ count: 0 }),
      mockStmt(null, [
        {
          typeId: 22,
          name: "Ember Stove",
          rarity: "common",
          imageUrl: "/assets/ember.png",
          minHeat: 0.2,
          maxHeat: 0.8,
        },
      ]),
      insertStoveStmt,
      ...collectionSchema,
      insertCollectionStmt,
      openLootboxStmt,
      insertDropStmt,
      decrementCountStmt,
    ]);

    const [success, result] = await new LootboxService(unit).openLootbox(10, 1);

    expect(success).toBe(true);
    expect(result).toEqual({
      stoveId: 501,
      stoveName: "Ember Stove",
      rarity: "common",
      imageUrl: "/assets/ember.png",
      lootboxId: 10,
    });
    expect(insertStoveStmt.get).toHaveBeenCalledTimes(1);
    for (const stmt of collectionSchema) {
      expect(stmt.run).toHaveBeenCalledTimes(1);
    }
    expect(insertCollectionStmt.run).toHaveBeenCalledTimes(1);
    expect(openLootboxStmt.run).toHaveBeenCalledTimes(1);
    expect(insertDropStmt.get).toHaveBeenCalledTimes(1);
    expect(decrementCountStmt.run).toHaveBeenCalledTimes(1);
  });

  test("a listed lootbox cannot be opened and no drop is created", async () => {
    const insertStoveStmt = mockStmt({ stoveId: 501 }, [], { changes: 1 });
    const unit = mockUnitSequence([
      mockStmt({ lootboxId: 10, lootboxTypeId: 1, playerId: 1, openedAt: null, acquiredHow: "free" }),
      mockStmt({ count: 1 }),
      insertStoveStmt,
    ]);

    const [success, result] = await new LootboxService(unit).openLootbox(10, 1);

    expect(success).toBe(false);
    expect(result).toBeNull();
    expect(insertStoveStmt.get).not.toHaveBeenCalled();
    expect(insertStoveStmt.run).not.toHaveBeenCalled();
  });
});
