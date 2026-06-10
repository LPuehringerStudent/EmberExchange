import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerAchievementService } from "./player-achievement-service";
import { GloryCustomizationService } from "./glory-customization-service";
import { PlayerPrestigeService } from "./player-prestige-service";
import { NotificationService } from "./notification-service";
import type { AchievementDefinition } from "../../shared/model";

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    // ── Lootbox ───────────────────────────────────────────────
    { achievementId: 'first_drop', label: 'First Drop', description: 'Open your first lootbox', category: 'lootbox', rewardCoins: 50, rewardXP: 10, tier: 'common' },
    { achievementId: 'lootbox_addict', label: 'Lootbox Addict', description: 'Open 50+ lootboxes', category: 'lootbox', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'centurion', label: 'Centurion', description: 'Open 100+ lootboxes', category: 'lootbox', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'lootbox_god', label: 'Lootbox God', description: 'Open 500+ lootboxes', category: 'lootbox', rewardCoins: 3000, rewardXP: 400, tier: 'epic' },

    // ── Trade ─────────────────────────────────────────────────
    { achievementId: 'trader', label: 'Trader', description: 'Complete your first trade', category: 'trade', rewardCoins: 100, rewardXP: 25, tier: 'common' },
    { achievementId: 'active_trader', label: 'Active Trader', description: 'Make 10+ purchases', category: 'trade', rewardCoins: 300, rewardXP: 75, tier: 'uncommon' },
    { achievementId: 'trading_empire', label: 'Trading Empire', description: 'Complete 100+ trades', category: 'trade', rewardCoins: 1000, rewardXP: 200, tier: 'rare' },
    { achievementId: 'market_mogul', label: 'Market Mogul', description: 'Complete 500+ trades', category: 'trade', rewardCoins: 5000, rewardXP: 750, tier: 'legendary' },

    // ── Mini-game ─────────────────────────────────────────────
    { achievementId: 'big_winner', label: 'Big Winner', description: 'Win 5+ mini-games', category: 'mini-game', rewardCoins: 100, rewardXP: 25, tier: 'common' },
    { achievementId: 'win_streak', label: 'Win Streak', description: 'Win 20+ mini-games', category: 'mini-game', rewardCoins: 300, rewardXP: 75, tier: 'uncommon' },
    { achievementId: 'gambler', label: 'Gambler', description: 'Play 50+ mini-games', category: 'mini-game', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'mini_game_master', label: 'Mini-Game Master', description: 'Play 100+ mini-games', category: 'mini-game', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'burnout', label: 'Burnout', description: 'Play 500+ mini-games', category: 'mini-game', rewardCoins: 2000, rewardXP: 300, tier: 'epic' },
    { achievementId: 'profitable', label: 'Profitable', description: 'Earn 10,000+ coins from mini-games', category: 'mini-game', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'high_roller', label: 'High Roller', description: 'Win 10,000+ coins in one hand', category: 'mini-game', rewardCoins: 1000, rewardXP: 150, tier: 'epic' },
    { achievementId: 'jackpot', label: 'Jackpot!', description: 'Win 100,000+ coins in one hand', category: 'mini-game', rewardCoins: 5000, rewardXP: 500, tier: 'legendary' },

    // ── Prestige ──────────────────────────────────────────────
    { achievementId: 'first_steps', label: 'First Steps', description: 'Reach level 10', category: 'prestige', rewardCoins: 200, rewardXP: 50, tier: 'common' },
    { achievementId: 'veteran', label: 'Veteran', description: 'Reach level 25', category: 'prestige', rewardCoins: 500, rewardXP: 100, tier: 'uncommon' },
    { achievementId: 'ascended', label: 'Ascended', description: 'Prestige at least once', category: 'prestige', rewardCoins: 1000, rewardXP: 250, tier: 'rare' },
    { achievementId: 'prestigious', label: 'Prestigious', description: 'Prestige at least once', category: 'prestige', rewardCoins: 1000, rewardXP: 250, tier: 'rare' },
    { achievementId: 'immortal', label: 'Immortal', description: 'Prestige 5 times', category: 'prestige', rewardCoins: 5000, rewardXP: 1000, tier: 'legendary' },

    // ── Wealth ────────────────────────────────────────────────
    { achievementId: 'early_bird', label: 'Early Bird', description: 'Play for 1+ days', category: 'wealth', rewardCoins: 50, rewardXP: 10, tier: 'common' },
    { achievementId: 'dedicated', label: 'Dedicated', description: 'Play for 7+ days', category: 'wealth', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'big_spender', label: 'Big Spender', description: 'Spend 25,000+ coins', category: 'wealth', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'whale', label: 'Whale', description: 'Spend 500,000+ coins', category: 'wealth', rewardCoins: 2000, rewardXP: 300, tier: 'epic' },
    { achievementId: 'king_of_the_hill', label: 'King of the Hill', description: 'Hold 500,000+ coins at once', category: 'wealth', rewardCoins: 2000, rewardXP: 300, tier: 'epic' },
    { achievementId: 'wealthy', label: 'Wealthy', description: 'Reach 100,000+ net worth', category: 'wealth', rewardCoins: 500, rewardXP: 100, tier: 'uncommon' },
    { achievementId: 'tycoon', label: 'Tycoon', description: 'Reach 500,000+ net worth', category: 'wealth', rewardCoins: 1500, rewardXP: 250, tier: 'rare' },
    { achievementId: 'net_millionaire', label: 'Net Millionaire', description: 'Reach 1,000,000+ net worth', category: 'wealth', rewardCoins: 3000, rewardXP: 500, tier: 'epic' },
    { achievementId: 'billionaire', label: 'Billionaire', description: 'Reach 10,000,000+ net worth', category: 'wealth', rewardCoins: 10000, rewardXP: 2000, tier: 'legendary' },
    { achievementId: 'coin_millionaire', label: 'Coin Millionaire', description: 'Earn 1,000,000+ coins total', category: 'wealth', rewardCoins: 5000, rewardXP: 750, tier: 'epic' },
    { achievementId: 'coin_billionaire', label: 'Coin Billionaire', description: 'Earn 10,000,000+ coins total', category: 'wealth', rewardCoins: 15000, rewardXP: 2500, tier: 'legendary' },

    // ── Collection ────────────────────────────────────────────
    { achievementId: 'collector', label: 'Collector', description: 'Own 10+ stoves', category: 'collection', rewardCoins: 100, rewardXP: 25, tier: 'common' },
    { achievementId: 'collector_deluxe', label: 'Collector Deluxe', description: 'Own 50+ stoves', category: 'collection', rewardCoins: 500, rewardXP: 100, tier: 'uncommon' },
    { achievementId: 'dragon_tamer', label: 'Dragon Tamer', description: 'Acquire 50+ stoves', category: 'collection', rewardCoins: 300, rewardXP: 75, tier: 'uncommon' },
    { achievementId: 'dragon_master', label: 'Dragon Master', description: 'Own 5+ Dragon collection stoves', category: 'collection', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'dragon_hoarder', label: 'Dragon Hoarder', description: 'Own 10+ Dragon collection stoves', category: 'collection', rewardCoins: 1000, rewardXP: 200, tier: 'epic' },
    { achievementId: 'all_dragon', label: 'Dragon Lord', description: 'Own all Dragon collection stoves', category: 'collection', rewardCoins: 3000, rewardXP: 500, tier: 'legendary' },
    { achievementId: 'winter_wonderland', label: 'Winter Wonderland', description: 'Own 5+ Winter collection stoves', category: 'collection', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'frost_collector', label: 'Frost Collector', description: 'Own all Winter collection stoves', category: 'collection', rewardCoins: 2000, rewardXP: 300, tier: 'epic' },
    { achievementId: 'rare_hunter', label: 'Rare Hunter', description: 'Own a legendary or secret stove', category: 'collection', rewardCoins: 500, rewardXP: 100, tier: 'uncommon' },
    { achievementId: 'one_of_each', label: 'Rainbow Collection', description: 'Own one stove of every rarity', category: 'collection', rewardCoins: 2000, rewardXP: 400, tier: 'epic' },
    { achievementId: 'completionist', label: 'Completionist', description: 'Own every stove type in the game', category: 'collection', rewardCoins: 20000, rewardXP: 5000, tier: 'legendary' },

    // ── Market ────────────────────────────────────────────────
    { achievementId: 'merchant', label: 'Merchant', description: 'Create 20+ listings', category: 'trade', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'market_shark', label: 'Market Shark', description: 'Earn 50,000+ coins from sales', category: 'trade', rewardCoins: 1000, rewardXP: 200, tier: 'rare' },
    { achievementId: 'market_maker', label: 'Market Maker', description: 'Earn 250,000+ coins from sales', category: 'trade', rewardCoins: 3000, rewardXP: 500, tier: 'epic' },

    // ── Forging ───────────────────────────────────────────────
    { achievementId: 'first_forge', label: 'First Forge', description: 'Forge your first stove', category: 'forging', rewardCoins: 100, rewardXP: 25, tier: 'common' },
    { achievementId: 'blacksmith', label: 'Blacksmith', description: 'Forge 10+ stoves', category: 'forging', rewardCoins: 500, rewardXP: 100, tier: 'uncommon' },
    { achievementId: 'master_forge', label: 'Master Smith', description: 'Forge 50+ stoves', category: 'forging', rewardCoins: 2000, rewardXP: 300, tier: 'rare' },
    { achievementId: 'legendary_forge', label: 'Legendary Smith', description: 'Forge a legendary stove', category: 'forging', rewardCoins: 3000, rewardXP: 500, tier: 'epic' },
    { achievementId: 'limited_forge', label: 'Limited Edition', description: 'Forge a limited stove', category: 'forging', rewardCoins: 10000, rewardXP: 1500, tier: 'legendary' },
    { achievementId: 'perfect_forge', label: 'Perfect Forge', description: 'Forge a stove with 95%+ heat', category: 'forging', rewardCoins: 5000, rewardXP: 1000, tier: 'legendary' },

    // ── Shop ──────────────────────────────────────────────────
    { achievementId: 'first_purchase', label: 'First Purchase', description: 'Buy your first shop item', category: 'shop', rewardCoins: 50, rewardXP: 10, tier: 'common' },
    { achievementId: 'shop_regular', label: 'Regular Customer', description: 'Buy 10+ shop items', category: 'shop', rewardCoins: 300, rewardXP: 75, tier: 'uncommon' },
    { achievementId: 'streak_master', label: 'Streak Master', description: 'Claim a 7-day daily reward streak', category: 'shop', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'shopaholic', label: 'Shopaholic', description: 'Spend 50,000+ coins in the shop', category: 'shop', rewardCoins: 2000, rewardXP: 300, tier: 'epic' },

    // ── Social ────────────────────────────────────────────────
    { achievementId: 'first_friend', label: 'First Friend', description: 'Add your first friend', category: 'social', rewardCoins: 50, rewardXP: 10, tier: 'common' },
    { achievementId: 'socialite', label: 'Socialite', description: 'Have 10+ friends', category: 'social', rewardCoins: 300, rewardXP: 75, tier: 'uncommon' },
    { achievementId: 'chatterbox', label: 'Chatterbox', description: 'Send 100+ chat messages', category: 'social', rewardCoins: 500, rewardXP: 100, tier: 'rare' },
    { achievementId: 'diplomat', label: 'Diplomat', description: 'Complete 10+ trade offers', category: 'social', rewardCoins: 1000, rewardXP: 200, tier: 'rare' },
    { achievementId: 'popular', label: 'Popular', description: 'Receive 10+ profile visits', category: 'social', rewardCoins: 100, rewardXP: 25, tier: 'uncommon' },
    { achievementId: 'famous', label: 'Famous', description: 'Receive 100+ profile visits', category: 'social', rewardCoins: 1000, rewardXP: 200, tier: 'epic' },
    { achievementId: 'celebrity', label: 'Celebrity', description: 'Receive 1,000+ profile visits', category: 'social', rewardCoins: 10000, rewardXP: 2000, tier: 'legendary' },

    // ── Spin ──────────────────────────────────────────────────
    { achievementId: 'first_spin', label: 'First Spin', description: 'Spin the Lucky Wheel for the first time', category: 'spin', rewardCoins: 50, rewardXP: 10, tier: 'common' },
    { achievementId: 'spin_10', label: 'Wheel Regular', description: 'Spin the Lucky Wheel 10 times', category: 'spin', rewardCoins: 200, rewardXP: 50, tier: 'uncommon' },
    { achievementId: 'spin_50', label: 'Wheel Addict', description: 'Spin the Lucky Wheel 50 times', category: 'spin', rewardCoins: 1000, rewardXP: 200, tier: 'rare' },
    { achievementId: 'spin_jackpot', label: 'Wheel Jackpot', description: 'Win 1,000+ coins in a single spin', category: 'spin', rewardCoins: 500, rewardXP: 100, tier: 'epic' },
    { achievementId: 'spin_lootbox', label: 'Lucky Box', description: 'Win a lootbox from the Lucky Wheel', category: 'spin', rewardCoins: 100, rewardXP: 25, tier: 'uncommon' },
];

export class AchievementEngine extends ServiceBase {
    // Per-request caches to avoid redundant DB round-trips
    private playerCache = new Map<number, { coins: number; joinedAt: string }>();
    private statsCache = new Map<number, { netWorthEstimate: number; totalCoinsEarned: number }>();
    private prestigeCache = new Map<number, { currentLevel: number; prestigeCount: number }>();
    private stoveCountsCache = new Map<number, {
        total: number; dragon: number; winter: number; ownedTypes: number;
        rarityCount: number; rareCount: number; winterUnique: number; dragonUnique: number;
        totalTypes: number;
    }>();
    private ownershipCache = new Map<number, number>();
    private marketCache = new Map<number, { listings: number; revenue: number; spending: number }>();
    private miniGameCache = new Map<number, { games: number; wins: number; profit: number; maxPayout: number }>();
    private lootboxCache = new Map<number, number>();
    private tradeCache = new Map<number, number>();
    private socialCache = new Map<number, { friends: number; messages: number; tradeOffers: number; visits: number }>();
    private checkedCosmetics = false;

    constructor(unit: Unit) {
        super(unit);
    }

    private async getCachedPlayer(playerId: number): Promise<{ coins: number; joinedAt: string } | undefined> {
        if (!this.playerCache.has(playerId)) {
            const row = await this.unit.prepare<{ coins: number; joinedAt: string }>(
                "SELECT coins, joinedAt FROM Player WHERE playerId = @playerId", { playerId }
            ).get();
            if (row) this.playerCache.set(playerId, row);
        }
        return this.playerCache.get(playerId);
    }

    private async getCachedStats(playerId: number): Promise<{ netWorthEstimate: number; totalCoinsEarned: number } | undefined> {
        if (!this.statsCache.has(playerId)) {
            const row = await this.unit.prepare<{ netWorthEstimate: number; totalCoinsEarned: number }>(
                "SELECT netWorthEstimate, totalCoinsEarned FROM PlayerStatistics WHERE playerId = @playerId", { playerId }
            ).get();
            if (row) this.statsCache.set(playerId, row);
        }
        return this.statsCache.get(playerId);
    }

    private async getCachedPrestige(playerId: number): Promise<{ currentLevel: number; prestigeCount: number } | undefined> {
        if (!this.prestigeCache.has(playerId)) {
            const prestigeSvc = new PlayerPrestigeService(this.unit);
            const p = await prestigeSvc.getPrestige(playerId);
            if (p) this.prestigeCache.set(playerId, { currentLevel: p.currentLevel, prestigeCount: p.prestigeCount });
        }
        return this.prestigeCache.get(playerId);
    }

    private async getCachedStoveCounts(playerId: number) {
        if (!this.stoveCountsCache.has(playerId)) {
            const row = await this.unit.prepare<{
                total: number; dragon: number; winter: number; ownedTypes: number;
                rarityCount: number; rareCount: number; winterUnique: number; dragonUnique: number;
                totalTypes: number;
            }>(`
                SELECT
                    COUNT(*)::INTEGER as total,
                    COUNT(DISTINCT s.stoveId) FILTER (WHERE st.collection = 'Dragon')::INTEGER as dragon,
                    COUNT(DISTINCT s.stoveId) FILTER (WHERE st.collection = 'Winter')::INTEGER as winter,
                    COUNT(DISTINCT s.typeId)::INTEGER as ownedTypes,
                    COUNT(DISTINCT st.rarity)::INTEGER as rarityCount,
                    COUNT(*) FILTER (WHERE st.rarity IN ('legendary', 'secret'))::INTEGER as rareCount,
                    COUNT(DISTINCT s.typeId) FILTER (WHERE st.collection = 'Winter')::INTEGER as winterUnique,
                    COUNT(DISTINCT s.typeId) FILTER (WHERE st.collection = 'Dragon')::INTEGER as dragonUnique,
                    (SELECT COUNT(*)::INTEGER FROM StoveType) as totalTypes
                FROM Stove s
                JOIN StoveType st ON s.typeId = st.typeId
                WHERE s.currentOwnerId = @playerId
            `, { playerId }).get();
            if (row) this.stoveCountsCache.set(playerId, row);
        }
        return this.stoveCountsCache.get(playerId);
    }

    private async getCachedOwnershipCount(playerId: number): Promise<number> {
        if (!this.ownershipCache.has(playerId)) {
            const row = await this.unit.prepare<{ count: number }>(
                "SELECT COUNT(*)::INTEGER as count FROM Ownership WHERE playerId = @playerId", { playerId }
            ).get();
            this.ownershipCache.set(playerId, row?.count ?? 0);
        }
        return this.ownershipCache.get(playerId)!;
    }

    private async getCachedMarketStats(playerId: number) {
        if (!this.marketCache.has(playerId)) {
            const row = await this.unit.prepare<{
                listings: number; revenue: number; spending: number;
            }>(`
                SELECT
                    (SELECT COUNT(*)::INTEGER FROM Listing WHERE sellerId = @playerId) as listings,
                    COALESCE((SELECT SUM(l.price) FROM Listing l
                        JOIN Trade t ON l.listingId = t.listingId
                        WHERE l.sellerId = @playerId AND l.status = 'sold'), 0)::INTEGER as revenue,
                    COALESCE((SELECT SUM(l.price) FROM Trade t
                        JOIN Listing l ON t.listingId = l.listingId
                        WHERE t.buyerId = @playerId), 0)::INTEGER as spending
            `, { playerId }).get();
            if (row) this.marketCache.set(playerId, row);
        }
        return this.marketCache.get(playerId);
    }

    private async getCachedMiniGameStats(playerId: number) {
        if (!this.miniGameCache.has(playerId)) {
            const row = await this.unit.prepare<{
                games: number; wins: number; profit: number; maxPayout: number;
            }>(`
                SELECT
                    COUNT(*)::INTEGER as games,
                    COUNT(*) FILTER (WHERE result = 'win')::INTEGER as wins,
                    COALESCE(SUM(coinPayout), 0)::INTEGER as profit,
                    COALESCE(MAX(coinPayout), 0)::INTEGER as maxPayout
                FROM MiniGameSession
                WHERE playerId = @playerId
            `, { playerId }).get();
            if (row) this.miniGameCache.set(playerId, row);
        }
        return this.miniGameCache.get(playerId);
    }

    private async getCachedLootboxCount(playerId: number): Promise<number> {
        if (!this.lootboxCache.has(playerId)) {
            const row = await this.unit.prepare<{ count: number }>(
                "SELECT COUNT(*)::INTEGER as count FROM Lootbox WHERE playerId = @playerId AND openedAt IS NOT NULL", { playerId }
            ).get();
            this.lootboxCache.set(playerId, row?.count ?? 0);
        }
        return this.lootboxCache.get(playerId)!;
    }

    private async getCachedTradeCount(playerId: number): Promise<number> {
        if (!this.tradeCache.has(playerId)) {
            const row = await this.unit.prepare<{ count: number }>(`
                SELECT COUNT(*)::INTEGER as count FROM Trade t
                JOIN Listing l ON t.listingId = l.listingId
                WHERE t.buyerId = @playerId OR l.sellerId = @playerId
            `, { playerId }).get();
            this.tradeCache.set(playerId, row?.count ?? 0);
        }
        return this.tradeCache.get(playerId)!;
    }

    private purchaseCache = new Map<number, number>();

    private async getCachedPurchaseCount(playerId: number): Promise<number> {
        if (!this.purchaseCache.has(playerId)) {
            const row = await this.unit.prepare<{ count: number }>(`
                SELECT COUNT(*)::INTEGER as count FROM Trade t
                JOIN Listing l ON t.listingId = l.listingId
                WHERE t.buyerId = @playerId
            `, { playerId }).get();
            this.purchaseCache.set(playerId, row?.count ?? 0);
        }
        return this.purchaseCache.get(playerId)!;
    }

    private async getCachedSocialStats(playerId: number) {
        if (!this.socialCache.has(playerId)) {
            const row = await this.unit.prepare<{
                friends: number; messages: number; tradeOffers: number; visits: number;
            }>(`
                SELECT
                    (SELECT COUNT(*)::INTEGER FROM Friend WHERE status = 'accepted' AND (requesterId = @playerId OR addresseeId = @playerId)) as friends,
                    (SELECT COUNT(*)::INTEGER FROM ChatMessage WHERE senderId = @playerId) as messages,
                    (SELECT COUNT(*)::INTEGER FROM ChatMessage WHERE senderId = @playerId AND messageType = 'trade_offer') as tradeOffers,
                    (SELECT COUNT(*)::INTEGER FROM GloryVisit WHERE visitedPlayerId = @playerId) as visits
            `, { playerId }).get();
            if (row) this.socialCache.set(playerId, row);
        }
        return this.socialCache.get(playerId);
    }

    private async maybeCheckCosmeticUnlocks(playerId: number): Promise<void> {
        if (this.checkedCosmetics) return;
        this.checkedCosmetics = true;
        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Generic unlock helpers ─────────────────────────────────

    private async unlock(playerId: number, achievementId: string): Promise<{ fresh: boolean; rewards?: { coins: number; xp: number } }> {
        const svc = new PlayerAchievementService(this.unit);
        const def = ACHIEVEMENT_DEFINITIONS.find(d => d.achievementId === achievementId);
        try {
            const [wasUnlocked] = await svc.unlock(playerId, achievementId);
            if (wasUnlocked && def) {
                // Grant rewards
                if (def.rewardCoins) {
                    await this.unit.prepare(
                        `UPDATE Player SET coins = coins + @amount WHERE playerId = @playerId`,
                        { amount: def.rewardCoins, playerId }
                    ).run();
                }
                if (def.rewardXP) {
                    const prestigeSvc = new PlayerPrestigeService(this.unit);
                    await prestigeSvc.addXP(playerId, def.rewardXP, 'achievement', `Unlocked: ${def.label}`);
                }
                // Send notification
                const notifSvc = new NotificationService(this.unit);
                const rewardParts: string[] = [];
                if (def.rewardCoins) rewardParts.push(`${def.rewardCoins.toLocaleString()} coins`);
                if (def.rewardXP) rewardParts.push(`${def.rewardXP.toLocaleString()} XP`);
                const rewardText = rewardParts.length > 0 ? ` Reward: ${rewardParts.join(' + ')}.` : '';
                await notifSvc.create(
                    playerId,
                    'system',
                    `Achievement Unlocked: ${def.label}`,
                    `${def.description}.${rewardText}`,
                    { achievementId, rewardCoins: def.rewardCoins ?? 0, rewardXP: def.rewardXP ?? 0 }
                );
                return { fresh: true, rewards: { coins: def.rewardCoins ?? 0, xp: def.rewardXP ?? 0 } };
            }
            return { fresh: wasUnlocked };
        } catch {
            return { fresh: false };
        }
    }

    // ── Lootbox achievements ───────────────────────────────────

    async checkLootboxAchievements(playerId: number): Promise<void> {
        const opened = await this.getCachedLootboxCount(playerId);

        if (opened >= 1)  await this.unlock(playerId, 'first_drop');
        if (opened >= 50) await this.unlock(playerId, 'lootbox_addict');
        if (opened >= 100) await this.unlock(playerId, 'centurion');
        if (opened >= 500) await this.unlock(playerId, 'lootbox_god');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Trade achievements ─────────────────────────────────────

    async checkTradeAchievements(playerId: number): Promise<void> {
        const trades = await this.getCachedTradeCount(playerId);

        if (trades >= 1)   await this.unlock(playerId, 'trader');
        if (trades >= 100) await this.unlock(playerId, 'trading_empire');
        if (trades >= 500) await this.unlock(playerId, 'market_mogul');

        const purchases = await this.getCachedPurchaseCount(playerId);
        if (purchases >= 10) await this.unlock(playerId, 'active_trader');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Mini-game achievements ─────────────────────────────────

    async checkMiniGameAchievements(playerId: number): Promise<void> {
        const stats = await this.getCachedMiniGameStats(playerId);
        const wins = stats?.wins ?? 0;
        const games = stats?.games ?? 0;
        const profit = stats?.profit ?? 0;

        if (wins >= 5)  await this.unlock(playerId, 'big_winner');
        if (wins >= 20) await this.unlock(playerId, 'win_streak');
        if (games >= 50)  await this.unlock(playerId, 'gambler');
        if (games >= 100) await this.unlock(playerId, 'mini_game_master');
        if (games >= 500) await this.unlock(playerId, 'burnout');
        if (profit >= 10000) await this.unlock(playerId, 'profitable');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Level / Prestige achievements ──────────────────────────

    async checkLevelAchievements(playerId: number): Promise<void> {
        const prestige = await this.getCachedPrestige(playerId);
        const level = prestige?.currentLevel ?? 1;
        const prestigeCount = prestige?.prestigeCount ?? 0;

        if (level >= 10)  await this.unlock(playerId, 'first_steps');
        if (level >= 25)  await this.unlock(playerId, 'veteran');
        if (prestigeCount >= 1) {
            await this.unlock(playerId, 'ascended');
            await this.unlock(playerId, 'prestigious');
        }
        if (prestigeCount >= 5) await this.unlock(playerId, 'immortal');

        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Wealth / Collection achievements ───────────────────────

    async checkWealthAchievements(playerId: number): Promise<void> {
        const player = await this.getCachedPlayer(playerId);
        if (!player) return;

        const stats = await this.getCachedStats(playerId);
        const coins = player.coins ?? 0;
        const netWorth = stats?.netWorthEstimate ?? 0;
        const totalEarned = stats?.totalCoinsEarned ?? 0;

        if (coins >= 500000)       await this.unlock(playerId, 'king_of_the_hill');
        if (netWorth >= 100000)    await this.unlock(playerId, 'wealthy');
        if (netWorth >= 500000)    await this.unlock(playerId, 'tycoon');
        if (netWorth >= 1000000)   await this.unlock(playerId, 'net_millionaire');
        if (netWorth >= 10000000)  await this.unlock(playerId, 'billionaire');
        if (totalEarned >= 1000000) await this.unlock(playerId, 'coin_millionaire');
        if (totalEarned >= 10000000) await this.unlock(playerId, 'coin_billionaire');

        // Days since join
        const joined = new Date(player.joinedAt ?? Date.now());
        const days = Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 1)  await this.unlock(playerId, 'early_bird');
        if (days >= 7)  await this.unlock(playerId, 'dedicated');
        if (days >= 30) await this.unlock(playerId, 'veteran');

        // Stove collection (all in one cached query)
        const sc = await this.getCachedStoveCounts(playerId);
        const stoves = sc?.total ?? 0;
        const dragonStoves = sc?.dragon ?? 0;
        const winterStoves = sc?.winter ?? 0;
        const ownedTypes = sc?.ownedTypes ?? 0;
        const rarityCount = sc?.rarityCount ?? 0;
        const rareCount = sc?.rareCount ?? 0;
        const totalTypes = sc?.totalTypes ?? 0;
        const winterUnique = sc?.winterUnique ?? 0;
        const dragonUnique = sc?.dragonUnique ?? 0;

        if (stoves >= 10) await this.unlock(playerId, 'collector');
        if (stoves >= 50) await this.unlock(playerId, 'collector_deluxe');

        const acquired = await this.getCachedOwnershipCount(playerId);
        if (acquired >= 50) await this.unlock(playerId, 'dragon_tamer');

        if (dragonStoves >= 5) await this.unlock(playerId, 'dragon_master');
        if (dragonStoves >= 10) await this.unlock(playerId, 'dragon_hoarder');
        if (winterStoves >= 5) await this.unlock(playerId, 'winter_wonderland');
        const winterTotal = (await this.unit.prepare<{ cnt: number }>("SELECT COUNT(*)::INTEGER as cnt FROM StoveType WHERE collection = 'Winter'").get())?.cnt ?? 0;
        if (winterUnique > 0 && totalTypes > 0 && winterUnique >= winterTotal) {
            await this.unlock(playerId, 'frost_collector');
        }
        const dragonTotal = (await this.unit.prepare<{ cnt: number }>("SELECT COUNT(*)::INTEGER as cnt FROM StoveType WHERE collection = 'Dragon'").get())?.cnt ?? 0;
        if (dragonUnique > 0 && totalTypes > 0 && dragonUnique >= dragonTotal) {
            await this.unlock(playerId, 'all_dragon');
        }
        if (rarityCount >= 6) await this.unlock(playerId, 'one_of_each');
        if (totalTypes > 0 && ownedTypes >= totalTypes) {
            await this.unlock(playerId, 'completionist');
        }
        if (rareCount > 0) await this.unlock(playerId, 'rare_hunter');

        // Market achievements
        const market = await this.getCachedMarketStats(playerId);
        const listings = market?.listings ?? 0;
        const revenue = market?.revenue ?? 0;
        const spending = market?.spending ?? 0;

        if (listings >= 20) await this.unlock(playerId, 'merchant');
        if (revenue >= 50000)  await this.unlock(playerId, 'market_shark');
        if (revenue >= 250000) await this.unlock(playerId, 'market_maker');
        if (spending >= 25000)  await this.unlock(playerId, 'big_spender');
        if (spending >= 500000) await this.unlock(playerId, 'whale');

        // Luckiest win
        const mg = await this.getCachedMiniGameStats(playerId);
        const luckiest = mg?.maxPayout ?? 0;
        if (luckiest >= 10000)  await this.unlock(playerId, 'high_roller');
        if (luckiest >= 100000) await this.unlock(playerId, 'jackpot');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Forge achievements ─────────────────────────────────────

    async checkForgeAchievements(playerId: number, outputRarity?: string, heatLevel?: number): Promise<void> {
        const forged = await this.getCachedOwnershipCount(playerId); // approximate, counts all ownerships
        // Note: we don't have a cheap way to filter by acquiredHow='craft' in the cache,
        // but forge achievements are relatively rare so one extra query is acceptable
        const forgedStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Ownership WHERE playerId = @playerId AND acquiredHow = 'craft'`,
            { playerId }
        );
        const forgedExact = (await forgedStmt.get())?.count ?? 0;

        if (forgedExact >= 1) await this.unlock(playerId, 'first_forge');
        if (forgedExact >= 10) await this.unlock(playerId, 'blacksmith');
        if (forgedExact >= 50) await this.unlock(playerId, 'master_forge');

        if (outputRarity === 'legendary') await this.unlock(playerId, 'legendary_forge');
        if (outputRarity === 'limited') await this.unlock(playerId, 'limited_forge');
        if (heatLevel !== undefined && heatLevel >= 0.95) await this.unlock(playerId, 'perfect_forge');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Shop achievements ──────────────────────────────────────

    async checkShopAchievements(playerId: number): Promise<void> {
        const purchasesStmt = this.unit.prepare<{ count: number; total: number }>(
            `SELECT COUNT(*)::INTEGER as count, COALESCE(SUM(sl.price), 0) as total
             FROM ShopPurchase sp
             JOIN ShopListing sl ON sp.listingId = sl.listingId
             WHERE sp.playerId = @playerId`,
            { playerId }
        );
        const shopData = await purchasesStmt.get();
        const purchases = shopData?.count ?? 0;
        const totalSpent = shopData?.total ?? 0;

        if (purchases >= 1) await this.unlock(playerId, 'first_purchase');
        if (purchases >= 10) await this.unlock(playerId, 'shop_regular');
        if (totalSpent >= 50000) await this.unlock(playerId, 'shopaholic');

        const streakStmt = this.unit.prepare<{ streakCount: number }>(
            `SELECT streakCount FROM PlayerDailyReward WHERE playerId = @playerId`,
            { playerId }
        );
        const streak = (await streakStmt.get())?.streakCount ?? 0;
        if (streak >= 7) await this.unlock(playerId, 'streak_master');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Spin achievements ────────────────────────────────────

    async checkSpinAchievements(playerId: number, totalSpins?: number, prizeId?: string, amount?: number): Promise<void> {
        if (totalSpins !== undefined) {
            if (totalSpins >= 1) await this.unlock(playerId, 'first_spin');
            if (totalSpins >= 10) await this.unlock(playerId, 'spin_10');
            if (totalSpins >= 50) await this.unlock(playerId, 'spin_50');
        }
        if (prizeId === 'coins_max' && amount !== undefined && amount >= 1000) {
            await this.unlock(playerId, 'spin_jackpot');
        }
        if (prizeId === 'lootbox') {
            await this.unlock(playerId, 'spin_lootbox');
        }
        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Social achievements ────────────────────────────────────

    async checkSocialAchievements(playerId: number): Promise<void> {
        const social = await this.getCachedSocialStats(playerId);
        const friends = social?.friends ?? 0;
        const messages = social?.messages ?? 0;
        const tradeOffers = social?.tradeOffers ?? 0;
        const visits = social?.visits ?? 0;

        if (friends >= 1) await this.unlock(playerId, 'first_friend');
        if (friends >= 10) await this.unlock(playerId, 'socialite');
        if (messages >= 100) await this.unlock(playerId, 'chatterbox');
        if (tradeOffers >= 10) await this.unlock(playerId, 'diplomat');
        if (visits >= 10) await this.unlock(playerId, 'popular');
        if (visits >= 100) await this.unlock(playerId, 'famous');
        if (visits >= 1000) await this.unlock(playerId, 'celebrity');

        await this.checkLevelAchievements(playerId);
        await this.maybeCheckCosmeticUnlocks(playerId);
    }

    // ── Cosmetic auto-unlock engine ────────────────────────────

    async checkCosmeticUnlocks(playerId: number): Promise<void> {
        const glorySvc = new GloryCustomizationService(this.unit);

        // Gather player stats using cached helpers (zero extra queries if already cached)
        const prestige = await this.getCachedPrestige(playerId);
        const level = prestige?.currentLevel ?? 1;
        const prestigeCount = prestige?.prestigeCount ?? 0;

        const stats = await this.getCachedStats(playerId);
        const netWorth = stats?.netWorthEstimate ?? 0;

        const trades = await this.getCachedTradeCount(playerId);
        const lootboxes = await this.getCachedLootboxCount(playerId);
        const mg = await this.getCachedMiniGameStats(playerId);
        const games = mg?.games ?? 0;

        const sc = await this.getCachedStoveCounts(playerId);
        const stoves = sc?.total ?? 0;
        const dragonStoves = sc?.dragon ?? 0;
        const winterStoves = sc?.winter ?? 0;

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

        const unlockStats = { level, netWorth, trades, lootboxes, games, stoves, prestigeCount, dragonStoves, winterStoves };

        // Check themes
        for (const t of themes) {
            if (level < t.minLevel) continue;
            if (this.meetsCondition(t.unlockCondition, t.unlockValue, unlockStats)) {
                try { await glorySvc.unlockTheme(playerId, t.themeId); } catch { /* already unlocked */ }
            }
        }

        // Check titles
        for (const t of titles) {
            if (level < t.minLevel) continue;
            if (this.meetsCondition(t.unlockCondition, t.unlockValue, unlockStats)) {
                try { await glorySvc.unlockTitle(playerId, t.titleId); } catch { /* already unlocked */ }
            }
        }

        // Check banners
        for (const b of banners) {
            if (this.meetsCondition(b.unlockCondition, b.unlockValue, unlockStats)) {
                try { await glorySvc.unlockBanner(playerId, b.bannerId); } catch { /* already unlocked */ }
            }
        }
    }

    private meetsCondition(
        condition: string | null,
        value: number | null,
        stats: { level: number; netWorth: number; trades: number; lootboxes: number; games: number; stoves: number; prestigeCount: number; dragonStoves: number; winterStoves: number }
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
            case 'own_dragon': return stats.dragonStoves >= v;
            case 'own_winter': return stats.winterStoves >= v;
            case 'sales_revenue': return stats.netWorth >= v; // approximate
            case 'luckiest_win': return stats.netWorth >= v; // approximate
            default: return false;
        }
    }
}
