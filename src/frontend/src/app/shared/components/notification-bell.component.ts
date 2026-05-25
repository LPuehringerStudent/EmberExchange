import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationBellComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private toastService = inject(ToastService);
  private elRef = inject(ElementRef);

  dropdownOpen = signal(false);
  shakeBell = signal(false);
  lastCount = 0;

  unreadCount = this.notificationService.unreadCount;
  notifications = this.notificationService.notifications;

  ngOnInit(): void {
    void this.notificationService.refresh();
    this.lastCount = this.unreadCount();

    // Poll every 15s for new notifications
    setInterval(() => {
      void this.notificationService.loadUnreadCount().then(() => {
        const current = this.unreadCount();
        if (current > this.lastCount) {
          this.shakeBell.set(true);
          setTimeout(() => this.shakeBell.set(false), 600);
          void this.notificationService.loadNotifications();
        }
        this.lastCount = current;
      });
    }, 15000);
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
    if (this.dropdownOpen()) {
      void this.notificationService.loadNotifications();
    }
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  async markAsRead(notificationId: number, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    await this.notificationService.markAsRead(notificationId);
  }

  async markAllAsRead(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    await this.notificationService.markAllAsRead();
    this.toastService.success('All notifications marked as read');
  }

  async deleteNotification(notificationId: number, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    await this.notificationService.deleteNotification(notificationId);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'chat_message': return '💬';
      case 'trade_offer': return '🤝';
      case 'daily_reward': return '🎁';
      case 'friend_request': return '👤';
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
      case 'system': return 'System';
      default: return type;
    }
  }

  relativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }
}
