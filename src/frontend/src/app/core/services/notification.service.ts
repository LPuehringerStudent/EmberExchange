import { Injectable, inject, signal, effect } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';
import { HttpHeaders } from '@angular/common/http';
import type { NotificationRow } from '@shared/model';

export interface NotificationItem {
  notificationId: number;
  playerId: number;
  type: 'friend_request' | 'chat_message' | 'trade_offer' | 'daily_reward' | 'system' | 'quest_complete';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
  groupKey: string | null;
  count: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);

  unreadCount = signal<number>(0);
  notifications = signal<NotificationItem[]>([]);
  readonly lastHighPriorityNotification = signal<NotificationItem | null>(null);

  constructor() {
    effect(() => {
      const incoming = this.wsService.incomingNotification();
      if (incoming) {
        this.unreadCount.update(c => c + 1);
        this.loadNotifications();
        if (incoming.priority === 'high') {
          this.lastHighPriorityNotification.set(incoming as NotificationItem);
        }
      }
    });
  }

  async refresh(): Promise<void> {
    await Promise.all([this.loadNotifications(), this.loadUnreadCount()]);
  }

  async loadNotifications(): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;

    try {
      const items = await firstValueFrom(
        this.api.get<NotificationItem[]>('/notifications', new HttpHeaders({ 'session-id': sessionId }))
      );
      this.notifications.set(items);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  async loadUnreadCount(): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;

    try {
      const result = await firstValueFrom(
        this.api.get<{ count: number }>('/notifications/unread-count', new HttpHeaders({ 'session-id': sessionId }))
      );
      this.unreadCount.set(result.count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }

  async markAsRead(notificationId: number): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;

    try {
      await firstValueFrom(
        this.api.patch(`/notifications/${notificationId}/read`, null, new HttpHeaders({ 'session-id': sessionId }))
      );
      this.notifications.update(list =>
        list.map(n => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async markAllAsRead(): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;

    try {
      await firstValueFrom(
        this.api.patch('/notifications/read-all', null, new HttpHeaders({ 'session-id': sessionId }))
      );
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  async deleteNotification(notificationId: number): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;

    try {
      await firstValueFrom(
        this.api.delete(`/notifications/${notificationId}`, new HttpHeaders({ 'session-id': sessionId }))
      );
      const wasUnread = this.notifications().find(n => n.notificationId === notificationId && !n.isRead);
      this.notifications.update(list => list.filter(n => n.notificationId !== notificationId));
      if (wasUnread) {
        this.unreadCount.update(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }
}
