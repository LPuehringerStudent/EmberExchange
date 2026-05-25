import { Component, input, output, viewChild, ChangeDetectionStrategy, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ChatMessageRow } from '@shared/model';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-body">
      <!-- Header -->
      @if (friend()) {
        <div class="flex items-center justify-between p-4 border-b border-border bg-surface">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
              {{ friend()!.username.charAt(0).toUpperCase() }}
            </div>
            <span class="font-medium text-text-primary">{{ friend()!.username }}</span>
          </div>
          <button
            (click)="onMakeOffer.emit()"
            class="px-3 py-1.5 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/10 transition-colors"
          >
            Make Offer
          </button>
        </div>
      }

      <!-- Messages -->
      <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-3">
        @for (msg of messages(); track msg.messageId) {
          <div
            [class.justify-end]="msg.senderId === currentPlayerId()"
            [class.justify-start]="msg.senderId !== currentPlayerId()"
            class="flex"
          >
            @if (msg.messageType === 'trade_offer') {
              <div
                [class.bg-accent/20]="msg.senderId === currentPlayerId()"
                [class.border-accent]="msg.senderId === currentPlayerId()"
                [class.bg-surface]="msg.senderId !== currentPlayerId()"
                [class.border-border]="msg.senderId !== currentPlayerId()"
                class="max-w-[75%] rounded-2xl p-4 border"
              >
                <p class="text-xs font-semibold text-accent mb-2">TRADE OFFER</p>
                <p class="text-sm text-text-primary mb-2">{{ msg.content }}</p>
                <div class="text-sm text-text-secondary mb-3">
                  <p>Item: {{ $any(msg.data)['itemType'] | titlecase }} #{{ $any(msg.data)['itemId'] }}</p>
                  <p>Price: {{ $any(msg.data)['price'] }} Coal</p>
                </div>
                @if (msg.senderId !== currentPlayerId() && $any(msg.data)['status'] === 'pending') {
                  <div class="flex gap-2">
                    <button
                      (click)="onAcceptOffer.emit(msg.messageId)"
                      class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Accept
                    </button>
                    <button
                      (click)="onDeclineOffer.emit(msg.messageId)"
                      class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Decline
                    </button>
                  </div>
                } @else if ($any(msg.data)['status']) {
                  <p class="text-xs font-medium"
                    [class.text-success]="$any(msg.data)['status'] === 'accepted'"
                    [class.text-danger]="$any(msg.data)['status'] === 'declined'"
                  >
                    {{ $any(msg.data)['status'] | titlecase }}
                  </p>
                }
                <p class="text-[10px] text-text-secondary mt-2">{{ msg.sentAt | date:'shortTime' }}</p>
              </div>
            } @else {
              <div
                [class.bg-accent]="msg.senderId === currentPlayerId()"
                [class.text-white]="msg.senderId === currentPlayerId()"
                [class.bg-surface]="msg.senderId !== currentPlayerId()"
                [class.text-text-primary]="msg.senderId !== currentPlayerId()"
                class="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
              >
                <p>{{ msg.content }}</p>
                <p class="text-[10px] mt-1 opacity-70">{{ msg.sentAt | date:'shortTime' }}</p>
              </div>
            }
          </div>
        } @empty {
          @if (friend()) {
            <div class="flex items-center justify-center h-full text-text-secondary text-sm">
              No messages yet. Say hello!
            </div>
          } @else {
            <div class="flex items-center justify-center h-full text-text-secondary text-sm">
              Select a friend to start chatting.
            </div>
          }
        }
      </div>

      <!-- Input -->
      @if (friend()) {
        <div class="p-4 border-t border-border bg-surface">
          <div class="flex gap-2">
            <input
              #messageInput
              [(ngModel)]="messageText"
              (keydown.enter)="sendMessage()"
              type="text"
              placeholder="Type a message..."
              class="flex-1 px-4 py-2.5 rounded-xl bg-body border border-border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
            <button
              (click)="sendMessage()"
              [disabled]="!messageText.trim()"
              class="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatThreadComponent implements AfterViewChecked {
  friend = input<{ username: string } | null>(null);
  messages = input.required<ChatMessageRow[]>();
  currentPlayerId = input.required<number>();
  messageText = '';

  onSendMessage = output<string>();
  onMakeOffer = output<void>();
  onAcceptOffer = output<number>();
  onDeclineOffer = output<number>();

  private messagesContainer = viewChild<HTMLDivElement>('messagesContainer');
  private shouldScroll = false;

  constructor() {
    effect(() => {
      // Trigger scroll when messages change
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
