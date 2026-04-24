# Product Backlog

> Consolidated from `ProductBacklogTemplate.md` and `ProductBacklog.md`  
> Updated for the EmberExchange roadmap

| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|

## Sprint 1 — Foundation & Core Systems
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-01 | Technical Improvement | Set up repository branching strategy and CI basics | High | 1 | Completed | Sprint 1 | Laurenz Pühringer | Repository and CI are configured correctly. |
| PB-02 | Spike | Research and document the tech stack | High | 1 | Completed | Sprint 1 | Laurenz Pühringer | Tech stack research is documented and approved. |
| PB-03 | Technical Improvement | Complete the database ERD for players, inventory, stoves, trades, and price history | High | 2 | Completed | Sprint 1 | Laurenz Pühringer | ERD covers all core entities and relationships. |
| PB-04 | Technical Improvement | Implement the database schema and migrations in `unit.ts` | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Database schema is implemented in `unit.ts`. |
| PB-05 | Technical Improvement | Create seed data for test players, stove types, and lootboxes | Medium | 2 | Completed | Sprint 1 | Laurenz Pühringer | Seed scripts generate valid test data. |
| PB-06 | Technical Improvement | Build the Player Service layer for CRUD and coin management | High | 4 | Completed | Sprint 1 | Laurenz Pühringer | Player service supports create, read, update, delete, and coin operations. |
| PB-07 | User Story | As a user, I want to be able to manage my player account and coin balance | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Player management endpoints work correctly through the API. |
| PB-08 | User Story | As a user, I want to be able to register and log in securely | High | 4 | Completed | Sprint 1 | Laurenz Pühringer | Users can register and log in using JWT and session auth. |
| PB-09 | User Story | As a user, I want to be able to view and manage my inventory items | High | 4 | Completed | Sprint 1 | Laurenz Pühringer | Inventory backend supports items, lootboxes, and stoves. |
| PB-10 | User Story | As a user, I want to be able to browse and manage my inventory through the API | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Inventory endpoints return correct data. |
| PB-11 | User Story | As a user, I want to be able to open lootboxes and receive random stove drops | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Lootbox opening returns weighted random drops. |
| PB-12 | User Story | As a user, I want to be able to view and open my lootboxes | High | 5 | Completed | Sprint 1 | Laurenz Pühringer | Lootbox endpoints allow viewing and opening lootboxes. |
| PB-13 | Technical Improvement | Add comprehensive unit and integration tests | High | 5 | Completed | Sprint 1 | Laurenz Pühringer | Tests cover core backend flows and pass successfully. |
| PB-14 | Technical Improvement | Document all implemented endpoints in Swagger | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Swagger docs exist for all implemented endpoints. |
| PB-15 | Technical Improvement | Prepare sprint documentation and handover materials | Medium | 2 | Completed | Sprint 1 | Laurenz Pühringer | Sprint documentation and handover materials are complete. |

## Sprint 2 — Stove Trading, Marketplace & Auth Expansion
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-16 | Technical Improvement | Build the stove service for minting, ownership transfer, and history | High | 4 | Completed | Sprint 2 | Laurenz Pühringer | Stove service supports minting, transfers, and ownership history. |
| PB-17 | User Story | As a user, I want to be able to view my stove collection with ownership details | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Users can view their stove collection with ownership details. |
| PB-18 | User Story | As a user, I want to be able to list my stoves for sale at a chosen price | High | 4 | Completed | Sprint 2 | Laurenz Pühringer | Users can create marketplace listings. |
| PB-19 | User Story | As a user, I want to be able to browse the marketplace with useful filters | High | 4 | Completed | Sprint 2 | Laurenz Pühringer | Marketplace supports filtering by rarity, price, and type. |
| PB-20 | User Story | As a user, I want to be able to buy stoves with secure coin transfers | High | 5 | Completed | Sprint 2 | Laurenz Pühringer | Buying stoves performs atomic coin transfer correctly. |
| PB-21 | Technical Improvement | Calculate and store 30-day median prices per stove type | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | 30-day median price data is calculated and stored. |
| PB-22 | User Story | As a user, I want to be able to view price history charts for stove types | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Price history charts display correctly. |
| PB-23 | User Story | As a user, I want to be able to see the full ownership chain of a stove | Medium | 2 | Completed | Sprint 2 | Laurenz Pühringer | Ownership chain can be retrieved for any stove. |
| PB-24 | Technical Improvement | Document marketplace endpoints in Swagger | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Marketplace endpoints are documented in Swagger. |
| PB-25 | Technical Improvement | Add trading tests for service and route coverage | High | 4 | Completed | Sprint 2 | Muhammad Ayan | Trading logic and routes are covered by tests. |
| PB-26 | User Story | As a user, I want to be able to sign in with Google or GitHub | High | 4 | Completed | Sprint 2 | Laurenz Pühringer | OAuth login works for Google and GitHub. |
| PB-27 | Technical Improvement | Implement session-based auth with session guards | High | 4 | Completed | Sprint 2 | Laurenz Pühringer | Session auth and guards function properly. |
| PB-28 | Technical Improvement | Add statistics tables for player, daily, and stove-type metrics | High | 2 | Completed | Sprint 2 | Laurenz Pühringer | Statistics tables exist and match the model. |
| PB-29 | Technical Improvement | Build statistics services and aggregation routers | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Statistics are calculated and exposed through APIs. |
| PB-30 | Technical Improvement | Add `ChatMessage` and `MiniGameSession` backend tables, services, and routers | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Chat and mini-game session backend structures exist. |
| PB-31 | User Story | As a user, I want to be able to use a responsive login and registration flow | High | 5 | Completed | Sprint 2 | David Frühwirt | Login/register UI is usable and responsive. |
| PB-32 | User Story | As a user, I want to be able to use a warm-themed main page that feels cohesive | High | 5 | Completed | Sprint 2 | David Frühwirt | Main UI follows the warm-stove theme. |
| PB-33 | User Story | As a user, I want to be able to open a settings page to manage my account | Medium | 2 | Completed | Sprint 2 | David Frühwirt | Settings page UI exists and is usable. |
| PB-34 | Bug Fix | Fix small UI issues across the application | Medium | 2 | Completed | Sprint 2 | David Frühwirt | Major UI bugs are fixed. |

## Sprint 3 — Marketplace Frontend, Lootbox Rework & Polish
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-35 | User Story | As a user, I want to be able to use a marketplace frontend with coin-based buying and selling | High | 5 | Completed | Sprint 3 | Laurenz Pühringer | Marketplace frontend supports coin-based transactions. |
| PB-36 | User Story | As a user, I want to be able to sell items directly from my inventory | High | 4 | Completed | Sprint 3 | Laurenz Pühringer | Users can sell items directly from inventory. |
| PB-37 | User Story | As a user, I want to be able to see my coin balance in the top bar | High | 2 | Completed | Sprint 3 | Laurenz Pühringer | Coin balance is visible in the top bar. |
| PB-38 | User Story | As a user, I want lootboxes to appear as real inventory items | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Lootboxes behave as inventory items. |
| PB-39 | Bug Fix | Correct loot drop mapping so rarity resolves to the right stove type | High | 2 | Completed | Sprint 3 | Timon Brindl | Lootbox drops map correctly to stove type IDs. |
| PB-40 | Bug Fix | Restore lootbox functionality after the inventory rework | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Lootbox function works after inventory rework. |
| PB-41 | Technical Improvement | Track login history and coin transactions for accurate stats | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Tracking tables record user activity accurately. |
| PB-42 | User Story | As a user, I want to be able to view a profile page with my info and live statistics | High | 4 | Completed | Sprint 3 | Laurenz Pühringer | Profile page displays live user stats. |
| PB-43 | Technical Improvement | Modernize the frontend data layer and landing page | Medium | 4 | Completed | Sprint 3 | Laurenz Pühringer | Frontend uses modern service patterns and updated landing page. |
| PB-44 | Bug Fix | Fix package conflicts and Angular build budget issues | Medium | 2 | Completed | Sprint 3 | Laurenz Pühringer | Build completes without package or budget conflicts. |
| PB-45 | User Story | As a user, I want to be able to open lootboxes with animations and reward previews | High | 5 | Completed | Sprint 3 | David Frühwirt | Lootbox UI includes animations and previews. |
| PB-46 | Technical Improvement | Add stove sprite assets and wire them to the database | High | 4 | Completed | Sprint 3 | Laurenz Pühringer | Stove sprite assets are created and linked to DB records. |
| PB-47 | User Story | As a user, I want to be able to see actual stove sprites in my inventory | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Inventory shows actual stove sprites. |
| PB-48 | User Story | As a user, I want to be able to see stove sprites on marketplace listing cards | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Listing cards render stove sprites correctly. |
| PB-49 | Bug Fix | Remove hardcoded stove names and read them from `StoveType` | High | 2 | Completed | Sprint 3 | Laurenz Pühringer | UI reads stove names dynamically from `StoveType`. |
| PB-50 | Technical Improvement | Add router tests for lootbox, statistics, auth, chat, and coin transactions | High | 10 | Completed | Sprint 3 | Muhammad Ayan | Router tests cover the listed backend areas. |
| PB-51 | Bug Fix | Fix Express route shadowing issues such as `/count` before `/:id` | High | 2 | Completed | Sprint 3 | Laurenz Pühringer | Routes no longer shadow each other. |
| PB-52 | Bug Fix | Fix test database schema drift and migration issues | High | 3 | Completed | Sprint 3 | Laurenz Pühringer | Test DB migrations stay in sync with schema. |
| PB-53 | Technical Improvement | Keep the full test suite passing | High | 1 | Completed | Sprint 3 | Laurenz Pühringer | Test suite passes completely. |
| PB-54 | User Story | As a user, I want to be able to register through a step-by-step flow with password strength feedback | High | 5 | Completed | Sprint 3 | David Frühwirt | Registration wizard works with password validation. |
| PB-55 | User Story | As a user, I want to be able to use a polished top bar with account controls | Medium | 3 | Completed | Sprint 3 | David Frühwirt | Topbar account controls are polished. |
| PB-56 | Technical Improvement | Unify sprint backlog documentation | Medium | 2 | Completed | Sprint 3 | Laurenz Pühringer | Backlog documentation is unified and maintained. |

## Sprint 4 — Roulette & Blackjack MiniGames + Settings
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-57 | User Story | As a user, I want to be able to play roulette with fair bets, spins, and payouts | High | 5 | To Do | Sprint 4 | Unassigned | Roulette backend supports valid bets, spins, payouts, and daily caps. |
| PB-58 | User Story | As a user, I want to be able to use a roulette table UI to place chips and see results | High | 6 | To Do | Sprint 4 | Unassigned | Roulette UI is functional and updates balances correctly. |
| PB-59 | User Story | As a user, I want to be able to play blackjack with hit, stand, and double-down actions | High | 5 | To Do | Sprint 4 | Unassigned | Blackjack backend handles game flow and payouts. |
| PB-60 | User Story | As a user, I want to be able to use a blackjack table UI that shows hands, bets, and results | High | 6 | To Do | Sprint 4 | Unassigned | Blackjack UI supports full gameplay interaction. |
| PB-61 | User Story | As a user, I want to be able to open a mini-games hub that shows available games and my coin balance | High | 3 | To Do | Sprint 4 | Unassigned | Hub page lists games and shows earnings/balance. |
| PB-62 | User Story | As a user, I want to be able to update my username, email, password, and preferences | Medium | 3 | To Do | Sprint 4 | Unassigned | Settings backend allows profile and security updates. |
| PB-63 | User Story | As a user, I want to be able to use a settings page with profile, security, and theme options | Medium | 4 | To Do | Sprint 4 | Unassigned | Settings page provides all required sections and actions. |
| PB-64 | Bug Fix | Validate all game results server-side to prevent cheating | High | 3 | To Do | Sprint 4 | Unassigned | Server validates all game outcomes securely. |
| PB-65 | Technical Improvement | Enforce coin economy caps, cooldowns, and transaction logging | High | 2 | To Do | Sprint 4 | Unassigned | Economy guards and audit logging prevent abuse. |
| PB-66 | Technical Improvement | Add tests for game logic, routes, and frontend components | Medium | 4 | To Do | Sprint 4 | Unassigned | Tests cover mini-game logic, APIs, and UI. |
| PB-67 | Technical Improvement | Add sound effects, responsive layout, and loading states for the mini-games | Medium | 3 | To Do | Sprint 4 | Unassigned | Games feel polished and responsive. |

## Sprint 5 — 2 More MiniGames + Social
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-68 | User Story | As a user, I want to be able to bet on coin flips and receive instant results | High | 2 | To Do | Sprint 5 | Unassigned | Coin flip backend supports betting and payouts. |
| PB-69 | User Story | As a user, I want to be able to use a simple coin flip UI with animation and history | High | 3 | To Do | Sprint 5 | Unassigned | Coin flip UI is usable and animated. |
| PB-70 | User Story | As a user, I want to be able to play slots with weighted reels and jackpot rewards | High | 4 | To Do | Sprint 5 | Unassigned | Slots backend supports weighted reels and payouts. |
| PB-71 | User Story | As a user, I want to be able to use a slots UI that shows reels, paylines, and wins | High | 5 | To Do | Sprint 5 | Unassigned | Slots UI is playable and visually clear. |
| PB-72 | User Story | As a user, I want to be able to send and receive chat messages in real time | Medium | 4 | To Do | Sprint 5 | Unassigned | Chat backend supports delivery and history. |
| PB-73 | User Story | As a user, I want to be able to use a chat interface with threads, status, and message history | Medium | 5 | To Do | Sprint 5 | Unassigned | Chat UI supports real-time-style messaging. |
| PB-74 | User Story | As a user, I want to be able to manage friend requests and block or unblock players | Medium | 4 | To Do | Sprint 5 | Unassigned | Friends backend supports relationships and blocking. |
| PB-75 | User Story | As a user, I want to be able to search players and manage my friends list | Medium | 4 | To Do | Sprint 5 | Unassigned | Friends UI supports friend management tasks. |
| PB-76 | User Story | As a user, I want to be able to view public player profiles with stats and inventory previews | Low | 3 | To Do | Sprint 5 | Unassigned | Public profiles are viewable and informative. |
| PB-77 | User Story | As a user, I want to be able to see a social activity feed from friends | Low | 3 | To Do | Sprint 5 | Unassigned | Activity feed shows relevant social events. |
| PB-78 | User Story | As a user, I want to be able to see mini-game leaderboards for daily, weekly, and all-time earnings | Low | 3 | To Do | Sprint 5 | Unassigned | Leaderboards display top earners accurately. |
| PB-79 | Technical Improvement | Add tests for chat, social features, and game logic | Medium | 4 | To Do | Sprint 5 | Unassigned | Chat/social/game tests are in place and passing. |
| PB-80 | Technical Improvement | Polish the mini-games and social screens with sound, mobile layout, and error boundaries | Medium | 3 | To Do | Sprint 5 | Unassigned | Games and social screens are polished and stable. |

## Future Sprints — Post-MVP Backlog

### Performance & Optimization
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-81 | Technical Improvement | Cache frequent queries with Redis | Low | 5 | Backlog | Future | Unassigned | Repeated queries are cached to improve performance. |
| PB-82 | Technical Improvement | Review and optimize database queries and indexes | Low | 3 | Backlog | Future | Unassigned | Slow queries are optimized and indexes reviewed. |
| PB-83 | Technical Improvement | Serve stove images through a CDN | Low | 3 | Backlog | Future | Unassigned | Stove images can be served via CDN. |
| PB-84 | Non-Functional Requirement | Reach a Lighthouse performance score above 90 | Medium | 6 | Backlog | Future | Unassigned | Lighthouse performance score exceeds 90. |
| PB-85 | Technical Improvement | Analyze bundle size and keep the main bundle under 200KB | Medium | 3 | Backlog | Future | Unassigned | Main bundle size stays under the target threshold. |

### Analytics & Monitoring
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-86 | User Story | As an admin, I want to be able to see active users, trades, and economy health in one dashboard | Low | 5 | Backlog | Future | Unassigned | Admin dashboard displays live operational metrics. |
| PB-87 | Technical Improvement | Add Sentry error tracking | Low | 3 | Backlog | Future | Unassigned | Frontend and backend errors are tracked in Sentry. |
| PB-88 | Technical Improvement | Add user behavior analytics | Low | 5 | Backlog | Future | Unassigned | User interaction analytics are collected responsibly. |

### Advanced Features
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-89 | User Story | As a user, I want to be able to trade directly with another player | Low | 5 | Backlog | Future | Unassigned | Users can trade directly without marketplace listings. |
| PB-90 | User Story | As a user, I want to be able to craft higher-tier stoves from lower-tier ones | Low | 8 | Backlog | Future | Unassigned | Users can combine stoves into higher-tier items. |
| PB-91 | User Story | As a user, I want to be able to earn and display achievements and badges | Low | 5 | Backlog | Future | Unassigned | Users can earn and display achievements. |
| PB-92 | User Story | As a user, I want to be able to take part in seasonal events with limited-time drops | Low | 8 | Backlog | Future | Unassigned | Seasonal events provide unique limited-time rewards. |
| PB-93 | User Story | As a user, I want to be able to use offline support and push notifications | Low | 8 | Backlog | Future | Unassigned | App supports offline and push notification features. |
| PB-94 | Non-Functional Requirement | Support English and German translations | Low | 13 | Backlog | Future | Unassigned | UI supports English and German translations. |

### Mobile & Multi-Platform
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-95 | User Story | As a user, I want to be able to use a mobile app version of EmberExchange | Low | 21 | Backlog | Future | Unassigned | A mobile application variant exists. |
| PB-96 | Technical Improvement | Improve tablet responsiveness | Low | 5 | Backlog | Future | Unassigned | Tablet layouts are improved and verified. |
| PB-97 | Technical Improvement | Add Docker deployment configuration | Medium | 5 | Backlog | Future | Unassigned | Docker deployment is configured and documented. |
| PB-98 | Technical Improvement | Add Playwright end-to-end tests for login, lootbox, and trade flows | High | 5 | Backlog | Future | Unassigned | End-to-end tests cover critical user flows. |

---

## Backlog Summary

| Sprint | Focus | Status | Story Points | Est. Hours |
|--------|-------|--------|-------------|-----------|
| Sprint 1 | Foundation & Core Systems | Completed | 42 SP | ~45h |
| Sprint 2 | Stove Trading, Marketplace & Auth Expansion | Completed | 65 SP | ~50h |
| Sprint 3 | Marketplace Frontend, Lootbox Rework & Polish | Completed | 75 SP | ~45h |
| Sprint 4 | Roulette & Blackjack MiniGames + Settings | Planned | 44 SP | ~40h |
| Sprint 5 | Coin Flip & Slots + Social | Planned | 47 SP | ~42h |
| **MVP Total** |  |  | **~273 SP** | **~222h** |
| Future | Advanced Features, Mobile, Analytics | Backlog | ~80 SP | ~70h |

---

## Definition of Done

- [ ] Code merged to `develop` and then to `main`
- [ ] No TypeScript compilation errors
- [ ] Swagger documentation updated for new or modified endpoints
- [ ] Database schema changes reflected in `unit.ts`, `db-diagram.plantuml`, and `src/shared/model.ts`
- [ ] All Jest tests passing
- [ ] No Express route shadowing issues
- [ ] Responsive layout validated on desktop
- [ ] Critical user flows verified end-to-end
- [ ] Follows project coding standards

---

## Notes

- **Frontend:** Angular 21 with signals-based state management
- **Backend:** Express.js + SQLite (`better-sqlite3`)
- **Auth:** OAuth (Google/GitHub) + session-based auth
- **Economy:** Coin balance, atomic transactions, `CoinTransaction` audit trail
- **Tests:** 510 tests passing as of Sprint 3
- **Assets:** 8 stove sprites in `public/assets/stove_sprites/`
- **Upgrade Path:** SQLite is sufficient for MVP; PostgreSQL is recommended for scale
