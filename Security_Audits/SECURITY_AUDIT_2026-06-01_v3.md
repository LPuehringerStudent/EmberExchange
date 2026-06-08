# EmberExchange Security Audit Report — v3 (Deep-Dive)
**Date:** 2026-06-01  
**Scope:** Full-stack Node.js/Angular application  
**Focus:** Race conditions, business-logic flaws, deep architectural issues missed by audits v1 & v2

---

## 🔴 Executive Summary

Audits v1 and v2 fixed the **obvious** surface-level bugs (missing auth, password leaks, bot bypasses, XSS).  
**This audit finds 10 new CRITICAL/HIGH vulnerabilities** hiding in the **business logic, transaction layer, and resource limits** — areas that static scanners and shallow reviews miss.

The most dangerous finding is a **systemic lack of row-level locking** across the entire economy. Every coin transfer, shop purchase, and daily reward is vulnerable to **race-condition double-spending**.

| Category | New Critical | New High | New Medium | New Low |
|----------|-------------|----------|------------|---------|
| Auth & Authorization | 2 | 0 | 1 | 0 |
| Race Conditions / Economy | 3 | 2 | 0 | 0 |
| DoS / Resource Exhaustion | 0 | 2 | 1 | 0 |
| Information Disclosure | 0 | 2 | 1 | 0 |
| Input Validation | 0 | 1 | 3 | 1 |

---

## 1. Authentication & Authorization Bypasses Missed by v1/v2

### 1.1 `requireAuth` Does NOT Check Ban Status 🔴 CRITICAL
**File:** `src/backend/middleware/require-auth.ts:18-42`

```typescript
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    // ... validates session ...
    req.playerId = session.playerId;
    next();   // ← Never checks if player is banned
}
```

`requireAuth` is mounted on dozens of state-mutating routes (listings, trades, glory, etc.). A **banned player with a still-valid session** can continue using every single one of these routes indefinitely.

**Impact:** Ban evasion — banned accounts keep trading, listing, and spending coins.

**Fix:** After attaching `req.playerId`, query `Player.bannedAt`. If set, return 403 and invalidate the session.

---

### 1.2 IP Ban Check Fails Open on Database Errors 🔴 CRITICAL
**File:** `src/backend/middleware/ip-ban-check.ts:23-39`

```typescript
export async function ipBanCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    // ...
    try {
        const ban = await punishmentService.isIpBanned(ip);
        if (ban.banned) { res.status(403).json({ error: "Access denied" }); return; }
        next();
    } catch {
        next();   // ← DB error = ALLOW REQUEST
    }
}
```

If the database connection fails, is overloaded, or the query throws, the `catch` block **silently allows the request through**. A banned IP under DB pressure becomes unbanned.

**Fix:** In the `catch` block, return 503 or 403 — **never** call `next()` on failure.

---

### 1.3 Registration Race Condition — Duplicate Accounts 🟡 MEDIUM
**File:** `src/backend/routers/auth-router.ts:960-983`

```typescript
const existingByEmail = await playerService.getPlayerByEmail(email);
if (existingByEmail) { await playerService.deletePlayer(existingByEmail.playerId); }

const existingByUsername = await playerService.getPlayerByUsername(username);
if (existingByUsername) { await playerService.deletePlayer(existingByUsername.playerId); }

const [success, playerId] = await playerService.createPlayer(username, hashedPassword, email, ...);
```

Two concurrent registrations with the same email/username both pass the existence check, then one fails on the unique constraint. The "delete old unverified account" logic is also racy.

**Fix:** Use a single `INSERT … ON CONFLICT` query, or acquire an advisory lock on the email/username before checking.

---

## 2. Race Conditions & Double-Spending (The Invisible Bot Army)

### 2.1 Trade Execution — Double-Spend / Negative Balance 🔴 CRITICAL
**Files:** `src/backend/routers/trade-router.ts:474-475`, `src/backend/services/player-service.ts:127-134`  
**Root Cause:** `Unit.create(false)` only calls `BEGIN`; PostgreSQL defaults to **READ COMMITTED** isolation. No `SELECT FOR UPDATE` is used.

```typescript
// trade-router.ts:474-475
const buyerCoinsUpdated = await playerService.updatePlayerCoins(buyerId, buyer.coins - listing.price);
const sellerCoinsUpdated = await playerService.updatePlayerCoins(listing.sellerId, seller.coins + listing.price);
```

**Exploit:** Two concurrent `POST /trades` requests targeting the same buyer read the **same balance** simultaneously. Both pass the `buyer.coins < listing.price` check, both deduct coins. The buyer’s balance goes **negative**.

**Impact:** Infinite wealth generation, economy destruction.

**Fix:** Use `SELECT FOR UPDATE` when reading the buyer and seller rows, or use a single atomic `UPDATE … WHERE coins >= price` statement.

---

### 2.2 Shop Purchase — Overspending & Negative Stock 🔴 CRITICAL
**Files:** `src/backend/services/shop-service.ts:261-267`, `src/backend/services/shop-service.ts:339-344`

```typescript
// shop-service.ts:261-267
if (player.coins < listing.price) { return { success: false, error: "Insufficient coins" }; }
const newBalance = player.coins - listing.price;
await playerService.updatePlayerCoins(playerId, newBalance);   // ← NOT atomic

// shop-service.ts:339-344
if (listing.itemType !== 'lootbox' && listing.stock > 0) {
    await this.unit.prepare(
        `UPDATE ShopListing SET stock = stock - 1 WHERE listingId = @listingId`,
        { listingId }
    ).run();  // ← NOT atomic
}
```

**Exploit:** Rapid-fire concurrent `POST /shop/buy` requests. Two requests both read `stock = 1`, both pass the check, both decrement. Stock becomes **-1**. Same for coins.

**Fix:** Deduct coins and stock with `UPDATE … SET coins = coins - price WHERE coins >= price` and `UPDATE … SET stock = stock - 1 WHERE stock > 0`.

---

### 2.3 Daily Reward — Duplicate Claims 🔴 CRITICAL
**File:** `src/backend/services/shop-service.ts:500-550`

```typescript
const status = await this.getDailyRewardStatus(playerId);
if (!status.canClaim) { return { success: false, error: "Daily reward already claimed" }; }
// ... award coins/lootboxes ...
```

**Exploit:** `getDailyRewardStatus` reads `PlayerDailyReward`, checks `canClaim`, then writes the reward. Under READ COMMITTED, 10 concurrent requests all read `canClaim = true` and all award the reward.

**Fix:** Use `SELECT FOR UPDATE` on `PlayerDailyReward`, or use an `UPSERT` with a `lastClaimAt` check in the `WHERE` clause.

---

### 2.4 WebSocket Room Join — Overfill Race Condition 🟠 HIGH
**File:** `src/backend/websocket/handlers/join-room.ts:63-70`

```typescript
const playerCount = await roomPlayerService.countPlayersInRoom(roomId);
if (playerCount >= room.maxPlayers) { /* reject */ }
seatIndex = await roomPlayerService.findNextSeatIndex(roomId);
await roomPlayerService.addPlayer(roomId, meta.playerId, seatIndex);
```

There is **no database constraint** enforcing `maxPlayers`. Two concurrent `join_room` messages both read `playerCount < maxPlayers`, both insert, and the room is overfilled.

**Fix:** Add a DB check constraint or use `SELECT FOR UPDATE` on the room row before counting/inserting.

---

### 2.5 No Transaction Isolation Level Configured 🟠 HIGH
**File:** `src/backend/utils/unit.ts:1251-1257`

```typescript
public static async create(readOnly: boolean): Promise<Unit> {
    const client = await DB.createDBConnection();
    if (!readOnly) {
        await client.query("BEGIN");   // ← Defaults to READ COMMITTED
    }
    return new Unit(client, !readOnly);
}
```

All write transactions run at PostgreSQL’s default **READ COMMITTED**, which allows non-repeatable reads, phantom reads, and lost updates.

**Fix:** Start write transactions with `BEGIN ISOLATION LEVEL SERIALIZABLE` (or at least `REPEATABLE READ`), and handle serialization failures with automatic retry.

---

## 3. Denial of Service & Resource Exhaustion

### 3.1 Unbounded `limit` / `days` Query Parameters 🟠 HIGH
**Files:** `src/backend/routers/trade-router.ts:104-116`, `src/backend/routers/lootbox-router.ts:98-136`, `src/backend/routers/daily-statistics-router.ts:132-145`

```typescript
const limit = parseInt(req.query.limit as string) || 10;   // No upper bound
const days = parseInt(req.query.days as string) || 7;      // No upper bound
```

**Exploit:** `GET /trades/recent?limit=999999999` attempts to load and serialize **every trade record** into memory, causing OOM crash. `GET /daily-statistics/summary?days=999999` triggers massive aggregation.

**Fix:** Cap `limit` at 100 and `days` at 365 on **every** paginated/aggregated endpoint.

---

### 3.2 No JSON Body Size Limit 🟠 HIGH
**File:** `src/backend/app.ts:73`

```typescript
app.use(express.json());   // No limit option
```

**Exploit:** Send a multi-gigabyte JSON payload to any `POST`/`PATCH` endpoint. Node.js buffers the entire body in memory before parsing, causing OOM.

**Fix:** `app.use(express.json({ limit: '1mb' }));`

---

### 3.3 WebSocket Pre-Auth Queue Memory Pressure 🟡 MEDIUM
**File:** `src/backend/websocket/index.ts:53-56`

The pre-auth queue is capped at 10 messages, but **each message can be up to 65,536 bytes** (`maxPayload`). An attacker can open thousands of WebSocket connections and flood the queue before auth completes.

**Fix:** Add a per-IP connection limit and reduce `maxPayload` further if not needed.

---

## 4. Information Disclosure

### 4.1 `providerId` Leaked in Public API — PII Exposure 🟠 HIGH
**File:** `src/backend/services/player-service.ts:26-35`

```typescript
async getAllPublicPlayers(): Promise<Omit<PlayerRow, "password" | "totpSecret" | "email" | "isAdmin">[]> {
    // SELECT includes provider, providerId, bannedAt, banReason, emailVerified, verifiedAt
}
```

`providerId` is the **Google/GitHub unique user ID**. This is personally identifiable information (PII) that can be used to correlate accounts across services and target OAuth accounts for takeover.

**Fix:** Strip `providerId` and `provider` from all public APIs.

---

### 4.2 Public GET Endpoints Leak Player Data 🟠 HIGH
**Files:** Multiple routers with no auth on GET endpoints

The following endpoints are **completely public** and return any player's sensitive data:

| Endpoint | What leaks |
|----------|-----------|
| `GET /api/chat-messages` | All chat messages (global + private) |
| `GET /api/chat-messages/conversation/:p1/:p2` | Private conversations between any two players |
| `GET /api/coin-transactions` | All coin transactions |
| `GET /api/coin-transactions/:id` | Any individual transaction |
| `GET /players/:playerId/coin-transactions` | Any player's full transaction history |
| `GET /api/login-history` | All login history records |
| `GET /players/:playerId/login-history` | Any player's login history |
| `GET /api/mini-game-sessions` | All mini-game sessions |
| `GET /players/:playerId/mini-game-sessions` | Any player's game history |
| `GET /api/ownerships` | All ownership records |
| `GET /api/lootbox-drops` | All lootbox drop records |
| `GET /players/:playerId/lootbox-drops` | Any player's drop history |

**Fix:** Apply `requireAuth` and filter by `playerId` on all player-scoped GET endpoints.

---

### 4.3 `bannedAt` / `banReason` / `emailVerified` Exposed to Everyone 🟡 MEDIUM
Same `getAllPublicPlayers()` response includes:
- `bannedAt` / `banReason` → reveals who is banned and why
- `emailVerified` / `verifiedAt` → reveals verification status

**Fix:** Remove these fields from public player lists.

---

### 4.4 Bot-Trap Log Leaks Session IDs & Auth Tokens 🟠 HIGH
**File:** `src/backend/utils/bot-trap.ts:9-30`

```typescript
export interface BotTrapEvent {
    // ...
    headers: Record<string, string | string[] | undefined>;
    details: {
        turnstileTokenLength: number;
        hasRequiredHeader: boolean;
        requiredHeaderValue?: string;
        honeypotFields: Record<string, string>;
        username?: string;
        emailDomain?: string;
        hostHeader: string;
        bodyKeys: string[];
    };
}
```

The bot-trap log stores **full request headers** (including `session-id`, `cookie`, `authorization`) and partial body keys. This log is exposed to admins via `GET /admin/bot-traps` with **zero filtering**.

**Impact:** Any admin (or attacker with admin access) can harvest live session tokens from the bot trap log.

**Fix:** Redact sensitive headers (`session-id`, `cookie`, `authorization`) before logging. Do not log `requiredHeaderValue`.

---

## 5. Input Validation & Business Logic

### 5.1 Admin Ban IP — No IP Validation 🟠 HIGH
**File:** `src/backend/routers/admin-router.ts:235-260`

```typescript
const { ip, reason, durationHours } = req.body;
// Only checks: if (!ip || typeof ip !== "string")
await service.banIp(ip, reason, durationMs);
```

**Exploit:** An admin (or compromised admin session) can submit:
- `ip: "0.0.0.0/0"` → bans every IPv4 address
- `ip: "' OR '1'='1"` → the IP is stored raw; the **punishment middleware** (`ip-ban-check.ts`) may do string matching that behaves unexpectedly
- Extremely long strings → storage bloat

**Fix:** Validate IP against `net.isIP()` and reject CIDR ranges or wildcards.

---

### 5.2 `unit.ts` `savepoint()` String Interpolation — Latent SQL Injection 🟡 MEDIUM
**File:** `src/backend/utils/unit.ts:1277-1280`

```typescript
public async savepoint(name: string): Promise<void> {
    if (this.inTransaction) {
        await this.client.query(`SAVEPOINT ${name}`);   // ← String interpolation
    }
}
```

While no current caller passes user input to `savepoint()`, this is a **latent SQL injection** waiting for a future developer to misuse it. `rollbackToSavepoint()` has the same issue.

**Fix:** Use parameterized queries: `await this.client.query('SAVEPOINT $1', [name]);` (or validate `name` against `/^[a-zA-Z0-9_]+$/`).

---

### 5.3 Email Update Without Re-Verification 🟡 MEDIUM
**Files:** `src/backend/routers/auth-router.ts:407-458`, `src/backend/routers/player-router.ts:230-248`

```typescript
const success = await playerService.updatePlayerEmail(session.playerId, email);
// No verification token is sent; email is marked verified immediately
```

A compromised session can change the email to an attacker-controlled address **without any verification**. The attacker can then reset the password (if reset existed) or maintain persistence.

**Fix:** Set `emailVerified = 0` and send a verification token when email is changed.

---

### 5.4 Listing Search LIKE Wildcard Injection 🟡 MEDIUM
**File:** `src/backend/services/listing-service.ts:101-109`

```typescript
params.search = `%${filters.search.toLowerCase()}%`;
```

User-controlled `search` can contain `%` and `_` SQL LIKE wildcards, altering search semantics and potentially causing full-table scans.

**Fix:** Escape `%` and `_` in user input before wrapping in LIKE pattern, or use `pg_trgm`.

---

### 5.5 Support Ticket Stored XSS (Admin-Facing) 🟡 MEDIUM
**File:** `src/backend/routers/support-router.ts:136-142`

Support tickets store `title` and `description` with **zero server-side sanitization**. If an admin dashboard ever renders these raw, it’s a stored XSS vector against admins.

**Fix:** Sanitize support ticket content with the existing `sanitize.ts` utility.

---

### 5.6 Prototype Pollution — No Body Sanitization 🟡 MEDIUM
**Files:** `src/backend/routers/player-router.ts:196`, `src/backend/routers/admin-router.ts:490`

```typescript
const { username, email, motto, isPublic } = req.body;
// req.body is spread directly without stripping __proto__, constructor, prototype
```

Express `express.json()` does not strip prototype-pollution keys. An attacker sending `{ "__proto__": { "isAdmin": true } }` could pollute internal objects if any code uses `Object.assign()` or spreads without guards.

**Fix:** Add a global middleware that strips `__proto__`, `constructor`, and `prototype` from `req.body` before route handlers.

---

### 5.7 `getStoveOriginPlayerId` Trusts Mutable History 🟡 LOW
**File:** `src/backend/routers/listing-router.ts:447-478`

The banned-origin check traces a stove back to its original owner via the **Ownership** table. An attacker can:
1. Receive a stove from a banned account
2. Trade it through a clean intermediary account
3. The intermediary becomes the "first ownership" record
4. List the stove — origin check passes

**Fix:** Track the **original minting owner** (`currentOwnerId` at `mintedAt`) immutably on the `Stove` row itself.

---

## 6. Recommended Fix Priority

### P0 — Fix Today (Stop Auth & Economy Exploits)
1. **Check `bannedAt` in `requireAuth`** — reject banned sessions immediately.
2. **Fail closed in `ipBanCheck`** — return 403/503 in the `catch` block, never `next()`.
3. **Add row-level locking** to all economy operations (`SELECT FOR UPDATE` on `Player` rows during trades, purchases, daily claims).
4. **Use atomic UPDATE-with-WHERE** for coin deductions and stock decrements instead of read-then-write.
5. **Set transaction isolation** to `SERIALIZABLE` for all financial transactions in `Unit.create(false)`.

### P1 — This Week
6. **Cap `limit` query params** on all paginated endpoints (max 100).
7. **Cap `days` query param** on `/daily-statistics/summary` (max 365).
8. **Add `express.json({ limit: '1mb' })`** to prevent memory exhaustion.
9. **Strip `providerId`, `provider`, `bannedAt`, `banReason`** from public player APIs.
10. **Add auth + ownership filtering** to all player-scoped GET endpoints (chat, transactions, login history, game sessions, ownership, lootbox drops).
11. **Redact sensitive headers** from bot-trap log before storage.
12. **Validate IP addresses** in admin ban endpoint using `net.isIP()`.
13. **Sanitize support ticket content** server-side.
14. **Add DB constraint** for `maxPlayers` in `RoomPlayer` or lock the room row on join.
15. **Require email re-verification** when a player changes their email address.
16. **Add prototype-pollution middleware** to strip `__proto__`, `constructor`, `prototype` from all request bodies.

### P2 — Hardening
17. Escape `%` and `_` in listing search inputs.
18. Add per-IP WebSocket connection limits.
19. Fix `savepoint()` and `rollbackToSavepoint()` to use parameterized queries.
20. Consider adding an immutable `originalOwnerId` field to `Stove` for true provenance tracking.

---

## Appendix: Quick Exploit PoCs

### PoC A: Use a banned account forever
```bash
# Even after being banned, the session stays valid
curl -H "session-id: <banned-player-session>" \
  https://your-app.com/api/auth/me
# → 200 OK, player data returned
# Then create a listing, trade, etc. — all work.
```

### PoC B: Banned IP gets through during DB hiccup
```bash
# If the DB is under load and the isIpBanned query times out,
# the catch block calls next() and the request proceeds.
```

### PoC C: Double-spend a trade
```bash
# Send two concurrent requests buying the same listing
# Both will read the same buyer balance and both succeed
curl -X POST https://your-app.com/api/trades \
  -H "Content-Type: application/json" \
  -H "session-id: <buyer-session>" \
  -d '{"listingId": 42, "buyerId": 5}' &
curl -X POST https://your-app.com/api/trades \
  -H "Content-Type: application/json" \
  -H "session-id: <buyer-session>" \
  -d '{"listingId": 42, "buyerId": 5}' &
wait
```

### PoC D: Crash server with giant JSON
```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d @<(python3 -c "print('{\"x\":\"' + 'A'*500_000_000 + '\"}')")
```

### PoC E: Exfiltrate Google IDs of all players
```bash
curl https://your-app.com/api/players | jq '.[] | select(.provider == "google") | {username, providerId}'
```

### PoC F: Read anyone's private chat
```bash
curl https://your-app.com/api/chat-messages/conversation/1/2
# → Full private conversation between player 1 and player 2
```

### PoC G: Read anyone's coin transaction history
```bash
curl https://your-app.com/api/players/42/coin-transactions
# → Every coin transaction for player 42
```

### PoC H: Harvest session tokens from admin bot-trap log
```bash
curl -H "session-id: <admin-session>" \
  https://your-app.com/api/admin/bot-traps | jq '.[].headers["session-id"]'
```

### PoC I: Ban every IPv4 address
```bash
curl -X POST https://your-app.com/api/admin/banned-ips \
  -H "session-id: <admin-session>" \
  -H "Content-Type: application/json" \
  -d '{"ip": "0.0.0.0/0", "reason": "test"}'
```

### PoC J: Change email without re-verification
```bash
curl -X PATCH https://your-app.com/api/auth/me \
  -H "session-id: <your-session>" \
  -H "Content-Type: application/json" \
  -d '{"email": "attacker@evil.com"}'
# → 200 OK, email changed instantly, no verification required
```

### PoC K: Prototype pollution test
```bash
curl -X PATCH https://your-app.com/api/players/1/profile \
  -H "session-id: <your-session>" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","__proto__":{"isAdmin":true}}'
```

---
*Report generated by deep architectural review of the EmberExchange codebase.*
