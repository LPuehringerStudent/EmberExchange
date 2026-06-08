# Stream 4: WebSocket Real-time Push

## Goal
Broadcast high-priority notifications via WebSocket so connected clients see them instantly instead of waiting for the 15s poll.

## Architecture

```
Backend Event → NotificationService.create() 
                    │
                    ▼ (if priority === 'high')
              WebSocketManager.emit(playerId, 'notification:new', payload)
                    │
                    ▼
              Frontend WebSocket listener
                    │
                    ▼
              ToastService.show() + NotificationService.refresh()
```

## Files to Modify

### 1. `src/backend/services/notification-service.ts`

Add WebSocket broadcast inside `create()`, **after** the notification is successfully created/updated:

```typescript
import { getWebSocketManager } from "../websocket/websocket-manager"; // Check actual path

// At the end of create(), after successful insert or group update:
if (priority === 'high') {
  try {
    const wsManager = getWebSocketManager();
    const payload = {
      notificationId: id, // the created or updated notification ID
      type,
      title,
      message,
      priority,
      count: groupKey ? (existing?.count ?? 1) : 1,
      createdAt: new Date().toISOString()
    };
    wsManager.emitToPlayer(playerId, 'notification:new', payload);
  } catch (e) {
    console.error('[NotificationService] WebSocket broadcast failed:', e);
  }
}
```

> ⚠️ **You must verify the actual WebSocket manager path and API.** Search for existing WebSocket emit patterns in the codebase.

### 2. Find and verify WebSocket manager

Search for existing WebSocket infrastructure:
```bash
grep -r "emitToPlayer\|broadcast\|websocket" src/backend/websocket/ --include="*.ts"
```

Common patterns to look for:
- `WebSocketManager` class
- `wsManager.sendToPlayer(playerId, data)`
- `io.to(`player:${playerId}`).emit(...)` (if using Socket.IO)
- `wss.clients.forEach(...)` (raw WS)

If the project has an existing `src/backend/websocket/websocket-manager.ts`, read it and use its API.

If **no player-targeted emit exists**, add one:

```typescript
// In websocket-manager.ts (or similar)
private playerSockets = new Map<number, WebSocket>(); // playerId -> socket

public registerPlayer(playerId: number, socket: WebSocket): void {
  this.playerSockets.set(playerId, socket);
}

public unregisterPlayer(playerId: number): void {
  this.playerSockets.delete(playerId);
}

public emitToPlayer(playerId: number, event: string, payload: unknown): void {
  const socket = this.playerSockets.get(playerId);
  if (socket && socket.readyState === 1) { // OPEN
    socket.send(JSON.stringify({ event, payload }));
  }
}
```

Make sure player socket registration happens during auth/handshake.

### 3. `src/frontend/src/app/core/services/notification.service.ts`

Add WebSocket listener:

```typescript
import { Injectable, inject, signal, NgZone } from '@angular/core';
import { WebSocketService } from './websocket.service'; // Check actual path

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService); // NEW
  private zone = inject(NgZone); // NEW
  // ... existing signals ...

  constructor() {
    this.listenForWebSocketNotifications();
  }

  private listenForWebSocketNotifications(): void {
    // Check how your WebSocketService exposes messages
    // Common patterns:
    this.wsService.onMessage$.subscribe((msg: any) => {
      if (msg.event === 'notification:new') {
        this.zone.run(() => {
          // Update unread count
          this.unreadCount.update(c => c + 1);
          // Refresh the list to get full data
          this.loadNotifications();
        });
      }
    });

    // OR if it's an EventEmitter:
    // this.wsService.addListener('notification:new', (payload) => { ... });
  }
}
```

### 4. `src/frontend/src/app/shared/components/notification-bell.component.ts`

Add toast trigger for high-priority WebSocket notifications:

```typescript
// In the constructor or ngOnInit, subscribe to a new signal or Subject
// from NotificationService that emits when a high-priority notification arrives

// Alternative: NotificationService exposes a highPriorityNotification$ Observable
// that the bell component (or toast service) subscribes to
```

Better approach: Add to `NotificationService`:

```typescript
highPriorityNotification$ = new Subject<NotificationItem>();

// In listenForWebSocketNotifications:
if (msg.event === 'notification:new' && msg.payload.priority === 'high') {
  this.zone.run(() => {
    this.highPriorityNotification$.next(msg.payload as NotificationItem);
    this.unreadCount.update(c => c + 1);
    this.loadNotifications();
  });
}
```

Then in `notification-bell.component.ts` or `app.component.ts`:

```typescript
// Subscribe and show toast
this.notificationService.highPriorityNotification$.subscribe(n => {
  this.toastService.success(n.title, n.message);
});
```

## Acceptance Criteria
- [ ] High-priority notifications (`quest_complete`, `trade_offer`) trigger WebSocket message within 1 second
- [ ] Frontend receives WebSocket message and shows toast immediately
- [ ] Bell badge updates without waiting for next 15s poll
- [ ] If WebSocket is disconnected, polling still works as fallback
- [ ] Low-priority notifications do NOT spam WebSocket (only poll)

## Notes for Agent
- **CRITICAL**: Find the actual WebSocket setup before writing code. Search for `websocket`, `ws`, `socket.io` in the backend.
- The WebSocket emit must happen **outside** the main DB transaction if possible, or be wrapped in its own try/catch so DB commits even if WS fails
- If the project doesn't have player-specific socket tracking, you'll need to add it — check the auth/connection handshake first
- Frontend WebSocket integration must use `NgZone.run()` because WS callbacks run outside Angular's zone
