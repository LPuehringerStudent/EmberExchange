import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FriendService, type Friend } from '../../core/services/friend.service';
import { PlayerService } from '../../core/services/player.service';
import { ChatMessageService, type ChatMessage } from '../../core/services/chat-message.service';
import { TradeOfferService } from '../../core/services/trade-offer.service';
import { StoveService } from '../../core/services/stove.service';
import { LootboxService } from '../../core/services/lootbox.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FriendListComponent, type FriendWithPreview } from './friend-list.component';
import { ChatThreadComponent } from './chat-thread.component';
import { AddFriendModalComponent } from './add-friend-modal.component';
import { TradeOfferModalComponent, type TradeableItem } from './trade-offer-modal.component';
import type { FriendWithUser, ChatMessageRow } from '@shared/model';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [
    CommonModule,
    FriendListComponent,
    ChatThreadComponent,
    AddFriendModalComponent,
    TradeOfferModalComponent
  ],
  templateUrl: './social.component.html',
  styleUrl: './social.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocialComponent implements OnInit, OnDestroy {
  private friendService = inject(FriendService);
  private chatService = inject(ChatMessageService);
  private tradeOfferService = inject(TradeOfferService);
  private stoveService = inject(StoveService);
  private lootboxService = inject(LootboxService);
  private playerService = inject(PlayerService);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  friends = signal<FriendWithPreview[]>([]);
  pendingRequests = signal<FriendWithUser[]>([]);
  selectedFriend = signal<FriendWithUser | null>(null);
  messages = signal<ChatMessageRow[]>([]);
  activeTab = signal<'friends' | 'requests'>('friends');
  showAddFriendModal = signal(false);
  showTradeOfferModal = signal(false);
  tradeItems = signal<TradeableItem[]>([]);
  currentPlayerId = signal(0);

  private unreadCounts = new Map<number, number>();
  private wsSub?: () => void;

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.currentPlayerId.set(user.playerId);
    }

    this.loadFriends();
    this.loadPendingRequests();
    this.loadInventory();

    // Ensure WebSocket is connected
    this.ws.connect();

    // Subscribe to incoming chat messages
    this.wsSub = this.subscribeToChatMessages();
  }

  ngOnDestroy(): void {
    if (this.wsSub) {
      this.wsSub();
    }
  }

  async loadFriends(): Promise<void> {
    try {
      const list = await firstValueFrom(this.friendService.getFriends());
      const withPreview: FriendWithPreview[] = list.map(f => ({
        ...f,
        unreadCount: this.unreadCounts.get(f.friendId) ?? 0
      }));
      this.friends.set(withPreview);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }

  async loadPendingRequests(): Promise<void> {
    try {
      const list = await firstValueFrom(this.friendService.getPendingRequests());
      this.pendingRequests.set(list);
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  }

  async loadInventory(): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const stoves = await firstValueFrom(this.stoveService.getStovesByPlayerId(user.playerId));
      const tradeableStoves: TradeableItem[] = stoves.map(s => ({
        id: s.stoveId,
        name: (s as unknown as Record<string, string>)['name'] || `Stove #${s.stoveId}`,
        type: 'stove' as const,
        rarity: (s as unknown as Record<string, string>)['rarity'],
        imageUrl: (s as unknown as Record<string, string>)['imageUrl']
      }));

      // Lootboxes would need type name resolution; skip for now
      this.tradeItems.set(tradeableStoves);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  }

  async selectFriend(friend: FriendWithUser): Promise<void> {
    this.selectedFriend.set(friend);
    this.activeTab.set('friends');

    // Clear unread count
    this.unreadCounts.set(friend.friendId, 0);
    this.friends.update(list =>
      list.map(f => f.friendId === friend.friendId ? { ...f, unreadCount: 0 } : f)
    );

    // Load conversation
    const otherId = friend.requesterId === this.currentPlayerId() ? friend.addresseeId : friend.requesterId;
    try {
      const msgs = await firstValueFrom(
        this.chatService.getConversationPaginated(this.currentPlayerId(), otherId, 50, 0)
      );
      this.messages.set(msgs);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  async sendMessage(text: string): Promise<void> {
    const friend = this.selectedFriend();
    if (!friend) return;

    const otherId = friend.requesterId === this.currentPlayerId() ? friend.addresseeId : friend.requesterId;

    // Optimistically add message to UI
    const optimisticMsg: ChatMessageRow = {
      messageId: 0,
      senderId: this.currentPlayerId(),
      receiverId: otherId,
      content: text,
      sentAt: new Date(),
      isRead: true,
      messageType: 'text',
      data: {}
    };
    this.messages.update(msgs => [...msgs, optimisticMsg]);

    // Send via WebSocket for real-time delivery (also stores in DB)
    const wsConnected = this.ws.connectionState() === 'open';
    this.ws.sendChatMessage(otherId, text);

    // Only use REST fallback if WebSocket is not connected
    if (!wsConnected) {
      try {
        await firstValueFrom(
          this.chatService.sendChatMessage(this.currentPlayerId(), text, otherId)
        );
      } catch (err) {
        console.error('Failed to send message:', err);
        this.toast.error('Failed to send message');
        // Remove optimistic message on failure
        this.messages.update(msgs =>
          msgs.filter(m => !(m.messageId === 0 && m.content === text && m.senderId === this.currentPlayerId()))
        );
        return;
      }
    }

    // Refresh to get the real message with proper ID and timestamp
    try {
      const msgs = await firstValueFrom(
        this.chatService.getConversationPaginated(this.currentPlayerId(), otherId, 50, 0)
      );
      this.messages.set(msgs);
    } catch (err) {
      console.error('Failed to refresh conversation:', err);
    }
  }

  async respondToRequest(friendId: number, accept: boolean): Promise<void> {
    try {
      await firstValueFrom(this.friendService.respondToRequest(friendId, accept));
      this.toast.success(accept ? 'Friend request accepted' : 'Friend request declined');
      this.loadFriends();
      this.loadPendingRequests();
    } catch (err) {
      console.error('Failed to respond to request:', err);
      this.toast.error('Failed to process request');
    }
  }

  async addFriend(query: string): Promise<void> {
    let addresseeId: number;

    // Try to parse as player ID first, otherwise look up by username
    const parsedId = Number(query);
    if (!isNaN(parsedId) && parsedId > 0) {
      addresseeId = parsedId;
    } else {
      try {
        const player = await firstValueFrom(this.playerService.lookupPlayerByUsername(query.trim()));
        addresseeId = player.playerId;
      } catch (err) {
        this.toast.error('Player not found');
        this.showAddFriendModal.set(false);
        return;
      }
    }

    try {
      await firstValueFrom(this.friendService.sendRequest(addresseeId));
      this.toast.success('Friend request sent');
      this.showAddFriendModal.set(false);
      this.loadPendingRequests();
    } catch (err) {
      console.error('Failed to send friend request:', err);
      this.toast.error('Failed to send friend request');
    }
  }

  async makeTradeOffer(offer: { item: TradeableItem; price: number }): Promise<void> {
    const friend = this.selectedFriend();
    if (!friend) return;

    const otherId = friend.requesterId === this.currentPlayerId() ? friend.addresseeId : friend.requesterId;

    try {
      await firstValueFrom(
        this.chatService.sendChatMessage(
          this.currentPlayerId(),
          `Trade Offer: ${offer.item.name}`,
          otherId,
          'trade_offer',
          {
            itemType: offer.item.type,
            itemId: offer.item.id,
            price: offer.price,
            status: 'pending'
          }
        )
      );
      this.toast.success('Trade offer sent');
      this.showTradeOfferModal.set(false);

      // Refresh messages
      const msgs = await firstValueFrom(
        this.chatService.getConversationPaginated(this.currentPlayerId(), otherId, 50, 0)
      );
      this.messages.set(msgs);
    } catch (err) {
      console.error('Failed to send trade offer:', err);
      this.toast.error('Failed to send trade offer');
    }
  }

  async acceptTradeOffer(messageId: number): Promise<void> {
    try {
      await firstValueFrom(this.tradeOfferService.acceptTradeOffer(messageId));
      this.toast.success('Trade offer accepted');
      this.refreshMessages();
    } catch (err) {
      console.error('Failed to accept trade offer:', err);
      this.toast.error('Failed to accept trade offer');
    }
  }

  async declineTradeOffer(messageId: number): Promise<void> {
    try {
      await firstValueFrom(this.tradeOfferService.declineTradeOffer(messageId));
      this.toast.success('Trade offer declined');
      this.refreshMessages();
    } catch (err) {
      console.error('Failed to decline trade offer:', err);
      this.toast.error('Failed to decline trade offer');
    }
  }

  viewGlory(friendPlayerId: number): void {
    this.router.navigate(['/glory', friendPlayerId]);
  }

  private async refreshMessages(): Promise<void> {
    const friend = this.selectedFriend();
    if (!friend) return;
    const otherId = friend.requesterId === this.currentPlayerId() ? friend.addresseeId : friend.requesterId;
    try {
      const msgs = await firstValueFrom(
        this.chatService.getConversationPaginated(this.currentPlayerId(), otherId, 50, 0)
      );
      this.messages.set(msgs);
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }

  private subscribeToChatMessages(): () => void {
    // Poll the signal for changes since Angular signals don't have explicit subscribe
    // We'll use a simple interval to check for new messages
    const interval = setInterval(() => {
      const msg = this.ws.incomingChatMessage();
      if (msg) {
        this.handleIncomingMessage(msg);
        this.ws.incomingChatMessage.set(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }

  private handleIncomingMessage(msg: ChatMessageRow): void {
    // Skip duplicates
    const exists = this.messages().some(m => m.messageId === msg.messageId);
    if (exists) return;

    const friend = this.selectedFriend();
    const otherId = msg.senderId === this.currentPlayerId() ? msg.receiverId : msg.senderId;

    if (friend && (friend.requesterId === otherId || friend.addresseeId === otherId)) {
      // Append to current conversation
      this.messages.update(msgs => [...msgs, msg]);
    } else {
      // Increment unread count for the friend
      const friendEntry = this.friends().find(
        f => f.requesterId === otherId || f.addresseeId === otherId
      );
      if (friendEntry) {
        const current = this.unreadCounts.get(friendEntry.friendId) ?? 0;
        this.unreadCounts.set(friendEntry.friendId, current + 1);
        this.friends.update(list =>
          list.map(f =>
            f.friendId === friendEntry.friendId
              ? { ...f, unreadCount: current + 1, lastMessage: msg.content }
              : f
          )
        );
      }
    }
  }
}
