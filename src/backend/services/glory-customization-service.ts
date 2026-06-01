import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";

export interface GloryShowcaseItem {
    playerId: number;
    slotIndex: number;
    stoveId: number;
    pinnedAt: string;
}

export interface GloryTheme {
    themeId: number;
    name: string;
    cssClass: string;
    unlockCondition: string | null;
    unlockValue: number | null;
    minLevel: number;
}

export interface PlayerGloryTheme {
    themeId: number;
    name: string;
    cssClass: string;
    unlockedAt: string;
    isActive: boolean;
}

export interface GloryTitle {
    titleId: string;
    label: string;
    animation: string;
    unlockCondition: string | null;
    unlockValue: number | null;
    minLevel: number;
}

export interface PlayerGloryTitle {
    titleId: string;
    label: string;
    animation: string;
    unlockedAt: string;
    isActive: boolean;
}

export interface GloryBanner {
    bannerId: number;
    name: string;
    cssClass: string;
    unlockCondition: string | null;
    unlockValue: number | null;
}

export interface PlayerGloryBanner {
    bannerId: number;
    name: string;
    cssClass: string;
    unlockedAt: string;
    isActive: boolean;
}

export interface GloryGuestbookEntry {
    entryId: number;
    playerId: number;
    authorId: number;
    authorName: string;
    message: string;
    postedAt: string;
}

export interface GloryTrophy {
    trophyId: string;
    name: string;
    description: string;
    iconUrl: string | null;
    season: string | null;
    eventName: string | null;
    rarity: string;
}

export interface PlayerGloryTrophy {
    trophyId: string;
    name: string;
    description: string;
    iconUrl: string | null;
    season: string | null;
    eventName: string | null;
    rarity: string;
    awardedAt: string;
}

export class GloryCustomizationService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    // Showcase
    async getShowcase(playerId: number): Promise<GloryShowcaseItem[]> {
        const stmt = this.unit.prepare<GloryShowcaseItem>(
            `SELECT playerId, slotIndex, stoveId, pinnedAt FROM GloryShowcase WHERE playerId = @playerId ORDER BY slotIndex`,
            { playerId }
        );
        return await stmt.all();
    }

    async setShowcaseSlot(playerId: number, slotIndex: number, stoveId: number): Promise<void> {
        // Verify player owns the stove
        const ownershipStmt = this.unit.prepare<{ currentOwnerId: number }>(
            `SELECT currentOwnerId FROM Stove WHERE stoveId = @stoveId`,
            { stoveId }
        );
        const stove = await ownershipStmt.get();
        if (!stove || stove.currentOwnerId !== playerId) {
            throw new Error('You do not own this stove.');
        }

        // Prevent duplicate stoves in showcase
        const existingStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM GloryShowcase WHERE playerId = @playerId AND stoveId = @stoveId`,
            { playerId, stoveId }
        );
        const existing = (await existingStmt.get())?.count ?? 0;
        if (existing > 0) {
            throw new Error('This stove is already in the showcase.');
        }

        await this.unit.prepare(
            `INSERT INTO GloryShowcase (playerId, slotIndex, stoveId, pinnedAt)
             VALUES (@playerId, @slotIndex, @stoveId, @pinnedAt)
             ON CONFLICT (playerId, slotIndex) DO UPDATE SET stoveId = @stoveId, pinnedAt = @pinnedAt`,
            { playerId, slotIndex, stoveId, pinnedAt: new Date().toISOString() }
        ).run();
    }

    async removeShowcaseSlot(playerId: number, slotIndex: number): Promise<void> {
        await this.unit.prepare(
            `DELETE FROM GloryShowcase WHERE playerId = @playerId AND slotIndex = @slotIndex`,
            { playerId, slotIndex }
        ).run();
    }

    async clearShowcase(playerId: number): Promise<void> {
        await this.unit.prepare(
            `DELETE FROM GloryShowcase WHERE playerId = @playerId`,
            { playerId }
        ).run();
    }

    // Featured Achievements
    async getFeaturedAchievements(playerId: number): Promise<string[]> {
        const stmt = this.unit.prepare<{ achievementId: string }>(
            `SELECT achievementId FROM GloryFeaturedAchievement WHERE playerId = @playerId ORDER BY slotIndex`,
            { playerId }
        );
        const rows = await stmt.all();
        return rows.map(r => r.achievementId);
    }

    async setFeaturedAchievement(playerId: number, achievementId: string, slotIndex: number): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO GloryFeaturedAchievement (playerId, achievementId, slotIndex)
             VALUES (@playerId, @achievementId, @slotIndex)
             ON CONFLICT (playerId, achievementId) DO UPDATE SET slotIndex = @slotIndex`,
            { playerId, achievementId, slotIndex }
        ).run();
    }

    async removeFeaturedAchievement(playerId: number, achievementId: string): Promise<void> {
        await this.unit.prepare(
            `DELETE FROM GloryFeaturedAchievement WHERE playerId = @playerId AND achievementId = @achievementId`,
            { playerId, achievementId }
        ).run();
    }

    // Themes
    async getAllThemes(): Promise<GloryTheme[]> {
        const stmt = this.unit.prepare<GloryTheme>(
            `SELECT themeId, name, cssClass, unlockCondition, unlockValue, minLevel FROM GloryTheme ORDER BY themeId`
        );
        return await stmt.all();
    }

    async getPlayerThemes(playerId: number): Promise<PlayerGloryTheme[]> {
        const stmt = this.unit.prepare<PlayerGloryTheme>(
            `SELECT gt.themeId, gt.name, gt.cssClass, pgt.unlockedAt, pgt.isActive
             FROM PlayerGloryTheme pgt
             JOIN GloryTheme gt ON pgt.themeId = gt.themeId
             WHERE pgt.playerId = @playerId
             ORDER BY pgt.unlockedAt`,
            { playerId }
        );
        return await stmt.all();
    }

    async activateTheme(playerId: number, themeId: number): Promise<void> {
        await this.unit.prepare(
            `UPDATE PlayerGloryTheme SET isActive = 0 WHERE playerId = @playerId`,
            { playerId }
        ).run();
        await this.unit.prepare(
            `UPDATE PlayerGloryTheme SET isActive = 1 WHERE playerId = @playerId AND themeId = @themeId`,
            { playerId, themeId }
        ).run();
    }

    async unlockTheme(playerId: number, themeId: number): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerGloryTheme (playerId, themeId, unlockedAt, isActive)
             VALUES (@playerId, @themeId, @unlockedAt, 0)
             ON CONFLICT DO NOTHING`,
            { playerId, themeId, unlockedAt: new Date().toISOString() }
        ).run();
    }

    // Titles
    async getAllTitles(): Promise<GloryTitle[]> {
        const stmt = this.unit.prepare<GloryTitle>(
            `SELECT titleId, label, animation, unlockCondition, unlockValue, minLevel FROM GloryTitle ORDER BY minLevel`
        );
        return await stmt.all();
    }

    async getPlayerTitles(playerId: number): Promise<PlayerGloryTitle[]> {
        const stmt = this.unit.prepare<PlayerGloryTitle>(
            `SELECT gt.titleId, gt.label, gt.animation, pgt.unlockedAt, pgt.isActive
             FROM PlayerGloryTitle pgt
             JOIN GloryTitle gt ON pgt.titleId = gt.titleId
             WHERE pgt.playerId = @playerId
             ORDER BY pgt.unlockedAt`,
            { playerId }
        );
        return await stmt.all();
    }

    async activateTitle(playerId: number, titleId: string): Promise<void> {
        await this.unit.prepare(
            `UPDATE PlayerGloryTitle SET isActive = 0 WHERE playerId = @playerId`,
            { playerId }
        ).run();
        await this.unit.prepare(
            `UPDATE PlayerGloryTitle SET isActive = 1 WHERE playerId = @playerId AND titleId = @titleId`,
            { playerId, titleId }
        ).run();
    }

    async unlockTitle(playerId: number, titleId: string): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerGloryTitle (playerId, titleId, unlockedAt, isActive)
             VALUES (@playerId, @titleId, @unlockedAt, 0)
             ON CONFLICT DO NOTHING`,
            { playerId, titleId, unlockedAt: new Date().toISOString() }
        ).run();
    }

    // Banners
    async getAllBanners(): Promise<GloryBanner[]> {
        const stmt = this.unit.prepare<GloryBanner>(
            `SELECT bannerId, name, cssClass, unlockCondition, unlockValue FROM GloryBanner ORDER BY bannerId`
        );
        return await stmt.all();
    }

    async getPlayerBanners(playerId: number): Promise<PlayerGloryBanner[]> {
        const stmt = this.unit.prepare<PlayerGloryBanner>(
            `SELECT gb.bannerId, gb.name, gb.cssClass, pgb.unlockedAt, pgb.isActive
             FROM PlayerGloryBanner pgb
             JOIN GloryBanner gb ON pgb.bannerId = gb.bannerId
             WHERE pgb.playerId = @playerId
             ORDER BY pgb.unlockedAt`,
            { playerId }
        );
        return await stmt.all();
    }

    async activateBanner(playerId: number, bannerId: number): Promise<void> {
        await this.unit.prepare(
            `UPDATE PlayerGloryBanner SET isActive = 0 WHERE playerId = @playerId`,
            { playerId }
        ).run();
        await this.unit.prepare(
            `UPDATE PlayerGloryBanner SET isActive = 1 WHERE playerId = @playerId AND bannerId = @bannerId`,
            { playerId, bannerId }
        ).run();
    }

    async unlockBanner(playerId: number, bannerId: number): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerGloryBanner (playerId, bannerId, unlockedAt, isActive)
             VALUES (@playerId, @bannerId, @unlockedAt, 0)
             ON CONFLICT DO NOTHING`,
            { playerId, bannerId, unlockedAt: new Date().toISOString() }
        ).run();
    }

    // Visits
    async recordVisit(visitorPlayerId: number, visitedPlayerId: number): Promise<void> {
        const today = new Date().toISOString().split("T")[0];
        // Only record one visit per visitor per day per visited player
        const checkStmt = this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM GloryVisit
             WHERE visitorPlayerId = @visitorPlayerId AND visitedPlayerId = @visitedPlayerId
             AND SUBSTRING(visitedAt, 1, 10) = @today`,
            { visitorPlayerId, visitedPlayerId, today }
        );
        const result = await checkStmt.get();
        const count = typeof result?.cnt === "string" ? parseInt(result.cnt, 10) : (result?.cnt ?? 0);
        if (count === 0) {
            await this.unit.prepare(
                `INSERT INTO GloryVisit (visitorPlayerId, visitedPlayerId, visitedAt)
                 VALUES (@visitorPlayerId, @visitedPlayerId, @visitedAt)`,
                { visitorPlayerId, visitedPlayerId, visitedAt: new Date().toISOString() }
            ).run();
        }
    }

    async getVisitCount(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM GloryVisit WHERE visitedPlayerId = @playerId`,
            { playerId }
        );
        const result = await stmt.get();
        return typeof result?.cnt === "string" ? parseInt(result.cnt, 10) : (result?.cnt ?? 0);
    }

    async getRecentVisitors(playerId: number, limit: number = 5): Promise<{ visitorPlayerId: number; username: string; visitedAt: string }[]> {
        const stmt = this.unit.prepare<{ visitorPlayerId: number; username: string; visitedAt: string }>(
            `SELECT DISTINCT ON (v.visitorPlayerId) v.visitorPlayerId, p.username, v.visitedAt
             FROM GloryVisit v
             JOIN Player p ON v.visitorPlayerId = p.playerId
             WHERE v.visitedPlayerId = @playerId
             ORDER BY v.visitorPlayerId, v.visitedAt DESC
             LIMIT @limit`,
            { playerId, limit }
        );
        return await stmt.all();
    }

    // Guestbook
    async getGuestbook(playerId: number, limit: number = 20): Promise<GloryGuestbookEntry[]> {
        const stmt = this.unit.prepare<GloryGuestbookEntry>(
            `SELECT g.entryId, g.playerId, g.authorId, p.username as authorName, g.message, g.postedAt
             FROM GloryGuestbook g
             JOIN Player p ON g.authorId = p.playerId
             WHERE g.playerId = @playerId
             ORDER BY g.postedAt DESC
             LIMIT @limit`,
            { playerId, limit }
        );
        return await stmt.all();
    }

    async addGuestbookEntry(playerId: number, authorId: number, message: string): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO GloryGuestbook (playerId, authorId, message, postedAt)
             VALUES (@playerId, @authorId, @message, @postedAt)`,
            { playerId, authorId, message, postedAt: new Date().toISOString() }
        ).run();
    }

    async deleteGuestbookEntry(entryId: number, requestingPlayerId: number): Promise<boolean> {
        // Check if requesting player is the profile owner or the author
        const checkStmt = this.unit.prepare<{ playerId: number; authorId: number }>(
            `SELECT playerId, authorId FROM GloryGuestbook WHERE entryId = @entryId`,
            { entryId }
        );
        const entry = await checkStmt.get();
        if (!entry) return false;
        if (entry.playerId !== requestingPlayerId && entry.authorId !== requestingPlayerId) return false;

        await this.unit.prepare(
            `DELETE FROM GloryGuestbook WHERE entryId = @entryId`,
            { entryId }
        ).run();
        return true;
    }

    // Trophies
    async getAllTrophies(): Promise<GloryTrophy[]> {
        const stmt = this.unit.prepare<GloryTrophy>(
            `SELECT trophyId, name, description, iconUrl, season, eventName, rarity FROM GloryTrophy ORDER BY trophyId`
        );
        return await stmt.all();
    }

    async getPlayerTrophies(playerId: number): Promise<PlayerGloryTrophy[]> {
        const stmt = this.unit.prepare<PlayerGloryTrophy>(
            `SELECT gt.trophyId, gt.name, gt.description, gt.iconUrl, gt.season, gt.eventName, gt.rarity, pt.awardedAt
             FROM PlayerGloryTrophy pt
             JOIN GloryTrophy gt ON pt.trophyId = gt.trophyId
             WHERE pt.playerId = @playerId
             ORDER BY pt.awardedAt DESC`,
            { playerId }
        );
        return await stmt.all();
    }

    async awardTrophy(playerId: number, trophyId: string): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerGloryTrophy (playerId, trophyId, awardedAt)
             VALUES (@playerId, @trophyId, @awardedAt)
             ON CONFLICT DO NOTHING`,
            { playerId, trophyId, awardedAt: new Date().toISOString() }
        ).run();
    }

    // Full customization bundle for a player
    async getFullCustomization(playerId: number): Promise<{
        showcase: GloryShowcaseItem[];
        featuredAchievements: string[];
        themes: PlayerGloryTheme[];
        titles: PlayerGloryTitle[];
        banners: PlayerGloryBanner[];
        trophies: PlayerGloryTrophy[];
        visitCount: number;
    }> {
        const [showcase, featuredAchievements, themes, titles, banners, trophies, visitCount] = await Promise.all([
            this.getShowcase(playerId),
            this.getFeaturedAchievements(playerId),
            this.getPlayerThemes(playerId),
            this.getPlayerTitles(playerId),
            this.getPlayerBanners(playerId),
            this.getPlayerTrophies(playerId),
            this.getVisitCount(playerId),
        ]);
        return { showcase, featuredAchievements, themes, titles, banners, trophies, visitCount };
    }
}
