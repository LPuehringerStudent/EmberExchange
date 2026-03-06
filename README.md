# EmberExchange 🔥

A virtual marketplace and collection game for trading unique stoves. Built as an SYP (School Year Project) 2026.

**Quick Links:** [`/info`](./info) — Project documentation & resources

---

## Overview

EmberExchange is a full-stack web application where players can:
- **Collect** unique stoves with varying rarities (Common, Rare, Epic, Legendary, Limited)
- **Open lootboxes** to discover new stoves
- **Trade** stoves on the marketplace
- **Track** price history and ownership
- **Play mini-games** to earn coins

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Express.js (TypeScript) |
| **Frontend** | Angular 21 |
| **Database** | SQLite (better-sqlite3) |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **Testing** | Jest |

## Latest Sprint Updates 🚀

### UI/UX Overhaul - Warm Stove Aesthetic
- **Cohesive Design System**: Dark charcoal topbar with orange accents matching the stove theme
- **Main Menu**: Complete redesign with welcome section, player stats, game carousel, and live feed
- **Inventory**: Styled action buttons with gradient backgrounds, hover effects, and improved layout
- **Settings**: Connected navigation with WIP indicators for unfinished features

### Backend Improvements
- **API Test Page**: Modern UI with collapsible categories, search functionality, and response time tracking
- **Discord Notifications**: Automated PR event notifications with user mentions
- **Database**: Auto-reset on startup with fresh sample data for development

### Features Delivered
- ✅ Player management system
- ✅ Lootbox opening with rarity-based drops
- ✅ Inventory management
- ✅ Marketplace listings and trades
- ✅ Price history tracking
- ✅ Responsive UI with warm stove theme

## Release Schedule

| Version | Status | Expected Date |
|:-------:|:------:|:-------------:|
| `0.1.0` | ✅ Current | — |
| `0.2.0` | 🚧 In Progress | **20.03.2026** |

## Project Structure

```
EmberExchange/
├── src/
│   ├── backend/           # Express.js API
│   │   ├── routers/       # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database connection
│   │   └── swagger.ts     # API documentation
│   ├── frontend/          # Angular application
│   │   └── src/app/       # Components, CSS, HTML templates
│   ├── middleground/      # Shared utilities
│   └── shared/            # Shared TypeScript models
├── dist/                  # Compiled output
└── info/                  # Project documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run dev
```

The server will start on `http://localhost:3000`

### Frontend Development

```bash
# Serve Angular frontend
npm run frontend:serve

# Build for production
npm run frontend:build
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## API Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/player/:id` | Get player by ID |
| `POST /api/player` | Create new player |
| `GET /api/stove` | List all stoves |
| `POST /api/lootbox/open` | Open a lootbox |
| `GET /api/listing` | View marketplace listings |
| `POST /api/listing` | Create a listing |
| `POST /api/trade` | Execute a trade |

## Rarity System

Stoves come in 5 rarity tiers with different drop rates:

| Rarity | Color | Description |
|--------|-------|-------------|
| Common | Gray | Basic stoves, most frequent drops |
| Rare | Blue | Better stats, uncommon finds |
| Epic | Purple | High quality, rare drops |
| Legendary | Gold | Exceptional stoves, very rare |
| Limited | Red | Special event stoves, extremely rare |

## Branch Strategy

> **Active Development:** `develop` branch  
> **Current Release:** `main` branch

## Team

SYP Project 2026 - HTL Leonding

---

*Last updated: February 2026*  
*Note: This project is under active development. Some features may be marked as WIP.*
