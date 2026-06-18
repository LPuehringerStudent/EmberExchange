import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { FriendWithUser } from '@shared/model';
export type { FriendWithUser };

export interface FriendWithPreview extends FriendWithUser {
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: Date;
}

export interface MarketplaceThread {
  playerId: number;
  username: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inbox-sidebar">
      <header class="sidebar-header">
        <div>
          <p class="sidebar-kicker">Socials</p>
          <h2>{{ title() }}</h2>
        </div>
        @if (activeTab() !== 'marketplace') {
          <button type="button" class="new-message-btn" (click)="onAddFriend.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
            New
          </button>
        }
      </header>

      <section class="filter-panel" aria-label="Conversation filters">
        <p class="section-label">Filters</p>
        <button type="button" class="filter-row" [class.active]="activeTab() === 'friends'" (click)="onTabChange.emit('friends')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          </svg>
          <span>All Friends</span>
          <b>{{ friends().length }}</b>
        </button>
        <button type="button" class="filter-row" [class.active]="activeTab() === 'marketplace'" (click)="onTabChange.emit('marketplace')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>Marketplace</span>
          @if (marketplaceUnreadCount() > 0) {
            <b>{{ marketplaceUnreadCount() }}</b>
          }
        </button>
        <button type="button" class="filter-row" [class.active]="activeTab() === 'requests'" (click)="onTabChange.emit('requests')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          <span>Requests</span>
          @if (pendingRequests().length > 0) {
            <b>{{ pendingRequests().length }}</b>
          }
        </button>
      </section>

      <section class="conversation-list">
        <p class="section-label">{{ listLabel() }}</p>

        @if (activeTab() === 'friends') {
          <div class="list-scroll">
            @for (friend of friends(); track friend.friendId) {
              <button
                type="button"
                (click)="onSelectFriend.emit(friend)"
                class="conversation-row"
                [class.active]="selectedFriendId() === friend.friendId"
              >
                <div class="avatar">{{ friend.username.charAt(0).toUpperCase() }}</div>
                <div class="conversation-copy">
                  <span class="conversation-name">{{ friend.username }}</span>
                  @if (friend.lastMessage) {
                    <p>{{ friend.lastMessage }}</p>
                  } @else {
                    <p>No messages yet</p>
                  }
                </div>
                <div class="conversation-actions">
                  <span class="status-dot"></span>
                  @if (friend.unreadCount > 0) {
                    <span class="count-pill">{{ friend.unreadCount }}</span>
                  }
                  <span class="glory-link" (click)="$event.stopPropagation(); onViewGlory.emit(getFriendPlayerId(friend))">
                    Glory
                  </span>
                </div>
              </button>
            } @empty {
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                </svg>
                <p>No friends yet</p>
                <span>Send a request to start chatting.</span>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'requests') {
          <div class="list-scroll">
            @for (req of pendingRequests(); track req.friendId) {
              <div class="request-row">
                <div class="avatar">{{ req.username.charAt(0).toUpperCase() }}</div>
                <div class="conversation-copy">
                  <span class="conversation-name">{{ req.username }}</span>
                  <p>Wants to be your friend</p>
                </div>
                <div class="request-actions">
                  <button type="button" class="accept" (click)="onRespondRequest.emit({ friendId: req.friendId, accept: true })">Accept</button>
                  <button type="button" class="decline" (click)="onRespondRequest.emit({ friendId: req.friendId, accept: false })">Decline</button>
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No pending requests</p>
                <span>New requests will appear here.</span>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'marketplace') {
          <div class="list-scroll">
            @for (thread of marketplaceThreads(); track thread.playerId) {
              <button
                type="button"
                (click)="onSelectMarketplaceThread.emit(thread)"
                class="conversation-row"
                [class.active]="selectedMarketplacePlayerId() === thread.playerId"
              >
                <div class="avatar marketplace">{{ thread.username.charAt(0).toUpperCase() }}</div>
                <div class="conversation-copy">
                  <span class="conversation-name">{{ thread.username }}</span>
                  @if (thread.lastMessage) {
                    <p>{{ thread.lastMessage }}</p>
                  }
                </div>
                <div class="conversation-actions">
                  <time>{{ thread.lastMessageAt | date:'shortTime' }}</time>
                  @if (thread.unreadCount > 0) {
                    <span class="count-pill">{{ thread.unreadCount }}</span>
                  }
                </div>
              </button>
            } @empty {
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                  <path d="M3 6h18"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <p>No marketplace messages</p>
                <span>Buyer and seller conversations will appear here.</span>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styleUrl: './friend-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendListComponent {
  friends = input.required<FriendWithPreview[]>();
  pendingRequests = input.required<FriendWithUser[]>();
  marketplaceThreads = input.required<MarketplaceThread[]>();
  selectedFriendId = input<number | null>(null);
  selectedMarketplacePlayerId = input<number | null>(null);
  activeTab = input.required<'friends' | 'requests' | 'marketplace'>();
  currentPlayerId = input<number>(0);

  onSelectFriend = output<FriendWithUser>();
  onSelectMarketplaceThread = output<MarketplaceThread>();
  onViewGlory = output<number>();
  onAddFriend = output<void>();
  onRespondRequest = output<{ friendId: number; accept: boolean }>();
  onTabChange = output<'friends' | 'requests' | 'marketplace'>();

  marketplaceUnreadCount = computed(() =>
    this.marketplaceThreads().reduce((sum, t) => sum + t.unreadCount, 0)
  );

  title = computed(() => {
    if (this.activeTab() === 'marketplace') return 'Marketplace';
    if (this.activeTab() === 'requests') return 'Requests';
    return 'All Conversations';
  });

  listLabel = computed(() => {
    if (this.activeTab() === 'marketplace') return 'Marketplace Threads';
    if (this.activeTab() === 'requests') return 'Pending Requests';
    return 'Friend Conversations';
  });

  getFriendPlayerId(friend: FriendWithUser): number {
    const currentId = this.currentPlayerId();
    return friend.requesterId === currentId ? friend.addresseeId : friend.requesterId;
  }
}
