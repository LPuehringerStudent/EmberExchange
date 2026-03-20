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

### v0.2.0 Release - Authentication & Statistics

### Authentication & User Management
- **OAuth Integration**: Google and GitHub login support with Passport.js
- **Session-Based Auth**: Secure session management with automatic expiration
- **Login/Register UI**: Modern, animated authentication pages
- **Protected Routes**: Auth guards for secure page access

### Statistics System
- **Player Statistics**: Track individual player metrics (lootboxes opened, coins spent, trades)
- **Daily Statistics**: Aggregate daily platform activity
- **Stove Type Statistics**: Track rarity distribution and collection progress
- **Real-time Charts**: Interactive statistics dashboard with visualizations

### Social Features
- **Chat System**: Real-time messaging between players
- **Social Connections**: Friend system and player interactions
- **Mini-Games**: Play games to earn coins

### UI/UX Improvements
- **Component Refactoring**: Reorganized into modular component structure
- **Theme System**: Dynamic appearance settings with dark/light modes
- **Settings Pages**: Account, Security, Appearance, Language, and Social settings
- **Animated Lootbox**: Chest opening animations with transparency

### Backend Enhancements
- **Expanded API**: New routers for auth, chat, statistics, and mini-games
- **Database**: Additional tables for sessions, chat, and comprehensive statistics
- **Swagger Docs**: Updated API documentation with all new endpoints

## Release Schedule

| Version | Status | Release Date |
|:-------:|:------:|:------------:|
| `0.1.0` | ✅ Released | — |
| `0.2.0` | ✅ Current | **20.03.2026** |
| `0.3.0` | 🚧 Planning | TBD |

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
| `POST /api/auth/login` | Authenticate user |
| `POST /api/auth/register` | Register new user |
| `GET /api/auth/oauth/google` | Google OAuth login |
| `GET /api/auth/oauth/github` | GitHub OAuth login |
| `GET /api/statistics/player` | Get player statistics |
| `GET /api/statistics/daily` | Get daily platform stats |
| `GET /api/chat/messages` | Get chat messages |

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

*Last updated: March 2026*  
*Note: This project is under active development. Some features may be marked as WIP.*
