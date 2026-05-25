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
];

export class AchievementEngine extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
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
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Lootbox WHERE playerId = @playerId AND openedAt IS NOT NULL",
            { playerId }
        );
        const opened = (await stmt.get())?.count ?? 0;

        if (opened >= 1)  await this.unlock(playerId, 'first_drop');
        if (opened >= 50) await this.unlock(playerId, 'lootbox_addict');
        if (opened >= 100) await this.unlock(playerId, 'centurion');
        if (opened >= 500) await this.unlock(playerId, 'lootbox_god');

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
        if (trades >= 500) await this.unlock(playerId, 'market_mogul');

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
        if (netWorth >= 10000000)  await this.unlock(playerId, 'billionaire');
        if (totalEarned >= 1000000) await this.unlock(playerId, 'coin_millionaire');
        if (totalEarned >= 10000000) await this.unlock(playerId, 'coin_billionaire');

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

        const dragonStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT s.stoveId)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Dragon'`,
            { playerId }
        );
        const dragonStoves = (await dragonStmt.get())?.count ?? 0;

        const winterStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT s.stoveId)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Winter'`,
            { playerId }
        );
        const winterStoves = (await winterStmt.get())?.count ?? 0;
        if (stoves >= 10) await this.unlock(playerId, 'collector');
        if (stoves >= 50) await this.unlock(playerId, 'collector_deluxe');

        const acquiredStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*)::INTEGER as count FROM Ownership WHERE playerId = @playerId",
            { playerId }
        );
        const acquired = (await acquiredStmt.get())?.count ?? 0;
        if (acquired >= 50) await this.unlock(playerId, 'dragon_tamer');

        // Collection-specific achievements (dragonStoves / winterStoves already queried above)
        if (dragonStoves >= 5) await this.unlock(playerId, 'dragon_master');
        if (dragonStoves >= 10) await this.unlock(playerId, 'dragon_hoarder');
        if (winterStoves >= 5) await this.unlock(playerId, 'winter_wonderland');

        const winterUniqueStmt = this.unit.prepare<{ count: number; total: number }>(
            `SELECT COUNT(DISTINCT s.typeId)::INTEGER as count,
                    (SELECT COUNT(*)::INTEGER FROM StoveType WHERE collection = 'Winter') as total
             FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Winter'`,
            { playerId }
        );
        const winterUnique = await winterUniqueStmt.get();
        if (winterUnique && winterUnique.count >= winterUnique.total) {
            await this.unlock(playerId, 'frost_collector');
        }

        // Dragon collection completion
        const dragonUniqueStmt = this.unit.prepare<{ count: number; total: number }>(
            `SELECT COUNT(DISTINCT s.typeId)::INTEGER as count,
                    (SELECT COUNT(*)::INTEGER FROM StoveType WHERE collection = 'Dragon') as total
             FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Dragon'`,
            { playerId }
        );
        const dragonUnique = await dragonUniqueStmt.get();
        if (dragonUnique && dragonUnique.count >= dragonUnique.total) {
            await this.unlock(playerId, 'all_dragon');
        }

        // One of each rarity
        const rarityStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT st.rarity)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId`,
            { playerId }
        );
        const rarityCount = (await rarityStmt.get())?.count ?? 0;
        if (rarityCount >= 6) await this.unlock(playerId, 'one_of_each');

        // Completionist: own every stove type
        const totalTypesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM StoveType`
        );
        const ownedTypesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT s.typeId)::INTEGER as count FROM Stove s
             WHERE s.currentOwnerId = @playerId`,
            { playerId }
        );
        const totalTypes = (await totalTypesStmt.get())?.count ?? 0;
        const ownedTypes = (await ownedTypesStmt.get())?.count ?? 0;
        if (totalTypes > 0 && ownedTypes >= totalTypes) {
            await this.unlock(playerId, 'completionist');
        }

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

    // ── Forge achievements ─────────────────────────────────────

    async checkForgeAchievements(playerId: number, outputRarity?: string, heatLevel?: number): Promise<void> {
        const forgedStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Ownership WHERE playerId = @playerId AND acquiredHow = 'craft'`,
            { playerId }
        );
        const forged = (await forgedStmt.get())?.count ?? 0;

        if (forged >= 1) await this.unlock(playerId, 'first_forge');
        if (forged >= 10) await this.unlock(playerId, 'blacksmith');
        if (forged >= 50) await this.unlock(playerId, 'master_forge');

        if (outputRarity === 'legendary') await this.unlock(playerId, 'legendary_forge');
        if (outputRarity === 'limited') await this.unlock(playerId, 'limited_forge');
        if (heatLevel !== undefined && heatLevel >= 0.95) await this.unlock(playerId, 'perfect_forge');

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Shop achievements ──────────────────────────────────────

    async checkShopAchievements(playerId: number): Promise<void> {
        const purchasesStmt = this.unit.prepare<{ count: number; total: number }>(
            `SELECT COUNT(*)::INTEGER as count, COALESCE(SUM(price), 0) as total FROM ShopPurchase WHERE playerId = @playerId`,
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

        await this.checkCosmeticUnlocks(playerId);
    }

    // ── Social achievements ────────────────────────────────────

    async checkSocialAchievements(playerId: number): Promise<void> {
        const friendsStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Friend WHERE status = 'accepted' AND (requesterId = @playerId OR addresseeId = @playerId)`,
            { playerId }
        );
        const friends = (await friendsStmt.get())?.count ?? 0;
        if (friends >= 1) await this.unlock(playerId, 'first_friend');
        if (friends >= 10) await this.unlock(playerId, 'socialite');

        const messagesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM ChatMessage WHERE senderId = @playerId`,
            { playerId }
        );
        const messages = (await messagesStmt.get())?.count ?? 0;
        if (messages >= 100) await this.unlock(playerId, 'chatterbox');

        const tradeOffersStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM ChatMessage WHERE senderId = @playerId AND messageType = 'trade_offer'`,
            { playerId }
        );
        const tradeOffers = (await tradeOffersStmt.get())?.count ?? 0;
        if (tradeOffers >= 10) await this.unlock(playerId, 'diplomat');

        const visitsStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM GloryVisit WHERE visitedPlayerId = @playerId`,
            { playerId }
        );
        const visits = (await visitsStmt.get())?.count ?? 0;
        if (visits >= 10) await this.unlock(playerId, 'popular');
        if (visits >= 100) await this.unlock(playerId, 'famous');
        if (visits >= 1000) await this.unlock(playerId, 'celebrity');

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

        const playerStatsStmt = this.unit.prepare<{ netWorthEstimate: number }>(
            "SELECT netWorthEstimate FROM PlayerStatistics WHERE playerId = @playerId",
            { playerId }
        );
        const playerStats = await playerStatsStmt.get();
        const netWorth = playerStats?.netWorthEstimate ?? 0;

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

        const dragonStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT s.stoveId)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Dragon'`,
            { playerId }
        );
        const dragonStoves = (await dragonStmt.get())?.count ?? 0;

        const winterStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT s.stoveId)::INTEGER as count FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId AND st.collection = 'Winter'`,
            { playerId }
        );
        const winterStoves = (await winterStmt.get())?.count ?? 0;

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
