import { GloryCustomizationService } from '../../backend/services/glory-customization-service';
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
  } as unknown as Unit;
}

describe('GloryCustomizationService', () => {
  const playerId = 42;

  // ─── Showcase ───
  describe('showcase', () => {
    it('returns showcase items', async () => {
      const items = [
        { playerId, slotIndex: 0, stoveId: 101, pinnedAt: '2026-01-01' },
        { playerId, slotIndex: 1, stoveId: 102, pinnedAt: '2026-01-02' },
      ];
      const unit = mockUnitSequence([mockStmt(null, items)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getShowcase(playerId);
      expect(result).toEqual(items);
    });

    it('sets a showcase slot', async () => {
      const unit = mockUnitSequence([
        mockStmt({ currentOwnerId: playerId }), // ownership check
        mockStmt({ count: 0 }), // duplicate check
        mockStmt(),             // upsert
      ]);
      const service = new GloryCustomizationService(unit);

      await service.setShowcaseSlot(playerId, 2, 999);
      expect(unit.prepare).toHaveBeenCalledTimes(3);
    });

    it('rejects duplicate stove in showcase', async () => {
      const unit = mockUnitSequence([
        mockStmt({ currentOwnerId: playerId }), // ownership check
        mockStmt({ count: 1 }), // duplicate found
      ]);
      const service = new GloryCustomizationService(unit);

      await expect(service.setShowcaseSlot(playerId, 2, 999))
        .rejects.toThrow('already in the showcase');
    });

    it('removes a showcase slot', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.removeShowcaseSlot(playerId, 3);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });

    it('clears entire showcase', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.clearShowcase(playerId);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Featured Achievements ───
  describe('featured achievements', () => {
    it('returns featured achievement IDs', async () => {
      const rows = [{ achievementId: 'first-lootbox' }, { achievementId: '100-trades' }];
      const unit = mockUnitSequence([mockStmt(null, rows)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getFeaturedAchievements(playerId);
      expect(result).toEqual(['first-lootbox', '100-trades']);
    });

    it('sets a featured achievement', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.setFeaturedAchievement(playerId, 'collector', 1);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });

    it('removes a featured achievement', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.removeFeaturedAchievement(playerId, 'collector');
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Themes ───
  describe('themes', () => {
    it('returns all themes', async () => {
      const themes = [
        { themeId: 1, name: 'Default', cssClass: 'theme-default', unlockCondition: null, unlockValue: null, minLevel: 1 },
      ];
      const unit = mockUnitSequence([mockStmt(null, themes)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getAllThemes();
      expect(result).toEqual(themes);
    });

    it('returns player themes', async () => {
      const themes = [
        { themeId: 1, name: 'Default', cssClass: 'theme-default', unlockedAt: '2026-01-01', isActive: true },
      ];
      const unit = mockUnitSequence([mockStmt(null, themes)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getPlayerThemes(playerId);
      expect(result).toEqual(themes);
    });

    it('activates a theme (deactivates others)', async () => {
      const unit = mockUnitSequence([mockStmt(), mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.activateTheme(playerId, 2);
      expect(unit.prepare).toHaveBeenCalledTimes(2);
    });

    it('unlocks a theme', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.unlockTheme(playerId, 3);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Titles ───
  describe('titles', () => {
    it('returns all titles', async () => {
      const titles = [
        { titleId: 'novice', label: 'Novice', animation: 'none', unlockCondition: null, unlockValue: null, minLevel: 1 },
      ];
      const unit = mockUnitSequence([mockStmt(null, titles)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getAllTitles();
      expect(result).toEqual(titles);
    });

    it('returns player titles', async () => {
      const titles = [
        { titleId: 'novice', label: 'Novice', animation: 'none', unlockedAt: '2026-01-01', isActive: true },
      ];
      const unit = mockUnitSequence([mockStmt(null, titles)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getPlayerTitles(playerId);
      expect(result).toEqual(titles);
    });

    it('activates a title', async () => {
      const unit = mockUnitSequence([mockStmt(), mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.activateTitle(playerId, 'veteran');
      expect(unit.prepare).toHaveBeenCalledTimes(2);
    });

    it('unlocks a title', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.unlockTitle(playerId, 'expert');
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Banners ───
  describe('banners', () => {
    it('returns all banners', async () => {
      const banners = [
        { bannerId: 1, name: 'Standard', cssClass: 'banner-standard', unlockCondition: null, unlockValue: null },
      ];
      const unit = mockUnitSequence([mockStmt(null, banners)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getAllBanners();
      expect(result).toEqual(banners);
    });

    it('returns player banners', async () => {
      const banners = [
        { bannerId: 1, name: 'Standard', cssClass: 'banner-standard', unlockedAt: '2026-01-01', isActive: true },
      ];
      const unit = mockUnitSequence([mockStmt(null, banners)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getPlayerBanners(playerId);
      expect(result).toEqual(banners);
    });

    it('activates a banner', async () => {
      const unit = mockUnitSequence([mockStmt(), mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.activateBanner(playerId, 2);
      expect(unit.prepare).toHaveBeenCalledTimes(2);
    });

    it('unlocks a banner', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.unlockBanner(playerId, 3);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Visits ───
  describe('visits', () => {
    it('records a new visit', async () => {
      const unit = mockUnitSequence([
        mockStmt({ cnt: 0 }), // no existing visit today
        mockStmt(),           // insert visit
      ]);
      const service = new GloryCustomizationService(unit);

      await service.recordVisit(10, playerId);
      expect(unit.prepare).toHaveBeenCalledTimes(2);
    });

    it('does not record duplicate visit on same day', async () => {
      const unit = mockUnitSequence([
        mockStmt({ cnt: 1 }), // already visited today
      ]);
      const service = new GloryCustomizationService(unit);

      await service.recordVisit(10, playerId);
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });

    it('returns visit count', async () => {
      const unit = mockUnitSequence([mockStmt({ cnt: 42 })]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getVisitCount(playerId);
      expect(result).toBe(42);
    });

    it('returns recent visitors', async () => {
      const visitors = [
        { visitorPlayerId: 5, username: 'Alice', visitedAt: '2026-05-01' },
      ];
      const unit = mockUnitSequence([mockStmt(null, visitors)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getRecentVisitors(playerId, 5);
      expect(result).toEqual(visitors);
    });
  });

  // ─── Guestbook ───
  describe('guestbook', () => {
    it('returns guestbook entries', async () => {
      const entries = [
        { entryId: 1, playerId, authorId: 5, authorName: 'Alice', message: 'Nice profile!', postedAt: '2026-05-01' },
      ];
      const unit = mockUnitSequence([mockStmt(null, entries)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getGuestbook(playerId);
      expect(result).toEqual(entries);
    });

    it('adds a guestbook entry', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.addGuestbookEntry(playerId, 5, 'Hello!');
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });

    it('allows profile owner to delete entry', async () => {
      const unit = mockUnitSequence([
        mockStmt({ playerId, authorId: 5 }), // check auth
        mockStmt(),                           // delete
      ]);
      const service = new GloryCustomizationService(unit);

      const result = await service.deleteGuestbookEntry(1, playerId);
      expect(result).toBe(true);
    });

    it('allows author to delete their entry', async () => {
      const unit = mockUnitSequence([
        mockStmt({ playerId, authorId: 5 }), // check auth
        mockStmt(),                           // delete
      ]);
      const service = new GloryCustomizationService(unit);

      const result = await service.deleteGuestbookEntry(1, 5);
      expect(result).toBe(true);
    });

    it('rejects deletion by unauthorized user', async () => {
      const unit = mockUnitSequence([
        mockStmt({ playerId, authorId: 5 }), // check auth
      ]);
      const service = new GloryCustomizationService(unit);

      const result = await service.deleteGuestbookEntry(1, 99);
      expect(result).toBe(false);
    });

    it('returns false when entry not found', async () => {
      const unit = mockUnitSequence([
        mockStmt(null), // entry not found
      ]);
      const service = new GloryCustomizationService(unit);

      const result = await service.deleteGuestbookEntry(1, playerId);
      expect(result).toBe(false);
    });
  });

  // ─── Trophies ───
  describe('trophies', () => {
    it('returns all trophies', async () => {
      const trophies = [
        { trophyId: 'season-1-winner', name: 'Season 1 Winner', description: 'Won season 1', iconUrl: null, season: 'S1', eventName: null, rarity: 'legendary' },
      ];
      const unit = mockUnitSequence([mockStmt(null, trophies)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getAllTrophies();
      expect(result).toEqual(trophies);
    });

    it('returns player trophies', async () => {
      const trophies = [
        { trophyId: 'season-1-winner', name: 'Season 1 Winner', description: 'Won season 1', iconUrl: null, season: 'S1', eventName: null, rarity: 'legendary', awardedAt: '2026-01-01' },
      ];
      const unit = mockUnitSequence([mockStmt(null, trophies)]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getPlayerTrophies(playerId);
      expect(result).toEqual(trophies);
    });

    it('awards a trophy', async () => {
      const unit = mockUnitSequence([mockStmt()]);
      const service = new GloryCustomizationService(unit);

      await service.awardTrophy(playerId, 'season-1-winner');
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Full Customization ───
  describe('getFullCustomization', () => {
    it('returns bundled customization data', async () => {
      const showcase = [{ playerId, slotIndex: 0, stoveId: 101, pinnedAt: '2026-01-01' }];
      const themes = [{ themeId: 1, name: 'Default', cssClass: 'theme-default', unlockedAt: '2026-01-01', isActive: true }];
      const titles = [{ titleId: 'novice', label: 'Novice', animation: 'none', unlockedAt: '2026-01-01', isActive: true }];
      const banners = [{ bannerId: 1, name: 'Standard', cssClass: 'banner-standard', unlockedAt: '2026-01-01', isActive: true }];
      const trophies = [{ trophyId: 't1', name: 'Trophy', description: '', iconUrl: null, season: null, eventName: null, rarity: 'common', awardedAt: '2026-01-01' }];

      const unit = mockUnitSequence([
        mockStmt(null, showcase),
        mockStmt(null, []), // featured achievements
        mockStmt(null, themes),
        mockStmt(null, titles),
        mockStmt(null, banners),
        mockStmt(null, trophies),
        mockStmt({ cnt: 7 }), // visit count
      ]);
      const service = new GloryCustomizationService(unit);

      const result = await service.getFullCustomization(playerId);

      expect(result.showcase).toEqual(showcase);
      expect(result.featuredAchievements).toEqual([]);
      expect(result.themes).toEqual(themes);
      expect(result.titles).toEqual(titles);
      expect(result.banners).toEqual(banners);
      expect(result.trophies).toEqual(trophies);
      expect(result.visitCount).toBe(7);
    });
  });
});
