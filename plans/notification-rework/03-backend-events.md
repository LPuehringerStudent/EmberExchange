# Stream 3: Update All Backend Event Triggers

## Goal
Update every place that calls `NotificationService.create()` to use the new API correctly, and add missing quest notifications.

## Files to Modify

### 1. `src/backend/services/shop-service.ts`

**Change the purchase notification** (around line 354-366):

```typescript
// BEFORE: creates one notification per purchase
// AFTER: group by session (or by player+date if no session)
const sessionId = req.sessionID ?? `${playerId}:${new Date().toISOString().split('T')[0]}`;
// ^ Note: if req is not available here, pass sessionId from router or use playerId+date fallback
```

**Recommended approach**: Pass a `sessionId` from the router, or use a fallback:

```typescript
// In purchaseItem(), add optional sessionId parameter
async purchaseItem(playerId: number, listingId: number, sessionId?: string): Promise<PurchaseResult> {
  // ... existing logic ...

  // Create grouped purchase notification
  try {
    const notificationService = new NotificationService(this.unit);
    const groupKey = sessionId ? `shop:purchase:${sessionId}` : `shop:purchase:${playerId}:${new Date().toISOString().split('T')[0]}`;
    await notificationService.create(
      playerId,
      "system",
      "Purchase successful",
      `You purchased ${listing.name} from the shop for ${listing.price} coal`,
      { listingId, itemType: listing.itemType, itemName: listing.name, price: listing.price },
      {
        priority: 'low',
        groupKey,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    );
  } catch (e) {
    console.error("[SHOP] Notification creation failed:", e);
  }
}
```

Then in `src/backend/routers/shop-router.ts`, pass `req.sessionID` if available, or generate a session header.

**Alternative if session ID is unavailable**: Just use the playerId+date fallback in the service directly.

### 2. `src/backend/services/quest-service.ts`

**Add notification on quest completion** in `trackProgress()`:

```typescript
async trackProgress(playerId: number, templateId: string, amount: number = 1): Promise<void> {
  const now = new Date().toISOString();
  const quests = await this.unit.prepare<PlayerQuestRow>(
    `SELECT * FROM PlayerQuest
     WHERE playerId = @playerId AND templateId = @templateId AND expiresAt > @now AND isCompleted = 0`,
    { playerId, templateId, now }
  ).all();

  for (const quest of quests) {
    const newValue = Math.min(quest.targetValue, quest.currentValue + amount);
    const completed = newValue >= quest.targetValue ? 1 : 0;
    await this.unit.prepare(
      `UPDATE PlayerQuest SET currentValue = @newValue, isCompleted = @completed WHERE questId = @questId`,
      { newValue, completed, questId: quest.questId }
    ).run();

    // NEW: Send notification when quest completes
    if (completed === 1 && quest.isCompleted === 0) {
      try {
        const notificationService = new (await import("./notification-service")).NotificationService(this.unit);
        await notificationService.create(
          playerId,
          "quest_complete",
          "Quest completed!",
          `You completed "${quest.label}". Claim your reward!`,
          { questId: quest.questId, templateId: quest.templateId, label: quest.label },
          { priority: 'high' } // Immediate, no grouping
        );
      } catch (e) {
        console.error("[QUEST] Completion notification failed:", e);
      }
    }
  }
}
```

**Add notification on reward claim** in `claimReward()` (after marking claimed):

```typescript
// After: await this.unit.prepare(`UPDATE PlayerQuest SET isClaimed = 1...`).run();

try {
  const notificationService = new (await import("./notification-service")).NotificationService(this.unit);
  const rewardParts: string[] = [];
  if (quest.rewardCoins > 0) rewardParts.push(`${quest.rewardCoins} coal`);
  if (quest.rewardXP > 0) rewardParts.push(`${quest.rewardXP} XP`);
  if (quest.rewardLootboxTypeId) rewardParts.push(`a lootbox`);

  await notificationService.create(
    playerId,
    "daily_reward", // Or create 'quest_reward' type — check with team
    "Quest reward claimed",
    `You claimed ${rewardParts.join(" + ")} for "${quest.label}"`,
    { questId, rewards: { coins: quest.rewardCoins, xp: quest.rewardXP, lootboxTypeId: quest.rewardLootboxTypeId } },
    { priority: 'normal' }
  );
} catch (e) {
  console.error("[QUEST] Claim notification failed:", e);
}
```

> ⚠️ **Decision needed**: Should quest rewards use `daily_reward` type or a new `quest_reward` type? For now, use `daily_reward` since the frontend already handles it, OR use `system` with clear title. **Actually, let's use `quest_reward` if the frontend is being updated (Stream 6). If Stream 6 hasn't run yet, use `system` as a safe fallback.** The plan says to add `quest_complete` to the type enum, so also add `quest_reward` to the enum in `src/shared/model.ts`.

### 3. `src/backend/services/sparks-service.ts`

Update both salvaging and re-roll notifications to use appropriate priority:

**Salvage** (around line 114):
```typescript
await notificationService.create(
  playerId,
  "system",
  "Stove salvaged",
  `You salvaged ${stove.name} and received ${sparks} sparks`,
  { stoveId, sparks },
  { priority: 'normal' } // Individual action, not grouped
);
```

**Re-roll** (around line 203):
```typescript
await notificationService.create(
  playerId,
  "system",
  "Heat re-rolled",
  `Your ${stove.name} now has ${newHeat}% heat`,
  { stoveId, newHeat },
  { priority: 'normal' }
);
```

### 4. `src/backend/routers/trade-router.ts`

Update trade completion notifications (around line 573, 580) to `priority: 'high'` since getting an item sold is important:

```typescript
// Buyer notification
await notificationService.create(
  buyerId,
  "trade_offer",
  "Purchase successful",
  `You bought ${listing.stoveName} for ${listing.price} coal`,
  { listingId, stoveId: listing.stoveId },
  { priority: 'high' }
);

// Seller notification
await notificationService.create(
  listing.sellerId,
  "trade_offer",
  "Item sold!",
  `Your ${listing.stoveName} sold for ${listing.price} coal`,
  { listingId, stoveId: listing.stoveId },
  { priority: 'high' }
);
```

### 5. `src/backend/routers/auth-router.ts`

Welcome notification (around line 1028) — keep `priority: 'normal'`:

```typescript
await notificationService.create(
  player.playerId,
  "system",
  "Welcome to Ember Exchange!",
  "Start forging stoves, trading, and earning rewards.",
  {},
  { priority: 'normal' }
);
```

### 6. `src/backend/routers/friend-router.ts`

Friend request notification — keep `priority: 'normal'`:

```typescript
await notificationService.create(
  targetPlayerId,
  "friend_request",
  "New friend request",
  `${senderUsername} wants to be your friend`,
  { fromPlayerId: senderId, fromUsername: senderUsername },
  { priority: 'normal' }
);
```

### 7. `src/backend/routers/chat-message-router.ts` and `src/backend/websocket/handlers/chat-message.ts`

Chat message notifications — keep `priority: 'normal'`:

```typescript
await notificationService.create(
  receiverId,
  "chat_message",
  "New message",
  `${senderUsername}: ${truncatedMessage}`,
  { fromPlayerId: senderId, fromUsername: senderUsername, messageId },
  { priority: 'normal' }
);
```

### 8. `src/backend/services/achievement-engine.ts`

Find where achievements unlock and add notification if not present. Check if it already calls `NotificationService.create`.

## Acceptance Criteria
- [ ] Buying multiple shop items groups into ≤1 notification
- [ ] Quest completion sends `quest_complete` notification with `priority: 'high'`
- [ ] Quest reward claim sends a notification
- [ ] Trade notifications use `priority: 'high'`
- [ ] All existing notification types still work
- [ ] No duplicate notifications for the same event

## Notes for Agent
- Use dynamic import for `NotificationService` inside `quest-service.ts` to avoid circular dependency if needed
- Keep all existing try/catch wrappers — notification failures must never break the main transaction
- Make sure the `groupKey` for shop purchases is consistent within a shopping session
- If `req.sessionID` is unavailable in `shop-service.ts`, use `playerId + date` fallback
