# Notification System Rework — Master Plan (Option C)

## Goal
Transform the notification system from a flat, spammy, poll-only inbox into a smart, grouped, priority-aware, real-time notification center.

## Current Pain Points
1. **Spam**: Buying 25 shop items creates 25 identical `system` notifications
2. **Missing events**: Quest completions (both `isCompleted=1` and reward claimed) never generate notifications
3. **No priority**: Shop purchase, achievement unlock, and welcome message are all equal `system` type
4. **Slow delivery**: 15-second polling only; no real-time push for important events
5. **No grouping UI**: Flat list even if backend had similar notifications

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Backend Event                                                      │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐  │
│  │  Determine  │────▶│   Grouping   │────▶│   Priority Check    │  │
│  │  priority   │     │  (dedupe)    │     │  (create or update) │  │
│  └─────────────┘     └──────────────┘     └─────────────────────┘  │
│                                                   │                  │
│                           ┌───────────────────────┘                  │
│                           ▼                                          │
│                    ┌─────────────┐                                   │
│         ┌─────────│  WebSocket  │─────── High prio ───▶ Toast       │
│         │         │   broadcast │                                   │
│         │         └─────────────┘                                   │
│         │                   │                                        │
│         │                   └────────── All ────────▶ Bell badge    │
│         ▼                                                            │
│    ┌─────────┐                                                      │
│    │  Poll   │◀───────────────────────────────────── Frontend       │
│    │ fallback│                                                      │
│    └─────────┘                                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Workstreams

| # | Stream | File | Dependencies | Estimated Effort |
|---|--------|------|--------------|------------------|
| 1 | **Database Schema** | `01-database.md` | None | Small |
| 2 | **Backend Service** | `02-backend-service.md` | Stream 1 | Medium |
| 3 | **Backend Events** | `03-backend-events.md` | Stream 2 | Medium |
| 4 | **WebSocket Push** | `04-websocket.md` | Stream 2 | Small |
| 5 | **Frontend Service** | `05-frontend-service.md` | Stream 2, 4 | Small |
| 6 | **Frontend UI** | `06-frontend-ui.md` | Stream 5 | Medium |
| 7 | **Migration** | `07-migration.md` | Stream 1, 2 | Small |

## Execution Order

**Phase 1 (can start immediately, parallelizable within reason):**
- Stream 1 → Stream 2 → Stream 3
- Stream 1 → Stream 2 → Stream 4

**Phase 2 (after Phase 1 completes):**
- Stream 5 → Stream 6

**Phase 3 (final):**
- Stream 7

## Shared Contracts

All streams must agree on these types (defined in `src/shared/model.ts`):

```typescript
// New notification fields
type NotificationPriority = 'low' | 'normal' | 'high';

interface NotificationRow {
  notificationId: number;
  playerId: number;
  type: 'friend_request' | 'chat_message' | 'trade_offer' | 'daily_reward' | 'system' | 'quest_complete';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: number;           // 0 or 1
  priority: NotificationPriority;  // NEW
  groupKey: string | null;  // NEW — e.g. "shop:purchase:session"
  count: number;            // NEW — default 1
  expiresAt: string | null; // NEW — ISO date for auto-cleanup
  createdAt: string;
  updatedAt: string;        // NEW — for grouping window checks
}

// Player settings addition
interface PlayerSettings {
  notifyFriendRequests: boolean;
  notifyChatMessages: boolean;
  notifyTradeOffers: boolean;
  notifyDailyReward: boolean;
  notifyShopPurchases: boolean;  // NEW — default true
}
```

## Key Decisions (locked)

1. **Grouping window**: 5 minutes. If an unread notification with the same `(playerId, type, groupKey)` exists and `updatedAt` is within 5 minutes, increment `count` instead of creating new.
2. **Auto-expiry**: Low-priority grouped notifications expire after 7 days. Normal/high never auto-expire.
3. **WebSocket event name**: `notification:new`
4. **Quest notification strategy**: 
   - Fire `quest_complete` (high priority, immediate toast) when `trackProgress()` sets `isCompleted=1`
   - Fire `daily_reward` (normal priority) when quest reward is claimed
5. **Shop notification strategy**:
   - Per-purchase: `groupKey = 'shop:purchase:${sessionId}'`, priority = `low`
   - If no sessionId available, use `groupKey = 'shop:purchase:${playerId}:${date}'` where date is YYYY-MM-DD

## Acceptance Criteria (all must pass)

- [ ] Buying 10 stoves creates ≤ 1 notification, showing "You made 10 shop purchases"
- [ ] Completing a quest immediately shows a toast "Quest complete: Forge 5 Stoves"
- [ ] Claiming a quest reward shows a notification with reward details
- [ ] User can disable shop purchase notifications in Settings
- [ ] WebSocket-connected clients see high-priority notifications within 1 second
- [ ] Old notifications are cleaned up automatically (low-priority after 7 days)
- [ ] All existing tests pass; new tests added for grouping logic
