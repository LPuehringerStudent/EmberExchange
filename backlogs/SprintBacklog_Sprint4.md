# Sprint Backlog — Sprint 4

**Sprint Duration:** ~3 weeks (April 16, 2026 – May 7, 2026)
**Actual Hours:** ~40–45 hours
**Team Size:** 4 developers

---

## Epic 1: Database Migration (SQLite → PostgreSQL)

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| PostgreSQL connection pooling & `pg` integration | Laurenz Pühringer | `DB` class uses `pg.Pool`; `Unit` wraps `PoolClient` with `BEGIN`/`COMMIT`/`ROLLBACK`; all existing queries execute without syntax errors | 4h |
| Async refactor of all services | Laurenz Pühringer | Every service method returns `Promise<T>`; `better-sqlite3` fully removed from dependencies; `unit.prepare()` supports async `get()`/`all()`/`run()` | 4h |
| Async refactor of all routers | Laurenz Pühringer | All 17+ routers use `async/await`; no sync DB calls remain; Swagger annotations preserved | 3h |
| Auth & Passport async migration | Laurenz Pühringer | Login, register, OAuth, and session validation use async PostgreSQL queries; session expiry logic works with `pg` | 2h |
| Service tests updated for PostgreSQL | Muhammad Ayan | All service test suites pass against PostgreSQL; mocks updated for async patterns | 4h |

**Epic Total:** ~17 hours

---

## Epic 2: Multiplayer Infrastructure (WebSocket)

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| WebSocket connection manager | Laurenz Pühringer | `ConnectionManager` tracks socket→player mappings, room memberships, grace timers; supports `joinRoom`, `leaveRoom`, `broadcastToRoom` | 3h |
| WebSocket session authentication | Laurenz Pühringer | WS handshake validates `sessionId` query param against `Session` table; rejects unauthenticated connections with `1008` close code | 2h |
| Game room & lobby components | Laurenz Pühringer | Angular `GameRoomComponent` and `LobbyComponent`; create/join rooms; display connected players; game-type selection | 4h |
| GameState service with optimistic locking | Laurenz Pühringer | `GameStateService` stores JSONB blob with `version`; `updateState` uses `WHERE version = @expectedVersion` for atomic updates | 2h |
| Turn timer & auto-fold | Laurenz Pühringer | `startTurnTimer` schedules timeout; on expiry, server auto-folds (poker) or stands (blackjack); timer cleared on state advance | 2h |
| EventLog service | Laurenz Pühringer | `EventLogService` persists every action with sequence number, client timestamp, and server timestamp; supports replay | 1h |

**Epic Total:** ~14 hours

---

## Epic 3: Poker (Texas Hold'em)

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Poker engine backend | Laurenz Pühringer | Full betting rounds (pre-flop, flop, turn, river, showdown); blinds posting; call/raise/fold/check/all-in; side pot logic; hand evaluation from royal flush to high card | 6h |
| Poker engine tests | Muhammad Ayan | Tests cover heads-up and multiway blinds, raise/call/fold, all-in side pots, showdown winner determination, tie splitting | 3h |
| Poker table UI | David Frühwirt | Community cards display, pot amount, player avatars with stack/bet, turn indicator, dealer button, valid action buttons | 4h |
| Poker raise controls | David Frühwirt | Stepper with −/+/Raise buttons; min/max bounds from engine; input initialized to minimum raise | 2h |
| Poker winner display | David Frühwirt | Sidebar shows winners with hand name and amount won; visible only during showdown phase | 2h |
| Card sprites integration | David Frühwirt / Laurenz Pühringer | 52-card PNG sprites in `assets/poker_cards/`; back card sprite; sprites rendered with correct aspect ratio and no clipping | 3h |

**Epic Total:** ~20 hours

---

## Epic 4: Blackjack

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Blackjack engine backend | Laurenz Pühringer | Deck shuffle/deal; betting phase; hit/stand/double/split; dealer AI (hits soft 17); 3:2 blackjack payout; push logic; bust detection | 5h |
| Blackjack engine tests | Muhammad Ayan | Tests cover bet/deal flow, hit/stand, double, split, dealer play, blackjack payout, bust, push, resetForNextHand stack preservation | 3h |
| Blackjack frontend (full UI) | Laurenz Pühringer | Green felt oval table; dealer section at top; player seats in arc using `SEAT_POSITIONS`; card sprites; betting controls | 5h |
| Blackjack animations & polish | Laurenz Pühringer | Card deal animation via `bj-card--deal` class; phase announcements ("Dealer's Turn", "Showdown") with fade; results sidebar with "Next Game" button | 3h |
| Blackjack betting slider | Laurenz Pühringer | Range input from `minBet` to `maxBet`, step 10; clamps to available stack; displays current bet amount | 2h |
| Single-player support | Laurenz Pühringer | `minPlayers()` returns 1 for blackjack, 2 for poker; room can be started with 1 player | 1h |

**Epic Total:** ~19 hours

---

## Epic 5: Deployment & DevOps

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Render deployment pipeline | Laurenz Pühringer | `main` branch auto-deploys; build command includes `npm run frontend:build && npm run build`; `.envRender` for production | 2h |
| Angular build budget fix | Laurenz Pühringer | `poker.css` exceeded 16 kB component budget; raised `maximumError` to 24 kB in `angular.json`; production build succeeds | 1h |
| Startup player cleanup | Laurenz Pühringer | On server boot, only remove `RoomPlayer` entries where `disconnectedAt > 5 minutes ago`; preserves active games | 1h |
| WS deprecation fix | Laurenz Pühringer | Replaced deprecated `url.parse()` with `new URL()` in `websocket/index.ts`; no Node.js deprecation warnings | 1h |

**Epic Total:** ~5 hours

---

## Summary

| Epic | Tasks | Est. Hours | Focus Area |
|------|-------|------------|------------|
| Database Migration (SQLite → PostgreSQL) | 5 | 17h | Infrastructure |
| Multiplayer Infrastructure (WebSocket) | 6 | 14h | Real-time Networking |
| Poker (Texas Hold'em) | 6 | 20h | Game Engine + UI |
| Blackjack | 6 | 19h | Game Engine + UI |
| Deployment & DevOps | 4 | 5h | DevOps |
| **TOTAL** | **27 tasks** | **~75h** | |

---

## Definition of Done (Sprint 4)

- [x] **Code merged** to `develop` and subsequently to `main`
- [x] **No TypeScript compilation errors** across the entire project (`ng build` and `tsc` succeed)
- [x] **Database:** PostgreSQL migration complete; all tables created via `ensureTablesCreated`; no SQLite references remain
- [x] **Tests passing:** All Jest tests pass with PostgreSQL backend
- [x] **WebSocket:** Connections authenticate via session; rooms support join/leave; game state updates broadcast to all players
- [x] **Poker:** Full hand playable from blinds to showdown; side pots calculate correctly; winners receive chips
- [x] **Blackjack:** Full hand playable from bet to settlement; split, double, and blackjack payout work correctly
- [x] **Coin sync:** Game `stack` initializes from `Player.coins`; DB updated after every bet/win/loss; frontend header refreshes live
- [x] **Deployment:** `main` branch deploys successfully to Render; no build budget errors
- [x] **No Express route shadowing:** Static/path-specific routes registered before parameterized routes
- [x] **Frontend:** Responsive layout validated on desktop; no runtime console errors
- [x] **Follows project coding standards:** Consistent file naming, service/router patterns, and shared model usage

---

## Key Deliverables

1. **PostgreSQL Backend:** Full migration from SQLite with connection pooling, transactions, and async query support
2. **WebSocket Multiplayer:** Real-time game rooms with authentication, optimistic locking, turn timers, and state broadcasts
3. **Poker:** Complete Texas Hold'em with blinds, betting rounds, side pots, hand evaluation, and full Angular UI
4. **Blackjack:** Complete 21 game with hit/stand/double/split, dealer AI, animations, and betting controls
5. **Card Assets:** 52 transparent PNG card sprites + back card, integrated into both games
6. **Live Deployment:** Production app running on Render with auto-deploy from `main`
7. **Coin Economy:** In-game stack directly tied to `Player.coins` with live two-way sync

---

## Out-of-Scope (Moved to Sprint 5)

| Item | Reason |
|------|--------|
| Roulette mini-game | Scope replaced with Poker due to team decision |
| Settings page (profile/security updates) | Priority lowered; focus on multiplayer games |
| MiniGames Hub page | Deferred until all games are built |
| Daily earning caps / coin economy guards | Deferred until more games exist |
| Sound effects | Polish item; deferred |
| Mobile responsiveness for games | Desktop-first for MVP; mobile later |
