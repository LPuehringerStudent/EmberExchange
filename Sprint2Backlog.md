       # Sprint 2 Backlog (v0.1.0 to v0.2.0)

**Sprint Duration:** 3 weeks  
**Total Estimated Hours:** ~115 hours  
**Team Size:** 4 developers  
**Focus:** Authentication, Statistics, UI/UX Overhaul, Backend Infrastructure

---

## Epic 1: Authentication System

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 1.1 OAuth Backend | Google & GitHub OAuth working via Passport.js; `/auth/oauth/google` and `/auth/oauth/github` endpoints return valid sessions; tested with real OAuth apps | 3h |
| 1.2 Session Management | Session table created; `SessionService` with create/validate/expire methods; automatic session cleanup; Swagger docs complete | 2h |
| 1.3 Login/Register UI | Login and Register components styled; form validation; error handling; responsive design; connected to backend API | 4h |
| 1.4 Auth Guards | `AuthGuard` protecting private routes; `ReverseAuthGuard` redirecting logged-in users; both tested | 1.5h |
| 1.5 Auth Fetcher & Service | Frontend auth service with token management; fetcher methods for all auth endpoints; interceptors for 401 handling | 2h |

**Epic Total:** ~12.5 hours

---

## Epic 2: Statistics System

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 2.1 Statistics Database Schema | 3 tables: `PlayerStatistics`, `DailyStatistics`, `StoveTypeStatistics`; SQL migrations; PlantUML updated | 1.5h |
| 2.2 Statistics Services | Service classes with calculation logic; aggregation methods; proper error handling; unit tests passing | 3h |
| 2.3 Statistics Routers | REST endpoints for all stats types; query parameters for filtering; Swagger documentation; `.http` test files | 2.5h |
| 2.4 Statistics Frontend | Statistics dashboard component; real-time charts; data visualization; responsive layout | 5h |
| 2.5 Statistics Fetchers | Frontend fetchers for all statistics endpoints; caching strategy; error states handled | 1.5h |

**Epic Total:** ~13.5 hours

---

## Epic 3: Social and Chat System

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 3.1 Chat Database and Backend | `ChatMessage` table; service and router; CRUD operations; Swagger docs | 2h |
| 3.2 Mini-Games Backend | `MiniGameSession` table; service and router; session tracking; coin reward logic | 2h |
| 3.3 Social Connections UI | Socials component; friend list UI; connection requests (mock if not fully implemented) | 2.5h |
| 3.4 Chat Integration | Chat UI component; real-time message display; message sending (prepared for WebSocket) | 3h |

**Epic Total:** ~9.5 hours

---

## Epic 4: Lootbox Enhancements

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 4.1 Lootbox Type System | `LootboxType` table; service and router; fetcher; different lootbox categories | 2h |
| 4.2 Lootbox Drop Tracking | `LootboxDrop` table; tracking what players receive; drop history endpoint | 2h |
| 4.3 Animated Chest UI | Transparent GIF assets created; idle and opening animations; CSS positioning; integrated into lootbox page | 3h |
| 4.4 Lootbox UI Polish | Full lootbox page styling; rarity colors; opening animation flow; responsive design | 4h |

**Epic Total:** ~11 hours

---

## Epic 5: UI/UX Overhaul

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 5.1 Main Menu Redesign | Welcome section; player stats display; game carousel; live feed; responsive layout; CSS animations | 5h |
| 5.2 Settings System | Settings component shell; 5 sub-pages: Account, Security, Appearance, Language, Social; navigation working | 4h |
| 5.3 Theme System | Dark/light mode toggle; CSS variables; `ThemeService` with persistence; applies globally | 2.5h |
| 5.4 Inventory UI | Inventory grid layout; item cards; action buttons (use/sell/trade); CSS styling; responsive | 4h |
| 5.5 Global CSS Refactoring | Warm stove aesthetic applied; cobblestone background; orange/red accents; consistent spacing | 3h |
| 5.6 API Test Page | Modern UI design; collapsible categories; search functionality; response time tracking | 2.5h |

**Epic Total:** ~21 hours

---

## Epic 6: Backend Infrastructure

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 6.1 Complete Router Suite | 17 routers implemented; all CRUD operations; proper error handling; Swagger annotations | 8h |
| 6.2 Complete Service Layer | Services for all entities; business logic; data validation; unit tests | 7h |
| 6.3 Frontend Fetchers | 18 fetcher files; consistent error handling; TypeScript types; reusable patterns | 4h |
| 6.4 Database Seeding | `unit.ts` sample data for all tables; realistic test data; reset functionality | 3h |
| 6.5 CORS and Security | CORS configured; security headers; input validation; SQL injection prevention | 1.5h |

**Epic Total:** ~23.5 hours

---

## Epic 7: Testing and Quality

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 7.1 Jest Setup | Jest configured; test environment ready; coverage reporting; mock utilities | 1.5h |
| 7.2 Router Tests | Tests for all 17 routers; mocking database; >80% coverage; all passing | 6h |
| 7.3 Service Tests | Unit tests for all services; mocked dependencies; edge cases covered | 5h |
| 7.4 Component Tests | Angular component specs; basic rendering tests; placeholder tests for all components | 3h |

**Epic Total:** ~15.5 hours

---

## Epic 8: DevOps and Documentation

| Task | Definition of Done | Est. Time |
|------|-------------------|-----------|
| 8.1 Discord Notifications | GitHub workflow for PR events; user mentions working; tested with real PRs | 1h |
| 8.2 Dependabot Config | Daily npm updates configured; proper ignore rules; working | 0.5h |
| 8.3 Swagger Documentation | All endpoints documented; schemas defined; UI accessible at `/api-docs` | 2h |
| 8.4 README Updates | v0.2.0 release notes; feature list; API endpoint table; setup instructions | 1h |
| 8.5 OAuth Setup Docs | `OAUTH_SETUP.md` created; step-by-step guide; troubleshooting section | 1h |
| 8.6 Environment Configuration | `.env.example` created; all required variables documented; local dev setup guide | 1h |

**Epic Total:** ~6.5 hours

---

## Summary

| Epic | Tasks | Est. Hours | Focus Area |
|------|-------|------------|------------|
| Authentication | 5 | 12.5h | Security |
| Statistics | 5 | 13.5h | Data Analytics |
| Social and Chat | 4 | 9.5h | Community |
| Lootbox | 4 | 11h | Gameplay |
| UI/UX Overhaul | 6 | 21h | Frontend |
| Backend Infrastructure | 5 | 23.5h | Architecture |
| Testing and Quality | 4 | 15.5h | QA |
| DevOps and Documentation | 6 | 6.5h | Documentation |
| **TOTAL** | **39 tasks** | **~113 hours** | |

---

## Definition of Done (Global)

All tasks must meet these criteria before being considered complete:

- [ ] Code reviewed and merged to `develop`
- [ ] No TypeScript compilation errors
- [ ] Backend: Swagger docs updated
- [ ] Frontend: Responsive on desktop and mobile
- [ ] Tests passing (if applicable)
- [ ] Manual testing completed
- [ ] No console errors in browser
- [ ] Follows project coding standards

---

## Sprint Goal

Deliver a fully functional authentication system with OAuth support, comprehensive statistics tracking, and a polished UI/UX that aligns with the warm stove aesthetic. All major backend infrastructure should be in place with proper testing coverage.

---

## Key Deliverables

1. **Authentication:** Users can register/login with email or OAuth (Google/GitHub)
2. **Statistics:** Real-time player and platform statistics dashboard
3. **Social Foundation:** Chat and mini-game backend ready for frontend integration
4. **UI/UX:** Cohesive warm stove theme across all pages
5. **API:** Complete REST API with 17+ routers and full Swagger documentation
6. **Quality:** >80% test coverage for critical paths
