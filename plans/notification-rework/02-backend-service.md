# Stream 2: Backend Notification Service Overhaul

## Goal
Rewrite `NotificationService` to support priority, grouping, deduplication, auto-expiry, and the new `quest_complete` type.

## Files to Modify

### 1. `src/backend/services/notification-service.ts`

**Replace the entire file** with a new implementation that includes:

#### New `create()` signature:
```typescript
async create(
  playerId: number,
  type: NotificationRow["type"],
  title: string,
  message: string,
  data: Record<string, unknown> = {},
  options: {
    priority?: NotificationPriority;
    groupKey?: string;
    expiresAt?: Date;
  } = {}
): Promise<[boolean, number]>
```

#### Grouping Logic (inside `create()`):
```typescript
const priority = options.priority ?? 'normal';
const groupKey = options.groupKey ?? null;
const expiresAt = options.expiresAt ?? null;

// If groupKey provided, check for existing unread notification within 5 min window
if (groupKey) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const existing = await this.unit.prepare<NotificationRow>(
    `SELECT notificationId, count, message, data FROM Notification
     WHERE playerId = @playerId AND type = @type AND groupKey = @groupKey
     AND isRead = 0 AND updatedAt > @fiveMinutesAgo
     ORDER BY updatedAt DESC LIMIT 1`,
    { playerId, type, groupKey, fiveMinutesAgo }
  ).get();

  if (existing) {
    // Increment count and merge data
    const newCount = existing.count + 1;
    const mergedData = { ...existing.data, ...data, _count: newCount };
    const newMessage = `${message} (${newCount} total)`; // Or keep original and let frontend pluralize

    await this.unit.prepare(
      `UPDATE Notification
       SET count = @newCount, updatedAt = NOW(),
           data = @mergedData,
           message = CASE WHEN @newCount > 2 THEN @newMessage ELSE message END
       WHERE notificationId = @notificationId`,
      { newCount, mergedData: JSON.stringify(mergedData), newMessage, notificationId: existing.notificationId }
    ).run();

    return [true, existing.notificationId]; // Re-used existing row
  }
}

// No grouping match — insert new
const stmt = this.unit.prepare<NotificationRow>(
  `INSERT INTO Notification (playerId, type, title, message, data, isRead, priority, groupKey, count, expiresAt, createdAt, updatedAt)
   VALUES (@playerId, @type, @title, @message, @data, 0, @priority, @groupKey, 1, @expiresAt, NOW(), NOW())`,
  { playerId, type, title, message, data: JSON.stringify(data), priority, groupKey, expiresAt: expiresAt?.toISOString() ?? null }
);
return await this.executeStmt(stmt);
```

#### Settings Check Update:
The settings check must now also handle `notifyShopPurchases` for `system` notifications that have `groupKey` starting with `'shop:purchase'`:

```typescript
// In create(), after priority setup, before grouping:
if (type === 'system' && groupKey?.startsWith('shop:purchase')) {
  const settingsService = new PlayerSettingsService(this.unit);
  const settings = await settingsService.getSettings(playerId);
  if (settings && !settings.notifyShopPurchases) {
    return [false, 0];
  }
}
// Existing per-type checks for non-system types remain
```

#### New Methods to Add:

```typescript
/**
 * Deletes expired notifications (low-priority grouped items past their expiry).
 * Call this during getByPlayerId or via a periodic job.
 */
async cleanupExpired(playerId: number): Promise<number> {
  const stmt = this.unit.prepare(
    `DELETE FROM Notification
     WHERE playerId = @playerId AND expiresAt IS NOT NULL AND expiresAt < NOW()`,
    { playerId }
  );
  const result = await stmt.run();
  return result.changes ?? 0;
}

/**
 * Get unread count excluding expired.
 */
async getUnreadCount(playerId: number): Promise<number> {
  await this.cleanupExpired(playerId);
  const stmt = this.unit.prepare<{ count: number }>(
    `SELECT COUNT(*)::INTEGER as count FROM Notification
     WHERE playerId = @playerId AND isRead = 0
     AND (expiresAt IS NULL OR expiresAt > NOW())`,
    { playerId }
  );
  const result = await stmt.get();
  return result?.count ?? 0;
}

/**
 * Get all notifications excluding expired.
 */
async getByPlayerId(playerId: number, limit: number = 50, offset: number = 0): Promise<NotificationRow[]> {
  await this.cleanupExpired(playerId);
  const stmt = this.unit.prepare<NotificationRow>(
    `SELECT * FROM Notification
     WHERE playerId = @playerId
     AND (expiresAt IS NULL OR expiresAt > NOW())
     ORDER BY createdAt DESC
     LIMIT @limit OFFSET @offset`,
    { playerId, limit, offset }
  );
  return await stmt.all();
}
```

### 2. `src/backend/services/player-settings-service.ts`

Update to handle the new `notifyShopPurchases` field:

- In `getSettings()`: include `notifyShopPurchases` in the SELECT
- In `updateSettings()`: handle `notifyShopPurchases` in the UPDATE
- In default settings creation: set `notifyShopPurchases: true`

## Acceptance Criteria
- [ ] `NotificationService.create()` accepts `priority`, `groupKey`, `expiresAt` options
- [ ] Grouping works: 3 calls with same `groupKey` within 5 min creates 1 row with `count=3`
- [ ] `getByPlayerId()` and `getUnreadCount()` filter out expired rows
- [ ] `cleanupExpired()` removes old low-priority notifications
- [ ] `notifyShopPurchases` setting is read and respected
- [ ] All existing callers of `NotificationService.create()` still compile (backward-compatible since options are optional)

## Notes for Agent
- The grouping update SQL must be atomic or use the same transaction context (`this.unit`)
- Keep `executeStmt` pattern from the existing file
- Do NOT update the callers yet — that's Stream 3
- Make sure `PlayerSettingsService` defaults `notifyShopPurchases` to `true`
