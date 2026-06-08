# EmberExchange Security Re-Audit Report
**Date:** 2026-06-01  
**Scope:** Full-stack Node.js/Angular application  
**Focus:** Verify all fixes from 2026-06-01 audit, hunt for missed vulnerabilities

---

## 🔴 Executive Summary

Most **P0-critical** issues from the previous audit have been **fixed**. The bot army can no longer be created trivially, password hashes are stripped from public APIs, and a centralized `requireAuth` middleware now protects state-mutating routes.

**However, 3 new CRITICAL vulnerabilities were missed by the original audit**, plus several HIGH and MEDIUM issues remain open. The most dangerous new finding is the **leakage of TOTP secrets to every authenticated user**.

| Category | Fixed | Partially Fixed | Not Fixed | New |
|----------|-------|-----------------|-----------|-----|
| Bot Protections | 5 | 2 | 1 | 1 |
| Auth & Authorization | 6 | 1 | 2 | 2 |
| Injection / XSS / WS | 4 | 1 | 1 | 4 |
| Secrets / Config / InfoLeak | 3 | 2 | 2 | 5 |

---

## 1. Bot Protections — Fix Verification

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 1.1 | **OAuth Complete Bypass** | **PARTIALLY FIXED** | Initiation endpoints (`/oauth/google`, `/oauth/github`) now have `authRateLimiter` (20/min). **Callbacks have ZERO rate limit.** No Turnstile, honeypot, PoW, or timing guard on OAuth flow. |
| 1.2 | **Login Fails Open on Turnstile** | **FIXED** | `auth-router.ts:210` stacks `loginRateLimiter`, `timingGuard`, `headerGuard`, `turnstileMiddleware`. `bot-trap.ts:261-266` now hard-blocks on `turnstileFailed` alone. Login never reaches password verification if Turnstile fails. |
| 1.3 | **Turnstile Fail-Open Design** | **FIXED** | `turnstile.ts:26-29,50-54` returns `!IS_PROD` — fails closed in production, open only in dev. |
| 1.4 | **Localhost IP Bypass** | **PARTIALLY FIXED** | Host-header spoofing removed. Direct loopback (`127.0.0.1`, `::1`) still bypasses Turnstile if no `X-Forwarded-For` is present. Not gated by `NODE_ENV`. |
| 1.5 | **Rate Limiting Bypasses** | **PARTIALLY FIXED** | IP extraction now uses `CF-Connecting-IP` then **last** `X-Forwarded-For` hop (`rate-limiter.ts:68-85`). Still in-memory `Map` (no Redis). OAuth callbacks and `/auth/challenge` have **no rate limit**. |
| 1.6 | **Timing Guard Bypass** | **FIXED** | `timing-guard.ts:34-38` rejects timestamps > 5 min old or in the future. `formStartTime: 0` is blocked. |
| 1.7 | **Header Guard Leaked** | **FIXED** | `app.ts:143-161` serves raw `index.html` without `__EMBER_CFG` injection. |
| 1.8 | **Honeypot Bypass** | **FIXED** | `__EMBER_CFG` gone; honeypot fields driven by env var. Login blocks on honeypot alone (`bot-trap.ts:254-259`). |
| 1.9 | **Proof-of-Work Weaknesses** | **NOT FIXED** | Default difficulty still **4** (`auth-router.ts:30`). No IP/session binding. `/auth/challenge` has **no rate limit**. Still in-memory `Map`. |

### 🔴 NEW: Bot-Trap IP Spoofing Inconsistency
**File:** `src/backend/utils/bot-trap.ts:45-51`  
`getClientIp` in `bot-trap.ts` uses the **first** (spoofable) entry of `X-Forwarded-For`, while `rate-limiter.ts` uses the **last** hop. An attacker can send `X-Forwarded-For: <fake-ip>, <real-ip>` to evade bot-detection logging/tarpitting while still being rate-limited correctly.

---

## 2. Authentication & Authorization — Fix Verification

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 2.1 | **No Centralized Auth Middleware** | **PARTIALLY FIXED** | `requireAuth` exists and is applied to many routes (listings, trades, chat, glory, player coins/lootboxes/delete). **However**, dozens of routes still use manual session checks or skip auth entirely: `friend-router.ts`, `forgery-router.ts`, `notification-router.ts`, `quest-router.ts`, `shop-router.ts`, `sparks-router.ts`, `support-router.ts`, `trade-offer-router.ts`, `player-router.ts` (profile/settings), and `auth-router.ts` (manual checks). **Two routes are completely public:** `POST /lootboxes/:id/open` and `DELETE /lootboxes/:id`. |
| 2.2 | **Password Hash Leakage** | **FIXED** | `GET /players` uses `getAllPublicPlayers()` (excludes `password`, `totpSecret`, `email`). `GET /players/:id` uses `getPublicPlayerById()` (same exclusion). |
| 2.3 | **Plaintext Password Fallback** | **FIXED** | Removed from `auth-router.ts:265-272`. Plaintext passwords now force `passwordValid = false`. |
| 2.4 | **OAuth Session ID in URL** | **FIXED** | OAuth callbacks now set a short-lived `httpOnly` cookie (`oauth_session`) and redirect to `/oauth/callback` (`oauth-router.ts:102-107,176-181`). |
| 2.5 | **OAuth Missing `state` Parameter** | **FIXED** | `state` nonce generated, stored in `httpOnly` cookie `oauth_state`, validated in callback (`oauth-router.ts:56-61,83-89,130-135,157-163`). |
| 2.6 | **2FA Brute-Force** | **FIXED** | `POST /auth/2fa/verify` now uses `twoFactorRateLimiter.middleware()` (3 attempts / 15 min) (`auth-router.ts:1584`). |
| 2.7 | **Session Not Bound to IP/UA; Expired Sessions Valid** | **PARTIALLY FIXED** | `session-service.ts:19-28` now checks `expiresAt::timestamptz > NOW()`. **Still no IP or User-Agent binding. No session rotation.** |

### 🔴 NEW: Lootbox Open/Delete — Completely Unauthenticated
**Files:** `src/backend/routers/lootbox-router.ts:400-452` and `503-531`  
- `POST /lootboxes/:id/open` accepts `playerId` from the request body with **no `session-id` check**. Any unauthenticated caller can open any player’s lootbox.
- `DELETE /lootboxes/:id` has **no authentication or ownership check**. Any unauthenticated caller can delete any lootbox record.

### 🔴 NEW: Notification IDOR
**Files:** `src/backend/routers/notification-router.ts:134-172`, `253-291`  
Authenticated users can mark **any** notification as read or delete it, not just their own. The service methods do not filter by `playerId`:
```ts
// notification-service.ts:86-93
async markAsRead(notificationId: number): Promise<boolean> {
    const stmt = this.unit.prepare(
        `UPDATE Notification SET isRead = 1 WHERE notificationId = @notificationId`,
        { notificationId }
    );
    ...
}
```

### 🔴 NEW: `auth/me` Leaks TOTP Secret
**File:** `src/backend/routers/auth-router.ts:1240-1278`  
The `/auth/me` endpoint fetches the full `PlayerRow` via `getInfoByID` and strips only `password`:
```ts
const { password, ...playerWithoutPassword } = player;
res.status(StatusCodes.OK).json(playerWithoutPassword);
```
`playerWithoutPassword` still contains `totpSecret`. Every authenticated user can retrieve their own TOTP secret, enabling complete 2FA bypass if an attacker compromises a session.

### 🔴 NEW: Email Enumeration via Login
**File:** `src/backend/routers/auth-router.ts:304-312`  
When logging in with a valid username/email but **unverified** account, the endpoint returns:
```json
{ "error": "Please verify your email before logging in.", "requiresVerification": true, "email": "user@example.com" }
```
This differs from the generic "Invalid username/email or password" returned for wrong passwords or non-existent accounts, allowing attackers to enumerate registered emails and their verification status.

### 🟠 NEW: `isAdmin` Flag Exposed in Public Profiles
**Files:** `src/backend/services/player-service.ts:30`, `src/backend/routers/player-router.ts:635`  
Both `getAllPublicPlayers()` and the Hall of Glory profile (`buildGloryProfile`) include `isAdmin` in the JSON response. Any user can identify admin accounts from public APIs.

---

## 3. Injection, XSS & WebSocket — Fix Verification

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 3.1 | **Dynamic ORDER BY Injection** | **FIXED** | `admin-service.ts:101-109` uses strict `orderMap` with fallback. `listing-service.ts:111-114` uses hardcoded `if` branches. Router also validates allow-lists before passing to services. |
| 3.2 | **Stored XSS** | **NOT FIXED** | No server-side sanitization for chat, guestbook, support, or motto. A `sanitize.ts` utility exists but is **imported by zero files**. Angular auto-escapes, but API consumers (mobile, third-party) are vulnerable. |
| 3.3 | **Mass Assignment** | **FIXED** | `admin-service.ts:225-245` whitelists fields for `updateStoveType`. `player-settings-service.ts:53-70` whitelists settings fields. Other routes destructure specific body fields. |
| 4.1 | **WebSocket `leave_room` Broadcasts to Any Room** | **FIXED** | `leave-room.ts:36-47` returns early if `existingPlayer` is null. No broadcast occurs. |
| 4.2 | **No `maxPayload` / Unbounded Pre-Auth Queue** | **FIXED** | `websocket/index.ts:18` sets `maxPayload: 65536`. `websocket/index.ts:53-56` caps pre-auth queue at 10 messages. |
| 4.3 | **Session ID in WebSocket URL** | **NOT FIXED** | `websocket.service.ts:54` still builds `ws?sessionId=${sessionId}`. `websocket/index.ts:23` still reads it from URL query params. |
| 4.4 | **Chat Content No Max Length** | **PARTIALLY FIXED** | WebSocket handler enforces 2000 chars (`chat-message.ts:37-44`). **HTTP endpoint** (`chat-message-router.ts:479-482) has **no max-length check**. |

### 🟠 NEW: HTTP Chat Lacks Length Cap
**File:** `src/backend/routers/chat-message-router.ts:479-482`  
`POST /api/chat-messages` only checks `isNullOrWhiteSpace(content)`. Multi-megabyte messages can be stored and broadcast.

### 🟠 NEW: Profile Motto XSS Vector
**File:** `src/backend/routers/player-router.ts:250-251`  
`motto` is passed raw to `updatePlayerMotto`, which truncates to 100 chars but does **not** escape HTML.

### 🟡 NEW: Support Ticket Lacks Length Cap
**File:** `src/backend/routers/support-router.ts:111-126`  
`title` and `description` have no maximum length checks.

---

## 4. Secrets, Configuration & Information Leakage — Fix Verification

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| 5.1 | `.envRender` Contains Secrets | **PARTIALLY FIXED** | `.envRender` is **not tracked by git** (good), but still exists locally with real-looking secrets. `.gitignore` correctly excludes it. User claims rotation but local file remains a risk. |
| 5.2 | **Anti-Bot Config Leaked in HTML** | **FIXED** | Injection removed entirely (`app.ts:143-161`). |
| 5.3 | **Public Endpoints Leak Internal State** | **PARTIALLY FIXED** | `/api/health` is minimal. `/api/db-test` now requires admin auth in production, but catch block leaks `String(error)`. `/api-docs` still exposed and documents `password`/`isAdmin` fields. `/api/turnstile/sitekey` intentional. |
| 5.4 | **Hardcoded Admin Credentials in Seed Data** | **FIXED** | Seed data removed. Comment explicitly states: *"SECURITY: No admin account in seed data."* (`unit.ts:~1391`). |

### 🔴 NEW: `getPlayerByUsername` / `getPlayerByEmail` Return Password Hashes Internally
**File:** `src/backend/services/player-service.ts:322-341`  
Both use `SELECT * FROM Player` and return `PlayerRow` (includes `password` and `totpSecret`). While current callers do not serialize the whole object to clients, this is a **latent leak risk**.

### 🔴 NEW: Admin `getPlayerDetail` Returns Full PlayerRow Including Password Hash
**File:** `src/backend/services/admin-service.ts:130-152`  
`getPlayerDetail()` returns the full `PlayerRow` object inside `AdminPlayerDetail.player`, including the `password` bcrypt hash. Even though this is behind `requireAdmin`, returning password hashes to the admin frontend is unnecessary and risky.

### 🟠 NEW: CORS Allows All Origins Without Restriction
**File:** `src/backend/app.ts:64`  
```ts
app.use(cors());
```
No `origin` whitelist, no `credentials` restriction. If cookies/session headers are ever used cross-origin, this is a vulnerability.

### 🟠 NEW: Missing Helmet Security Headers
**Status:** NOT FIXED  
No `helmet` middleware anywhere in `src/backend/`. Missing `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, HSTS, etc.

### 🟠 NEW: Verbose Error Messages Leak Internal State
**Status:** NOT FIXED  
**235+ locations** use `res.status(500).json({ error: String(err) })`, which can leak SQL syntax errors, table names, connection failures, or stack traces. There is **no global Express error handler** registered.

### 🟡 NEW: Misleading Turnstile Bypass Comment
**Files:** `src/backend/app.ts:121-122`, `src/backend/middleware/turnstile.ts:62-65`  
Comments claim: *"Turnstile verification is skipped when the request includes the header `X-Bypass-Turnstile: monitoring`."* The actual code does **not** implement this bypass. The comment creates confusion and may tempt attackers (or auditors) to test a non-existent bypass.

---

## 5. Recommended Fix Priority

### P0 — Fix Today
1. **Add `requireAuth` to lootbox routes** and verify ownership (`lootbox-router.ts:400-452,503-531`).
2. **Fix Notification IDOR** — filter all notification read/delete queries by `playerId` (`notification-service.ts:86-93`).
3. **Strip `totpSecret` from `/auth/me` response** (`auth-router.ts:1271`).
4. **Return generic error for unverified login attempts** to prevent email enumeration (`auth-router.ts:304-312`).
5. **Remove `isAdmin` from public player API responses** (`player-service.ts:30`, `player-router.ts:635`).
6. **Add rate limiting to OAuth callback endpoints** (`oauth-router.ts:78,152`).
7. **Add rate limiting to `/auth/challenge`** (`auth-router.ts:845`).
8. **Increase PoW difficulty to 6+** and bind challenges to IP/session (`auth-router.ts:30,33`).
9. **Strip `password` and `totpSecret` from `AdminPlayerDetail`** (`admin-service.ts:130-152`).
10. **Add server-side XSS sanitization** to chat, guestbook, support, and motto (use the existing `sanitize.ts` utility).
11. **Enforce max length on HTTP chat content** (`chat-message-router.ts:479`).
12. **Add Helmet middleware** (`app.ts:64`).

### P1 — This Week
11. Move rate limiting to Redis (shared state across instances).
12. Gate localhost Turnstile bypass on `NODE_ENV !== 'production'`.
13. Move WebSocket `sessionId` from URL query param to first WS message or subprotocol.
14. Add max-length checks to support ticket title/description.
15. Fix `bot-trap.ts` `getClientIp` to use last `X-Forwarded-For` hop (consistent with rate-limiter).
16. Replace `SELECT *` with explicit column lists in `getPlayerByUsername`, `getPlayerByEmail`, `getInfoByID`.
17. Add a global Express error handler that returns generic "Internal server error" in production.
18. Restrict Swagger `/api-docs` to admin-only or disable in production.
19. Add session IP/UA binding and rotation.
20. Add Turnstile verification to OAuth initiation (or require PoW before OAuth redirect).

### P2 — Hardening
21. Add CORS origin whitelist in production.
22. Review all 235+ `String(err)` leak points.
23. Remove misleading `X-Bypass-Turnstile` comments.
24. Delete or encrypt `.envRender` locally if no longer needed.
25. Consider adding Content Security Policy headers.

---

## Appendix: Quick Exploit PoCs

### PoC A: Steal your own TOTP secret
```bash
curl -H "session-id: <your-session>" https://your-app.com/api/auth/me | jq '.totpSecret'
```

### PoC B: Enumerate unverified emails
```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"victim@example.com","password":"wrong"}'
# Response reveals "Please verify your email" if account exists but is unverified.
```

### PoC C: Find all admins via public API
```bash
curl https://your-app.com/api/players | jq '.[] | select(.isAdmin == 1) | .username'
```

### PoC D: Open someone else's lootbox (no auth)
```bash
curl -X POST https://your-app.com/api/lootboxes/42/open \
  -H "Content-Type: application/json" \
  -d '{"playerId": 1}'
```

### PoC E: Delete any lootbox (no auth)
```bash
curl -X DELETE https://your-app.com/api/lootboxes/42
```

### PoC F: Mark any notification as read
```bash
curl -X PATCH https://your-app.com/api/notifications/99/read \
  -H "session-id: <your-session>"
```

### PoC G: Mass-create OAuth accounts (no Turnstile, no callback rate limit)
```bash
# Initiation is rate-limited (20/min), but callbacks are unlimited.
# A puppeteer script completing real Google/GitHub OAuth can flood callbacks.
```

---
*Report generated by automated re-audit of the EmberExchange codebase.*
