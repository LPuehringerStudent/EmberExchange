# Unified Sprint Backlog — Sprints 2 & 3

**Sprint 2 Duration:** ~6 weeks (early February 2026 – March 20, 2026)  
**Sprint 3 Duration:** ~4 weeks (March 20, 2026 – April 16, 2026)  
**Total Estimated Hours:** ~90 hours  
**Team Size:** 4 developers

---

## Epic 1: Authentication & User Management

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| OAuth Backend (Google & GitHub) | Laurenz Pühringer | 2 | Passport.js strategies implemented; `/auth/oauth/google` and `/auth/oauth/github` endpoints return valid sessions; `authRouter` with Swagger docs; tested with real OAuth apps | 4h |
| Session-Based Auth System | Laurenz Pühringer | 2 | `Session` table created; `SessionService` with create/validate/expire; `AuthGuard` and `ReverseAuthGuard` protecting routes; frontend auth service with interceptors | 4h |
| Login & Register UI | David Frühwirt | 2 | Styled login/register components; form validation; error handling; responsive design; connected to backend API | 4h |
| Profile Page | Laurenz Pühringer | 3 | Profile component displaying user info and real-time player statistics; integrated with backend stats endpoints | 3h |

**Epic Total:** ~17 hours

---

## Epic 2: Statistics & Tracking

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| Statistics Schema & Models | Laurenz Pühringer | 2 | `PlayerStatistics`, `DailyStatistics`, `StoveTypeStatistics` tables created; SQL in `unit.ts`; PlantUML diagram updated; shared models typed | 2h |
| Statistics Services & Routers | Laurenz Pühringer | 2 | Service classes with calculation logic; aggregation methods; 3 statistics routers with endpoints, query params, and Swagger docs; `.http` test files | 3h |
| LoginHistory & CoinTransaction Tracking | Laurenz Pühringer | 3 | `LoginHistory` and `CoinTransaction` tables added; services and routers implemented; integrated into player statistics calculation for accurate "Active Today" and coin metrics | 2h |
| Router Tests — Statistics | Muhammad Ayan | 3 | `playerStatisticsRouterTests.ts`, `stoveTypeStatisticsRouterTests.ts`, `dailyStatisticsRouterTests.ts` written; all GET/POST/DELETE scenarios covered; assertions match on-demand calculation behavior | 5h |

**Epic Total:** ~12 hours

---

## Epic 3: Marketplace & Economy

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| Marketplace Backend | Laurenz Pühringer | 3 | Working marketplace with coin economy; sell-from-inventory logic; coin display integrated into shell; `Listing` and `Trade` services wired to UI | 5h |
| Marketplace Logic Enhancements | Timon Brindl | 3 | Additional marketplace business logic implemented; trade flow validation; economy balancing helpers | 2h |

**Epic Total:** ~8 hours

---

## Epic 4: Lootbox System

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| LootboxType & LootboxDrop Backend | Laurenz Pühringer | 2 | `LootboxType` and `LootboxDrop` tables; services, routers, fetchers, and Swagger schemas; sample data seeded | 2h |
| Lootbox Rework (Inventory Items) | Laurenz Pühringer | 3 | Lootboxes reworked as actual inventory items; backend inventory logic updated; basic lootbox function restored and simplified | 3h |
| Lootbox Rarity Fixes | Timon Brindl | 3 | Corrected rarity-to-`stoveTypeId` mapping; fixed bug where wrong rarity was displayed on lootbox pull | 1h |
| Lootbox UI & Chest Animations | David Frühwirt | 2/3 | Transparent chest GIF assets created; idle/opening animations; CSS positioning; integrated into lootbox page; responsive styling | 4h |
| Lootbox Router Tests | Muhammad Ayan | 3 | `lootboxTypeRouterTests.ts` and `lootboxDropRouterTests.ts` written; covers count, lookup, creation, deletion, and constraint error cases | 3h |

**Epic Total:** ~13 hours

---

## Epic 5: Social & Chat

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| ChatMessage & MiniGameSession Backend | Laurenz Pühringer | 2 | `ChatMessage` and `MiniGameSession` tables; services and routers; CRUD operations; Swagger docs; sample data in `unit.ts` | 3h |
| Social / Chat Router Tests | Muhammad Ayan | 3 | `chatMessageRouterTests.ts` and `miniGameSessionRouterTests.ts` written; all GET/POST/DELETE paths and edge cases covered | 2h |

**Epic Total:** ~5 hours

---

## Epic 6: UI/UX & Frontend Infrastructure

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| Main Menu Redesign | David Frühwirt | 2 | Welcome section; player stats display; game carousel; live feed; responsive layout; CSS animations aligned with warm stove aesthetic | 5h |
| Settings System | David Frühwirt | 2 | Settings component shell with 5 sub-pages (Account, Security, Appearance, Language, Social); navigation and routing working | 3h |
| Theme System | David Frühwirt | 2 | Dark/light mode toggle; CSS variables; `ThemeService` with localStorage persistence; applies globally | 2h |
| Frontend Modernization | Laurenz Pühringer | 3 | Migrated data fetching to Angular `HttpClient` services; added startup landing page; fixed package conflicts and build budget issues | 4h |
| Global CSS & Warm Stove Theme | David Frühwirt | 2 | Cobblestone background; orange/red accents; consistent spacing; `min-height: 100vh` fixes; global CSS reset | 3h |

**Epic Total:** ~16 hours

---

## Epic 7: Backend Infrastructure & Quality Assurance

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| Complete Router & Service Suite | Laurenz Pühringer | 2 | 17+ routers implemented; all CRUD operations; proper error handling; Swagger annotations; registered in `app.ts` | 6h |
| Database Seeding & Migrations | Laurenz Pühringer | 2/3 | `unit.ts` sample data for all tables; realistic test data; reset functionality; silent migration for `Lootbox` schema update | 2h |
| Router Tests — Auth, Trade, Listings, etc. | Muhammad Ayan | 3 | `loginHistoryRouterTests.ts`, `coinTransactionRouterTests.ts` and other router test suites written; high endpoint coverage | 4h |
| Test Fixes & Route Shadowing Resolution | Laurenz Pühringer | 3 | Identified and fixed Express route shadowing bugs in `lootbox-type-router.ts` and `lootbox-drop-router.ts`; removed duplicate routes from `lootbox-router.ts`; resolved schema drift in tests; **all 510 tests passing** | 4h |

**Epic Total:** ~14 hours

---

## Epic 8: DevOps & Documentation

| Task | Who | Sprint | Definition of Done | Est. Time |
|------|-----|--------|-------------------|-----------|
| README & Release Notes | Laurenz Pühringer | 2/3 | v0.2.0 release notes; feature list; API endpoint table; setup instructions; README revised for Sprint 3 commands | 2h |
| OAuth Setup Docs | Laurenz Pühringer | 2 | `OAUTH_SETUP.md` created; step-by-step guide; troubleshooting section | 1h |
| Environment Configuration | Laurenz Pühringer | 2 | `.env.example` created; all required variables documented; local dev setup guide | 0.5h |
| Agent Database Change Guide | Laurenz Pühringer | 3 | `agent/DATABASE_CHANGES.md` created; documents schema change workflow, affected files, and common pitfalls | 1h |
| Dependabot & CI | dependabot[bot] / Laurenz Pühringer | 2/3 | Daily npm updates configured; GitHub workflows for PR notifications; package bumps merged | 0.5h |

**Epic Total:** ~5 hours

---

## Summary

| Epic | Tasks | Est. Hours | Focus Area |
|------|-------|------------|------------|
| Authentication & User Management | 4 | 15h | Security & Identity |
| Statistics & Tracking | 4 | 12h | Data Analytics |
| Marketplace & Economy | 2 | 7h | Trading |
| Lootbox System | 5 | 13h | Gameplay |
| Social & Chat | 2 | 5h | Community |
| UI/UX & Frontend Infrastructure | 5 | 17h | Frontend |
| Backend Infrastructure & QA | 4 | 16h | Architecture & Tests |
| DevOps & Documentation | 5 | 5h | Documentation |
| **TOTAL** | **29 tasks** | **~90 hours** | |

---

## Definition of Done (Unified)

All tasks delivered during Sprints 2 & 3 must meet these criteria:

- [x] **Code merged** to `develop` and subsequently to `main`
- [x] **No TypeScript compilation errors** across the entire project (`ng build` and `tsc` succeed)
- [x] **Backend:** Swagger documentation updated for all new or modified endpoints
- [x] **Database:** Schema changes reflected in `unit.ts`, `db-diagram.plantuml`, and `src/shared/model.ts`
- [x] **Tests passing:** All 510 Jest tests pass (router tests + service tests) with `maxWorkers: 1`
- [x] **No Express route shadowing:** Static/path-specific routes (e.g., `/count`) are registered before parameterized routes (e.g., `/:id`)
- [x] **Frontend:** Responsive layout validated on desktop; no runtime console errors
- [x] **Manual testing:** Critical user flows (login, lootbox open, marketplace listing, stats view) verified end-to-end
- [x] **Follows project coding standards:** Consistent file naming, service/router patterns, and shared model usage

---

## Key Deliverables

1. **Authentication:** Full OAuth (Google/GitHub) + session-based auth with guards and UI
2. **Statistics:** Real-time calculated statistics dashboard (player, daily, stove-type) with tracking tables
3. **Marketplace:** Functional coin economy with buy/sell from inventory
4. **Lootbox:** Type system, drop tracking, inventory integration, and animated chest UI
5. **Social Foundation:** Chat and mini-game backend with test coverage
6. **UI/UX:** Cohesive warm-stove theme, main menu, settings, and landing page
7. **API:** Complete REST API with 17+ routers, full Swagger docs, and 100% test coverage on routers
8. **Quality:** 510/510 tests passing; no build errors; no route shadowing
