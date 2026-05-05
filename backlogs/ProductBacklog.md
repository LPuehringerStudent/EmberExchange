# EmberExchange Product Backlog

**Last Updated:** 2026-04-16  
**Story Point Scale:** 1 SP ≈ 2 hours of work  
**Sprint Duration:** 3–4 weeks  
**Target Velocity:** 18–23 SP per sprint (≈ 35–45 hours)

---

## Sprint 1 — Foundation & Core Systems ✅ COMPLETED
**Duration:** ~3 weeks (January – February 2026)  
**Actual Hours:** ~45h  
**Goal:** Database schema, player management, authentication, and core lootbox functionality

| ID | User Story | Points | Status |
|----|-----------|--------|--------|
| PB-01 | Git repository with branching strategy and CI basics | 1 | ✅ |
| PB-02 | Tech stack research and documentation | 1 | ✅ |
| PB-03 | Complete database ERD (players, inventory, stoves, trades, price history) | 2 | ✅ |
| PB-04 | Database schema implemented with migrations in `unit.ts` | 3 | ✅ |
| PB-05 | Seed data scripts for test players, stove types, and lootboxes | 2 | ✅ |
| PB-06 | Player Service layer (create, get, update, delete, coin management) | 4 | ✅ |
| PB-07 | REST API endpoints for player management (CRUD, coin ops) | 3 | ✅ |
| PB-08 | Register and login with JWT + session-based authentication | 4 | ✅ |
| PB-09 | Inventory management backend (items, lootboxes, stoves) | 4 | ✅ |
| PB-10 | REST API endpoints for inventory viewing and management | 3 | ✅ |
| PB-11 | Lootbox opening with random stove drops based on rarity weights | 3 | ✅ |
| PB-12 | REST API endpoints for lootbox viewing and opening | 5 | ✅ |
| PB-13 | Comprehensive tests (unit + integration, 50+ tests) | 5 | ✅ |
| PB-14 | Complete Swagger API documentation | 3 | ✅ |
| PB-15 | Sprint documentation and handover | 2 | ✅ |

**Sprint 1 Total: 42 SP (~45h)**

**Key Deliverables:**
- Full SQLite schema with 15+ tables
- Express backend with service/router pattern
- JWT + session auth system
- Working lootbox mechanics with weighted drops
- 50+ passing tests
- Swagger docs at `/api-docs`

---

## Sprint 2 — Stove Trading, Marketplace & Auth Expansion ✅ COMPLETED
**Duration:** ~6 weeks (February – March 20, 2026)  
**Actual Hours:** ~50h  
**Goal:** Implement stove trading, marketplace listings, price history, ownership chain, OAuth, and statistics backend

| ID | User Story | Points | Status |
|----|-----------|--------|--------|
| PB-16 | Stove Service (mint, transfer ownership, ownership history) | 4 | ✅ |
| PB-17 | View stove collection with ownership details | 3 | ✅ |
| PB-18 | List stoves for sale at a chosen price | 4 | ✅ |
| PB-19 | Browse marketplace with filters (rarity, price, type) | 4 | ✅ |
| PB-20 | Buy stoves with atomic coin transfer | 5 | ✅ |
| PB-21 | Calculate and store 30-day median prices per stove type | 3 | ✅ |
| PB-22 | View price history charts for stove types | 3 | ✅ |
| PB-23 | View complete ownership chain of any stove | 2 | ✅ |
| PB-24 | Marketplace endpoints with Swagger docs | 3 | ✅ |
| PB-25 | Comprehensive tests for trading (unit + integration) | 4 | ✅ |
| PB-26 | OAuth Backend (Google & GitHub) with Passport.js | 4 | ✅ |
| PB-27 | Session-based auth with `Session` table and guards | 4 | ✅ |
| PB-28 | Statistics schema (`PlayerStatistics`, `DailyStatistics`, `StoveTypeStatistics`) | 2 | ✅ |
| PB-29 | Statistics services and routers with aggregation | 3 | ✅ |
| PB-30 | ChatMessage & MiniGameSession backend (tables, services, routers) | 3 | ✅ |
| PB-31 | Login/Register UI with form validation and responsive design | 5 | ✅ |
| PB-32 | Main page UI rework with cohesive warm-stove theme | 5 | ✅ |
| PB-33 | Settings UI | 2 | ✅ |
| PB-34 | Small UI bugfixes across the application | 2 | ✅ |

**Sprint 2 Total: ~65 SP (~50h)** — *Extended scope with OAuth and statistics*

**Key Deliverables:**
- Full marketplace backend (Listings, Trades, PriceHistory)
- OAuth (Google/GitHub) + session auth working end-to-end
- Statistics backend with real-time calculation
- Chat and MiniGameSession backend ready
- Cohesive frontend theme (dark charcoal + orange accent)

---

## Sprint 3 — Marketplace Frontend, Lootbox Rework & Polish ✅ COMPLETED
**Duration:** ~4 weeks (March 20 – April 16, 2026)  
**Actual Hours:** ~45h  
**Goal:** Working marketplace UI, lootbox-as-inventory rework, statistics tracking, and visual polish

| ID | User Story | Points | Status |
|----|-----------|--------|--------|
| PB-35 | Working marketplace frontend with coin economy | 5 | ✅ |
| PB-36 | Sell-from-inventory logic wired to UI | 4 | ✅ |
| PB-37 | Coin display integrated into shell topbar | 2 | ✅ |
| PB-38 | Lootbox reworked as actual inventory items | 3 | ✅ |
| PB-39 | Correct rarity-to-stoveTypeId mapping in drops | 2 | ✅ |
| PB-40 | Restore lootbox basic function after rework | 3 | ✅ |
| PB-41 | LoginHistory & CoinTransaction tracking for accurate stats | 3 | ✅ |
| PB-42 | Profile page with user info and real-time statistics | 4 | ✅ |
| PB-43 | Frontend modernization (HttpClient services, landing page) | 4 | ✅ |
| PB-44 | Fix package conflicts and build budget issues | 2 | ✅ |
| PB-45 | Lootbox UI with chest GIF animations and reward previews | 5 | ✅ |
| PB-46 | Stove sprite assets (8 PNGs) created and wired to database | 4 | ✅ |
| PB-47 | Inventory displays actual stove sprites instead of generic icons | 3 | ✅ |
| PB-48 | Marketplace listing cards show stove sprites | 3 | ✅ |
| PB-49 | Remove hardcoded stove names; read from `StoveType` | 2 | ✅ |
| PB-50 | Router tests for lootbox, statistics, auth, chat, coin-transaction | 10 | ✅ |
| PB-51 | Fix Express route shadowing bugs (`/count` before `/:id`) | 2 | ✅ |
| PB-52 | Fix test DB schema drift and silent migration trap | 3 | ✅ |
| PB-53 | All 510 tests passing | 1 | ✅ |
| PB-54 | 3-step register wizard with password strength meter | 5 | ✅ |
| PB-55 | Shell topbar polish (account dropdown, logout styling) | 3 | ✅ |
| PB-56 | Unified sprint backlog documentation | 2 | ✅ |

**Sprint 3 Total: ~75 SP (~45h)**

**Key Deliverables:**
- Functional marketplace UI (buy, sell, cancel listings)
- Lootbox as inventory item with server-side drops
- 8 stove sprites wired to DB and displayed across inventory/marketplace/lootbox
- LoginHistory + CoinTransaction tracking for accurate "Active Today" stats
- Profile page with statistics
- 510/510 tests passing
- Register wizard, shell polish, cohesive theme
- Tagged `Sprint-3` on `main`

---

## Sprint 4 — Roulette & Blackjack MiniGames + Settings
**Duration:** ~4 weeks (April 16 – May 14, 2026)  
**Target Hours:** 35–45h (~18–22 SP)  
**Goal:** Build Roulette and Blackjack mini-games with full UI, plus a comprehensive Settings page

| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-57 | **Roulette Backend:** Betting logic (numbers, colors, odd/even), wheel spin RNG, payout calculation, daily coin caps | 5 | High |
| PB-58 | **Roulette UI:** Betting table layout, wheel animation, chip placement, result display, coin balance update | 6 | High |
| PB-59 | **Blackjack Backend:** Deck management, hit/stand/double-down logic, dealer AI (stand on 17+), payout rules | 5 | High |
| PB-60 | **Blackjack UI:** Card table layout, player/dealer hands, card flip animations, betting controls, result overlay | 6 | High |
| PB-61 | **MiniGames Hub Page:** Central page listing available games, daily earnings tracker, coin balance display | 3 | High |
| PB-62 | **Settings Backend:** Update username, email, password; notification preferences; session management | 3 | Medium |
| PB-63 | **Settings UI:** Form sections for profile, security, notifications; theme toggle; delete account option | 4 | Medium |
| PB-64 | **Game Result Validation:** Server-side validation of all bets and results to prevent cheating | 3 | High |
| PB-65 | **Coin Economy Guards:** Daily earning caps, cooldowns, and audit logging via `CoinTransaction` | 2 | High |
| PB-66 | **Tests:** Unit tests for game logic; router tests for mini-game endpoints; frontend component tests | 4 | Medium |
| PB-67 | **Integration & Polish:** Sound effects for games, responsive layout for mobile, loading states | 3 | Medium |

**Sprint 4 Total: 44 SP (~40h)**

**Dependencies:** MiniGameSession and ChatMessage backend tables already exist from Sprint 2. CoinTransaction tracking from Sprint 3 enables audit logging.

**Definition of Done:**
- [ ] Both games fully playable with valid coin bets and payouts
- [ ] Settings page allows profile/security updates
- [ ] Daily caps prevent economy inflation
- [ ] All new endpoints have Swagger docs
- [ ] Tests cover game logic edge cases (bust, blackjack, 0 balance)
- [ ] No console errors; responsive on desktop

---

## Sprint 5 — 2 More MiniGames + Social
**Duration:** ~4 weeks (May 14 – June 11, 2026)  
**Target Hours:** 35–45h (~18–22 SP)  
**Goal:** Add Coin Flip and Slots mini-games, plus real-time chat and social features

| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-68 | **Coin Flip Backend:** Simple heads/tails betting, RNG, instant payout, streak tracking | 2 | High |
| PB-69 | **Coin Flip UI:** Clean two-button interface, coin flip animation, result history | 3 | High |
| PB-70 | **Slots Backend:** Reel RNG (3 reels, weighted symbols), payline logic, jackpot mechanic | 4 | High |
| PB-71 | **Slots UI:** Reel spin animation, lever pull interaction, payline highlighting, jackpot celebration | 5 | High |
| PB-72 | **Chat Backend:** Real-time message delivery (WebSocket or polling), read receipts, message history | 4 | Medium |
| PB-73 | **Chat UI:** Message threads, send/receive bubbles, online status indicator, chat list | 5 | Medium |
| PB-74 | **Friends System Backend:** Friend requests, accept/decline, friend list storage, block/unblock | 4 | Medium |
| PB-75 | **Friends System UI:** Friend list, search players, pending requests, remove friend | 4 | Medium |
| PB-76 | **Player Search & Profiles:** Public player profiles with stats, recent activity, inventory showcase | 3 | Low |
| PB-77 | **Social Activity Feed:** Recent trades, lootbox pulls, achievements visible to friends | 3 | Low |
| PB-78 | **MiniGames Leaderboard:** Daily/weekly top earners per game, all-time stats | 3 | Low |
| PB-79 | **Tests:** Router tests for chat and social endpoints; game logic unit tests | 4 | Medium |
| PB-80 | **Integration & Polish:** Sound effects for slots/coin-flip, mobile responsiveness, error boundaries | 3 | Medium |

**Sprint 5 Total: 47 SP (~42h)**

**Dependencies:** ChatMessage backend from Sprint 2; CoinTransaction from Sprint 3; MiniGames Hub from Sprint 4.

**Definition of Done:**
- [ ] 4 total mini-games playable (Roulette, Blackjack, Coin Flip, Slots)
- [ ] Real-time chat between players
- [ ] Friend requests and friend list functional
- [ ] Leaderboard displays top earners
- [ ] All new endpoints have Swagger docs
- [ ] Tests cover chat message CRUD and friend request flows
- [ ] No console errors; responsive on desktop

---

## Future Sprints (Post-MVP Backlog)

### Performance & Optimization
| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-81 | Redis caching for frequent queries | 5 | Low |
| PB-82 | Database query optimization and indexing review | 3 | Low |
| PB-83 | CDN integration for stove images | 3 | Low |
| PB-84 | Lighthouse performance score >90 | 6 | Medium |
| PB-85 | Bundle size analysis (<200KB main) | 3 | Medium |

### Analytics & Monitoring
| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-86 | Admin dashboard (active users, trades, economy health) | 5 | Low |
| PB-87 | Sentry error tracking | 3 | Low |
| PB-88 | User behavior analytics | 5 | Low |

### Advanced Features
| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-89 | Peer-to-peer direct trading | 5 | Low |
| PB-90 | Stove crafting (combine lower-tier for higher-tier) | 8 | Low |
| PB-91 | Achievements and badges | 5 | Low |
| PB-92 | Seasonal events with limited-time drops | 8 | Low |
| PB-93 | PWA features (offline support, push notifications) | 8 | Low |
| PB-94 | i18n support (English, German) | 13 | Low |

### Mobile & Multi-Platform
| ID | User Story | Points | Priority |
|----|-----------|--------|----------|
| PB-95 | Mobile app (Capacitor/Ionic) | 21 | Low |
| PB-96 | Tablet responsive improvements | 5 | Low |
| PB-97 | Docker deployment configuration | 5 | Medium |
| PB-98 | Playwright E2E tests (login, lootbox, trade flows) | 5 | High |

---

## Backlog Summary

| Sprint | Focus | Status | Story Points | Est. Hours |
|--------|-------|--------|-------------|-----------|
| Sprint 1 | Foundation & Core Systems | ✅ Done | 42 SP | ~45h |
| Sprint 2 | Stove Trading, Marketplace & Auth | ✅ Done | ~65 SP | ~50h |
| Sprint 3 | Marketplace UI, Lootbox Rework & Polish | ✅ Done | ~75 SP | ~45h |
| Sprint 4 | Roulette & Blackjack + Settings | 🔄 Planned | 44 SP | ~40h |
| Sprint 5 | Coin Flip & Slots + Social | 🔄 Planned | 47 SP | ~42h |
| **MVP Total** | | | **~273 SP** | **~222h** |
| Future | Advanced Features, Mobile, Analytics | 📋 Backlog | ~80 SP | ~70h |

---

## Definition of Done (All Sprints)

- [ ] Code merged to `develop` and subsequently to `main`
- [ ] No TypeScript compilation errors (`tsc` + `ng build` succeed)
- [ ] Swagger documentation updated for all new/modified endpoints
- [ ] Database schema changes reflected in `unit.ts`, `db-diagram.plantuml`, and `src/shared/model.ts`
- [ ] All Jest tests passing (currently 510; new tests added for new features)
- [ ] No Express route shadowing (`/count` before `/:id`)
- [ ] Responsive layout validated on desktop; no runtime console errors
- [ ] Critical user flows verified end-to-end (login, game play, trade, stats)
- [ ] Follows project coding standards (consistent naming, service/router patterns)

---

## Notes

- **Frontend:** Angular 21 with signals-based state management; cohesive warm-stove theme established in Sprint 3
- **Backend:** Express.js + SQLite (better-sqlite3); 17+ routers; all endpoints Swagger-documented
- **Auth:** OAuth (Google/GitHub) + session-based with `AuthGuard`/`ReverseAuthGuard`
- **Economy:** Coin balance, atomic transactions, `CoinTransaction` audit trail, daily caps planned for Sprint 4
- **Tests:** 510 tests passing as of Sprint 3; target is to maintain or increase coverage
- **Assets:** 8 stove sprites in `public/assets/stove_sprites/`; chest GIFs in `public/assets/animation/`
- **GDPR:** Clear data policies and user deletion path documented; no real money keeps project outside gambling law scope
- **Upgrade Path:** SQLite sufficient for MVP; PostgreSQL recommended for scale post-MVP
