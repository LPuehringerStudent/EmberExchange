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
import { FriendListComponent, type FriendWithPreview, type MarketplaceThread } from './friend-list.component';
import { ChatThreadComponent } from './chat-thread.component';
import { AddFriendModalComponent } from './add-friend-modal.component';
import { TradeOfferModalComponent, type TradeableItem } from './trade-offer-modal.component';
import type { FriendWithUser, ChatMessageRow, ShowedStove } from '@shared/model';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";
import { StoveDetailComponent } from '../inventory/stove-detail.component';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [
    CommonModule,
    FriendListComponent,
    ChatThreadComponent,
    AddFriendModalComponent,
    TradeOfferModalComponent,
    PageBackgroundComponent,
    StoveDetailComponent,
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
  activeTab = signal<'friends' | 'requests' | 'marketplace'>('friends');
  showAddFriendModal = signal(false);
  showTradeOfferModal = signal(false);
  tradeItems = signal<TradeableItem[]>([]);
  currentPlayerId = signal(0);

  // Stove inspection from trade offers
  showInspectModal = signal(false);
  inspectStove = signal<ShowedStove | null>(null);
  inspectLoading = signal(false);
  inspectError = signal<string | null>(null);

  /* ── Marketplace messages ── */
  marketplaceThreads = signal<MarketplaceThread[]>([]);
  selectedMarketplaceThread = signal<MarketplaceThread | null>(null);
  marketplaceMessages = signal<ChatMessageRow[]>([]);
  private marketplaceUnreadCounts = new Map<number, number>();

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
    this.loadMarketplaceMessages();

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
      const [stoves, lootboxes, lootboxTypes] = await Promise.all([
        firstValueFrom(this.stoveService.getStovesByPlayerId(user.playerId)),
        firstValueFrom(this.lootboxService.getLootboxesByPlayerId(user.playerId)),
        firstValueFrom(this.lootboxService.getAllLootboxTypes())
      ]);

      const typeMap = new Map(lootboxTypes.map(t => [t.lootboxTypeId, t.name]));

      const tradeableStoves: TradeableItem[] = stoves.map(s => ({
        id: s.stoveId,
        name: (s as unknown as Record<string, string>)['name'] || `Stove #${s.stoveId}`,
        type: 'stove' as const,
        rarity: (s as unknown as Record<string, string>)['rarity'],
        imageUrl: (s as unknown as Record<string, string>)['imageUrl']
      }));

      const tradeableLootboxes: TradeableItem[] = lootboxes.map(lb => ({
        id: lb.lootboxId,
        name: typeMap.get(lb.lootboxTypeId) || `Lootbox #${lb.lootboxId}`,
        type: 'lootbox' as const,
        rarity: undefined,
        imageUrl: undefined
      }));

      this.tradeItems.set([...tradeableStoves, ...tradeableLootboxes]);
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
    const playerId = this.currentPlayerId();

    // Optimistically add message to UI
    const optimisticMsg: ChatMessageRow = {
      messageId: 0,
      senderId: playerId,
      receiverId: otherId,
      content: text,
      sentAt: new Date(),
      isRead: true,
      messageType: 'text',
      data: {}
    };
    this.messages.update(msgs => [...msgs, optimisticMsg]);

    const wsConnected = this.ws.connectionState() === 'open';

    if (wsConnected) {
      // WebSocket path: handler ack replaces the optimistic message.
      // Do NOT poll REST here — it races with the ack and causes duplicates.
      this.ws.sendChatMessage(otherId, text);
    } else {
      // REST fallback: replace optimistic with the real message returned by the server
      try {
        const result = await firstValueFrom(
          this.chatService.sendChatMessage(playerId, text, otherId)
        );
        const realMsg: ChatMessageRow = {
          messageId: result.messageId,
          senderId: result.senderId,
          receiverId: result.receiverId ?? otherId,
          content: text,
          sentAt: new Date(),
          isRead: true,
          messageType: 'text',
          data: {}
        };
        this.messages.update(msgs => {
          const idx = msgs.findIndex(m => m.messageId === 0 && m.content === text && m.senderId === playerId);
          if (idx === -1) return [...msgs, realMsg];
          const updated = [...msgs];
          updated[idx] = realMsg;
          return updated;
        });
      } catch (err) {
        console.error('Failed to send message:', err);
        this.toast.error('Failed to send message');
        this.messages.update(msgs =>
          msgs.filter(m => !(m.messageId === 0 && m.content === text && m.senderId === playerId))
        );
      }
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

  async inspectStoveFromOffer(stoveId: number): Promise<void> {
    this.inspectLoading.set(true);
    this.inspectError.set(null);
    try {
      const stove = await firstValueFrom(this.stoveService.getStoveById(stoveId));
      const type = await firstValueFrom(this.stoveService.getStoveTypeById(stove.typeId));

      const showedStove: ShowedStove = {
        ...stove,
        stoveId: stove.stoveId,
        stoveName: type.name,
        rarity: type.rarity,
        imageUrl: type.imageUrl ?? '',
        collection: type.collection ?? 'Unknown'
      };

      this.inspectStove.set(showedStove);
      this.showInspectModal.set(true);
    } catch (err) {
      console.error('Failed to inspect stove:', err);
      this.toast.error('Failed to load stove details');
    } finally {
      this.inspectLoading.set(false);
    }
  }

  closeInspectModal(): void {
    this.showInspectModal.set(false);
    this.inspectStove.set(null);
    this.inspectError.set(null);
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

  /* ── Marketplace messages ── */

  async loadMarketplaceMessages(): Promise<void> {
    const playerId = this.currentPlayerId();
    if (!playerId) return;

    try {
      const [sent, received] = await Promise.all([
        firstValueFrom(this.chatService.getSentMessages(playerId)),
        firstValueFrom(this.chatService.getReceivedMessages(playerId))
      ]);

      const all = [...sent, ...received];
      const marketplaceMsgs = all.filter(
        m => m.data && (m.data as Record<string, unknown>)['source'] === 'marketplace'
      );

      // Group by other player
      const threads = new Map<number, { username: string; messages: ChatMessageRow[] }>();
      for (const msg of marketplaceMsgs) {
        const otherId = msg.senderId === playerId ? (msg.receiverId ?? 0) : msg.senderId;
        if (!otherId) continue;
        const existing = threads.get(otherId);
        if (existing) {
          existing.messages.push(msg);
        } else {
          threads.set(otherId, { username: `User #${otherId}`, messages: [msg] });
        }
      }

      // Look up usernames
      for (const [otherId, thread] of threads) {
        try {
          const player = await firstValueFrom(this.playerService.getPlayerById(otherId));
          if (player && player.username) {
            thread.username = player.username;
          }
        } catch {
          // keep fallback username
        }
      }

      // Build thread list
      const result: MarketplaceThread[] = [];
      for (const [otherId, thread] of threads) {
        thread.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        const last = thread.messages[thread.messages.length - 1];
        const unread = thread.messages.filter(
          m => m.senderId !== playerId && !m.isRead
        ).length;
        result.push({
          playerId: otherId,
          username: thread.username,
          lastMessage: last.content,
          lastMessageAt: new Date(last.sentAt),
          unreadCount: unread + (this.marketplaceUnreadCounts.get(otherId) ?? 0)
        });
      }

      result.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      this.marketplaceThreads.set(result);
    } catch (err) {
      console.error('Failed to load marketplace messages:', err);
    }
  }

  async selectMarketplaceThread(thread: MarketplaceThread): Promise<void> {
    this.selectedMarketplaceThread.set(thread);
    this.selectedFriend.set(null);
    this.activeTab.set('marketplace');

    // Clear unread
    this.marketplaceUnreadCounts.set(thread.playerId, 0);
    this.marketplaceThreads.update(list =>
      list.map(t => t.playerId === thread.playerId ? { ...t, unreadCount: 0 } : t)
    );

    // Load conversation
    try {
      const msgs = await firstValueFrom(
        this.chatService.getConversationPaginated(this.currentPlayerId(), thread.playerId, 50, 0)
      );
      // Filter to only marketplace messages
      const filtered = msgs.filter(
        m => m.data && (m.data as Record<string, unknown>)['source'] === 'marketplace'
      );
      this.marketplaceMessages.set(filtered);
    } catch (err) {
      console.error('Failed to load marketplace conversation:', err);
    }
  }

  async sendMarketplaceMessage(text: string): Promise<void> {
    const thread = this.selectedMarketplaceThread();
    if (!thread) return;

    const otherId = thread.playerId;
    const playerId = this.currentPlayerId();

    const optimisticMsg: ChatMessageRow = {
      messageId: 0,
      senderId: playerId,
      receiverId: otherId,
      content: text,
      sentAt: new Date(),
      isRead: true,
      messageType: 'text',
      data: { source: 'marketplace' }
    };
    this.marketplaceMessages.update(msgs => [...msgs, optimisticMsg]);

    const wsConnected = this.ws.connectionState() === 'open';

    if (wsConnected) {
      this.ws.sendChatMessage(otherId, text);
    } else {
      try {
        const result = await firstValueFrom(
          this.chatService.sendChatMessage(playerId, text, otherId, 'text', { source: 'marketplace' })
        );
        const realMsg: ChatMessageRow = {
          messageId: result.messageId,
          senderId: result.senderId,
          receiverId: result.receiverId ?? otherId,
          content: text,
          sentAt: new Date(),
          isRead: true,
          messageType: 'text',
          data: { source: 'marketplace' }
        };
        this.marketplaceMessages.update(msgs => {
          const idx = msgs.findIndex(m => m.messageId === 0 && m.content === text && m.senderId === playerId);
          if (idx === -1) return [...msgs, realMsg];
          const updated = [...msgs];
          updated[idx] = realMsg;
          return updated;
        });
        this.loadMarketplaceMessages();
      } catch (err) {
        console.error('Failed to send marketplace message:', err);
        this.toast.error('Failed to send message');
        this.marketplaceMessages.update(msgs =>
          msgs.filter(m => !(m.messageId === 0 && m.content === text && m.senderId === playerId))
        );
      }
    }
  }

  private subscribeToChatMessages(): () => void {
    const interval = setInterval(() => {
      const msg = this.ws.incomingChatMessage();
      if (msg) {
        this.handleIncomingMessage(msg);
        this.ws.incomingChatMessage.set(null);
      }

      const tradeUpdate = this.ws.incomingTradeUpdate();
      if (tradeUpdate) {
        this.refreshMessages();
        this.ws.incomingTradeUpdate.set(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }

  private handleIncomingMessage(msg: ChatMessageRow): void {
    const isMarketplace = msg.data && (msg.data as Record<string, unknown>)['source'] === 'marketplace';
    const playerId = this.currentPlayerId();

    // If this is our own message (WS ack), replace the optimistic version
    if (msg.senderId === playerId) {
      if (isMarketplace) {
        this.marketplaceMessages.update(msgs => {
          const idx = msgs.findIndex(m => m.messageId === 0 && m.content === msg.content);
          if (idx !== -1) {
            const updated = [...msgs];
            updated[idx] = msg;
            return updated;
          }
          return msgs;
        });
      } else {
        this.messages.update(msgs => {
          const idx = msgs.findIndex(m => m.messageId === 0 && m.content === msg.content);
          if (idx !== -1) {
            const updated = [...msgs];
            updated[idx] = msg;
            return updated;
          }
          return msgs;
        });
      }
      return;
    }

    if (isMarketplace) {
      const otherId = msg.senderId === playerId ? (msg.receiverId ?? 0) : msg.senderId;
      const thread = this.selectedMarketplaceThread();
      if (thread && thread.playerId === otherId) {
        this.marketplaceMessages.update(msgs => [...msgs, msg]);
      } else {
        const current = this.marketplaceUnreadCounts.get(otherId) ?? 0;
        this.marketplaceUnreadCounts.set(otherId, current + 1);
        this.loadMarketplaceMessages();
      }
      return;
    }

    // Skip duplicates
    const exists = this.messages().some(m => m.messageId === msg.messageId);
    if (exists) return;

    const friend = this.selectedFriend();
    const otherId = msg.senderId === playerId ? msg.receiverId : msg.senderId;

    if (friend && (friend.requesterId === otherId || friend.addresseeId === otherId)) {
      this.messages.update(msgs => [...msgs, msg]);
    } else {
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
