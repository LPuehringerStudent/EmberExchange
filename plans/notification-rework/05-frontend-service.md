# Stream 5: Frontend Notification Service Update

## Goal
Update the Angular `NotificationService` and `NotificationItem` model to handle grouped notifications, new types, and WebSocket integration.

## Files to Modify

### 1. `src/frontend/src/app/core/services/notification.service.ts`

**Full rewrite considerations** — update the existing file:

#### Update `NotificationItem` interface:
```typescript
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationItem {
  notificationId: number;
  playerId: number;
  type: 'friend_request' | 'chat_message' | 'trade_offer' | 'daily_reward' | 'system' | 'quest_complete';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  priority: NotificationPriority;  // NEW
  groupKey: string | null;         // NEW
  count: number;                   // NEW
  expiresAt: string | null;        // NEW
  createdAt: string;
  updatedAt: string;               // NEW
}
```

#### Add high-priority Observable:
```typescript
import { Subject } from 'rxjs';

export class NotificationService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  
  unreadCount = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);
  
  // NEW: Observable for high-priority real-time notifications
  highPriorityNotification$ = new Subject<NotificationItem>();

  // ... existing methods ...
}
```

#### Update `loadNotifications()`:
No major changes needed — the API returns the new fields automatically since they come from `NotificationRow`.

#### Add WebSocket hook placeholder:
```typescript
// This will be wired up in Stream 4, but add the method now:
handleWebSocketNotification(payload: Partial<NotificationItem>): void {
  if (payload.priority === 'high') {
    this.highPriorityNotification$.next(payload as NotificationItem);
  }
  this.unreadCount.update(c => c + 1);
  // Optionally prepend to notifications list without full reload
  this.notifications.update(list => [payload as NotificationItem, ...list]);
}
```

### 2. `src/frontend/src/app/core/services/toast.service.ts`

No changes needed unless you want to add a `notification()` helper method. The existing `success()`, `info()`, `warning()`, `error()` methods are sufficient.

### 3. `src/frontend/src/app/features/settings/pages/notifications/notifications.component.ts`

Add the new `notifyShopPurchases` toggle:

```typescript
// In the component class, add to the form/signals:
notifyShopPurchases = signal<boolean>(true);

// In loadSettings(), include:
this.notifyShopPurchases.set(settings.notifyShopPurchases);

// In saveSettings(), include:
settings.notifyShopPurchases = this.notifyShopPurchases();
```

### 4. `src/frontend/src/app/features/settings/pages/notifications/notifications.component.html`

Add a new toggle card after the existing 4:

```html
<!-- Shop Purchase Notifications -->
<div class="settings-card">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold text-text-primary">Shop Purchases</h3>
      <p class="text-xs text-text-muted">Get notified when you buy items from the shop</p>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" [checked]="notifyShopPurchases()" (change)="notifyShopPurchases.set($event.target.checked); saveSettings()">
      <span class="toggle-slider"></span>
    </label>
  </div>
</div>
```

> ⚠️ **Check the actual toggle markup in the file** — the above is illustrative. Copy the existing toggle structure exactly.

## Acceptance Criteria
- [ ] `NotificationItem` includes all new fields from backend
- [ ] `NotificationService` exposes `highPriorityNotification$` Subject
- [ ] Settings page has a working "Shop Purchases" toggle
- [ ] Settings save/load includes `notifyShopPurchases`
- [ ] TypeScript compilation passes

## Notes for Agent
- Do NOT break the polling logic — it remains the fallback
- The WebSocket integration from Stream 4 will call `handleWebSocketNotification()` — make sure this method exists
- Check if settings are loaded via a separate `PlayerSettingsService` — if so, update that too
- The `highPriorityNotification$` Subject should be imported from `rxjs`, not `rxjs/operators`
