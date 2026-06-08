# Stream 1: Database Schema Changes

## Goal
Add columns to the `Notification` table and `PlayerSettings` table to support grouping, priority, and expiry.

## Files to Modify

### 1. `src/backend/utils/unit.ts`

Find the `Notification` table creation SQL and update it:

```sql
CREATE TABLE IF NOT EXISTS Notification (
    notificationId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'chat_message', 'trade_offer', 'daily_reward', 'system', 'quest_complete')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}' NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),  -- NEW
    groupKey TEXT,  -- NEW
    count INTEGER NOT NULL DEFAULT 1,  -- NEW
    expiresAt TIMESTAMPTZ,  -- NEW
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- NEW
);
```

Also update the index:
```sql
-- Add index for grouping lookups
CREATE INDEX IF NOT EXISTS idx_notification_player_group ON Notification(playerId, type, groupKey, isRead, updatedAt);
```

Then find the `PlayerSettings` table and add:
```sql
-- Add to PlayerSettings table creation or as ALTER TABLE
notifyShopPurchases INTEGER NOT NULL DEFAULT 1
```

If using SQLite (check if this project supports both), use compatible types.

### 2. `src/shared/model.ts`

Update the `NotificationRow` interface:

```typescript
export type NotificationType = 'friend_request' | 'chat_message' | 'trade_offer' | 'daily_reward' | 'system' | 'quest_complete';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationRow {
  notificationId: number;
  playerId: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: number;
  priority: NotificationPriority;
  groupKey: string | null;
  count: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Update `PlayerSettings`:
```typescript
export interface PlayerSettings {
  playerId?: number;
  notifyFriendRequests: boolean;
  notifyChatMessages: boolean;
  notifyTradeOffers: boolean;
  notifyDailyReward: boolean;
  notifyShopPurchases: boolean;  // NEW
}
```

## Migration Strategy

Because the `Notification` table already exists, you must write migration SQL, not just update the CREATE TABLE. Add to `src/backend/utils/unit.ts` in the migration section (or create a one-off migration block):

```sql
-- Migration: notification system v2
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS groupKey TEXT;
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS expiresAt TIMESTAMPTZ;
ALTER TABLE Notification ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create index for grouping lookups
CREATE INDEX IF NOT EXISTS idx_notification_player_group ON Notification(playerId, type, groupKey, isRead, updatedAt);

-- Add to PlayerSettings
ALTER TABLE PlayerSettings ADD COLUMN IF NOT EXISTS notifyShopPurchases INTEGER NOT NULL DEFAULT 1;
```

> ⚠️ **Check the project's DB setup**: This project appears to use SQLite in some environments and PostgreSQL in others. Make sure your ALTER TABLE syntax works for both, or find the existing migration pattern and follow it.

## Acceptance Criteria
- [ ] `npm run build` compiles without type errors
- [ ] Database starts successfully (migration runs cleanly)
- [ ] `SELECT * FROM Notification` returns the new columns
- [ ] `PlayerSettings` includes `notifyShopPurchases`

## Notes for Agent
- Do NOT modify any service logic yet — only schema and types
- Check if the project has an existing migration framework (e.g., `src/backend/db/migrations/`)
- If `unit.ts` runs migrations on startup, make sure they are idempotent (IF NOT EXISTS / IF NOT EXISTS equivalent)
