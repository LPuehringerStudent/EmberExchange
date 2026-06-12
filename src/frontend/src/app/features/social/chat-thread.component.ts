import { Component, input, output, viewChild, ChangeDetectionStrategy, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ChatMessageRow } from '@shared/model';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="thread-shell">
      @if (friend()) {
        <header class="thread-header">
          <div class="thread-person">
            <div class="avatar">{{ friend()!.username.charAt(0).toUpperCase() }}</div>
            <div>
              <h2>{{ friend()!.username }}</h2>
              <p>Conversation</p>
            </div>
          </div>
          @if (allowTradeOffer()) {
            <button type="button" class="offer-btn" (click)="onMakeOffer.emit()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/>
                <path d="M2 7h20v5H2z"/>
                <path d="M12 22V7"/>
                <path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>
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
              <h2>No conversation selected</h2>
              <p>Choose a thread from the sidebar</p>
            </div>
          </div>
        </header>
      }

      <div #messagesContainer class="messages-scroll">
        @for (msg of messages(); track msg.messageId + '-' + $index) {
          <div class="message-line" [class.own]="isOwnMessage(msg)">
            @if (msg.messageType === 'trade_offer') {
              <article class="trade-card" [class.own]="isOwnMessage(msg)">
                <p class="trade-label">Trade Offer</p>
                <h3>{{ msg.content }}</h3>
                <div class="trade-meta">
                  <span>Item: {{ $any(msg.data)['itemType'] | titlecase }} #{{ $any(msg.data)['itemId'] }}</span>
                  <span>Price: {{ $any(msg.data)['price'] }} Coal</span>
                </div>
                @if (!isOwnMessage(msg) && $any(msg.data)['status'] === 'pending') {
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
                  @if (isOwnMessage(msg)) {
                    <span class="read-ticks" [class.read]="msg.isRead" [attr.aria-label]="msg.isRead ? 'Read' : 'Sent'">
                      @if (msg.isRead) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m3 12 4 4 8-8"/>
                          <path d="m13 16 8-8"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m5 12 4 4 10-10"/>
                        </svg>
                      }
                    </span>
                  }
                </footer>
              </article>
            } @else {
              <article class="message-bubble" [class.own]="isOwnMessage(msg)">
                <p>{{ msg.content }}</p>
                <footer>
                  <time>{{ msg.sentAt | date:'shortTime' }}</time>
                  @if (isOwnMessage(msg)) {
                    <span class="read-ticks" [class.read]="msg.isRead" [attr.aria-label]="msg.isRead ? 'Read' : 'Sent'">
                      @if (msg.isRead) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m3 12 4 4 8-8"/>
                          <path d="m13 16 8-8"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m5 12 4 4 10-10"/>
                        </svg>
                      }
                    </span>
                  }
                </footer>
              </article>
            }
          </div>
        } @empty {
          <div class="empty-thread">
            @if (friend()) {
              <p>No messages yet</p>
              <span>Start the conversation below.</span>
            } @else {
              <p>Select a conversation</p>
              <span>Your messages will appear here.</span>
            }
          </div>
        }
      </div>

      @if (friend()) {
        <footer class="composer">
          <input
            #messageInput
            [(ngModel)]="messageText"
            (keydown.enter)="sendMessage()"
            type="text"
            placeholder="Type a message"
          />
          <button type="button" (click)="sendMessage()" [disabled]="!messageText.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/>
              <path d="M22 2 11 13"/>
            </svg>
            Send
          </button>
        </footer>
      }
    </div>
  `,
  styleUrl: './chat-thread.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatThreadComponent implements AfterViewChecked {
  friend = input<{ username: string } | null>(null);
  messages = input.required<ChatMessageRow[]>();
  currentPlayerId = input.required<number>();
  allowTradeOffer = input<boolean>(true);
  messageText = '';

  onSendMessage = output<string>();
  onMakeOffer = output<void>();
  onAcceptOffer = output<number>();
  onDeclineOffer = output<number>();

  private messagesContainer = viewChild<HTMLDivElement>('messagesContainer');
  private shouldScroll = false;

  constructor() {
    effect(() => {
      const _ = this.messages();
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  isOwnMessage(message: ChatMessageRow): boolean {
    return message.senderId === this.currentPlayerId();
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text) return;
    this.onSendMessage.emit(text);
    this.messageText = '';
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer();
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
