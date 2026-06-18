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
    <div class="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center" (click)="onClose.emit()">
      <div class="bg-[#211712] border border-[#3a261b] rounded-2xl p-7 max-w-[31.25rem] w-full mx-4 max-h-[80vh] flex flex-col shadow-[0_1rem_2.5rem_rgba(0,0,0,0.45)]" (click)="$event.stopPropagation()">
        <h3 class="text-xl font-bold text-[#f4eee8] mb-4">Make Trade Offer</h3>
        <p class="text-sm text-[#c8b6aa] mb-3">Select an item from your inventory and set a price.</p>

        <!-- Item list -->
        <div class="flex-1 overflow-y-auto mb-4 space-y-2 max-h-[18.75rem]">
          @for (item of items(); track item.id + item.type) {
            <div
              (click)="selectedItem = item"
              [style.border-color]="selectedItem?.id === item.id && selectedItem?.type === item.type ? '#f48c06' : null"
              [style.background]="selectedItem?.id === item.id && selectedItem?.type === item.type ? '#302219' : null"
              class="flex items-center gap-3 p-3 rounded-xl border border-[#3a261b] cursor-pointer hover:border-[#8a4a1d] transition-colors"
            >
              @if (item.imageUrl) {
                <img [src]="item.imageUrl" class="w-10 h-10 rounded-lg object-cover" [alt]="item.name" />
              } @else {
                <div class="w-10 h-10 rounded-lg bg-[#332116] border border-[#4b3327] flex items-center justify-center text-[#f48c06] font-bold text-xs">
                  {{ item.type === 'stove' ? 'S' : 'L' }}
                </div>
              }
              <div class="flex-1">
                <p class="text-sm font-medium text-[#f4eee8]">{{ item.name }}</p>
                <p class="text-xs text-[#927f73]">{{ item.type | titlecase }}</p>
              </div>
              @if (item.rarity) {
                <span class="text-xs px-2 py-0.5 rounded-full bg-[#332116] text-[#f48c06] font-medium">{{ item.rarity | titlecase }}</span>
              }
            </div>
          } @empty {
            <div class="text-center py-8 text-[#927f73] text-sm">
              No items in your inventory.
            </div>
          }
        </div>

        <!-- Price input -->
        @if (selectedItem) {
          <div class="mb-4">
            <label class="block text-sm font-medium text-[#f4eee8] mb-1.5">Price (Coal)</label>
            <input
              [(ngModel)]="price"
              type="number"
              min="1"
              placeholder="Enter price"
              class="w-full px-4 py-2.5 rounded-xl bg-[#120c09] border border-[#3a261b] text-[#f4eee8] text-sm placeholder:text-[#927f73] focus:outline-none focus:border-[#f48c06] transition-colors"
            />
          </div>
        }

        <div class="flex gap-3 justify-end">
          <button
            (click)="onClose.emit()"
            class="px-4 py-2 rounded-lg text-[#c8b6aa] text-sm font-medium hover:text-[#f4eee8] transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="submitOffer()"
            [disabled]="!selectedItem || !price || price < 1"
            class="px-4 py-2 rounded-lg bg-[#e85d04] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
