# AGENTS.md — EmberExchange

This file contains project-specific context for AI coding agents. The reader is assumed to know nothing about the project.

---

## Project Overview

EmberExchange is a full-stack web application for a virtual marketplace and collection game built around trading unique stoves. Players open lootboxes, trade stoves on a marketplace, track price history, and play real-time multiplayer card games (Poker, Blackjack, Roulette). It was built for SYP 2026 at HTL Leonding.

**Production URL:** https://emberexchange.xyz  
**Repository:** Private GitHub repo with auto-deploy to Render from `main`.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend runtime | Node.js + Express.js 5.2 |
| Backend language | TypeScript 5.9 (target: ES2020, CommonJS modules) |
| Frontend framework | Angular 21 (standalone components, signals-based reactivity) |
| Styling | Tailwind CSS v4 with PostCSS |
| Database | PostgreSQL (via `pg` connection pooling) |
| Real-time | WebSocket (`ws` library) with session auth |
| API docs | Swagger / OpenAPI 3.0 (`swagger-jsdoc` + `swagger-ui-express`) |
| Testing | Jest 30 + `ts-jest` |
| Deployment | Render (Web Service) |

---

## Project Structure

```
src/
├── backend/
│   ├── app.ts                 # Express entry point, middleware pipeline, cron jobs
│   ├── swagger.ts             # OpenAPI schema definitions
│   ├── db/                    # PlantUML diagram + legacy SQLite file (not used at runtime)
│   ├── game-engines/          # Poker, Blackjack, Roulette engine implementations
│   ├── game-logic/            # Card utilities, hand evaluation, type definitions
│   ├── middleware/            # Express middleware (auth, rate limiting, Turnstile, anti-bot)
│   ├── routers/               # Express REST API routers (mounted under /api)
│   ├── services/              # Database service layer (one per domain)
│   ├── utils/                 # DB unit helper, auth, password hashing, anti-bot config
│   ├── websocket/             # WS server setup, connection manager, handlers, timers
│   └── __mocks__/             # Jest mock utilities
├── frontend/
│   ├── src/app/
│   │   ├── core/              # Guards, layout shell, services (API, auth, WS, etc.)
│   │   ├── features/          # Page-level components (lazy-loaded routes)
│   │   └── shared/            # Reusable UI components
│   ├── public/                # Static assets
│   └── angular.json           # Angular CLI config
├── shared/                    # Shared TypeScript models & pipes (backend + frontend)
└── test/                      # Jest test suites
```

### Frontend route organization
Routes are defined in `src/frontend/src/app/app.routes.ts`. Most protected pages use `authGuard`; login/register use `reverse-auth-guard`. Admin routes are children of `/admin` loaded lazily from `features/admin/admin.routes.ts`.

---

## Build & Development Commands

All commands run from the project root.

```bash
# Install dependencies
npm install

# Compile TypeScript backend to dist/
npm run build

# Start compiled backend
npm start

# Development: backend with nodemon + ts-node
npm run dev

# Development: backend + frontend watch concurrently
npm run dev:full

# Frontend only
npm run frontend:serve    # Angular dev server (port 4200, proxied to backend)
npm run frontend:build    # Production build
npm run frontend:watch    # Development build with watch
npm run frontend:test     # Angular unit tests (Karma/Jasmine — rarely used)

# Testing
npm test                  # Run all Jest tests sequentially
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

The server listens on `PORT` (default 3000). The Angular dev server runs on 4200 and proxies API calls to 3000 via `proxy.conf.json`.

---

## Environment Variables

Required variables (defined in `.env` for local dev, set in Render dashboard for production):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session cookie signing |
| `BASE_URL` | Base URL for OAuth callbacks (e.g. `http://localhost:3000`) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `http://localhost:4200`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |
| `TURNSTILE_SECRET_KEY` / `TURNSTILE_SITE_KEY` | Cloudflare Turnstile anti-bot (optional in dev) |
| `RESEND_API_KEY` / `FROM_EMAIL` | Email delivery via Resend (optional in dev) |
| `GITHUB_API_TOKEN` | GitHub API token for admin features (optional) |
| `NODE_ENV` | Set to `production` on Render to enable production hardening |

Anti-bot configuration values (honeypot fields, headers, proof-of-work difficulty) are loaded from `src/backend/utils/anti-bot-config.ts` and can be overridden via env vars.

---

## Database Architecture

The project uses **PostgreSQL**. Schema management is **programmatic**, not migration-based:

- `src/backend/utils/unit.ts` contains `DB.ensureTablesCreated(connection)` which runs `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements on every cold start.
- All SQL column names are `snake_case` in the database.
- A `COLUMN_MAP` in `unit.ts` automatically transforms query results from `snake_case` to `camelCase` so TypeScript code uses camelCase exclusively.

### The `Unit` transaction pattern

Every database operation should use the `Unit` class:

```typescript
const unit = await Unit.create(true);   // true = read-only, false = writable
const service = new SomeService(unit);
const result = await service.doWork();
await unit.complete(true);              // commit
```

- `Unit.create(readOnly)` acquires a `PoolClient` from the `pg` pool.
- `unit.complete(true)` releases the client back to the pool (commits if writable).
- `unit.complete(false)` rolls back (only meaningful if the unit performed writes).
- **Never** forget to call `complete()` — use `try/finally` or the pattern shown throughout the codebase.

### Service layer conventions

- All services extend `ServiceBase` and accept a `Unit` in their constructor.
- Services use `unit.prepare<T, P>(sql, bindings)` to create typed statements.
- Parameter binding uses `@name` syntax (converted to Postgres positional `$1`, `$2` internally).

---

## Code Style Guidelines

### Backend
- Use **camelCase** for all TypeScript identifiers.
- SQL inside services uses `@param` named placeholders.
- Return early (guard clauses) rather than deeply nested `if` blocks.
- Express routers export a named router (e.g., `export const playerRouter = express.Router()`).
- Middleware functions are async where needed and must call `next(err)` on errors.

### Frontend
- Angular **standalone components** (no NgModules except the root bootstrap).
- **Signals-based** reactivity (`signal()`, `computed()`, `effect()`).
- Lazy-loaded routes with `loadComponent` / `loadChildren`.
- Path alias `@core` maps to `src/app/core/`.
- Tailwind CSS utility classes; custom design system tokens defined in `src/styles.css` under `@theme`.

### Shared
- `src/shared/model.ts` contains interfaces used by both backend and frontend.
- `src/shared/pipes/` contains Angular pipes that may also be useful on the backend.

---

## Testing Instructions

- Test runner: **Jest** with `ts-jest` preset.
- Configuration: `jest.config.js`.
- **Tests run sequentially** (`maxWorkers: 1`) to avoid database contention.
- Timeout: 15 seconds per test.
- Tests are located in `src/test/` and named `*.test.ts` or `*Tests.ts`.
- Router integration tests under `src/test/routerTests/` are **ignored** by Jest.

### Mocking pattern

Most service tests mock `Unit.prepare()` manually rather than using the `__mocks__` folder:

```typescript
function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}
```

Game engine tests (`poker-engine.test.ts`, `blackjack-engine.test.ts`) test pure logic without database dependencies.

---

## Security Considerations

This project has an extensive security stack. When modifying auth, registration, login, or admin routes, you **must** preserve these protections:

1. **Rate limiting** — In-memory token-bucket limiters for registration (3/15min), login (10/min), auth (20/min), 2FA (3/15min), OAuth callbacks (5/min), and proof-of-work challenges (30/min). Defined in `middleware/rate-limiter.ts`.
2. **Cloudflare Turnstile** — Bot challenge on registration and login. Bypassed automatically on localhost. Fail-closed in production. `middleware/turnstile.ts`.
3. **Behavior guard** — Client-generated interaction token validated server-side (mouse movement, keystrokes, focus/blur counts). `middleware/behavior-guard.ts`.
4. **Honeypots** — Invisible form fields and decoy endpoints (`/admin-panel-old`, `/phpmyadmin`) that trigger IP bans when touched. `middleware/header-guard.ts`, `routers/honeypot-router.ts`.
5. **IP banning** — `BannedIP` table + `middleware/ip-ban-check.ts` reject requests from banned IPs before they hit route handlers.
6. **Prototype pollution protection** — Express middleware strips `__proto__`, `constructor`, and `prototype` keys from `req.body`. `app.ts`.
7. **CORS** — Whitelist-only; credentials enabled. Blocks unknown origins.
8. **Helmet** — Security headers enabled, but **CSP is disabled** because external resources (Google Fonts, Font Awesome, Turnstile) make a strict CSP too fragile.
9. **Request logging** — All API requests (except health/docs) are logged to `RequestLog` with 24-hour retention for forensics.
10. **Security events** — Anomaly scoring, rate-limit hits, Turnstile failures, and honeypot triggers are logged to `SecurityEvent` with 90-day retention.
11. **Admin gating** — Swagger docs and `/api/db-test` require admin authentication in production. `middleware/admin.ts`.
12. **WebSocket hardening** — Max 10 connections per IP; max payload 64KB; auth via `sec-websocket-protocol` header (not query params); pre-auth message queue capped at 10 messages.

### Important: never commit secrets

- `.env` and `.envRender` are gitignored.
- The `.envRender` file in the repo contains **production values** for documentation/reference but must **not** be treated as a template — it contains real credentials.
- If you rotate anti-bot config or OAuth secrets, update the Render dashboard environment variables and redeploy.

---

## WebSocket Protocol

The WebSocket server mounts at `/ws` on the same HTTP server.

- **Authentication:** Session ID is passed via the `sec-websocket-protocol` header (first subprotocol). Never put it in the URL.
- **Message format:** JSON with `{ type: string, payload?: unknown }`.
- **Game rooms:** Players join a room, the engine produces per-player views of the game state, and the server broadcasts `state_update` messages.
- **Optimistic locking:** Game state updates include a `version` field; concurrent updates are rejected and the client must retry.
- **Turn timer:** Active games have a server-side turn timer. If a player disconnects, an auto-fold/auto-stand timer fires after a grace period.
- **Disconnect handling:** On disconnect, the player is marked `disconnected` in the DB. After 5 minutes of disconnection, they are removed from the room.

---

## Deployment

- **Platform:** Render (Web Service)
- **Branch:** `main` auto-deploys to production.
- **Build command:** `npm install && npm run build && cd src/frontend && npm install && npx ng build`
- **Start command:** `node dist/backend/app.js`
- **Health check:** `GET /api/health` returns `{ status: "ok" }`.

### Cron jobs (initialized in `app.ts`)

- **Daily at 00:00 UTC:** Shop rotation (`ShopRotationService`).
- **Daily at 03:00 UTC:** Purge security events older than 90 days.
- **Hourly:** Purge request logs older than 24 hours.

---

## CI / Automation

- `.github/workflows/discord-notify.yml` sends PR open/update/comment notifications to a Discord webhook.
- User mapping for Discord mentions is read from `github/discord_ids/githubToDiscord.csv`.
- There is no automated test runner in CI; tests are run manually before merging.

---

## Common Pitfalls

1. **Forgetting `unit.complete()`** — Always pair `Unit.create()` with `complete()` in a `try/finally` block. Unreleased pool clients will exhaust the connection pool and crash the server.
2. **Mounting admin router too early** — `adminRouter` is mounted **after** all public routes because its `requireAdmin` middleware would block everything that follows it.
3. **CSP conflicts** — Do not enable Helmet's `contentSecurityPolicy` without testing all external fonts, scripts, and the Turnstile widget.
4. **Frontend build path** — The backend serves the Angular build from `src/frontend/dist/ember-frontend/browser`. If the build output path changes in `angular.json`, update `app.ts` accordingly.
5. **Test isolation** — Jest runs with `maxWorkers: 1`. Do not increase this unless you implement per-worker database isolation.
6. **TypeScript rootDir / outDir** — `tsconfig.json` compiles `src/**/*` into `dist/`. `src/frontend` and `src/test` are excluded from the backend compilation.
