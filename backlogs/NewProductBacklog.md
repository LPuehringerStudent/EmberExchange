# Product Backlog

> Consolidated from `ProductBacklogTemplate.md` and `ProductBacklog.md`  
> Updated for the EmberExchange roadmap

| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|

## Sprint 1 — Foundation & Core Systems
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-01 | Technical Improvement | Project infrastructure: repository setup, CI configuration, tech research, and documentation | High | 4 | Completed | Sprint 1 | Laurenz Pühringer | Repository and CI are configured correctly. |
| PB-03 | Technical Improvement | Database architecture: ERD, schema migrations in `unit.ts`, and seed data scripts | High | 7 | Completed | Sprint 1 | Laurenz Pühringer | ERD covers all core entities and schema is implemented. |
| PB-06 | Technical Improvement | Player management backend: service layer (CRUD, coin ops) and REST API endpoints | High | 7 | Completed | Sprint 1 | Laurenz Pühringer | Player service and endpoints work correctly. |
| PB-08 | Technical Improvement | Authentication and inventory backend: JWT/session auth, inventory service, and API endpoints | High | 11 | Completed | Sprint 1 | Laurenz Pühringer | Auth and inventory APIs are functional. |
| PB-11 | Technical Improvement | Lootbox core: weighted random drops and REST endpoints | High | 8 | Completed | Sprint 1 | Laurenz Pühringer | Lootbox opening returns weighted random drops. |
| PB-14 | Technical Improvement | Swagger API documentation for all implemented endpoints | High | 3 | Completed | Sprint 1 | Laurenz Pühringer | Swagger docs exist for all implemented endpoints. |
| PB-13 | Technical Improvement | Unit tests for player and inventory services | High | 2 | Completed | Sprint 1 | Muhammad Ayan | Service tests cover core backend flows. |
| PB-13b | Technical Improvement | Integration tests for auth and lootbox endpoints | High | 3 | Completed | Sprint 1 | Muhammad Ayan | Endpoint tests pass successfully. |

## Sprint 2 — Stove Trading, Marketplace & Auth Expansion
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-16 | Technical Improvement | Stove management backend: service layer and collection API | High | 7 | Completed | Sprint 2 | Laurenz Pühringer | Stove service supports minting, transfers, and ownership history. |
| PB-18 | User Story | Marketplace core: listings, browsing, and atomic purchases | High | 13 | Completed | Sprint 2 | Laurenz Pühringer | Users can create listings, browse, and buy with atomic coin transfer. |
| PB-21 | User Story | Marketplace analytics: pricing, history, and ownership tracking | High | 8 | Completed | Sprint 2 | Laurenz Pühringer | Price history and ownership chain are tracked and retrievable. |
| PB-24 | Technical Improvement | API documentation and statistics backend | High | 8 | Completed | Sprint 2 | Laurenz Pühringer | Statistics tables, services, and Swagger docs are complete. |
| PB-26 | User Story | OAuth and session-based authentication | High | 8 | Completed | Sprint 2 | Laurenz Pühringer | OAuth login works for Google and GitHub; session guards function. |
| PB-30 | Technical Improvement | Chat and mini-game session backend | High | 3 | Completed | Sprint 2 | Laurenz Pühringer | Chat and mini-game session backend structures exist. |
| PB-25 | Technical Improvement | Unit tests for marketplace service layer | High | 2 | Completed | Sprint 2 | Muhammad Ayan | Service-layer trading logic is covered by tests. |
| PB-25b | Technical Improvement | Router tests for listing and trade endpoints | High | 2 | Completed | Sprint 2 | Muhammad Ayan | Listing and trade routes are covered by tests. |
| PB-31 | User Story | Login page layout and form styling | High | 2 | Completed | Sprint 2 | David Frühwirt | Login page layout is styled and responsive. |
| PB-31b | User Story | Login form validation and responsive design | High | 2 | Completed | Sprint 2 | David Frühwirt | Login form validates inputs and adapts to screen sizes. |
| PB-31c | User Story | Login OAuth button integration and error states | High | 1 | Completed | Sprint 2 | David Frühwirt | OAuth buttons and error messages are integrated. |
| PB-32 | User Story | Main page hero section and navigation | High | 2 | Completed | Sprint 2 | David Frühwirt | Main page hero and navigation are styled. |
| PB-32b | User Story | Main page stove carousel and live feed | High | 2 | Completed | Sprint 2 | David Frühwirt | Carousel and feed display correctly on the main page. |
| PB-32c | User Story | Main page CSS animations and mobile layout | High | 1 | Completed | Sprint 2 | David Frühwirt | Animations and mobile layout are polished. |
| PB-33 | User Story | Settings page shell and navigation | Medium | 1 | Completed | Sprint 2 | David Frühwirt | Settings shell and navigation are usable. |
| PB-33b | User Story | Settings sub-pages (Account, Security, Appearance) | Medium | 1 | Completed | Sprint 2 | David Frühwirt | Sub-pages are accessible and styled. |
| PB-34 | Bug Fix | Fix topbar and sidebar styling issues | Medium | 1 | Completed | Sprint 2 | David Frühwirt | Topbar and sidebar styling issues are resolved. |
| PB-34b | Bug Fix | Fix form input and button consistency | Medium | 1 | Completed | Sprint 2 | David Frühwirt | Form inputs and buttons are visually consistent. |

## Sprint 3 — Marketplace Frontend, Lootbox Rework & Polish
| ID | Type of Item | Description | Priority | Story Points | Status | Sprint | Assignee | Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| PB-35 | User Story | Marketplace frontend: buy/sell flows, inventory integration, and coin UI | High | 11 | Completed | Sprint 3 | Laurenz Pühringer | Marketplace frontend supports coin-based transactions. |
| PB-38 | User Story | Lootbox inventory rework and function restoration | High | 6 | Completed | Sprint 3 | Laurenz Pühringer | Lootboxes behave as inventory items and function correctly. |
| PB-41 | Technical Improvement | Player tracking and profile page with live statistics | High | 7 | Completed | Sprint 3 | Laurenz Pühringer | Profile page displays live user stats. |
| PB-43 | Technical Improvement | Frontend modernization: HttpClient migration, landing page, and build fixes | Medium | 6 | Completed | Sprint 3 | Laurenz Pühringer | Frontend uses modern service patterns and updated landing page. |
| PB-46 | Technical Improvement | Stove sprite system: asset creation, DB wiring, and UI integration | High | 12 | Completed | Sprint 3 | Laurenz Pühringer | Sprite assets are created, linked to DB, and displayed across UI. |
| PB-51 | Technical Improvement | Backend quality: route fixes, schema stability, and documentation | High | 8 | Completed | Sprint 3 | Laurenz Pühringer | Routes no longer shadow; test DB stays in sync; docs updated. |
| PB-39 | Bug Fix | Investigate and reproduce lootbox rarity mapping bug | High | 1 | Completed | Sprint 3 | Timon Brindl | Bug is identified and reproducible. |
| PB-39b | Bug Fix | Implement and verify rarity-to-stoveTypeId fix | High | 1 | Completed | Sprint 3 | Timon Brindl | Lootbox drops map correctly to stove type IDs. |
| PB-50 | Technical Improvement | Lootbox router tests | High | 3 | Completed | Sprint 3 | Muhammad Ayan | Lootbox routes are covered by tests. |
| PB-50b | Technical Improvement | Statistics router tests | High | 2 | Completed | Sprint 3 | Muhammad Ayan | Statistics routes are covered by tests. |
| PB-50c | Technical Improvement | Auth and login history router tests | High | 3 | Completed | Sprint 3 | Muhammad Ayan | Auth and login history routes are covered by tests. |
| PB-50d | Technical Improvement | Chat and coin transaction router tests | High | 2 | Completed | Sprint 3 | Muhammad Ayan | Chat and coin transaction routes are covered by tests. |
| PB-45 | User Story | Chest idle and opening GIF animations | High | 2 | Completed | Sprint 3 | David Frühwirt | Chest animations are integrated and smooth. |
| PB-45b | User Story | Lootbox reward preview card layout | High | 2 | Completed | Sprint 3 | David Frühwirt | Reward preview cards display correctly. |
| PB-45c | User Story | Lootbox responsive styling and CSS polish | High | 1 | Completed | Sprint 3 | David Frühwirt | Lootbox UI is responsive and polished. |
| PB-54 | User Story | Register step 1: Identity form with validation | High | 2 | Completed | Sprint 3 | David Frühwirt | Identity form validates username and email. |
| PB-54b | User Story | Register step 2: Password strength meter and confirm | High | 2 | Completed | Sprint 3 | David Frühwirt | Password strength feedback and confirmation work. |
| PB-54c | User Story | Register step 3: Terms acceptance and submit flow | High | 1 | Completed | Sprint 3 | David Frühwirt | Terms checkbox and submit flow are functional. |
| PB-55 | User Story | Shell topbar styling and coin pill design | Medium | 2 | Completed | Sprint 3 | David Frühwirt | Topbar styling and coin pill are polished. |
| PB-55b | User Story | Account dropdown and logout interaction polish | Medium | 1 | Completed | Sprint 3 | David Frühwirt | Account dropdown and logout interactions are smooth. |

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
| Sprint 1 | Foundation & Core Systems | Completed | 45 SP | ~45h |
| Sprint 2 | Stove Trading, Marketplace & Auth Expansion | Completed | 65 SP | ~50h |
| Sprint 3 | Marketplace Frontend, Lootbox Rework & Polish | Completed | 75 SP | ~45h |
| Sprint 4 | Roulette & Blackjack MiniGames + Settings | Planned | 44 SP | ~40h |
| Sprint 5 | Coin Flip & Slots + Social | Planned | 47 SP | ~42h |
| **MVP Total** |  |  | **~276 SP** | **~222h** |
| Future | Advanced Features, Mobile, Analytics | Backlog | ~80 SP | ~70h |

### Team Contribution Summary (Sprints 1–3)

| Team Member | Items Completed | Story Points | Primary Focus |
|-------------|----------------|-------------|---------------|
| Laurenz Pühringer | 18 | 137 | Backend architecture, core systems, marketplace, sprites, docs |
| David Frühwirt | 18 | 27 | Frontend UI/UX: login, register, main page, settings, lootbox |
| Muhammad Ayan | 8 | 19 | Test coverage: services, routers, auth, statistics |
| Timon Brindl | 2 | 2 | Bug fixes: lootbox rarity mapping |

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
