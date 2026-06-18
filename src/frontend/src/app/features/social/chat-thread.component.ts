import { Component, input, output, viewChild, ChangeDetectionStrategy, effect, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ChatMessageRow } from '@shared/model';

export interface ChatPerson {
  username: string;
  playerId?: number;
  friendId?: number;
  canMakeOffer?: boolean;
}

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="thread-shell">
      @if (friend()) {
        <header class="thread-header">
          <div class="person-menu-wrap">
            <button type="button" class="thread-person person-trigger" (click)="togglePersonMenu($event)">
              <div class="avatar">{{ friend()!.username.charAt(0).toUpperCase() }}</div>
              <div>
                <h2>{{ friend()!.username }}</h2>
                <p>Conversation</p>
              </div>
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            @if (personMenuOpen()) {
              <div class="person-menu" (click)="$event.stopPropagation()">
                <button type="button" (click)="reportPerson()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  <span>Report</span>
                </button>
                @if (friend()!.friendId) {
                  <button type="button" class="danger" (click)="unfriendPerson()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 11h-6"/>
                    </svg>
                    <span>Unfriend</span>
                  </button>
                }
                @if (friend()!.playerId) {
                  <button type="button" (click)="viewProfile()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                      <path d="M4 22h16"/>
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                    </svg>
                    <span>View profile</span>
                  </button>
                }
              </div>
            }
          </div>

          @if (friend()!.canMakeOffer) {
            <button type="button" class="offer-btn" (click)="onMakeOffer.emit()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14"/>
                <path d="M5 12h14"/>
              </svg>
              Make Offer
            </button>
          }
        </header>
      } @else {
        <header class="thread-header muted">
          <div class="thread-person">
            <div class="avatar empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h2>No chat selected</h2>
              <p>Select a conversation</p>
            </div>
          </div>
        </header>
      }

      <div #messagesContainer class="messages-scroll">
        @for (msg of messages(); track trackMessage(msg, $index)) {
          <div class="message-line" [class.own]="msg.senderId === currentPlayerId()">
            @if (msg.messageType === 'trade_offer') {
              <article class="trade-card" [class.own]="msg.senderId === currentPlayerId()">
                <span class="trade-label">Trade Offer</span>
                <div class="trade-item">
                  @if ($any(msg.data)['itemImageUrl']) {
                    <img [src]="$any(msg.data)['itemImageUrl']" [alt]="$any(msg.data)['itemName'] || 'Item'" />
                  } @else {
                    <div class="trade-placeholder">{{ $any(msg.data)['itemType'] === 'stove' ? 'S' : 'L' }}</div>
                  }
                  <div>
                    <h3>{{ $any(msg.data)['itemName'] || (($any(msg.data)['itemType'] | titlecase) + ' #' + $any(msg.data)['itemId']) }}</h3>
                    @if ($any(msg.data)['itemRarity']) {
                      <span class="rarity">{{ $any(msg.data)['itemRarity'] | titlecase }}</span>
                    } @else {
                      <p>{{ $any(msg.data)['itemType'] | titlecase }}</p>
                    }
                  </div>
                  @if ($any(msg.data)['itemType'] === 'stove') {
                    <button type="button" class="inspect-btn" (click)="onInspectStove.emit($any(msg.data)['itemId']); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                        <path d="M11 8v6"/>
                        <path d="M8 11h6"/>
                      </svg>
                      Inspect
                    </button>
                  }
                </div>
                <p class="trade-price">{{ $any(msg.data)['price'] }} Coal</p>

                @if (msg.senderId !== currentPlayerId() && $any(msg.data)['status'] === 'pending') {
                  <div class="trade-actions">
                    <button type="button" class="accept" (click)="onAcceptOffer.emit(msg.messageId)">Accept</button>
                    <button type="button" class="decline" (click)="onDeclineOffer.emit(msg.messageId)">Decline</button>
                  </div>
                } @else if ($any(msg.data)['status']) {
                  <p class="trade-status" [class.accepted]="$any(msg.data)['status'] === 'accepted'" [class.declined]="$any(msg.data)['status'] === 'declined'">
                    {{ $any(msg.data)['status'] | titlecase }}
                  </p>
                }
                <footer>
                  <time>{{ msg.sentAt | date:'shortTime' }}</time>
                  @if (msg.senderId === currentPlayerId()) {
                    <ng-container [ngTemplateOutlet]="readTicks" [ngTemplateOutletContext]="{ read: msg.isRead }"></ng-container>
                  }
                </footer>
              </article>
            } @else {
              <div class="message-bubble" [class.own]="msg.senderId === currentPlayerId()">
                <p>{{ msg.content }}</p>
                <footer>
                  <time>{{ msg.sentAt | date:'shortTime' }}</time>
                  @if (msg.senderId === currentPlayerId()) {
                    <ng-container [ngTemplateOutlet]="readTicks" [ngTemplateOutletContext]="{ read: msg.isRead }"></ng-container>
                  }
                </footer>
              </div>
            }
          </div>
        } @empty {
          <div class="empty-thread">
            @if (friend()) {
              <p>No messages yet. Say hello!</p>
            } @else {
              <p>Select a friend to start chatting.</p>
            }
          </div>
        }
      </div>

      @if (friend()) {
        <form class="composer" (ngSubmit)="sendMessage()">
          <input
            #messageInput
            [(ngModel)]="messageText"
            type="text"
            name="message"
            placeholder="Type a message..."
          />
          <button type="submit" [disabled]="!messageText.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
            Send
          </button>
        </form>
      }

      <ng-template #readTicks let-read="read">
        <span class="read-ticks" [class.read]="read" [attr.aria-label]="read ? 'Read' : 'Sent'">
          @if (read) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 12 4 4 8-8"/>
              <path d="m13 16 8-8"/>
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="m5 12 4 4 10-10"/>
            </svg>
          }
        </span>
      </ng-template>
    </div>
  `,
  styleUrl: './chat-thread.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatThreadComponent {
  friend = input<ChatPerson | null>(null);
  messages = input.required<ChatMessageRow[]>();
  currentPlayerId = input.required<number>();
  messageText = '';

  onSendMessage = output<string>();
  onMakeOffer = output<void>();
  onAcceptOffer = output<number>();
  onDeclineOffer = output<number>();
  onInspectStove = output<number>();
  onReportPlayer = output<ChatPerson>();
  onUnfriend = output<number>();
  onViewProfile = output<number>();

  private messagesContainer = viewChild<HTMLDivElement>('messagesContainer');
  private lastMessageCount = 0;
  personMenuOpen = signal(false);

  constructor() {
    effect(() => {
      const count = this.messages().length;
      if (count > this.lastMessageCount) {
        this.scheduleScrollToBottom();
      }
      this.lastMessageCount = count;
    });
  }

  @HostListener('document:click')
  closePersonMenu(): void {
    this.personMenuOpen.set(false);
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text) return;
    this.onSendMessage.emit(text);
    this.messageText = '';
    this.scheduleScrollToBottom();
  }

  togglePersonMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.personMenuOpen.set(!this.personMenuOpen());
  }

  reportPerson(): void {
    const person = this.friend();
    if (!person) return;
    this.personMenuOpen.set(false);
    this.onReportPlayer.emit(person);
  }

  unfriendPerson(): void {
    const friendId = this.friend()?.friendId;
    if (!friendId) return;
    this.personMenuOpen.set(false);
    this.onUnfriend.emit(friendId);
  }

  viewProfile(): void {
    const playerId = this.friend()?.playerId;
    if (!playerId) return;
    this.personMenuOpen.set(false);
    this.onViewProfile.emit(playerId);
  }

  trackMessage(msg: ChatMessageRow, index: number): number | string {
    return msg.messageId || `${msg.senderId}:${msg.content}:${index}`;
  }

  private scheduleScrollToBottom(): void {
    queueMicrotask(() => {
      requestAnimationFrame(() => this.scrollToBottom());
    });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer();
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
