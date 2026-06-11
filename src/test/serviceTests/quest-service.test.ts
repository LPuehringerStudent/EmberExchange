import { QuestService } from '../../backend/services/quest-service';
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

const quest = {
  questId: 1,
  playerId: 1,
  questType: 'daily',
  templateId: 'open_lootboxes',
  targetValue: 3,
  currentValue: 2,
  rewardCoins: 100,
  rewardXP: 20,
  rewardLootboxTypeId: null,
  isCompleted: 0,
  isClaimed: 0,
  expiresAt: '2099-01-01',
  createdAt: '2026-01-01',
};

describe('QuestService', () => {
  it('does not create daily quests when active daily quests exist', async () => {
    const unit = mockUnitSequence([mockStmt({ count: 1 })]);
    const service = new QuestService(unit);

    await service.ensureDailyQuests(1);

    expect(unit.prepare).toHaveBeenCalledTimes(1);
  });

  it('creates three daily quests when none are active', async () => {
    const unit = mockUnitSequence([
      mockStmt({ count: 0 }),
      mockStmt(),
      mockStmt(),
      mockStmt(),
    ]);
    const service = new QuestService(unit);

    await service.ensureDailyQuests(1);

    expect(unit.prepare).toHaveBeenCalledTimes(4);
  });

  it('creates two weekly quests when none are active', async () => {
    const unit = mockUnitSequence([
      mockStmt({ count: 0 }),
      mockStmt(),
      mockStmt(),
    ]);
    const service = new QuestService(unit);

    await service.ensureWeeklyQuests(1);

    expect(unit.prepare).toHaveBeenCalledTimes(3);
  });

  it('tracks quest progress and marks completion', async () => {
    const unit = mockUnitSequence([
      mockStmt(null, [quest]),
      mockStmt(),
    ]);
    const service = new QuestService(unit);

    await service.trackProgress(1, 'open_lootboxes', 1);

    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE PlayerQuest SET currentValue'),
      { newValue: 3, completed: 1, questId: 1 }
    );
  });

  it('rejects missing, incomplete and already claimed rewards', async () => {
    const missing = new QuestService(mockUnitSequence([mockStmt(undefined)]));
    await expect(missing.claimReward(1, 1)).resolves.toEqual({ success: false, error: 'Quest not found' });

    const incomplete = new QuestService(mockUnitSequence([mockStmt(quest)]));
    await expect(incomplete.claimReward(1, 1)).resolves.toEqual({ success: false, error: 'Quest not completed' });

    const claimed = new QuestService(mockUnitSequence([mockStmt({ ...quest, isCompleted: 1, isClaimed: 1 })]));
    await expect(claimed.claimReward(1, 1)).resolves.toEqual({ success: false, error: 'Reward already claimed' });
  });
});
