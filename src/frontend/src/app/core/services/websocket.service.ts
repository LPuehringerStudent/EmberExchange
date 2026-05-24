import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import type { ChatMessageRow } from '@shared/model';

export type WsConnectionState = 'closed' | 'connecting' | 'open' | 'reconnecting';

export interface WsError {
  code: string;
  message: string;
}

export interface PlayerInRoom {
  playerId: number;
  seatIndex: number;
  connectionState: string;
  username?: string;
  activeTitle?: { titleId?: string; label: string; animation?: string } | null;
  activeBanner?: { bannerId?: number; name: string; cssClass?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private auth = inject(AuthService);

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 8000;
  private seq = 0;
  private shouldReconnect = true;

  private currentRoomId: string | null = null;

  readonly connectionState = signal<WsConnectionState>('closed');
  readonly lastError = signal<WsError | null>(null);
  readonly playersInRoom = signal<PlayerInRoom[]>([]);
  readonly currentVersion = signal<number>(0);
  readonly stateBlob = signal<Record<string, unknown> | null>(null);
  readonly incomingChatMessage = signal<ChatMessageRow | null>(null);

  connect(): void {
    if (this.ws) {
      return;
    }

    const sessionId = this.auth.getSessionId();
    if (!sessionId) {
      console.error('Cannot connect WebSocket: no session');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}`;

    this.connectionState.set('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionState.set('open');
      this.lastError.set(null);

      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        this.handleServerMessage(msg);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.ws = null;
      if (event.code === 1008) {
        // Permanent auth failure — stop reconnecting
        this.shouldReconnect = false;
        this.connectionState.set('closed');
        this.lastError.set({ code: 'AUTH_EXPIRED', message: 'Session expired. Please log in again.' });
        return;
      }
      if (this.shouldReconnect) {
        this.connectionState.set('reconnecting');
        this.scheduleReconnect();
      } else {
        this.connectionState.set('closed');
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this.currentRoomId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionState.set('closed');
  }

  joinRoom(roomId: string): void {
    this.currentRoomId = roomId;
    this.send({
      type: 'join_room',
      payload: { roomId },
      clientTimestamp: Date.now(),
      sequenceNumber: this.nextSeq()
    });
  }

  leaveRoom(): void {
    if (this.currentRoomId) {
      this.send({
        type: 'leave_room',
        payload: { roomId: this.currentRoomId },
        clientTimestamp: Date.now(),
        sequenceNumber: this.nextSeq()
      });
      this.currentRoomId = null;
    }
  }

  sendAction(actionType: string, actionData: Record<string, unknown> = {}): void {
    if (!this.currentRoomId) {
      return;
    }
    this.send({
      type: 'player_action',
      payload: {
        roomId: this.currentRoomId,
        actionType,
        actionData,
        expectedVersion: this.currentVersion()
      },
      clientTimestamp: Date.now(),
      sequenceNumber: this.nextSeq()
    });
  }

  requestSync(): void {
    if (!this.currentRoomId) {
      return;
    }
    this.send({
      type: 'request_sync',
      payload: { roomId: this.currentRoomId },
      clientTimestamp: Date.now(),
      sequenceNumber: this.nextSeq()
    });
  }

  sendStartGame(): void {
    if (!this.currentRoomId) {
      return;
    }
    this.send({
      type: 'start_game',
      payload: { roomId: this.currentRoomId },
      clientTimestamp: Date.now(),
      sequenceNumber: this.nextSeq()
    });
  }

  sendChatMessage(receiverId: number, content: string): void {
    this.send({
      type: 'chat_message',
      payload: { receiverId, content },
      clientTimestamp: Date.now(),
      sequenceNumber: this.nextSeq()
    });
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private nextSeq(): number {
    return ++this.seq;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleServerMessage(msg: Record<string, unknown>): void {
    const type = msg['type'] as string;
    const payload = (msg['payload'] as Record<string, unknown>) || {};

    switch (type) {
      case 'state_update': {
        const blob = payload['stateBlob'] as Record<string, unknown> | undefined;
        const version = payload['version'] as number | undefined;
        this.stateBlob.set(blob ?? null);
        if (typeof version === 'number') {
          this.currentVersion.set(version);
        }
        if (blob && Array.isArray(blob['players'])) {
          this.playersInRoom.set(blob['players'] as PlayerInRoom[]);

          // Keep the header coin display in sync with the in-game stack
          const currentUser = this.auth.getCurrentUser();
          if (currentUser) {
            const me = (blob['players'] as Array<{ playerId: number; stack?: number }>)
              .find(p => p.playerId === currentUser.playerId);
            if (me && typeof me.stack === 'number') {
              this.auth.patchCurrentUserCoins(me.stack);
            }
          }
        }
        break;
      }
      case 'player_joined':
        // state_update will follow with full state
        break;
      case 'player_left':
        // state_update will follow with full state
        break;
      case 'error': {
        const code = payload['code'] as string;
        const message = payload['message'] as string;
        this.lastError.set({ code: code || 'UNKNOWN', message: message || 'Unknown error' });
        break;
      }
      case 'chat_message': {
        const chatMsg = payload as unknown as ChatMessageRow;
        this.incomingChatMessage.set(chatMsg);
        break;
      }
    }
  }
}
