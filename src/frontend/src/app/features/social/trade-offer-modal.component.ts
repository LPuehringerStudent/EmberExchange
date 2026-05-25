import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TradeableItem {
  id: number;
  name: string;
  type: 'stove' | 'lootbox';
  rarity?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-trade-offer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center" (click)="onClose.emit()">
      <div class="bg-surface border border-border rounded-[20px] p-7 max-w-[500px] w-full mx-4 max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
        <h3 class="text-xl font-bold text-text-primary mb-4">Make Trade Offer</h3>
        <p class="text-sm text-text-secondary mb-3">Select an item from your inventory and set a price.</p>

        <!-- Item list -->
        <div class="flex-1 overflow-y-auto mb-4 space-y-2 max-h-[300px]">
          @for (item of items(); track item.id + item.type) {
            <div
              (click)="selectedItem = item"
              [class.border-accent]="selectedItem?.id === item.id && selectedItem?.type === item.type"
              [class.bg-accent/5]="selectedItem?.id === item.id && selectedItem?.type === item.type"
              class="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-accent/50 transition-colors"
            >
              @if (item.imageUrl) {
                <img [src]="item.imageUrl" class="w-10 h-10 rounded-lg object-cover" [alt]="item.name" />
              } @else {
                <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
                  {{ item.type === 'stove' ? 'S' : 'L' }}
                </div>
              }
              <div class="flex-1">
                <p class="text-sm font-medium text-text-primary">{{ item.name }}</p>
                <p class="text-xs text-text-secondary">{{ item.type | titlecase }}</p>
              </div>
              @if (item.rarity) {
                <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{{ item.rarity | titlecase }}</span>
              }
            </div>
          } @empty {
            <div class="text-center py-8 text-text-secondary text-sm">
              No items in your inventory.
            </div>
          }
        </div>

        <!-- Price input -->
        @if (selectedItem) {
          <div class="mb-4">
            <label class="block text-sm font-medium text-text-primary mb-1.5">Price (Coal)</label>
            <input
              [(ngModel)]="price"
              type="number"
              min="1"
              placeholder="Enter price"
              class="w-full px-4 py-2.5 rounded-xl bg-body border border-border text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        }

        <div class="flex gap-3 justify-end">
          <button
            (click)="onClose.emit()"
            class="px-4 py-2 rounded-lg text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="submitOffer()"
            [disabled]="!selectedItem || !price || price < 1"
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send Offer
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradeOfferModalComponent {
  items = input.required<TradeableItem[]>();
  onClose = output<void>();
  onSubmit = output<{ item: TradeableItem; price: number }>();

  selectedItem: TradeableItem | null = null;
  price = 0;

  submitOffer(): void {
    if (!this.selectedItem || !this.price || this.price < 1) return;
    this.onSubmit.emit({ item: this.selectedItem, price: this.price });
  }
}
