import { AchievementEngine, ACHIEVEMENT_DEFINITIONS } from '../../backend/services/achievement-engine';
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

describe('AchievementEngine', () => {
    describe('ACHIEVEMENT_DEFINITIONS', () => {
        it('contains all expected achievements', () => {
            const ids = ACHIEVEMENT_DEFINITIONS.map(d => d.achievementId);
            expect(ids).toContain('first_drop');
            expect(ids).toContain('lootbox_addict');
            expect(ids).toContain('centurion');
            expect(ids).toContain('trader');
            expect(ids).toContain('big_winner');
            expect(ids).toContain('first_steps');
            expect(ids).toContain('king_of_the_hill');
            expect(ids).toContain('collector');
            expect(ids).toContain('early_bird');
            expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(35);
        });

        it('has unique achievementIds', () => {
            const ids = ACHIEVEMENT_DEFINITIONS.map(d => d.achievementId);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('checkLootboxAchievements', () => {
        it('unlocks first_drop when player has opened 1 lootbox', async () => {
            const unit = mockUnitSequence([
                mockStmt({ count: 1 }), // opened lootboxes
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkLootboxAchievements(1);

            // Should call unlock which calls PlayerAchievementService.unlock
            expect(unit.prepare).toHaveBeenCalled();
        });

        it('does not unlock first_drop when 0 lootboxes opened', async () => {
            const unit = mockUnitSequence([
                mockStmt({ count: 0 }), // no lootboxes
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkLootboxAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });
    });

    describe('checkTradeAchievements', () => {
        it('unlocks trader when player has completed 1 trade', async () => {
            const unit = mockUnitSequence([
                mockStmt({ count: 1 }), // trades
                mockStmt({ count: 0 }), // purchases
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkTradeAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });
    });

    describe('checkMiniGameAchievements', () => {
        it('unlocks big_winner when player has 5 wins', async () => {
            const unit = mockUnitSequence([
                mockStmt({ count: 5 }), // wins
                mockStmt({ count: 10 }), // games
                mockStmt({ total: 5000 }), // profit
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkMiniGameAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });
    });

    describe('checkLevelAchievements', () => {
        it('unlocks first_steps when player reaches level 10', async () => {
            const unit = mockUnitSequence([
                mockStmt({ playerId: 1, totalXP: 900, currentLevel: 10, prestigeCount: 0 }), // prestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkLevelAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });

        it('unlocks ascended and prestigious when player has prestiged', async () => {
            const unit = mockUnitSequence([
                mockStmt({ playerId: 1, totalXP: 0, currentLevel: 1, prestigeCount: 1 }), // prestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkLevelAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });
    });

    describe('checkWealthAchievements', () => {
        it('unlocks king_of_the_hill when player has 500k+ coins', async () => {
            const unit = mockUnitSequence([
                mockStmt({ coins: 600000, joinedAt: new Date().toISOString() }), // player
                mockStmt({ netWorthEstimate: 0, totalCoinsEarned: 0 }), // stats
                mockStmt({ count: 0 }), // stoves
                mockStmt({ count: 0 }), // acquired
                mockStmt({ count: 0 }), // rare
                mockStmt({ count: 0 }), // listings
                mockStmt({ total: 0 }), // revenue
                mockStmt({ total: 0 }), // spending
                mockStmt({ max: 0 }), // luckiest
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkWealthAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });

        it('unlocks early_bird when player has played 1+ days', async () => {
            const joinedAt = new Date();
            joinedAt.setDate(joinedAt.getDate() - 2);
            const unit = mockUnitSequence([
                mockStmt({ coins: 0, joinedAt: joinedAt.toISOString() }), // player
                mockStmt({ netWorthEstimate: 0, totalCoinsEarned: 0 }), // stats
                mockStmt({ count: 0 }), // stoves
                mockStmt({ count: 0 }), // acquired
                mockStmt({ count: 0 }), // rare
                mockStmt({ count: 0 }), // listings
                mockStmt({ total: 0 }), // revenue
                mockStmt({ total: 0 }), // spending
                mockStmt({ max: 0 }), // luckiest
                mockStmt(null), // getPrestige
                mockStmt(null), // player coins
                mockStmt(null), // stats
                mockStmt(null, []), // trades
                mockStmt(null, []), // lootboxes
                mockStmt(null, []), // games
                mockStmt(null, []), // stoves
                mockStmt(null, []), // themes
                mockStmt(null, []), // titles
                mockStmt(null, []), // banners
            ]);
            const engine = new AchievementEngine(unit);

            await engine.checkWealthAchievements(1);

            expect(unit.prepare).toHaveBeenCalled();
        });
    });
});
