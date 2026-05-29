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

## Summary

| Epic | Source | Priority | Status |
|------|--------|----------|--------|
| Factory | PB-79 | Low | Planned |
| Stove Loadouts & Passive Bonuses | PB-78 | Medium | Planned |
| Game <-> Social Bridge | New | Medium | Planned |
| Investing | New | Medium | Planned |
| Tournaments & Leaderboards | New | Low | Planned |
| More Mini-Games | New | Low | Planned |

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
