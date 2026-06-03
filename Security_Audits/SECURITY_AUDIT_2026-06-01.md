# EmberExchange Security Audit Report
**Date:** 2026-06-01  
**Scope:** Full-stack Node.js/Angular application (public repo, active threat model: classmates hunting exploits)  
**Focus:** Bot-creation bypasses, authentication flaws, injection, IDOR, information disclosure

---

## 🔴 Executive Summary: How Your Classmates Are Creating Bot Armies

Your bot protections are **effectively optional**. An attacker has **at least 8 distinct ways** to bypass every anti-bot control and create unlimited accounts. The easiest path is **OAuth registration**, which skips Turnstile, honeypots, proof-of-work, strict rate limits, and disposable-email checks entirely.

**Top 3 bot-creation bypasses (easiest → hardest):**

| Rank | Bypass | Effort | Details |
|------|--------|--------|---------|
| 1 | **OAuth (Google/GitHub)** | Trivial | No CAPTCHA, no honeypot, no PoW, no strict rate limit. Only 20/min generic auth limit. |
| 2 | **Login brute-force (no Turnstile block)** | Trivial | `/auth/login` **does not block** if Turnstile fails. It only logs. Register with any garbage token. |
| 3 | **Fail-open Turnstile + missing env** | Trivial | If `TURNSTILE_SECRET_KEY` is unset or Cloudflare is unreachable, Turnstile returns `true`. |

---

## 1. Bot Protection Bypasses (Detailed)

### 1.1 OAuth — Complete Bypass of ALL Anti-Bot Controls 🔴 CRITICAL
**Files:** `src/backend/routers/oauth-router.ts`, `src/backend/utils/passport.ts`

- `/oauth/google` and `/oauth/github` only use `authRateLimiter` (20 requests/min).
- **No Turnstile, no honeypot, no timing guard, no header guard, no proof-of-work, no disposable-email block.**
- After OAuth callback, `handleOAuthLogin` auto-creates a verified player account.
- **Impact:** A script that can complete Google/GitHub OAuth (e.g., using puppeteer + real accounts, or rotating through free Gmail/GitHub accounts) can mass-register bots.

**Fix:** Add Turnstile verification to the OAuth callback flow or require it before initiating OAuth.

---

### 1.2 Login Endpoint Fails Open on Turnstile 🔴 CRITICAL
**Files:** `src/backend/routers/auth-router.ts:201`, `src/backend/utils/bot-trap.ts:261`

```typescript
// bot-trap.ts:261-265
if (turnstileFailed) {
    logBot(req, "turnstile-failed");
    return false;  // ← LOGIN PROCEEDS NORMALLY
}
```

On `/auth/login`, `handleBotDetection` only blocks if:
- `turnstileFailed && honeypotTriggered`, OR
- `honeypotTriggered` alone.

A request with a **missing, empty, or invalid Turnstile token** and **no honeypot fields** is logged but **allowed to attempt password verification**.

**Impact:** Brute-force and credential-stuffing attacks bypass Turnstile entirely.

**Fix:** Hard-block on `turnstileFailed` for login, same as registration.

---

### 1.3 Turnstile Fail-Open Design 🔴 CRITICAL
**File:** `src/backend/middleware/turnstile.ts:24-26, 47-49`

```typescript
if (!TURNSTILE_SECRET_KEY) return true;        // No secret = no check
if (networkError) return true;                  // Cloudflare down = pass
```

If the server is misconfigured or Cloudflare times out, Turnstile is silently disabled.

**Fix:** Fail closed in production. `return false` by default.

---

### 1.4 Localhost IP Bypass 🟠 HIGH
**File:** `src/backend/middleware/turnstile.ts:74-76`

```typescript
return ip === "127.0.0.1"
    || ip === "::1"
    || ip === "::ffff:127.0.0.1";
```

If an attacker can make requests appear to come from localhost (SSRF, internal proxy misconfiguration), Turnstile is skipped entirely.

**Fix:** Remove localhost bypass in production. Use a dedicated `NODE_ENV` check only for explicit test modes.

---

### 1.5 Rate Limiting Bypasses 🟠 HIGH
**File:** `src/backend/middleware/rate-limiter.ts`

1. **In-memory only:** Limits stored in a JS `Map`. Reset on server restart. No shared state across instances.
2. **X-Forwarded-For spoofing:** Uses the *first* entry of `X-Forwarded-For` as the client IP. An attacker can send `X-Forwarded-For: <random-ip>` on every request and rotate apparent IPs.
3. **OAuth callbacks unlimited:** `/oauth/google/callback` and `/oauth/github/callback` have **zero** rate limiting.
4. **PoW challenge unlimited:** `/auth/challenge` has no rate limit.

**Fix:** Use Redis-backed rate limiting. Trust only `CF-Connecting-IP` or the last `X-Forwarded-For` hop from a known proxy.

---

### 1.6 Timing Guard Bypass 🟠 HIGH
**File:** `src/backend/middleware/timing-guard.ts:23`

```typescript
const elapsed = Date.now() - formStartTime;
if (elapsed < antiBotConfig.minFormTimeMs) { ... }
```

`formStartTime` is not validated to be recent. A bot can send `formStartTime: 0` (Unix epoch) and pass instantly.

**Fix:** Reject `formStartTime` older than e.g. 5 minutes or in the future.

---

### 1.7 Header Guard Trivially Bypassed 🟠 HIGH
**File:** `src/backend/middleware/header-guard.ts`, `src/backend/app.ts:152-156`

The required header name and value are injected into every `index.html` response:
```html
<script>window.__EMBER_CFG={clientHeader:"X-Ember-Client",clientHeaderValue:"forge-v1"};</script>
```

One `curl` to `/` reveals the secret header.

**Fix:** Do not leak anti-bot configuration to the client. Hardcode the header in the frontend build instead, or use a rotating challenge.

---

### 1.8 Honeypot Bypass 🟠 HIGH
**File:** `src/backend/utils/bot-trap.ts:77-89`, `src/backend/app.ts:152-156`

The real honeypot field name is leaked in `__EMBER_CFG`. An attacker simply leaves that field empty.

Additionally, on login the honeypot only blocks if **both** Turnstile fails **and** the honeypot is filled. A request with an empty honeypot and bad Turnstile token proceeds.

---

### 1.9 Proof-of-Work Weaknesses 🟡 MEDIUM
**File:** `src/backend/routers/auth-router.ts:29, 814-825`

- Difficulty defaults to **4** (easily thousands/second on a laptop).
- No binding to IP or session.
- No rate limit on challenge issuance.
- In-memory store (`Map`) — resets on restart.

**Fix:** Increase difficulty to 6+, bind challenges to IP/session, rate-limit issuance.

---

## 2. Authentication & Authorization Catastrophes

### 2.1 No Centralized Auth Middleware — Most Routes Are Public 🔴 CRITICAL
**Impact:** There is **no `isAuthenticated` middleware** in the entire codebase. Dozens of sensitive routes are completely unauthenticated.

**Routes with NO auth that allow arbitrary player manipulation:**

| Route | What an attacker can do |
|-------|------------------------|
| `GET /api/players` | List **all players** including `password` bcrypt hashes, emails, `isAdmin` flag |
| `GET /api/players/:id` | Get any player's full profile **with password hash** |
| `PATCH /api/players/:id/coins` | **Set any player's coin balance to any value** |
| `PATCH /api/players/:id/lootboxes` | **Set any player's lootbox count** |
| `DELETE /api/players/:id` | **Delete any player account** |
| `POST /api/listings` | Create a listing **as any seller** |
| `PATCH /api/listings/:id/price` | Change any listing's price |
| `DELETE /api/listings/:id` | Delete any listing |
| `POST /api/trades` | Execute a trade with **arbitrary buyerId** |
| `POST /api/stoves` | Mint a stove for **any owner** |
| `PATCH /api/stoves/:id/owner` | Transfer any stove to anyone |
| `POST /api/ownerships` | Create ownership records for anyone |
| `POST /api/chat-messages` | Send messages **as any senderId** |
| `GET /api/chat-messages/conversation/:p1/:p2` | **Read any private conversation** |
| `POST /api/coin-transactions` | Create coin transactions for any player |
| `POST /api/mini-game-sessions` | Record game sessions for any player |
| `POST /api/glory/showcase` | Modify any player's glory showcase |
| `POST /api/players/:playerId/prestige` | Prestige any player |

**Fix:** Create a `requireAuth` middleware that validates `session-id`, looks up the session, and attaches `req.playerId`. Apply it to every non-public route. Reject any body parameter that claims to act on a different player.

---

### 2.2 Password Hash Leakage 🔴 CRITICAL
**Files:** `src/backend/routers/player-router.ts:48-60`, `src/backend/services/player-service.ts:14-18`

`GET /api/players` returns `SELECT * FROM Player`, including the `password` column. Attackers can offline-crack bcrypt hashes.

**Fix:** Never return `password` in any API response. Explicitly exclude it in every SELECT.

---

### 2.3 Plaintext Password Fallback 🔴 CRITICAL
**File:** `src/backend/routers/auth-router.ts:250-251`

```typescript
if (!isHashed(player.password) && player.password === password) {
    // migrate to hash
}
```

If any account still has a plaintext password, it is compared directly. The seed data in `unit.ts:1364` inserts plaintext passwords.

**Fix:** Remove the plaintext fallback immediately. Force-reset any plaintext passwords.

---

### 2.4 OAuth Session ID in URL Query String 🟠 HIGH
**File:** `src/backend/routers/oauth-router.ts:61, 119`

OAuth callbacks redirect with:
```
/oauth/callback?sessionId=<uuid>&playerId=<id>
```

Session IDs in URLs leak to browser history, server logs, and referrer headers.

**Fix:** Set a short-lived `Set-Cookie` header or use a redirect token exchange instead.

---

### 2.5 OAuth Missing `state` Parameter — CSRF Login 🟠 HIGH
**File:** `src/backend/routers/oauth-router.ts:26-28, 84-86`

`passport.authenticate` is called without `state`. Attackers can force victims to log in as an attacker-controlled account.

**Fix:** Generate and validate a `state` nonce for every OAuth initiation.

---

### 2.6 2FA Brute-Force — No Rate Limiting 🔴 CRITICAL
**File:** `src/backend/routers/auth-router.ts:1533`, `src/backend/services/two-factor-service.ts:58`

`POST /auth/2fa/verify` has **no rate limiting**. An attacker with a challenge can brute-force the 6-digit TOTP (1,000,000 combos). Speakeasy `window: 2` widens the valid window.

**Fix:** Add strict rate limiting (3 attempts max) and max-attempts per challenge.

---

### 2.7 Session Not Bound to IP/UA; Expired Sessions Valid 🟠 HIGH
**File:** `src/backend/services/session-service.ts:19-24`

- `getSession()` checks `isActive = 1` but does **not** verify `expiresAt` in the SQL query.
- Sessions are not bound to IP or User-Agent.
- No session rotation.

**Fix:** Add `expiresAt > NOW()` to the session query. Bind sessions to IP/UA fingerprints.

---

## 3. Injection & Input Validation

### 3.1 Dynamic ORDER BY Injection 🟠 HIGH
**Files:** `src/backend/services/admin-service.ts`, `src/backend/services/listing-service.ts`

`ORDER BY ${orderBy}` is interpolated into SQL. An allow-list exists but is still dynamic SQL.

**Fix:** Use a strict hardcoded mapping object. Reject any `sortBy` not in the allow-list before interpolation.

### 3.2 Stored XSS 🟠 HIGH
User input is stored and returned without server-side sanitization:
- `POST /api/chat-messages` — `content`
- `POST /api/glory/guestbook` — `message`
- `POST /api/support` — `title`, `description`

Angular auto-escapes, but API consumers (mobile, third-party) are vulnerable.

**Fix:** Sanitize HTML or escape entities server-side before storage/response.

### 3.3 Mass Assignment 🟠 HIGH
**Files:** `src/backend/routers/admin-router.ts`, `src/backend/routers/player-router.ts`

`req.body` is passed directly to update methods without field whitelisting (e.g., `updateStoveType`, `updateSettings`).

**Fix:** Whitelist allowed fields in every router before passing to services.

---

## 4. WebSocket Security

### 4.1 `leave_room` Broadcasts to Any Room 🔴 CRITICAL
**File:** `src/backend/websocket/handlers/leave-room.ts:36-101`

If a user sends `leave_room` for a room they were never in, the handler still broadcasts `player_left` and `state_update` to that room.

**Fix:** Return early if `existingPlayer` is null.

### 4.2 No `maxPayload` Limit / Unbounded Pre-Auth Queue 🟠 HIGH
**File:** `src/backend/websocket/index.ts:18, 27-57`

- `WebSocketServer` has no `maxPayload` limit.
- Pre-auth messages are buffered in an unbounded `messageQueue`.

**Fix:** Add `maxPayload: 65536` and cap the pre-auth queue at ~10 messages.

### 4.3 Session ID in WebSocket URL 🟠 HIGH
**File:** `src/frontend/src/app/core/services/websocket.service.ts:54`

```typescript
const url = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;
```

Session ID appears in WebSocket URL (proxy logs, browser history).

**Fix:** Send session ID in the first WebSocket message or use a subprotocol header.

### 4.4 Chat Content No Max Length 🟡 MEDIUM
**File:** `src/backend/websocket/handlers/chat-message.ts:29`

Only checks non-empty. Multi-megabyte messages are stored and broadcast.

**Fix:** Enforce max length (e.g., 2000 chars).

---

## 5. Secrets, Information Leakage, & Configuration

### 5.1 `.envRender` Contains Active Production Secrets 🔴 CRITICAL
**File:** `.envRender`

Exposed secrets:
- Full PostgreSQL connection string (Neon DB)
- Google OAuth Client ID + Secret
- GitHub OAuth Client ID + Secret + API token
- Cloudflare Turnstile Secret + Site key
- Resend API key
- Honeypot fields and required header values

**Fix:** Rotate ALL secrets immediately. Ensure `.env*` files are never committed or deployed. Add them to `.gitignore` (already done) but also check Render/Neon dashboard for leaked credentials.

### 5.2 Anti-Bot Config Leaked in HTML 🔴 CRITICAL
**File:** `src/backend/app.ts:152-156`

Every `index.html` response contains the real honeypot field, timing requirement, and secret header.

**Fix:** Stop injecting anti-bot config into HTML.

### 5.3 Public Endpoints Leak Internal State 🟠 HIGH
- `GET /api/db-test` — DB connectivity + table count
- `GET /api/health` — uptime
- `GET /api-docs` — full Swagger schema including password fields
- `GET /api/turnstile/sitekey` — Turnstile public key (expected, but still info)

### 5.4 Hardcoded Admin Credentials in Seed Data 🔴 CRITICAL
**File:** `src/backend/utils/unit.ts:1364-1368`

```typescript
{ username: "admin", password: "321admin", ... isAdmin: 1 }
```

This account is inserted on every DB init with a weak password and 999,999 coins.

**Fix:** Remove weak default credentials. Force password change on first admin login.

---

## 6. Recommended Fix Priority

### P0 — Do This Today (Stop the Bot Army)
1. **Add Turnstile + strict rate limiting to OAuth callbacks.**
2. **Make Turnstile fail-closed** (`return false` on missing secret / network error).
3. **Hard-block login on Turnstile failure** (do not just log).
4. **Remove anti-bot config injection** from `index.html`.
5. **Fix timing guard** — reject old/future `formStartTime`.
6. **Add `requireAuth` middleware** and apply to ALL state-mutating routes.
7. **Strip `password` field** from every player API response.
8. **Rotate all secrets** in `.envRender` (DB, OAuth, Turnstile, Resend, GitHub token).

### P1 — This Week
9. Fix OAuth `state` CSRF protection and stop putting `sessionId` in URLs.
10. Add rate limiting to `/auth/2fa/verify` (max 3 attempts).
11. Fix `GET /api/players` and `GET /api/players/:id` auth + field filtering.
12. Add ownership checks to `PATCH /players/:id/coins`, `PATCH /players/:id/lootboxes`, `DELETE /players/:id`.
13. Fix `leave_room` WebSocket handler (verify membership).
14. Add `maxPayload` and queue limits to WebSocket server.
15. Remove plaintext password fallback in login.
16. Fix CORS to allow only your frontend origin in production.

### P2 — Hardening
17. Move rate limiting to Redis (shared state).
18. Validate `X-Forwarded-For` against trusted proxy hops.
19. Add server-side XSS sanitization for chat/guestbook/support.
20. Add field whitelisting to all PATCH/POST update endpoints.
21. Fix dynamic `ORDER BY` with strict allow-list mapping.
22. Add `helmet()` middleware for security headers.
23. Increase PoW difficulty and bind challenges to sessions.
24. Add session expiration enforcement and IP/UA binding.

---

## Appendix: Quick Exploit PoCs

### PoC 1: Create a listing as any player (no auth)
```bash
curl -X POST https://your-app.com/api/listings \
  -H "Content-Type: application/json" \
  -d '{"sellerId": 1, "stoveId": 5, "price": 1}'
```

### PoC 2: Set anyone's coins to 999999 (no auth)
```bash
curl -X PATCH https://your-app.com/api/players/42/coins \
  -H "Content-Type: application/json" \
  -d '{"coins": 999999}'
```

### PoC 3: Read any private chat (no auth)
```bash
curl https://your-app.com/api/chat-messages/conversation/1/2
```

### PoC 4: Bypass Turnstile on login
```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"321admin","turnstileToken":""}'
```

### PoC 5: Get all password hashes (no auth)
```bash
curl https://your-app.com/api/players | jq '.[].password'
```

---
*Report generated by automated static analysis of the EmberExchange codebase.*
