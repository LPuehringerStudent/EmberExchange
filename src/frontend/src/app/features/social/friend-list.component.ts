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
    <div class="h-full flex flex-col bg-surface border-r border-border">
      <!-- Header -->
      <div class="p-4 border-b border-border flex items-center justify-between">
        <h2 class="text-lg font-bold text-text-primary">
          @if (activeTab() === 'marketplace') { Messages } @else { Friends }
        </h2>
        @if (activeTab() !== 'marketplace') {
          <button
            (click)="onAddFriend.emit()"
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Add
          </button>
        }
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-border">
        <button
          (click)="onTabChange.emit('friends')"
          [class.border-b-2]="activeTab() === 'friends'"
          [class.border-accent]="activeTab() === 'friends'"
          [class.text-text-primary]="activeTab() === 'friends'"
          [class.text-text-secondary]="activeTab() !== 'friends'"
          class="flex-1 py-2.5 text-sm font-medium transition-colors"
        >
          Friends
        </button>
        <button
          (click)="onTabChange.emit('requests')"
          [class.border-b-2]="activeTab() === 'requests'"
          [class.border-accent]="activeTab() === 'requests'"
          [class.text-text-primary]="activeTab() === 'requests'"
          [class.text-text-secondary]="activeTab() !== 'requests'"
          class="flex-1 py-2.5 text-sm font-medium transition-colors"
        >
          Requests
          @if (pendingRequests().length > 0) {
            <span class="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold">
              {{ pendingRequests().length }}
            </span>
          }
        </button>
        <button
          (click)="onTabChange.emit('marketplace')"
          [class.border-b-2]="activeTab() === 'marketplace'"
          [class.border-accent]="activeTab() === 'marketplace'"
          [class.text-text-primary]="activeTab() === 'marketplace'"
          [class.text-text-secondary]="activeTab() !== 'marketplace'"
          class="flex-1 py-2.5 text-sm font-medium transition-colors"
        >
          Marketplace
          @if (marketplaceUnreadCount() > 0) {
            <span class="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold">
              {{ marketplaceUnreadCount() }}
            </span>
          }
        </button>
      </div>

      <!-- Friends list -->
      @if (activeTab() === 'friends') {
        <div class="flex-1 overflow-y-auto">
          @for (friend of friends(); track friend.friendId) {
            <div
              (click)="onSelectFriend.emit(friend)"
              [class.bg-accent/10]="selectedFriendId() === friend.friendId"
              class="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-hover transition-colors border-b border-border/50"
            >
              <div class="relative">
                <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {{ friend.username.charAt(0).toUpperCase() }}
                </div>
                <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-text-primary truncate">{{ friend.username }}</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      (click)="$event.stopPropagation(); onViewGlory.emit(getFriendPlayerId(friend))"
                      class="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[0.625rem] font-semibold hover:bg-accent hover:text-white transition-colors"
                      title="View Hall of Glory"
                    >
                      ✦ Glory
                    </button>
                    @if (friend.unreadCount > 0) {
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold">
                        {{ friend.unreadCount }}
                      </span>
                    }
                  </div>
                </div>
                @if (friend.lastMessage) {
                  <p class="text-xs text-text-secondary truncate mt-0.5">{{ friend.lastMessage }}</p>
                }
              </div>
            </div>
          } @empty {
            <div class="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div class="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center text-3xl mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                👋
              </div>
              <p class="text-base font-semibold text-text-primary m-0 mb-1">No friends yet</p>
              <span class="text-sm text-text-secondary mb-5">Send a request to start chatting</span>
              <button
                (click)="onAddFriend.emit()"
                class="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Add Friend
              </button>
            </div>
          }
        </div>
      }

      <!-- Requests list -->
      @if (activeTab() === 'requests') {
        <div class="flex-1 overflow-y-auto">
          @for (req of pendingRequests(); track req.friendId) {
            <div class="flex items-center gap-3 p-3 border-b border-border/50">
              <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                {{ req.username.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-text-primary">{{ req.username }}</span>
                <p class="text-xs text-text-secondary">Wants to be your friend</p>
              </div>
              <div class="flex gap-2">
                <button
                  (click)="onRespondRequest.emit({ friendId: req.friendId, accept: true })"
                  class="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Accept
                </button>
                <button
                  (click)="onRespondRequest.emit({ friendId: req.friendId, accept: false })"
                  class="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Decline
                </button>
              </div>
            </div>
          } @empty {
            <div class="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div class="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center text-3xl mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                📭
              </div>
              <p class="text-base font-semibold text-text-primary m-0 mb-1">No pending requests</p>
              <span class="text-sm text-text-secondary">Check back later for new requests</span>
            </div>
          }
        </div>
      }

      <!-- Marketplace messages list -->
      @if (activeTab() === 'marketplace') {
        <div class="flex-1 overflow-y-auto">
          @for (thread of marketplaceThreads(); track thread.playerId) {
            <div
              (click)="onSelectMarketplaceThread.emit(thread)"
              [class.bg-accent/10]="selectedMarketplacePlayerId() === thread.playerId"
              class="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-hover transition-colors border-b border-border/50"
            >
              <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                {{ thread.username.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-text-primary truncate">{{ thread.username }}</span>
                  @if (thread.unreadCount > 0) {
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-xs font-bold">
                      {{ thread.unreadCount }}
                    </span>
                  }
                </div>
                @if (thread.lastMessage) {
                  <p class="text-xs text-text-secondary truncate mt-0.5">{{ thread.lastMessage }}</p>
                }
              </div>
            </div>
          } @empty {
            <div class="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div class="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center text-3xl mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                💬
              </div>
              <p class="text-base font-semibold text-text-primary m-0 mb-1">No marketplace messages</p>
              <span class="text-sm text-text-secondary">Messages from buyers or sellers will appear here</span>
            </div>
          }
        </div>
      }
    </div>
  `,
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

  getFriendPlayerId(friend: FriendWithUser): number {
    const currentId = this.currentPlayerId();
    return friend.requesterId === currentId ? friend.addresseeId : friend.requesterId;
  }
}
