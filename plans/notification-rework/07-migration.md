# Stream 7: Data Migration & Cleanup

## Goal
Migrate existing notification data and set up automatic cleanup for the new expiry system.

## Files to Modify

### 1. Database Migration (in `src/backend/utils/unit.ts` or migration file)

After Streams 1 and 2 are complete, run this migration to backfill existing data:

```sql
-- Backfill existing notifications
UPDATE Notification SET
  priority = 'normal',
  count = 1,
  groupKey = NULL,
  expiresAt = NULL,
  updatedAt = createdAt
WHERE priority IS NULL;

-- Backfill PlayerSettings
UPDATE PlayerSettings SET
  notifyShopPurchases = 1
WHERE notifyShopPurchases IS NULL;
```

### 2. Optional: Periodic Cleanup Job

If the project has a cron/scheduler (check `src/backend/jobs/` or `src/backend/scheduler/`), add a cleanup job:

```typescript
// src/backend/jobs/notification-cleanup-job.ts (new file)
import { Unit } from "../utils/unit";
import { NotificationService } from "../services/notification-service";

export async function runNotificationCleanup(): Promise<void> {
  const unit = await Unit.create();
  try {
    const notificationService = new NotificationService(unit);
    
    // Clean up expired notifications for all players
    // This is a simplified version — for production, paginate by playerId
    const stmt = unit.prepare<{ playerId: number }>(
      `SELECT DISTINCT playerId FROM Notification WHERE expiresAt IS NOT NULL AND expiresAt < NOW()`
    );
    const players = await stmt.all();
    
    let totalDeleted = 0;
    for (const { playerId } of players) {
      const deleted = await notificationService.cleanupExpired(playerId);
      totalDeleted += deleted;
    }
    
    console.log(`[NotificationCleanup] Deleted ${totalDeleted} expired notifications`);
  } catch (e) {
    console.error('[NotificationCleanup] Failed:', e);
  } finally {
    await unit.complete();
  }
}
```

Then schedule it (check existing job scheduling pattern):
```typescript
// In app.ts or scheduler setup
setInterval(() => {
  void runNotificationCleanup();
}, 60 * 60 * 1000); // Every hour
```

If no scheduler exists, the cleanup on-read (in `NotificationService.getByPlayerId()`) is sufficient — skip this file.

### 3. Optional: One-time deduplication of existing spam

If the user currently has 25 identical shop notifications, offer a one-time cleanup:

```sql
-- Delete duplicate shop purchase notifications, keeping only the newest
DELETE FROM Notification
WHERE notificationId IN (
  SELECT n1.notificationId FROM Notification n1
  JOIN Notification n2 ON n1.playerId = n2.playerId
    AND n1.type = n2.type
    AND n1.title = n2.title
    AND n1.notificationId < n2.notificationId
  WHERE n1.type = 'system'
    AND n1.title = 'Purchase successful'
    AND n1.createdAt > NOW() - INTERVAL '7 days'
);
```

> ⚠️ **Only run this if requested** — it's destructive. Better to let the user decide.

## Acceptance Criteria
- [ ] All existing notifications have `priority`, `count`, `updatedAt` set
- [ ] All existing player settings have `notifyShopPurchases = 1`
- [ ] Expired notifications are cleaned up on read
- [ ] Optional: scheduled cleanup runs without errors
- [ ] No data loss for non-expired notifications

## Notes for Agent
- This stream must run AFTER Streams 1 and 2 are deployed
- The migration SQL must be idempotent (safe to run multiple times)
- If using SQLite, `INTERVAL` syntax may not work — use `datetime('now', '-7 days')` instead
- Check the project's existing migration/startup pattern before adding cleanup jobs
