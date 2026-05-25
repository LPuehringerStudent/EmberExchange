# EmberExchange

A virtual marketplace and collection game for trading unique stoves, with real-time multiplayer card games. Built in SYP (System Planning) 2026.

## What is this?

EmberExchange is a full-stack web app where players can:

- **Collect** unique stoves with different rarities (Common, Rare, Epic, Legendary, Limited)
- **Open lootboxes** to discover new items with weighted drop rates
- **Trade** stoves on a marketplace with a real coin economy
- **Track** price history, ownership chains, and personal statistics
- **Play multiplayer Poker** (Texas Hold'em) and **Blackjack** in real-time game rooms

## Tech Stack

- **Backend:** Express.js 5.2 + TypeScript 5.7
- **Frontend:** Angular 21 (standalone components, signals-based)
- **Database:** PostgreSQL (via `pg` connection pooling)
- **Real-time:** WebSocket API with session authentication
- **API Docs:** Swagger / OpenAPI 3.0
- **Testing:** Jest
- **Deployment:** Render (auto-deploy from `main`)

## Quick Start

```bash
npm install

# Create a .env file (see .env.example)
cp .env.example .env

# Development mode (backend + frontend watch)
npm run dev:full
```

The server starts at `http://localhost:3000`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session cookie signing |
| `GOOGLE_CLIENT_ID` | OAuth Google client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | OAuth Google client secret (optional) |
| `GITHUB_CLIENT_ID` | OAuth GitHub client ID (optional) |
| `GITHUB_CLIENT_SECRET` | OAuth GitHub client secret (optional) |

## Tests

```bash
npm test
```

All tests run sequentially to avoid database contention.

## API Documentation

Interactive docs are available at:

```
http://localhost:3000/api-docs
```

## Project Structure

```
src/
├── backend/
│   ├── game-engines/      # Poker & Blackjack game logic
│   ├── game-logic/        # Card utils, hand evaluation
│   ├── routers/           # Express REST API routers
│   ├── services/          # Database service layer
│   ├── websocket/         # WS connection manager, handlers, timers
│   └── utils/             # Unit (transactions), auth, password hashing
├── frontend/
│   └── src/app/
│       ├── core/          # Auth, API, WebSocket services
│       ├── features/      # Pages: marketplace, inventory, poker, blackjack, lobby
│       └── shared/        # Reusable UI components
├── middleground/          # Shared utilities
└── shared/                # TypeScript models (backend + frontend)
dist/                      # Compiled output
```

## Multiplayer Games

### Poker (Texas Hold'em)
- Real-time betting rounds: pre-flop → flop → turn → river → showdown
- Blinds, call/raise/fold/check/all-in actions
- Side pot logic for all-in situations
- Hand evaluation with tie-breaking

### Blackjack
- Bet, hit, stand, double down, split
- Dealer AI (hits on soft 17)
- 3:2 blackjack payout, push logic
- Single-player support (1 player minimum)

### WebSocket Protocol
- Authenticated via `sessionId` query parameter
- Game state updates broadcast to all room players
- Optimistic locking on game state (`version` field)
- Turn timer with auto-fold/stand on timeout

## Branches

- `main` — production release (auto-deploys to Render)
- `develop` — active development

## Team

SYP 2026 — HTL Leonding
