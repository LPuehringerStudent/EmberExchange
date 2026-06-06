# Stream 6: Frontend Notification UI Polish

## Goal
Update the notification bell dropdown and toast integration to display grouped notifications beautifully and celebrate high-priority events.

## Files to Modify

### 1. `src/frontend/src/app/shared/components/notification-bell.component.ts`

#### Subscribe to high-priority notifications:
```typescript
import { Subject, takeUntil } from 'rxjs';

export class NotificationBellComponent implements OnInit, OnDestroy {
  // ... existing injections ...
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    void this.notificationService.refresh();
    this.lastCount = this.unreadCount();

    // NEW: Subscribe to high-priority notifications for instant toasts
    this.notificationService.highPriorityNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.toastService.success(notification.title, notification.message);
        this.shakeBell.set(true);
        setTimeout(() => this.shakeBell.set(false), 600);
      });

    // Existing polling...
    setInterval(() => { ... }, 15000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ... rest of component ...
}
```

#### Add quest icon and color:
```typescript
getTypeIcon(type: string): string {
  switch (type) {
    case 'chat_message': return '💬';
    case 'trade_offer': return '🤝';
    case 'daily_reward': return '🎁';
    case 'friend_request': return '👤';
    case 'quest_complete': return '🏆';  // NEW
    case 'system': return '🔔';
    default: return '•';
  }
}

getTypeLabel(type: string): string {
  switch (type) {
    case 'chat_message': return 'Chat';
    case 'trade_offer': return 'Trade';
    case 'daily_reward': return 'Reward';
    case 'friend_request': return 'Friend';
    case 'quest_complete': return 'Quest';  // NEW
    case 'system': return 'System';
    default: return type;
  }
}

// NEW: Get CSS class for priority-based styling
getPriorityClass(notification: NotificationItem): string {
  if (notification.type === 'quest_complete') return 'quest-complete';
  if (notification.priority === 'high') return 'priority-high';
  if (notification.priority === 'low') return 'priority-low';
  return '';
}
```

### 2. `src/frontend/src/app/shared/components/notification-bell.component.html`

#### Update notification item rendering:

```html
@for (notification of notifications(); track notification.notificationId) {
  <div
    class="notification-item flex items-start gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all duration-180 relative mb-1 last:mb-0"
    [class.unread]="!notification.isRead"
    [class.quest-complete]="notification.type === 'quest_complete'"
    [class.priority-high]="notification.priority === 'high' && notification.type !== 'quest_complete'"
    (click)="markAsRead(notification.notificationId, $event)"
  >
    <div [class]="'notification-accent accent-' + notification.type"></div>
    <div class="w-9 h-9 rounded-[10px] bg-surface-secondary flex items-center justify-center text-base flex-shrink-0 mt-0.5 transition-colors duration-200">
      {{ getTypeIcon(notification.type) }}
      <!-- NEW: Show count badge for grouped notifications -->
      @if (notification.count > 1) {
        <span class="count-badge">{{ notification.count }}</span>
      }
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <span [class]="'type-label type-' + notification.type">{{ getTypeLabel(notification.type) }}</span>
        <span class="text-[11px] text-text-muted font-medium">{{ relativeTime(notification.updatedAt || notification.createdAt) }}</span>
      </div>
      <div class="text-[13px] font-semibold text-text-primary leading-tight mb-0.5">{{ notification.title }}</div>
      <div class="text-xs text-text-secondary leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">{{ notification.message }}</div>
    </div>
    <button
      class="notification-delete bg-transparent border-none text-text-muted text-[13px] cursor-pointer p-1 rounded-md leading-none flex-shrink-0 mt-0.5 opacity-0 transition-all duration-150"
      (click)="deleteNotification(notification.notificationId, $event)"
      title="Delete"
    >
      ✕
    </button>
  </div>
}
```

> ⚠️ **Check the actual CSS class names in the existing file** and adapt. The above uses illustrative class names.

### 3. `src/frontend/src/app/shared/components/notification-bell.component.css`

#### Add quest-complete styling:
```css
.notification-item.quest-complete {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%);
  border: 1px solid rgba(251, 191, 36, 0.15);
}

.notification-item.quest-complete .notification-accent {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.notification-item.quest-complete .type-label {
  background: rgba(251, 191, 36, 0.15);
  color: #f59e0b;
}
```

#### Add count badge styling:
```css
.count-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--surface-bg, #1a1a1a);
}
```

#### Add priority-high styling:
```css
.notification-item.priority-high {
  border-left: 3px solid #22c55e;
}
```

### 4. `src/frontend/src/app/core/layout/shell.component.html` (or wherever toast subscription lives)

Make sure the toast host is positioned correctly. No changes likely needed, but verify `app-toast-host` is present in `app.component.ts`:

```typescript
// In app.component.ts template
@Component({
  template: `
    <app-shell />
    <app-toast-host />
  `,
  // ...
})
```

## Acceptance Criteria
- [ ] Grouped notifications show a red count badge (e.g., "x5")
- [ ] `quest_complete` notifications have gold/orange styling (🏆 icon + gradient bg)
- [ ] High-priority notifications trigger toast immediately via WebSocket
- [ ] Relative time shows `updatedAt` for grouped notifications, `createdAt` otherwise
- [ ] Bell shakes on high-priority notification arrival
- [ ] Badge updates instantly on WebSocket notification
- [ ] All notification types still display correctly
- [ ] Empty state still works

## Notes for Agent
- The CSS class names (`text-text-primary`, `bg-surface-secondary`, etc.) are likely Tailwind or custom CSS variables. **Match the existing naming convention exactly.**
- The `notification-accent` element is a thin colored bar on the left — check its existing CSS and replicate for `quest_complete`
- Make sure the count badge doesn't overflow on small screens
- Test the unread state styling — grouped notifications should still show as unread until clicked
- If the component uses Tailwind exclusively (no `.css` file), add the styles to the component's `:host` or inline styles, or add to `styles.css`/`tailwind.config.js`
