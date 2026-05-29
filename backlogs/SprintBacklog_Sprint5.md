# Sprint Backlog — Sprint 5

**Sprint Duration:** ~4 weeks (May 14, 2026 – June 11, 2026)  
**Team Size:** 4 developers  

---

## Epic 1: Forgery

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Forgery backend service | Done | Laurenz | `ForgeryService` accepts exactly 6 `stoveIds`; validates ownership and same-rarity; rejects Limited/Secret inputs; deletes inputs (with FK cleanup); creates 1 new stove of next rarity tier; inserts `Ownership` with `acquiredHow = 'craft'` | 1h | ~1h |
| Forgery rarity & collection logic | Done | Laurenz | Deterministic upgrade: Common→Rare, Rare→Epic, Epic→Legendary, Legendary→Limited; output collection weighted by input mix; output `heatLevel` = average of inputs mapped into output type's range | 1.5h | ~1.5h |
| Forgery UI – stove selection & table | Done | David | `/forgery` page with `forging-table.png` centerpiece; 6 hexagonal slots; stove grid with rarity filter tabs; same-rarity enforcement; auto-filter on first pick | 2h | ~2h |
| Forgery UI – result modal | Done | David | Success overlay shows forged stove sprite, name, rarity badge, collection, heat; "Awesome!" dismiss; failure overlay with error + "Try Again" | 1h | ~1h |
| Forgery router & tests | Done | Laurenz / Ayan | `POST /api/forgery` endpoint with Swagger docs; returns `ForgeryResult`; Jest tests cover validation, ownership, mixed-rarity rejection, Limited/Secret rejection, heat calc, tier upgrades | 1.5h | ~2h |
| Forgery navigation | Done | David | "The Forge" card in main menu Quick Access; `/forgery` lazy-loaded route with `authGuard`; back button to `/home` | 0.5h | ~0.5h |
| **Bug Fix: Forgery FK Constraint** | Done | Laurenz | `ForgeryService` deleted input stoves without removing active `Listing` rows, causing `listing_stoveid_fkey` violation. Fixed by adding `DELETE FROM Listing WHERE stoveId IN (...)` before `DELETE FROM Stove`. | — | ~0.5h |

**Epic Total:** 7.5h planned → **~8.5h actual**

---

## Epic 2: Shop

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Shop backend – direct purchases | Done | Laurenz | `ShopService` lists fixed-price stoves and lootboxes; atomic coin deduction; item delivered to inventory; purchase logged in `CoinTransaction` | 1.5h | ~1.5h |
| Shop backend – daily rewards | Done | Laurenz | `DailyRewardService` tracks last claim; 24-hour cooldown; rewards scale Day 1=100 to Day 7=1000+lootbox; streak resets after 48h miss | 1h | ~1h |
| Shop UI – catalog | Done | David | Tabbed view: "Stoves", "Lootboxes", "Daily"; items display price, rarity, sprite; buy button disabled if insufficient coins | 1.5h | ~1.5h |
| Shop UI – daily reward streak | Done | David | 7-day calendar visualization; claimed days highlighted; streak count; countdown timer; claim animation | 1.5h | ~1.5h |
| Shop stock & rotation | Done | Laurenz | Admin-configurable stock limits; daily rotation at 00:00 UTC; out-of-stock grayed out; `ShopListing` table | 1h | ~1h |
| Shop router & tests | Done | Laurenz / Ayan | `GET /shop/items`, `POST /shop/buy/:itemId`, `POST /shop/claim-daily`; Swagger docs; tests cover purchase, cooldown, streak | 1.5h | ~2h |
| **Bug Fix: Shop Purchase Crash** | Done | Laurenz | `AchievementEngine.checkShopAchievements()` referenced non-existent `price` column on `ShopPurchase`. Fixed query to JOIN `ShopListing`. | — | ~0.5h |
| **Performance: Batched Shop Limits** | Done | Laurenz | Replaced N+1 `COUNT(*)` queries with single `GROUP BY` query for daily purchase limits. | — | ~0.5h |

**Epic Total:** 9h planned → **~9.5h actual**

---

## Epic 3: Social

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Friends backend | Done | Laurenz | `FriendService` with request/accept/decline/remove; `Friend` table stores requester/addressee/status; mutual friendship required for chat | 1.5h | ~1.5h |
| Chat backend – real-time | Done | Laurenz | WebSocket `chat_message` handler; messages stored in `ChatMessage`; read receipts via `isRead`; paginated history (20 msg/fetch); blocked users cannot send | 1h | ~1h |
| Chat UI – conversation list | Done | David | Sidebar shows friends with unread count badge; last message preview; online status; click opens conversation | 1.5h | ~1.5h |
| Chat UI – message thread | Done | David | Bubble-style messages (own right, other left); timestamps; auto-scroll; send button + Enter; emoji picker | 1.5h | ~1.5h |
| Direct sales offers in chat | Partial | David | "Make Offer" button in chat; modal to select stove/lootbox and set price; offer sent as structured message; recipient accepts/rejects; atomic trade execution partially implemented | 1h | ~1h |
| Social router & tests | Done | Laurenz / Ayan | `POST /friends/request`, `POST /friends/respond`, `DELETE /friends/:id`, `GET /friends/list`, `GET /chat/history/:friendId`; tests cover request flow, block, message CRUD | 1.5h | ~1.5h |

**Epic Total:** 10h planned → **~9.5h actual**

---

## Epic 4: Hall of Glory

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Hall of Glory backend | Done | Laurenz | `HallOfGloryService` fetches profile, top 5 rarest stoves, collection value, achievements, statistics; public `GET /hall-of-glory/:playerId` no auth | 1h | ~1h |
| Hall of Glory – profile showcase | Done | David | Username, avatar placeholder, join date, total coins, total stoves; editable motto (max 100 chars); public/private flag | 1h | ~1h |
| Hall of Glory – trophy case | Done | David | Grid displays rarest stoves sorted by rarity; sprites with rarity border glow; click opens stove detail modal | 1.5h | ~1.5h |
| Hall of Glory – achievement badges | Done | David | Badge system: "First Lootbox", "100 Trades", "Collector", "High Roller"; `PlayerAchievement` table; locked/unlocked display | 1.5h | ~2h |
| Hall of Glory – statistics panel | Done | David | Total coins earned/lost, total trades, favorite game, luckiest win, days active; `PlayerStatistics`; sparkline chart | 1h | ~1h |
| Hall of Glory UI | Done | David | Full-page layout with trophy case center, stats left, achievements right; shareable URL `/glory/:username`; copy link; responsive | 1.5h | ~1.5h |
| **Bug Fix: Glory Template Crash** | Done | David | `profile()!.visitCount` threw when `profile()` was briefly undefined. Fixed with `@if (profile(); as p)` alias. | — | ~0.25h |

**Epic Total:** 8h planned → **~8.25h actual**

---

## Epic 5: Settings

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Settings – profile updates | Done   | Laurenz / David | "Account" tab: change username (unique check), change email, update motto for Hall of Glory; `PATCH /players/:id/profile` | 1h | ~1h |
| Settings – security | Done   | Laurenz / David | "Security" tab: change password (current required, bcrypt rehash); view active sessions; "Log out all devices" | 1.5h | ~1.5h |
| Settings – notifications | Done   | David | "Notifications" tab: toggles for friend requests, chat, trade offers, daily reminder; `PlayerSettings` table; UI exists, some toggles functional | 1h | ~0.75h |
| Settings – theme toggle | Done   | David | "Appearance" tab: Light/Dark/System mode; preference saved to `localStorage`; CSS variables switch themes | 1h | — |
| Settings – delete account | Done      | Laurenz / David | "Danger Zone" tab: "Delete Account" with confirmation modal; cascades via DB FKs; backend exists, UI stub present | 1h | ~0.5h |
| Settings UI layout | Done   | David | Left sidebar nav (Account, Security, Notifications, Appearance, Danger Zone); scrollable panels; toast on save | 1h | ~1h |

**Epic Total:** 7h planned → **~4.75h actual**

---

## Epic 6: Roulette (Resurrected from Sprint 4 Out-of-Scope)

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Roulette backend engine | Done | Laurenz | European roulette rules; 1-6 players; bet types: straight/red/black/even/odd/high/low/dozen/column; spin resolution with RNG; payout math (35:1, 2:1, 1:1); `syncPlayerCoinsFromState` compatible | — | ~3h |
| Roulette engine tests | Done | Ayan | 14 Jest tests: bet validation, multiple bets, spin resolution, payout math, next_hand reset, validActions, player view equality | — | ~1h |
| Roulette WebSocket integration | Done | Laurenz | `player-action.ts` passes `betType`/`number` through to engine; `getValidActions` returns `spin` when bets exist; `getPlayerView` has no hidden info | — | ~0.5h |
| Roulette frontend – wheel SVG | Done | Timon | 37-segment SVG wheel with authentic European order; dynamic path generation; red/black/green segments; gold rim; center turret | — | ~2h |
| Roulette frontend – betting table | Done | Timon | Full betting grid: 0, numbers 1-36, 2:1 columns, 1st/2nd/3rd 12, 1-18/Even/Red/Black/Odd/19-36; chip indicators show total per field | — | ~1.5h |
| Roulette frontend – ball animation | Done | Timon | Ball fixed at top of track; wheel rotates 5+ spins to bring winning pocket to ball; CSS transition with cubic-bezier deceleration; ball bounce on landing | — | ~1h |
| Roulette frontend – multi-bet support | Done | Timon | Player can place multiple bets on same or different fields; total tracked per field; stack checked against cumulative bet; backend resolves each independently | — | ~1h |
| Roulette frontend – result reveal | Done | Timon | Result number and color appear only after animation completes (~3.6s); winners banner delayed similarly | — | ~0.5h |
| Roulette – lobby & room wiring | Done | Timon | Added to `games.component.ts` lobby; `game-room.component.ts` routes to `<app-roulette>`; `minPlayers=1` | — | ~0.25h |
| Roulette – seed data | Done | Timon | Added to `insertGames()` in `unit.ts` with genre "casino", tags, description | — | ~0.25h |

**Epic Total:** — → **~10.5h actual**

---

## Epic 7: Performance & Infrastructure

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Database indexes | Done | Laurenz | 15 indexes added: `Stove(currentOwnerId)`, `MiniGameSession(playerId)`, `RoomPlayer(roomId, playerId)`, `Trade(offererId, offereeId)`, `Ownership(playerId)`, etc. | — | ~1h |
| AchievementEngine refactor | Done | Laurenz | Per-request caches; combined `FILTER` aggregates replace 7 separate queries; `checkedCosmetics` flag prevents redundant checks; ~34 queries/lootbox → ~5 | — | ~2h |
| Batched coin sync | Done | Laurenz | `updatePlayerCoinsBatch` uses `UPDATE ... FROM (VALUES ...)` instead of per-player loop; batched `::int` cast fix for PostgreSQL | — | ~0.5h |
| Batched shop limits | Done | Laurenz | `GROUP BY` single query replaces N+1 `COUNT(*)` for daily purchase limits | — | ~0.25h |
| Eliminate `lastval()` round-trips | Done | Laurenz | All inserts use `RETURNING` instead of separate `lastval()` calls | — | ~0.25h |
| Fix `PlayerAction` type | Done | Laurenz | Added `betType` and `number` optional fields to support roulette and future games | — | ~0.1h |
| Fix batched coin sync SQL type cast | Done | Laurenz | Added `::int` casts in `updatePlayerCoinsBatch` to fix `integer = text` operator error | — | ~0.25h |

**Epic Total:** — → **~4.35h actual**

---

## Epic 8: Collections & Quests

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Collections backend | Done | Laurenz | `CollectionService` tracks player stove collections; `GET /collections/:playerId` endpoint; `CollectionRouter` | — | ~1.5h |
| Collections frontend | Done | David | `/collections` page with grid display; stove sprites grouped by collection/rarity | — | ~1h |
| Quests backend | Done | Laurenz | `QuestService` with quest definitions, progress tracking, completion rewards; `QuestRouter` | — | ~1.5h |
| Quests frontend | Done | David | `/quests` page with active/completed quest list; progress bars; reward display | — | ~1h |

**Epic Total:** — → **~5h actual**

---

## Epic 9: Marketplace Redesign + Pity + Sparks

| Task | Status | Who | Definition of Done | Est. | Actual |
|------|--------|-----|-------------------|------|--------|
| Marketplace UI redesign | Done | David | Complete overhaul of `/marketplace` layout; new CSS, HTML, component structure | — | ~2h |
| Pity counter backend | Done | Laurenz | `PityService` tracks rolls since last legendary; increases legendary drop rate after threshold; `PityRouter` | — | ~1h |
| Sparks salvage system | Done | Laurenz | `SparksService` allows salvaging stoves for Sparks currency; `SparksRouter`; integration with inventory | — | ~1.5h |
| Stove detail component | Done | David | `stove-detail.component.ts` with detailed stove view, re-roll mechanics, heat display, ownership history | — | ~1.5h |

**Epic Total:** — → **~6h actual**

---

## Summary

| Epic | Planned | Actual | Status |
|------|---------|--------|--------|
| Forgery | 7.5h | ~8.5h | Complete |
| Shop | 9h | ~9.5h | Complete |
| Social | 10h | ~9.5h | Mostly complete (trade offers partial) |
| Hall of Glory | 8h | ~8.25h | Complete |
| Settings | 7h | ~4.75h | Partial (theme toggle missing, delete account partial) |
| **Roulette** | — | **~10.5h** | **Complete** |
| **Performance** | — | **~4.35h** | **Complete** |
| **Collections & Quests** | — | **~5h** | **Complete** |
| **Marketplace + Pity + Sparks** | — | **~6h** | **Complete** |
| **TOTAL** | **41.5h** | **~71.5h** | |

### By Developer

| Developer | Areas | Approx. Hours |
|-----------|-------|---------------|
| **Laurenz** | Backend (all services, routers, engines, WebSocket, DB), infrastructure, performance, bug fixes, coin sync, roulette engine | ~38.5h |
| **David** | Frontend UI (Forgery, Shop, Social, Hall of Glory, Settings, Collections, Quests, Marketplace, Stove Detail) | ~18h |
| **Timon** | Roulette (frontend component, animation, multi-bet) | ~7h |
| **Ayan** | Tests (all Jest test suites, engine tests, service tests, integration tests) | ~10h |

---

## Definition of Done (Sprint 5)

- [x] **Code merged** to `main`
- [x] **No TypeScript compilation errors** across backend (`tsc` succeeds); frontend has pre-existing warnings in `stove-detail.component.ts` only
- [x] **Database:** Schema changes reflected in `unit.ts` and `src/shared/model.ts`
- [x] **Tests passing:** 452/452 Jest tests passing (includes roulette, forgery, shop-sell-rotation, trade-offer, pity, quest, collection tests)
- [x] **Swagger:** All new endpoints documented
- [x] **No Express route shadowing:** Static/path-specific routes registered before parameterized routes
- [x] **Critical user flows verified end-to-end:**
  - Forgery: select 6 same-rarity stoves → forge → receive next-tier stove 
  - Shop: browse → buy → inventory updates → claim daily → streak increments 
  - Social: send friend request → accept → chat → make offer 
  - Hall of Glory: visit `/glory/:username` → trophy case, stats, achievements 
  - Settings: change password → log out all devices 
  - **Roulette: place multiple bets → spin → wheel animates → result reveals → next round** 
- [x] **Follows project coding standards:** Consistent patterns, shared model usage

---

## Verification Notes

### Bugs Found & Fixed During Sprint 5
1. **Forgery FK Constraint (Critical)** — `ForgeryService` deleted stoves without removing `Listing` rows. Fixed with pre-delete `Listing` cleanup.
2. **Shop Purchase Crash** — `AchievementEngine` referenced non-existent `price` column. Fixed with `ShopListing` JOIN.
3. **WebSocket Action Stripping** — `player-action.ts` only passed `{type, amount}`, dropping `betType`/`number`. Fixed to pass all action fields.
4. **Batched Coin Sync Type Error** — `VALUES` clause defaulted to `text`, causing `integer = text` error. Fixed with `::int` casts.
5. **Roulette Wheel Landing** — wheel landed on segment edge instead of center. Fixed with `(index + 0.5) * segAngle` targeting.
6. **Roulette Result Spoiler** — result appeared instantly while wheel was still spinning. Fixed with `resultRevealed` signal delayed by animation duration.

### Performance Wins
- Achievement engine: ~34 queries/lootbox → ~5 queries
- Batched coin sync: single `UPDATE ... FROM VALUES` vs per-player loop
- Batched shop limits: `GROUP BY` vs N+1 `COUNT(*)`
- Added 15 DB indexes for hot query paths

### API Verification Results
- **Roulette:** `POST player_action {bet}` → stack deducted → `POST player_action {spin}` → state settled → winningNumber generated → payouts distributed → coins synced 
- **Shop:** `POST /shop/buy` with `listingId=1` succeeded (coins deducted, stove received) 
- **Daily Reward:** `POST /shop/claim-daily` succeeded (streak increments, coins awarded) 
- **Social:** Friend request sent, chat message sent, trade offer created 
- **Hall of Glory:** `/glory/user/admin` works when logged out; public access confirmed 
- **Settings:** `PATCH /players/1/profile` motto update succeeded 

---

## Key Deliverables

1. **Forgery** (Laurenz + David) — Players sacrifice 6 same-rarity stoves to craft 1 guaranteed next-tier stove
2. **Shop** (Laurenz + David) — Direct purchase catalog with daily rotating stock + 7-day login reward streak
3. **Social** (Laurenz + David) — Friend requests, real-time chat, and in-chat trade offers
4. **Hall of Glory** (Laurenz + David) — Public player profile with trophy case, statistics, achievements
5. **Settings** (Laurenz + David) — Profile, security, and notification settings
6. **Roulette** (Timon + Ayan) — Complete European roulette with multi-bet support, animated SVG wheel, WebSocket multiplayer
7. **Collections & Quests** (Laurenz + David) — Player stove collection tracking and quest system
8. **Pity Counter & Sparks Salvage** (Laurenz) — Drop-rate mercy system and stove salvage currency
9. **Performance** (Laurenz) — ~85% reduction in achievement queries, batched coin updates, 15 new indexes
