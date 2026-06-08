# AGENTS.md — EmberExchange

This file contains project-specific context for AI coding agents. The reader is assumed to know nothing about EmberExchange.

---

## Project Overview

EmberExchange is a full-stack web application that combines a virtual marketplace and collection game for trading unique stoves with real-time multiplayer card games (Texas Hold'em Poker, Blackjack, and Roulette). Players open lootboxes, trade items on a marketplace with a coin economy, track price history and ownership chains, and play multiplayer games in real-time rooms.

The project was built for **SYP 2026 — HTL Leonding**.

**Key Domains:**
- Virtual item collection (stoves with rarities: Common, Rare, Epic, Legendary, Limited, Secret)
- Lootbox opening with weighted drop rates and pity systems
- Marketplace listings, trades, and price history
- Real-time multiplayer game rooms via WebSocket
- Player statistics, achievements, quests, and social features
- Admin dashboard with moderation tools

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend runtime | Node.js + Express.js | Express 5.2 |
| Backend language | TypeScript | 5.9 (strict mode) |
| Database | PostgreSQL | 14+ (via `pg` driver with connection pooling) |
| Frontend framework | Angular | 21 (standalone components, signals-based) |
| Frontend styling | Tailwind CSS | 4.3 (via PostCSS plugin) |
| Real-time | WebSocket (`ws` library) | 8.x |
| API documentation | Swagger / OpenAPI 3.0 | `swagger-jsdoc` + `swagger-ui-express` |
| Testing (backend) | Jest | 30.x with `ts-jest` |
| Testing (frontend) | Angular CLI (`ng test`) | Karma/Jasmine (seldom used) |
| Task runner | npm scripts | — |

**Deployment:** Render (auto-deploys from `main` branch).

---

## Project Structure

```
src/
├── backend/
│   ├── app.ts                 # Express application entry point
│   ├── swagger.ts             # OpenAPI schema definitions
│   ├── db/                    # PlantUML schema diagram, legacy .db file
│   ├── game-engines/          # PokerEngine, BlackjackEngine, RouletteEngine
│   ├── game-logic/            # Card utilities, hand evaluation, game types
│   ├── middleware/            # Express middleware stack
│   ├── routers/               # Express REST API routers (one per domain)
│   ├── services/              # Database service layer (one per domain)
│   ├── utils/                 # Auth, password hashing, DB abstraction, bot traps
│   └── websocket/             # WS connection manager, handlers, timers, rate limiter
├── frontend/
│   └── src/app/
│       ├── core/              # Auth, API, WebSocket services; guards; layout; onboarding
│       ├── features/          # Page-level standalone components (lazy-loaded)
│       ├── pages/             # Static/marketing pages (how-it-works)
│       └── shared/            # Reusable UI components, not-found page
├── shared/
│   ├── model.ts               # Shared TypeScript interfaces/enums (backend + frontend)
│   └── pipes/                 # Shared Angular pipes
└── test/                      # Jest test suites (engine tests, service tests, integration)
```

**Compiled output:** `dist/` (TypeScript `outDir`).

**One-off scripts:** `scripts/` contains Node.js maintenance/utility scripts (e.g. ban bots, seed data, fix exploits).

**Security audits:** `Security_Audits/` contains periodic markdown audit reports.

---

## Build and Run Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm install` | Install all dependencies (root + frontend) |
| `npm run build` | Compile backend TypeScript to `dist/` |
| `npm start` | Run the compiled backend (`dist/backend/app.js`) |
| `npm run dev` | Run backend in development with `nodemon` (restarts on `src/**/*.ts` changes) |
| `npm run dev:full` | Concurrently run `npm run dev` + frontend watch build |
| `npm test` | Run Jest backend tests sequentially (see Testing section) |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with coverage report |
| `npm run frontend:build` | Build Angular app for production |
| `npm run frontend:serve` | Serve Angular dev server (proxies `/api` and `/ws` to `:3000`) |
| `npm run frontend:watch` | Build Angular in watch mode (development configuration) |
| `npm run frontend:test` | Run Angular unit tests via CLI |

**Development workflow:**
1. `npm install`
2. Create `.env` (see Environment Variables)
3. `npm run dev:full` — backend watches `src/backend`, frontend rebuilds on change
4. Server starts at `http://localhost:3000`
5. Angular dev server (if using `frontend:serve`) typically runs at `http://localhost:4200`

---

## Environment Variables

Create a `.env` file in the project root. At minimum:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`) |
| `SESSION_SECRET` | Secret for session cookie signing |
| `BASE_URL` | Base URL for OAuth callbacks (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth GitHub (optional) |
| `GITHUB_API_TOKEN` | GitHub API token for admin features (optional) |

The backend auto-creates tables on first startup via `DB.ensureTablesCreated()`.

---

## Code Organization and Architecture

### Backend

**Layered architecture:**

1. **Routers** (`src/backend/routers/*-router.ts`) — Express routers handling HTTP request/response. Validate inputs, call services, return JSON.
2. **Services** (`src/backend/services/*-service.ts`) — Business logic and database access. Each service extends `ServiceBase` and receives a `Unit` instance.
3. **Unit / DB abstraction** (`src/backend/utils/unit.ts`) — Wraps `pg` `PoolClient`. Provides:
   - `unit.prepare<T>(sql, bindings?)` → typed statement with `.get()`, `.all()`, `.run()`
   - Named parameters use `@paramName` syntax (converted internally to PostgreSQL `$N` positional params)
   - Automatic row transformation: database `snake_case` columns are mapped to `camelCase` via a large `COLUMN_MAP`
   - Transaction support via `unit.begin()`, `unit.complete(success?)`
4. **Middleware** (`src/backend/middleware/`) — Composable Express middleware:
   - `require-auth.ts` — Validates `session-id` header, attaches `req.playerId`, checks bans
   - `admin.ts` — `requireAdmin` guard
   - `rate-limiter.ts` — Domain-specific rate limiters (login, register, 2FA, etc.)
   - `turnstile.ts` — Cloudflare Turnstile CAPTCHA verification
   - `behavior-guard.ts`, `header-guard.ts`, `timing-guard.ts`, `datacenter-guard.ts`, `anomaly-scorer.ts` — Anti-bot/abuse layers
   - `ip-ban-check.ts`, `ban-check.ts` — Ban enforcement
5. **Game Engines** (`src/backend/game-engines/`) — Pure state machines for Poker, Blackjack, and Roulette. Implement the `GameEngine` interface. Stateless; all persistence is handled by callers.
6. **WebSocket** (`src/backend/websocket/`) — Authenticated real-time layer:
   - Auth via `sec-websocket-protocol` header (sessionId)
   - Per-IP connection limits, rate limiting, message queuing
   - Handlers: `join-room`, `leave-room`, `start-game`, `player-action`, `chat-message`, `request-sync`
   - Turn timers with auto-fold / auto-stand on timeout
   - Grace timers for disconnected players

**Entry point:** `src/backend/app.ts` wires all middleware, routers, Swagger UI, static file serving, cron jobs, and WebSocket setup.

### Frontend

**Angular 21 standalone architecture** (no NgModules):

- **Components** are standalone by default. Do NOT add `standalone: true` to decorators.
- **Path aliases** (from `src/frontend/tsconfig.json`):
  - `@app/*` → `src/app/*`
  - `@core/*` → `src/app/core/*`
  - `@features/*` → `src/app/features/*`
  - `@shared/*` → `../shared/*`
  - `@assets/*` → `src/assets/*`
- **Core** (`src/frontend/src/app/core/`):
  - `services/` — Singleton services (`providedIn: 'root'`), using `inject()` for DI
  - `guards/` — `authGuard`, `reverseAuthGuard`, `adminGuard`
  - `layout/` — `shell.component.ts` (main app shell)
  - `components/` — `onboarding-overlay.component.ts`
- **Features** (`src/frontend/src/app/features/`) — One directory per domain. Each feature is a standalone component, lazy-loaded via `loadComponent` in `app.routes.ts`.
- **Shared** (`src/frontend/src/app/shared/`) — Reusable UI components (e.g. `not-found.component.ts`).
- **State management:** Angular signals (`signal()`, `computed()`) for local component state. RxJS `Observable` for HTTP calls.
- **HTTP client:** `ApiService` wraps `HttpClient`, injects hardcoded client fingerprint headers (`X-DTOTF-JXLBHU: vqd7-pf16`), and maps errors to `ApiError`.
- **WebSocket client:** `WebSocketService` manages connection lifecycle, reconnection backoff, and exposes signals for `stateBlob`, `playersInRoom`, `incomingChatMessage`, etc.

### Shared Models

`src/shared/model.ts` contains the canonical TypeScript interfaces/enums used by both backend and frontend. **Always keep this file in sync** when adding or changing domain entities.

---

## Code Style Guidelines

### TypeScript (Backend + Frontend)

- **Strict mode is enabled.** Do not use `any`. Use `unknown` when the type is uncertain.
- Prefer `type` over `interface` for simple shapes; use `interface` for extensible domain models.
- Use explicit return types on public service methods.
- Named parameters in SQL use `@paramName` syntax (e.g. `SELECT * FROM Player WHERE playerId = @id`).

### Angular (Frontend)

- **Standalone components only.** Do not create NgModules.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Use `inject()` instead of constructor injection.
- Set `changeDetection: ChangeDetectionStrategy.OnPush` on all components.
- Prefer native control flow (`@if`, `@for`, `@switch`) over structural directives.
- Do not use `ngClass` or `ngStyle`; use `class` and `style` bindings.
- Do not use `@HostBinding` / `@HostListener`; put host bindings in the `host` object of `@Component`.
- Use `NgOptimizedImage` for static images (not base64).
- Prefer inline templates for very small components; otherwise use external templates relative to the `.ts` file.
- Use Reactive forms over Template-driven forms.
- Do not write arrow functions in templates.

### Backend-Specific Conventions

- Routers import from `express` and export a `Router` instance.
- Services extend `ServiceBase` and accept `Unit` in their constructor.
- Always call `await unit.complete()` or `await unit.complete(false)` in `finally` blocks to release DB connections.
- Prefer `StatusCodes` from `http-status-codes` over raw HTTP numbers.
- Security middleware is applied globally or per-router as needed; do not bypass it without explicit justification.

---

## Testing Instructions

### Backend Tests

Framework: **Jest** with `ts-jest` preset.

Configuration (`jest.config.js`):
- `testEnvironment: 'node'`
- `testMatch: ['**/*.test.ts', '**/*Tests.ts']`
- `maxWorkers: 1` — **Tests run sequentially** to avoid database contention and locking issues
- `testTimeout: 15000`
- `restoreMocks: true`, `clearMocks: true`
- Coverage collects from `src/**/*.ts` excluding `.d.ts`
- Ignores `src/test/routerTests/`

**Test categories:**

1. **Service tests** (`src/test/serviceTests/*.test.ts`) — Unit test services by mocking `Unit`:
   ```ts
   function mockStmt(getResult = null, allResult = [], runResult = { changes: 1 }) {
     return { get: jest.fn().mockResolvedValue(getResult), all: jest.fn().mockResolvedValue(allResult), run: jest.fn().mockResolvedValue(runResult) };
   }
   function mockUnit(stmt = mockStmt()) {
     return { prepare: jest.fn().mockReturnValue(stmt), getLastRowId: jest.fn().mockResolvedValue(1) } as unknown as Unit;
   }
   ```
2. **Engine tests** (`src/test/poker-engine.test.ts`, `blackjack-engine.test.ts`, `roulette-engine.test.ts`) — Test game logic state machines in isolation.
3. **WebSocket integration tests** (`src/test/websocket-integration.test.ts`) — Spins up a real HTTP + WS server, creates test players/sessions via DB, and exercises the full WebSocket protocol.

**Running tests:**
```bash
npm test           # full suite
npm run test:watch # watch mode
```

### Frontend Tests

Angular CLI tests are configured but **rarely used** in this project (only ~5 `.spec.ts` files exist). Most frontend verification is manual or integration-level.

---

## Security Considerations

EmberExchange implements a **defense-in-depth** security model. Be extremely careful when modifying auth, middleware, or game-state logic.

### Authentication & Authorization

- **Session-based auth:** Clients send `session-id` header on every API request. WebSocket auth uses `sec-websocket-protocol` (sessionId) to avoid leaking tokens in URLs/logs.
- **OAuth:** Google and GitHub OAuth 2.0 flows supported. OAuth users have `password: null`.
- **Two-factor authentication (2FA):** TOTP via `speakeasy`. Enforced after login if `totpEnabled`.
- **Bans:** Players can be banned (`bannedAt`, `banReason`). Banned players have sessions invalidated immediately.
- **Admin routes:** Protected by `requireAdmin` middleware (`isAdmin === 1`).

### Anti-Abuse Layers (Middleware Stack)

1. **Helmet** — Security headers (CSP is intentionally disabled because external resources like Google Fonts and Turnstile make a strict CSP too fragile).
2. **Rate Limiters** — Per-endpoint limits (login, register, auth, 2FA, resend verification, challenges).
3. **Turnstile** — Cloudflare CAPTCHA on auth endpoints.
4. **Proof of Work (PoW)** — Cryptographic challenges for auth endpoints to slow down automated attacks.
5. **Behavior Guard** — Tracks client behavior signals (form timing, interaction patterns).
6. **Header Guard** — Validates expected client fingerprint headers.
7. **Timing Guard** — Enforces minimum processing times to prevent timing analysis.
8. **Datacenter Guard** — Blocks requests from known cloud/datacenter IP ranges.
9. **Anomaly Scorer** — Heuristic scoring for suspicious request patterns.
10. **IP Ban Check** — Rejects requests from banned IPs.
11. **Bot Trap / Honeypot** — Fake endpoints and tar-pit responses to detect and slow bots.
12. **WebSocket limits** — Per-IP connection caps, pre-auth message queue limits, max payload size.

### Game Security

- **Optimistic locking:** Game state updates use a `version` field; concurrent updates are rejected.
- **Auto-fold / auto-stand timers** prevent disconnected players from stalling games.
- **Grace timers** remove disconnected players from rooms after a timeout.
- **Action validation:** All player actions are validated by game engines before state mutation.

### Data Safety

- Passwords are hashed with bcrypt.
- Services explicitly exclude sensitive fields (`password`, `totpSecret`) from public API responses.
- SQL injection is mitigated by the `Unit` parameterization layer (`@param` → `$N`).
- Input sanitization utility exists (`src/backend/utils/sanitize.ts`).

### When Modifying Security Code

- Run existing tests (`npm test`) before and after changes.
- Check `Security_Audits/` for recent audit findings and verify fixes against them.
- Do not weaken rate limits or bypass guards without updating the corresponding audit notes.
- Any new endpoints handling auth, admin, or game actions must apply the appropriate middleware stack.

---

## Database Notes

- **PostgreSQL** is the production database. The `pg` driver is used with a connection pool (max 20 connections).
- `src/backend/utils/unit.ts` contains the full schema bootstrap (`DB.ensureTablesCreated`). Tables are created with `IF NOT EXISTS` and columns are added with `ADD COLUMN IF NOT EXISTS`, making the setup idempotent.
- A legacy `EmberExchange.db` file exists in `src/backend/db/` but is not used by the application.
- The schema diagram is documented in `src/backend/db/db-diagram.plantuml`.

---

## WebSocket Protocol Summary

- **Path:** `/ws`
- **Auth:** `sec-websocket-protocol: <sessionId>`
- **Messages:** JSON with `{ type: string, payload?: object }`
- **Key message types:**
  - `join_room`, `leave_room`, `start_game`, `player_action`, `chat_message`, `request_sync`
  - Server pushes: `state_update`, `player_joined`, `player_left`, `error`, `notification`
- **State updates** include a `version` number for optimistic locking.
- **Player views** are filtered per-player (e.g. hidden hole cards in Poker).

---

## Important Files to Know

| File | Purpose |
|---|---|
| `src/backend/app.ts` | Express app bootstrap, middleware wiring, router registration |
| `src/backend/swagger.ts` | OpenAPI 3.0 schema definitions |
| `src/backend/utils/unit.ts` | DB pool, connection management, schema creation, `Unit` class |
| `src/shared/model.ts` | Canonical shared TypeScript domain models |
| `src/frontend/src/app/app.routes.ts` | Angular route definitions (lazy loading) |
| `src/frontend/src/app/core/services/api.service.ts` | HTTP client wrapper with fingerprint headers |
| `src/frontend/src/app/core/services/websocket.service.ts` | WebSocket client with signals |
| `jest.config.js` | Jest configuration |
| `nodemon.json` | Backend dev restart rules |
| `src/frontend/proxy.conf.json` | Dev server proxy to backend |

---

## Branches and Deployment

- `main` — Production branch. Auto-deploys to Render on push.
- `develop` — Active development branch.
- GitHub Actions: `discord-notify.yml` sends PR/review notifications to Discord.

---

## Contact / Team

SYP 2026 — HTL Leonding.
