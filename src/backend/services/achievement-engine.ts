import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerAchievementService } from "./player-achievement-service";
import { GloryCustomizationService } from "./glory-customization-service";
import { PlayerPrestigeService } from "./player-prestige-service";
import type { AchievementDefinition } from "../../shared/model";

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    // Lootbox
    { achievementId: 'first_drop', label: 'First Drop', description: 'Open your first lootbox', category: 'lootbox' },
    { achievementId: 'lootbox_addict', label: 'Lootbox Addict', description: 'Open 50+ lootboxes', category: 'lootbox' },
    { achievementId: 'centurion', label: 'Centurion', description: 'Open 100+ lootboxes', category: 'lootbox' },
    // Trade
    { achievementId: 'trader', label: 'Trader', description: 'Complete your first trade', category: 'trade' },
    { achievementId: 'trading_empire', label: 'Trading Empire', description: 'Complete 100+ trades', category: 'trade' },
    { achievementId: 'active_trader', label: 'Active Trader', description: 'Make 10+ purchases', category: 'trade' },
    // Mini-game
    { achievementId: 'big_winner', label: 'Big Winner', description: 'Win 5+ mini-games', category: 'mini-game' },
    { achievementId: 'win_streak', label: 'Win Streak', description: 'Win 20+ mini-games', category: 'mini-game' },
    { achievementId: 'gambler', label: 'Gambler', description: 'Play 50+ mini-games', category: 'mini-game' },
    { achievementId: 'mini_game_master', label: 'Mini-Game Master', description: 'Play 100+ mini-games', category: 'mini-game' },
    { achievementId: 'burnout', label: 'Burnout', description: 'Play 500+ mini-games', category: 'mini-game' },
    { achievementId: 'profitable', label: 'Profitable', description: 'Earn 10,000+ coins from mini-games', category: 'mini-game' },
    { achievementId: 'high_roller', label: 'High Roller', description: 'Win 10,000+ coins in one hand', category: 'mini-game' },
    { achievementId: 'jackpot', label: 'Jackpot!', description: 'Win 100,000+ coins in one hand', category: 'mini-game' },
    // Prestige / Level
    { achievementId: 'first_steps', label: 'First Steps', description: 'Reach level 10', category: 'prestige' },
    { achievementId: 'veteran', label: 'Veteran', description: 'Reach level 25', category: 'prestige' },
    { achievementId: 'ascended', label: 'Ascended', description: 'Prestige at least once', category: 'prestige' },
    { achievementId: 'prestigious', label: 'Prestigious', description: 'Prestige at least once', category: 'prestige' },
    { achievementId: 'immortal', label: 'Immortal', description: 'Prestige 5 times', category: 'prestige' },
    // Wealth
    { achievementId: 'king_of_the_hill', label: 'King of the Hill', description: 'Hold 500,000+ coins at once', category: 'wealth' },
    { achievementId: 'wealthy', label: 'Wealthy', description: 'Reach 100,000+ net worth', category: 'wealth' },
    { achievementId: 'tycoon', label: 'Tycoon', description: 'Reach 500,000+ net worth', category: 'wealth' },
    { achievementId: 'net_millionaire', label: 'Net Millionaire', description: 'Reach 1,000,000+ net worth', category: 'wealth' },
    { achievementId: 'coin_millionaire', label: 'Coin Millionaire', description: 'Earn 1,000,000+ coins total', category: 'wealth' },
    { achievementId: 'early_bird', label: 'Early Bird', description: 'Play for 1+ days', category: 'wealth' },
    { achievementId: 'dedicated', label: 'Dedicated', description: 'Play for 7+ days', category: 'wealth' },
    // Collection
    { achievementId: 'collector', label: 'Collector', description: 'Own 10+ stoves', category: 'collection' },
    { achievementId: 'collector_deluxe', label: 'Collector Deluxe', description: 'Own 50+ stoves', category: 'collection' },
    { achievementId: 'dragon_tamer', label: 'Dragon Tamer', description: 'Acquire 50+ stoves', category: 'collection' },
    { achievementId: 'rare_hunter', label: 'Rare Hunter', description: 'Own a legendary or secret stove', category: 'collection' },
    // Market
    { achievementId: 'merchant', label: 'Merchant', description: 'Create 20+ listings', category: 'trade' },
    { achievementId: 'market_shark', label: 'Market Shark', description: 'Earn 50,000+ coins from sales', category: 'trade' },
    { achievementId: 'market_maker', label: 'Market Maker', description: 'Earn 250,000+ coins from sales', category: 'trade' },
    { achievementId: 'big_spender', label: 'Big Spender', description: 'Spend 25,000+ coins', category: 'wealth' },
    { achievementId: 'whale', label: 'Whale', description: 'Spend 500,000+ coins', category: 'wealth' },
];

export class AchievementEngine extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    // ── Generic unlock helpers ─────────────────────────────────

    private async unlock(playerId: number, achievementId: string): Promise<void> {
        const svc = new PlayerAchievementService(this.unit);
        try {
            await svc.unlock(playerId, achievementId);
        } catch {
            // Ignore duplicate/unlock errors
        }
    }

    // ── Lootbox achievements ───────────────────────────────────

    async checkLootboxAchievements(playerId: number): Promise<void> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Lootbox WHERE playerId = @playerId AND openedAt IS NOT NULL",
            { playerId }
        );
        const opened = (await stmt.get())?.count ?? 0;

        if (opened >= 1)  await this.unlock(playerId, 'first_drop');
        if (opened >= 50) await this.unlock(playerId, 'lootbox_addict');
        if (opened >= 100) await this.unlock(playerId, 'centurion');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Trade achievements ─────────────────────────────────────

    async checkTradeAchievements(playerId: number): Promise<void> {
        const tradesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             WHERE (t.buyerId = @playerId OR l.sellerId = @playerId)`,
            { playerId }
        );
        const trades = (await tradesStmt.get())?.count ?? 0;

        if (trades >= 1)   await this.unlock(playerId, 'trader');
        if (trades >= 100) await this.unlock(playerId, 'trading_empire');

        const purchasesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Trade t JOIN Listing l ON t.listingId = l.listingId WHERE t.buyerId = @playerId",
            { playerId }
        );
        const purchases = (await purchasesStmt.get())?.count ?? 0;
        if (purchases >= 10) await this.unlock(playerId, 'active_trader');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Mini-game achievements ─────────────────────────────────

    async checkMiniGameAchievements(playerId: number): Promise<void> {
        const winsStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM MiniGameSession WHERE playerId = @playerId AND result = 'win'",
            { playerId }
        );
        const wins = (await winsStmt.get())?.count ?? 0;

        const gamesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const games = (await gamesStmt.get())?.count ?? 0;

        if (wins >= 5)  await this.unlock(playerId, 'big_winner');
        if (wins >= 20) await this.unlock(playerId, 'win_streak');
        if (games >= 50)  await this.unlock(playerId, 'gambler');
        if (games >= 100) await this.unlock(playerId, 'mini_game_master');
        if (games >= 500) await this.unlock(playerId, 'burnout');

        const profitStmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(coinPayout), 0) as total FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const profit = (await profitStmt.get())?.total ?? 0;
        if (profit >= 10000) await this.unlock(playerId, 'profitable');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Level / Prestige achievements ──────────────────────────

    async checkLevelAchievements(playerId: number): Promise<void> {
        const prestigeSvc = new PlayerPrestigeService(this.unit);
        const prestige = await prestigeSvc.getPrestige(playerId);
        const level = prestige?.currentLevel ?? 1;
        const prestigeCount = prestige?.prestigeCount ?? 0;

        if (level >= 10)  await this.unlock(playerId, 'first_steps');
        if (level >= 25)  await this.unlock(playerId, 'veteran');
        if (prestigeCount >= 1) {
            await this.unlock(playerId, 'ascended');
            await this.unlock(playerId, 'prestigious');
        }
        if (prestigeCount >= 5) await this.unlock(playerId, 'immortal');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Wealth / Collection achievements ───────────────────────

    async checkWealthAchievements(playerId: number): Promise<void> {
        const playerStmt = this.unit.prepare<{ coins: number; joinedAt: string }>(
            "SELECT coins, joinedAt FROM Player WHERE playerId = @playerId",
            { playerId }
        );
        const player = await playerStmt.get();
        if (!player) return;

        const statsStmt = this.unit.prepare<{ netWorthEstimate: number; totalCoinsEarned: number }>(
            "SELECT netWorthEstimate, totalCoinsEarned FROM PlayerStatistics WHERE playerId = @playerId",
            { playerId }
        );
        const stats = await statsStmt.get();

        const coins = player.coins ?? 0;
        const netWorth = stats?.netWorthEstimate ?? 0;
        const totalEarned = stats?.totalCoinsEarned ?? 0;

        if (coins >= 500000)       await this.unlock(playerId, 'king_of_the_hill');
        if (netWorth >= 100000)    await this.unlock(playerId, 'wealthy');
        if (netWorth >= 500000)    await this.unlock(playerId, 'tycoon');
        if (netWorth >= 1000000)   await this.unlock(playerId, 'net_millionaire');
        if (totalEarned >= 1000000) await this.unlock(playerId, 'coin_millionaire');

        // Days since join
        const joined = new Date(player.joinedAt ?? Date.now());
        const days = Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 1)  await this.unlock(playerId, 'early_bird');
        if (days >= 7)  await this.unlock(playerId, 'dedicated');
        if (days >= 30) await this.unlock(playerId, 'veteran');

        // Stove collection
        const stovesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Stove WHERE currentOwnerId = @playerId",
            { playerId }
        );
        const stoves = (await stovesStmt.get())?.count ?? 0;
        if (stoves >= 10) await this.unlock(playerId, 'collector');
        if (stoves >= 50) await this.unlock(playerId, 'collector_deluxe');

        const acquiredStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Ownership WHERE playerId = @playerId",
            { playerId }
        );
        const acquired = (await acquiredStmt.get())?.count ?? 0;
        if (acquired >= 50) await this.unlock(playerId, 'dragon_tamer');

        // Legendary/secret ownership
        const rareStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.rarity IN ('legendary', 'secret')`,
            { playerId }
        );
        const hasRare = ((await rareStmt.get())?.count ?? 0) > 0;
        if (hasRare) await this.unlock(playerId, 'rare_hunter');

        // Market achievements
        const listingsStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Listing WHERE sellerId = @playerId",
            { playerId }
        );
        const listings = (await listingsStmt.get())?.count ?? 0;
        if (listings >= 20) await this.unlock(playerId, 'merchant');

        const revenueStmt = this.unit.prepare<{ total: number }>(
            `SELECT COALESCE(SUM(l.price), 0) as total FROM Listing l
             JOIN Trade t ON l.listingId = t.listingId
             WHERE l.sellerId = @playerId AND l.status = 'sold'`,
            { playerId }
        );
        const revenue = (await revenueStmt.get())?.total ?? 0;
        if (revenue >= 50000)  await this.unlock(playerId, 'market_shark');
        if (revenue >= 250000) await this.unlock(playerId, 'market_maker');

        const spendingStmt = this.unit.prepare<{ total: number }>(
            `SELECT COALESCE(SUM(l.price), 0) as total FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             WHERE t.buyerId = @playerId`,
            { playerId }
        );
        const spending = (await spendingStmt.get())?.total ?? 0;
        if (spending >= 25000)  await this.unlock(playerId, 'big_spender');
        if (spending >= 500000) await this.unlock(playerId, 'whale');

        // Luckiest win
        const luckStmt = this.unit.prepare<{ max: number }>(
            "SELECT COALESCE(MAX(coinPayout), 0) as max FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const luckiest = (await luckStmt.get())?.max ?? 0;
        if (luckiest >= 10000)  await this.unlock(playerId, 'high_roller');
        if (luckiest >= 100000) await this.unlock(playerId, 'jackpot');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Cosmetic auto-unlock engine ────────────────────────────

    async checkCosmeticUnlocks(playerId: number): Promise<void> {
        const glorySvc = new GloryCustomizationService(this.unit);
        const prestigeSvc = new PlayerPrestigeService(this.unit);

        // Gather player stats needed for unlock checks
        const prestige = await prestigeSvc.getPrestige(playerId);
        const level = prestige?.currentLevel ?? 1;
        const prestigeCount = prestige?.prestigeCount ?? 0;

        const playerStmt = this.unit.prepare<{ coins: number }>(
            "SELECT coins FROM Player WHERE playerId = @playerId",
            { playerId }
        );
        const player = await playerStmt.get();

        const statsStmt = this.unit.prepare<{ netWorthEstimate: number }>(
            "SELECT netWorthEstimate FROM PlayerStatistics WHERE playerId = @playerId",
            { playerId }
        );
        const stats = await statsStmt.get();
        const netWorth = stats?.netWorthEstimate ?? 0;

        const tradesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             WHERE (t.buyerId = @playerId OR l.sellerId = @playerId)`,
            { playerId }
        );
        const trades = (await tradesStmt.get())?.count ?? 0;

        const lootboxesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Lootbox WHERE playerId = @playerId AND openedAt IS NOT NULL",
            { playerId }
        );
        const lootboxes = (await lootboxesStmt.get())?.count ?? 0;

        const gamesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const games = (await gamesStmt.get())?.count ?? 0;

        const stovesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Stove WHERE currentOwnerId = @playerId",
            { playerId }
        );
        const stoves = (await stovesStmt.get())?.count ?? 0;

        // Fetch all catalog items with unlock conditions
        const themesStmt = this.unit.prepare<{ themeId: number; unlockCondition: string | null; unlockValue: number | null; minLevel: number }>(
            "SELECT themeId, unlockCondition, unlockValue, minLevel FROM GloryTheme WHERE unlockCondition IS NOT NULL"
        );
        const titlesStmt = this.unit.prepare<{ titleId: string; unlockCondition: string | null; unlockValue: number | null; minLevel: number }>(
            "SELECT titleId, unlockCondition, unlockValue, minLevel FROM GloryTitle WHERE unlockCondition IS NOT NULL"
        );
        const bannersStmt = this.unit.prepare<{ bannerId: number; unlockCondition: string | null; unlockValue: number | null }>(
            "SELECT bannerId, unlockCondition, unlockValue FROM GloryBanner WHERE unlockCondition IS NOT NULL"
        );

        const themes = await themesStmt.all();
        const titles = await titlesStmt.all();
        const banners = await bannersStmt.all();

        // Check themes
        for (const t of themes) {
            if (level < t.minLevel) continue;
            if (this.meetsCondition(t.unlockCondition, t.unlockValue, { level, netWorth, trades, lootboxes, games, stoves, prestigeCount })) {
                try { await glorySvc.unlockTheme(playerId, t.themeId); } catch { /* already unlocked */ }
            }
        }

        // Check titles
        for (const t of titles) {
            if (level < t.minLevel) continue;
            if (this.meetsCondition(t.unlockCondition, t.unlockValue, { level, netWorth, trades, lootboxes, games, stoves, prestigeCount })) {
                try { await glorySvc.unlockTitle(playerId, t.titleId); } catch { /* already unlocked */ }
            }
        }

        // Check banners
        for (const b of banners) {
            if (this.meetsCondition(b.unlockCondition, b.unlockValue, { level, netWorth, trades, lootboxes, games, stoves, prestigeCount })) {
                try { await glorySvc.unlockBanner(playerId, b.bannerId); } catch { /* already unlocked */ }
            }
        }
    }

    private meetsCondition(
        condition: string | null,
        value: number | null,
        stats: { level: number; netWorth: number; trades: number; lootboxes: number; games: number; stoves: number; prestigeCount: number }
    ): boolean {
        if (!condition) return true;
        const v = value ?? 0;
        switch (condition) {
            case 'level': return stats.level >= v;
            case 'net_worth': return stats.netWorth >= v;
            case 'trades': return stats.trades >= v;
            case 'lootboxes': return stats.lootboxes >= v;
            case 'games_played': return stats.games >= v;
            case 'stoves': return stats.stoves >= v;
            case 'prestige': return stats.prestigeCount >= v;
            case 'own_stove': return stats.stoves >= 1;
            case 'sales_revenue': return stats.netWorth >= v; // approximate
            case 'luckiest_win': return stats.netWorth >= v; // approximate
            default: return false;
        }
    }
}
