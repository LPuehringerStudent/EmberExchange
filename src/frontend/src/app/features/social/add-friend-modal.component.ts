import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-friend-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center" (click)="onClose.emit()">
      <div class="bg-surface border border-border rounded-[1.25rem] p-7 max-w-[25rem] w-full mx-4" (click)="$event.stopPropagation()">
        <h3 class="text-xl font-bold text-text-primary mb-4">Add Friend</h3>
        <p class="text-sm text-text-secondary mb-4">Enter the player's username or ID to send a friend request.</p>
        <input
          [(ngModel)]="searchQuery"
          type="text"
          placeholder="Username or Player ID"
          class="w-full px-4 py-2.5 rounded-xl bg-body border border-border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors mb-4"
        />
        <div class="flex gap-3 justify-end">
          <button
            (click)="onClose.emit()"
            class="px-4 py-2 rounded-lg text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="sendRequest()"
            [disabled]="!searchQuery.trim() || loading"
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Sending...' : 'Send Request' }}
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddFriendModalComponent {
  onClose = output<void>();
  onSendRequest = output<string>();

  searchQuery = '';
  loading = false;

  sendRequest(): void {
    const query = this.searchQuery.trim();
    if (!query) return;
    this.loading = true;
    this.onSendRequest.emit(query);
  }
}
