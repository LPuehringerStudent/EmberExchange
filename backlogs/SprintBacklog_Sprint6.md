# Sprint Backlog — Sprint 6

**Sprint Duration:** ~4 weeks (June 12, 2026 – July 10, 2026)
**Team Size:** 4 developers

---

## Epic 1: Factory

**Source:** Product Backlog PB-79  
Place stoves in a factory to generate coal over multiple rounds with risk of destruction. Up to 10 stoves per factory layout. Heat damage chance scales with rarity each round. Destroyed stoves are removed from inventory; survivors persist their new heat level. Coal earned is added to the player balance atomically. Cash-out and reset actions are atomic.

---

## Epic 2: Stove Loadouts & Passive Bonuses

**Source:** Product Backlog PB-78  
Equip up to 3 stoves for passive bonuses that directly impact gameplay. Bonuses scale by rarity and heat: mini-game win chance, shop discount, XP gain, daily reward boost. Attuned stoves cannot be traded for 24h. Switching loadouts has a cooldown. Bonuses are visible in the UI and apply to relevant systems.

---

## Epic 3: Game <-> Social Bridge

Connect game outcomes to the social layer. Share big wins, rare drops, and achievements directly to the activity feed or chat. Spectate friends' games in real time. Send in-game gifts (coins, lootboxes) through the chat interface. Brag about leaderboard positions in the Hall of Glory.

---

## Epic 4: Investing

Allow players to invest coins into stove-type funds or player-managed portfolios. Returns scale with marketplace activity (trading volume, price appreciation). Withdrawal cooldowns prevent pump-and-dump. Leaderboard for top investors. Backend tracks investment positions, returns, and history.

---

## Epic 5: Tournaments & Leaderboards

Scheduled tournaments for Poker, Blackjack, and Roulette. Entry fees create prize pools. Leaderboards track weekly/monthly winners by game type and by overall profit. Trophy rewards for top 3 finishers. Public tournament brackets and live standings.

---

## Epic 6: More Mini-Games

Expand the casino floor with additional games. Candidates: Coin Flip (heads/tails, 50/50), Slots (3-reel with stove-themed symbols), Dice (over/under betting). Reuse existing WebSocket room infrastructure, coin sync, and betting patterns. Each game needs an engine, tests, and a frontend component.

---

## Epic 7: Security Hardening — June 3 Audit Remediation

**Source:** `Security_Audits/SECURITY_AUDIT_2026-06-03`  
**Priority:** P0

Comprehensive remediation of the 28 new findings and 4 remaining open issues from the June 3 security audit. These patches close unauthenticated data leaks, session hijacking vectors, economy exploits, and DoS risks before new feature work (Factory, Investing, etc.) builds on top of them.

| Task | Status | Who | Definition of Done | Est. |
|------|--------|-----|-------------------|------|
| Patch unauthenticated chat endpoints | | | `GET /chat-messages/:id`, `/players/:id/sent-messages`, `/received-messages`, `/unread-messages` all require `requireAuth`; `GET /chat-messages` filters by `senderId === req.playerId OR receiverId === req.playerId`; `GET /chat-messages/global` filters by `receiverId IS NULL` | 1h |
| Fix login history sessionId leak | | | `GET /login-history/:id` gated behind `requireAdmin` OR `sessionId` stripped from all login-history API responses | 0.5h |
| Harden trade offer acceptance | | | Rejects `price <= 0`, `!Number.isFinite(price)`, and `accepterId === senderId`; Jest tests cover negative/NaN/self-trade exploit vectors | 0.5h |
| Add bot protection to OAuth callbacks | | | `POST /oauth/google/callback` and `/oauth/github/callback` enforce Turnstile verification or proof-of-work challenge before completing OAuth flow | 1h |
| Paginate all unbounded GET endpoints | | | Every public and auth-gated `GET ALL` endpoint enforces `limit <= 100` with a hard cap; unbounded player-scoped endpoints filter by `req.playerId` unless admin | 1.5h |
| Fix latent SQL injection in purge functions | | | `security-event-service.ts` and `request-log-service.ts` use parameterized `INTERVAL $1 days` (or `parseInt` + strict type guard) instead of string interpolation | 0.5h |
| Remove `SELECT * FROM Player` leaks | | | All `Player` queries use explicit column lists excluding `password` and `totpSecret`; separate `getPlayerWithCredentials()` method for auth-only use | 1h |
| Auth-gate public player data endpoints | | | `/players/:id/ownerships`, `/players/:buyerId/trades`, `/players/:buyerId/trades/count`, `/players/:sellerId/active-listings/count` require auth and enforce `req.playerId === :playerId` or `requireAdmin` | 1h |
| Sign OAuth session cookie | | | `oauth_session` cookie cryptographically signed with server secret (e.g. `cookie-parser` signed cookie or JWT) instead of raw `JSON.stringify` | 0.5h |
| Lock down Swagger docs | | | `/api-docs` gated behind `requireAdmin` OR disabled entirely in production; sensitive schema fields (`password`, `totpSecret`, `isAdmin`) redacted from public spec | 0.25h |
| Strip PII from production logs | | | `email-service.ts`, `passport.ts`, `auth-router.ts` remove or downgrade to debug-level all logs containing emails, session IDs, passwords, or OAuth profile data | 0.5h |
| Block unverified username re-registration | | | Registration no longer deletes unverified accounts on username conflict; instead blocks re-registration for 24–48 hours | 0.5h |

**Epic Total:** ~8.75h

---

## Epic 8: First Impressions & Onboarding

**Source:** Teacher feedback + award presentability  
**Priority:** P0

Addresses the core concern that the site is overwhelming for non-gamers and first-time visitors. Focuses on optional guided discovery, contextual help, and landing-page clarity rather than removing existing depth.

| Task | Status | Who | Definition of Done | Est. |
|------|--------|-----|-------------------|------|
| Optional interactive onboarding | | | First-time login triggers a dismissible 3-step walkthrough (Collect → Trade → Play); returning users see a "Replay Tour" button in settings; progress saved in `PlayerSettings` | 2h |
| Contextual tooltips | | | `?` hover icons on Rarity, Heat, Pity, Sparks, Forgery, and Loadout explain mechanics in ≤2 sentences; uses existing theme; no external deps | 1.5h |
| "How It Works" page | | | `/how-it-works` route with a visual infographic explaining the core loop (lootboxes → inventory → marketplace/trade → games); responsive; linked from landing page and footer | 1h |
| Landing page polish | | | Tagline rewritten for non-gamers (e.g. "Collect, trade, and invest in rare digital stoves"); CTA buttons clarified; preview screenshots or animated GIF of core features; scroll-reveal animations | 1h |
| Visual consistency pass | | | Loading skeletons on all async pages; consistent empty-state illustrations; page transition animations; mobile breakpoint polish (375/768/1440); no console warnings | 2h |

**Epic Total:** ~7.5h

---

## Summary

| Epic | Source | Priority | Status |
|------|--------|----------|--------|
| **Security Hardening — June 3 Audit Remediation** | **SECURITY_AUDIT_2026-06-03** | **P0** | **Done** |
| **First Impressions & Onboarding** | **Teacher feedback** | **P0** | **Done** |
| Investing | New | Medium | Planned |
| Factory | PB-79 | Low | Deferred |
| Stove Loadouts & Passive Bonuses | PB-78 | Medium | Deferred |
| Game <-> Social Bridge | New | Medium | Deferred |
| Tournaments & Leaderboards | New | Low | Deferred |
| More Mini-Games | New | Low | Deferred |

---

## Definition of Done (Sprint 6)

- [ ] **Code merged** to `main`
- [ ] **No TypeScript compilation errors** across backend and frontend
- [ ] **Database:** Schema changes reflected in `unit.ts` and `src/shared/model.ts`
- [ ] **Tests passing:** All new Jest tests pass; existing suite remains green
- [ ] **Swagger:** All new endpoints documented
- [ ] **No Express route shadowing:** Static routes before parameterized routes
- [ ] **Critical user flows verified end-to-end**
- [ ] **Follows project coding standards:** Consistent patterns, shared model usage
