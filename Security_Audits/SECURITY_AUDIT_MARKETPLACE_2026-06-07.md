# Marketplace Security Audit — 2026-06-07

**Auditor:** AI Security Review  
**Scope:** Backend routers (`listing-router.ts`, `trade-router.ts`), services (`listing-service.ts`, `stove-service.ts`, `lootbox-service.ts`, `trade-service.ts`, `trade-offer-service.ts`, `player-service.ts`, `price-history-service.ts`), frontend marketplace components, and database schema.

---

## Executive Summary

The marketplace has **solid authorization controls** (seller/buyer identity checks, banned-account blocking, self-purchase prevention) and **no SQL injection vulnerabilities** (all queries use parameterized statements). However, **three significant issues** were identified:

1. **CRITICAL:** Trade execution blindly transfers item ownership without verifying the seller still owns the item. Combined with missing database constraints, this creates a path to item theft.
2. **HIGH:** Missing unique constraints on the `Listing` table allow race-condition double-listing of the same item.
3. **MEDIUM:** Widespread `limit` validation flaws let attackers bypass pagination caps across ~15 endpoints.

---

## 🔴 Critical — Blind Ownership Transfer in Trade Execution

### Finding
When a marketplace trade is executed, `StoveService.updateOwner()` and `LootboxService.updateLootboxOwner()` perform **unconditional** `UPDATE` statements without checking the current owner:

```typescript
// src/backend/services/stove-service.ts:102
async updateOwner(id: number, newOwnerId: number): Promise<boolean> {
    const stmt = this.unit.prepare(
        "UPDATE Stove SET currentOwnerId = @newOwnerId WHERE stoveId = @id",
        { id, newOwnerId }
    );
    const result = await stmt.run();
    return result.changes === 1;
}
```

```typescript
// src/backend/services/lootbox-service.ts:382
async updateLootboxOwner(lootboxId: number, playerId: number): Promise<boolean> {
    const stmt = this.unit.prepare(
        "UPDATE Lootbox SET playerId = @playerId WHERE lootboxId = @lootboxId",
        { lootboxId, playerId }
    );
    const result = await stmt.run();
    return result.changes === 1;
}
```

The trade router (`src/backend/routers/trade-router.ts:513-535`) checks that the listing exists and is active, but **never verifies that the listing's seller still owns the item at the moment of transfer**.

### Impact
If an item's ownership changes after listing (e.g., via admin action, direct DB manipulation, or a future feature that doesn't check listings), a buyer can execute the trade and the item is transferred from the **current owner** (who may be a completely different player) to the buyer. The original listing seller still receives the coins. This is effectively **item theft**.

### Reproduction Scenario
1. Player A lists Stove #42 for 1000 coins.
2. An admin or database script transfers Stove #42 to Player B (e.g., compensation, rollback, etc.). The listing remains active because there is no trigger to auto-cancel it.
3. Player C buys the listing. `updateOwner(42, PlayerC)` succeeds because the stove still exists.
4. Player C receives Stove #42 from Player B. Player A receives 1000 coins.

### Fix
Add current-owner verification to both update methods:

```typescript
// stove-service.ts
async updateOwner(id: number, newOwnerId: number, expectedCurrentOwnerId: number): Promise<boolean> {
    const stmt = this.unit.prepare(
        "UPDATE Stove SET currentOwnerId = @newOwnerId WHERE stoveId = @id AND currentOwnerId = @expectedCurrentOwnerId",
        { id, newOwnerId, expectedCurrentOwnerId }
    );
    const result = await stmt.run();
    return result.changes === 1;
}
```

And update the call site in `trade-router.ts`:
```typescript
const transferSuccess = await stoveService.updateOwner(listing.stoveId, buyerId, listing.sellerId);
```

Do the same for `LootboxService.updateLootboxOwner`.

---

## 🟠 High — Missing Unique Constraints on Listing Table

### Finding
The `Listing` table schema (`src/backend/utils/unit.ts:528-539`) has **no unique constraint** preventing multiple active listings for the same item:

```sql
CREATE TABLE IF NOT EXISTS Listing (
    listingId SERIAL PRIMARY KEY,
    sellerId INTEGER NOT NULL REFERENCES Player(playerId),
    stoveId INTEGER REFERENCES Stove(stoveId),
    lootboxId INTEGER REFERENCES Lootbox(lootboxId),
    price INTEGER NOT NULL CHECK (price >= 1),
    listedAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'sold')),
    CHECK ((stoveId IS NOT NULL) OR (lootboxId IS NOT NULL))
)
```

The `createListing` flow (`src/backend/routers/listing-router.ts:590-601`) checks `isStoveListed()` / `isLootboxListed()` before inserting, but this is a **Time-of-Check-Time-of-Use (TOCTOU)** pattern. While `SERIALIZABLE` isolation may catch some conflicts, it is not a reliable substitute for a database constraint.

### Impact
A race condition allows the same item to be listed multiple times simultaneously. Both listings can be sold, but only one item exists. The second buyer pays coins but receives nothing (or the trade fails at the ownership-transfer stage, leaving the buyer out of pocket in a confusing state).

### Fix
Add partial unique indexes:

```sql
CREATE UNIQUE INDEX idx_listing_active_stove ON Listing(stoveId) WHERE status = 'active';
CREATE UNIQUE INDEX idx_listing_active_lootbox ON Listing(lootboxId) WHERE status = 'active';
```

Handle the unique violation gracefully in `createListing` by returning a clear "Item is already listed" error.

---

## 🟡 Medium — Price Validation Flaws (NaN, Infinity, Decimals)

### Finding
Listing creation (`src/backend/routers/listing-router.ts:512-545`) and price updates (`src/backend/routers/listing-router.ts:714-717`) validate price with:

```typescript
if (typeof price !== "number" || price < 1) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive number" });
    return;
}
```

This check **fails to catch:**
- `NaN` — `typeof NaN === "number" && NaN < 1 === false` → passes
- `Infinity` — `typeof Infinity === "number" && Infinity < 1 === false` → passes
- Decimals (e.g., `1.5`) — pass validation; PostgreSQL truncates to `1`

### Impact
- `NaN` / `Infinity` cause PostgreSQL errors (500 responses) — usable for error-probing or minor DoS.
- Decimal prices silently truncate, allowing listings like `1.9` to be stored as `1`.

### Fix
Add proper validation:

```typescript
if (!Number.isFinite(price) || !Number.isInteger(price) || price < 1 || price > 2147483647) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive integer" });
    return;
}
```

---

## 🟡 Medium — Negative `limit` Bypasses Pagination Caps

### Finding
A widespread pattern across **~15 endpoints** uses:

```typescript
const limit = Math.min(Number(req.query.limit) || 100, 100);
```

When `req.query.limit = "-1"`:
- `Number("-1")` → `-1`
- `-1 || 100` → `-1` (truthy)
- `Math.min(-1, 100)` → `-1`

PostgreSQL treats `LIMIT -1` as **no limit**, allowing attackers to retrieve the entire table in a single request.

### Affected Endpoints
| File | Line | Endpoint |
|------|------|----------|
| `listing-router.ts` | 53 | `GET /listings` |
| `listing-router.ts` | 94 | `GET /listings/active` |
| `trade-router.ts` | 62 | `GET /trades` |
| `trade-router.ts` | 111 | `GET /trades/recent` |
| `stove-router.ts` | 45 | `GET /stoves` |
| `lootbox-router.ts` | 46 | `GET /lootboxes` |
| `coin-transaction-router.ts` | 38 | `GET /coin-transactions` |
| `price-history-router.ts` | 38 | `GET /price-history` |
| `chat-message-router.ts` | 87 | `GET /chat/messages` |
| `chat-message-router.ts` | 406 | `GET /chat/messages/:id/replies` |
| `game-router.ts` | 13 | `GET /games` |
| `mini-game-session-router.ts` | 46 | `GET /mini-game-sessions` |
| `lootbox-drop-router.ts` | 44 | `GET /lootbox-drops` |
| `stove-type-router.ts` | 44 | `GET /stove-types` |
| `daily-statistics-router.ts` | 37 | `GET /daily-statistics` |
| `admin-router.ts` | 261 | `GET /admin/players` |

### Impact
Information disclosure / DoS — attackers can dump large tables, increasing server load and exposing more data than intended.

### Fix
Use `Math.max()` to enforce a floor:

```typescript
const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
const offset = Math.max(Number(req.query.offset) || 0, 0);
```

---

## 🟢 Low — Redundant Manual Coin Rollback

### Finding
In `trade-router.ts:495-500`, if crediting the seller fails, the code manually adds coins back to the buyer before rolling back the transaction:

```typescript
const sellerCredited = await playerService.addCoinsAtomic(listing.sellerId, listing.price);
if (!sellerCredited) {
    await playerService.addCoinsAtomic(buyerId, listing.price);  // ← redundant
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to credit seller" });
    await unit.complete(false);
    return;
}
```

Because the entire flow runs inside a `SERIALIZABLE` transaction, `unit.complete(false)` already rolls back **all** changes including the buyer's deduction. The manual rollback is unnecessary and confusing.

### Fix
Remove the manual rollback line. The transaction handles it automatically.

---

## 🟢 Low — Dead Frontend Endpoint

### Finding
`src/frontend/src/app/core/services/listing.service.ts:77-81` defines:

```typescript
buyListing(listingId: number): Observable<PurchaseResult> {
    return this.api.post<PurchaseResult>(`/listings/${listingId}/buy`, {}, headers);
}
```

No backend route handles `POST /listings/:id/buy`. The marketplace component uses `TradeService.executeTrade()` instead. This is dead code that could confuse future developers.

### Fix
Remove the `buyListing` method from `ListingService`.

---

## ✅ What Is NOT Vulnerable

| Concern | Result |
|---------|--------|
| **SQL Injection** | All queries use parameterized statements. Dynamic `WHERE`/`ORDER BY` in `getFilteredListings` only interpolates whitelisted literals (`price_asc`, `stove`, etc.). `search` is properly escaped for `LIKE`. |
| **Authorization Bypass (listing CRUD)** | All listing mutations check `req.playerId === sellerId`. Unauthorized attempts are logged via `PunishmentService`. |
| **Self-purchase** | Explicitly blocked: `listing.sellerId === buyerId` returns 400. |
| **Banned seller trading** | Both `listing-router.ts` and `trade-router.ts` check `bannedAt`. `requireAuth` middleware also invalidates banned sessions. |
| **Trade offer ↔ Marketplace conflict** | `TradeOfferService.acceptTradeOffer()` checks `isStoveListed` / `isLootboxListed` before transferring. |
| **Salvage / Shop sale while listed** | `SparksService` and `ShopService` both check `isStoveListed`. |
| **Open lootbox while listed** | `LootboxService.openLootbox()` checks `isLootboxListed`. |
| **XSS via marketplace** | Angular's built-in interpolation escaping handles usernames/item names safely. |

---

## Recommended Priority Order

1. **Fix blind ownership transfer** (CRITICAL) — add `currentOwnerId` verification to `updateOwner` calls.
2. **Add unique constraints** (HIGH) — prevent double-listing at the database level.
3. **Fix `limit` validation** (MEDIUM) — apply `Math.max(..., 1)` to all affected endpoints.
4. **Harden price validation** (MEDIUM) — reject `NaN`, `Infinity`, and non-integers.
5. **Clean up dead code** (LOW) — remove unused `buyListing` method.
6. **Remove redundant rollback** (LOW) — simplify trade-error handling.
