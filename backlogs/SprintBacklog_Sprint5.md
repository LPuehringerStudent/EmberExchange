# Sprint Backlog — Sprint 5

**Sprint Duration:** ~4 weeks (May 14, 2026 – June 11, 2026)
**Target Hours:** 35–45 hours
**Team Size:** 4 developers

---

## Epic 1: Forgery

| Task | Who | Definition of Done                                                                                                                                                                                                                                                                      | Est. Time |
|------|-----|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|
| Forgery backend service | | `ForgeryService` accepts 10 stove IDs from the same player; validates ownership; consumes stoves; creates 1 new stove with rarity calculated from input rarity weights; logs result in `CoinTransaction`                                                                                | 1h |
| Forgery rarity calculation | | Common input → 80% Common / 15% Rare / 5% Epic; Rare input → 50% Rare / 30% Epic / 15% Legendary / 5% Limited; Epic input → 60% Epic / 25% Legendary / 15% Limited; Legendary input → 70% Legendary / 30% Limited; at least 1 rarity tier higher than lowest input with 10% probability | 1.5h |
| Forgery UI – stove selection | | Grid shows eligible stoves from inventory; player selects 2–5 stoves; selection highlights with count indicator; submit button disabled until 2+ selected                                                                                                                               | 1.5h |
| Forgery UI – result animation | | Animated fusion sequence (stoves combine into one); result stove displayed with rarity glow; rarity name and sprite shown; "Keep" and "Try Again" buttons                                                                                                                               | 1.5h |
| Forgery ownership & history | | New stove `Ownership` record created with `acquiredHow = 'craft'`; `PlayerStatistics.totalStovesCrafted` incremented; stove IDs consumed are logged in `EventLog`                                                                                                                       | 1h |
| Forgery router & tests | | `POST /forgery` endpoint with Swagger docs; returns new stove or error; 403 if stoves not owned; Jest tests cover 2-stove and 5-stove fusions, rarity distribution edge cases                                                                                                           | 1.5h |

**Epic Total:** 9h

---

## Epic 2: Shop

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Shop backend – direct purchases | | `ShopService` lists fixed-price stoves and lootboxes; player buys with atomic coin deduction; item delivered to inventory; purchase logged in `CoinTransaction` with type `listing_purchase` | 1.5h |
| Shop backend – daily rewards | | `DailyRewardService` tracks last claim per player; 24-hour cooldown; rewards scale: Day 1 = 100 coins, Day 7 = 1000 coins + 1 free lootbox; streak resets after 48h miss; claim logged | 1h |
| Shop UI – catalog | | Tabbed view: "Stoves", "Lootboxes", "Daily"; items display price, rarity, sprite; buy button disabled if insufficient coins; real-time coin balance from `AuthService` | 1.5h |
| Shop UI – daily reward streak | | 7-day calendar visualization; claimed days highlighted; current streak count displayed; countdown timer to next claim; animation on claim | 1.5h |
| Shop stock & rotation | | Admin-configurable stock limits; daily rotation of featured items at 00:00 UTC; out-of-stock items grayed out; shop inventory stored in `ShopListing` table | 1h |
| Shop router & tests | | `GET /shop/items`, `POST /shop/buy/:itemId`, `POST /shop/claim-daily` endpoints; Swagger docs; tests cover purchase with/without funds, daily claim cooldown, streak logic | 1.5h |

**Epic Total:** 9h

---

## Epic 3: Social

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Friends backend | | `FriendService` with request/accept/decline/remove; `Friend` table stores `requesterId`, `addresseeId`, `status` (pending/accepted/blocked), `createdAt`; mutual friendship required for chat | 1.5h |
| Chat backend – real-time | | WebSocket `chat_message` handler; messages stored in `ChatMessage` table; read receipts via `isRead` flag; message history paginated (20 messages per fetch); blocked users cannot send | 1h |
| Chat UI – conversation list | | Sidebar shows friends with unread count badge; last message preview; online status indicator; click opens conversation | 1.5h |
| Chat UI – message thread | | Bubble-style messages (own right, other left); timestamps; auto-scroll to bottom; send button + Enter key; emoji picker | 1.5h |
| Direct sales offers in chat | | "Make Offer" button in chat; opens modal to select stove/lootbox from inventory and set price; offer sent as structured message; recipient accepts/rejects; on accept, atomic trade executes | 1h |
| Social router & tests | | `POST /friends/request`, `POST /friends/respond`, `DELETE /friends/:id`, `GET /friends/list`, `GET /chat/history/:friendId` endpoints; tests cover request flow, block, message CRUD, offer accept/decline | 1.5h |

**Epic Total:** 10h

---

## Epic 4: Hall of Glory

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Hall of Glory backend | | `HallOfGloryService` fetches player profile, top 5 rarest stoves, total collection value, achievements, and statistics; public endpoint `GET /hall-of-glory/:playerId` with no auth required | 1h |
| Hall of Glory – profile showcase | | Player username, avatar placeholder, join date, total coins, total stoves owned; editable motto (max 100 chars); display flag for public/private profile | 1h |
| Hall of Glory – trophy case | | Grid displays player's rarest stoves sorted by rarity; stove sprites with rarity border glow; click opens stove detail modal with ownership history | 1.5h |
| Hall of Glory – achievement badges | | Badge system: "First Lootbox", "100 Trades", "Collector" (10 Legendary), "High Roller" (win 10k in one poker hand); badges stored in `PlayerAchievement` table; displayed as locked/unlocked | 1.5h |
| Hall of Glory – statistics panel | | Total coins earned/lost, total trades, favorite game, luckiest win, days active; data sourced from `PlayerStatistics`; sparkline chart for coin balance over last 30 days | 1h |
| Hall of Glory UI | | Full-page layout with trophy case center, stats left, achievements right; shareable URL (`/glory/:username`); copy link button; responsive grid | 1.5h |

**Epic Total:** 8h

---

## Epic 5: Settings

| Task | Who | Definition of Done | Est. Time |
|------|-----|-------------------|-----------|
| Settings – profile updates | | "Account" tab: change username (unique check), change email (verification not required for MVP), update motto for Hall of Glory; `PATCH /players/:id/profile` endpoint | 1h |
| Settings – security | | "Security" tab: change password (current password required, bcrypt rehash); view active sessions with device/last-active info; "Log out all devices" button deletes all sessions except current | 1.5h |
| Settings – notifications | | "Notifications" tab: toggles for friend requests, chat messages, trade offers, daily reward reminder; preferences stored in `PlayerSettings` table; defaults all enabled | 1h |
| Settings – theme toggle | | "Appearance" tab: Light/Dark/System mode switch; preference saved to `localStorage`; CSS variables switch between warm-stove (current) and dark charcoal themes | 1h |
| Settings – delete account | | "Danger Zone" tab: "Delete Account" button with confirmation modal (type username to confirm); deletes player, all sessions, and related records; cascades via DB foreign keys | 1h |
| Settings UI layout | | Left sidebar navigation (Account, Security, Notifications, Appearance, Danger Zone); each section is a scrollable panel; changes saved with toast notification; all buttons functional | 1h |

**Epic Total:** 7h

---

## Summary

| Epic | Tasks | Est. Hours | Focus Area |
|------|-------|------------|------------|
| Forgery | 6 | 9h | Crafting / Economy |
| Shop | 6 | 9h | Monetization / Rewards |
| Social | 6 | 10h | Community |
| Hall of Glory | 6 | 8h | Player Profile |
| Settings | 6 | 7h | UX / Account |
| **TOTAL** | **30 tasks** | **43h** | |

---

## Definition of Done (Sprint 5)

- [ ] **Code merged** to `develop` and subsequently to `main`
- [ ] **No TypeScript compilation errors** across the entire project (`ng build` and `tsc` succeed)
- [ ] **Database:** Schema changes reflected in `unit.ts`, `db-diagram.plantuml`, and `src/shared/model.ts`
- [ ] **Tests passing:** All Jest tests passing (existing + new tests for forgery, shop, social, hall-of-glory, settings)
- [ ] **Swagger:** All new endpoints documented in Swagger
- [ ] **No Express route shadowing:** Static/path-specific routes registered before parameterized routes
- [ ] **Frontend:** Responsive layout validated on desktop; no runtime console errors
- [ ] **Critical user flows verified end-to-end:**
  - Forgery: select 2+ stoves → fuse → receive new stove with correct rarity
  - Shop: browse catalog → buy item → inventory updates → claim daily reward → streak increments
  - Social: send friend request → accept → send chat message → receive reply → make direct offer → trade completes
  - Hall of Glory: visit `/glory/:username` → see trophy case, stats, achievements without login
  - Settings: change password → log out all devices → toggle theme → delete account (test account)
- [ ] **Follows project coding standards:** Consistent file naming, service/router patterns, shared model usage

---

## Key Deliverables

1. **Forgery:** Players can sacrifice 2–5 stoves to craft 1 new stove with weighted rarity based on inputs
2. **Shop:** Direct purchase catalog with daily rotating stock + 7-day daily login reward streak system
3. **Social:** Friend requests, real-time direct chat, and in-chat direct trade offers with atomic settlement
4. **Hall of Glory:** Public player profile page showcasing rarest stoves, statistics, achievements, and shareable URL
5. **Settings:** Fully functional settings panel with profile, security, notifications, appearance, and account deletion
