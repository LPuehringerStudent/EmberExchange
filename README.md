# EmberExchange

A virtual marketplace and collection game for trading unique stoves. Built in SYP (System Planning) 2026.

## What is this?

EmberExchange is a full-stack web app where players can:

- **Collect** unique stoves with different rarities
- **Open lootboxes** to discover new items
- **Trade** stoves on a marketplace with a real coin economy
- **Track** price history, ownership, and personal statistics
- **Play mini-games** to earn coins

## Tech Stack

- **Backend:** Express.js + TypeScript
- **Frontend:** Angular 21
- **Database:** SQLite (better-sqlite3)
- **API Docs:** Swagger / OpenAPI 3.0
- **Testing:** Jest

## Quick Start

```bash
npm install
npm run dev:full
```

The server starts at `http://localhost:3000`.

## Tests

```bash
npm test
```

All 510 tests run sequentially to avoid SQLite locking.

## API Documentation

Interactive docs are available at:

```
http://localhost:3000/api-docs
```

## Project Structure

```
src/
├── backend/      # Express API (routers, services, db)
├── frontend/     # Angular app
├── middleground/ # Shared utilities
└── shared/       # TypeScript models
dist/             # Compiled output
```

## Branches

- `main` — current release
- `develop` — active development

## Team

SYP 2026 — HTL Leonding
