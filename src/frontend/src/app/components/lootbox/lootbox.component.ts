import {AfterViewInit, Component, ElementRef, inject, ViewChild, ChangeDetectorRef} from '@angular/core';
import {LootBoxHelper, LootItem} from "../../../../../middleground/LootboxHelper";
import {StoveApiService} from '../../../services/stove';

@Component({
  selector: 'app-lootbox',
  standalone: true,
  templateUrl: './lootbox.html',
  imports: [],
  styleUrls: ['./lootbox.css']
})

export class LootboxComponent implements AfterViewInit {
  @ViewChild('itemsContainer') itemsElement!: ElementRef<HTMLElement>;

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  showOverlay = false;
  showPopup = false;
  resultText = '';
  isOpening = false;

  ngAfterViewInit(): void {
  }


  private lootBoxHelper: LootBoxHelper;
  private stoveApi = inject(StoveApiService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.lootBoxHelper = new LootBoxHelper();
  }

  openBox(): void {
    if (this.isOpening) return;

    console.log('Opening lootbox...');
    this.isOpening = true;
    this.showPopup = false;
    this.lootBoxHelper.buildStrip();
    this.items = this.lootBoxHelper.items;
    this.showOverlay = true;

    // Wait for DOM to render items
    setTimeout(() => {
      const itemsEl = this.itemsElement.nativeElement;
      const itemEl = itemsEl.querySelector('.item') as HTMLElement;

      if (!itemEl) {
        console.error('No item elements found');
        this.isOpening = false;
        return;
      }

      // Calculate dimensions
      const style = window.getComputedStyle(itemEl);
      const width = itemEl.offsetWidth + parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
      const rollerEl = document.getElementById('roller');
      const rollerWidth = rollerEl?.offsetWidth || 620;
      const centerOffset = rollerWidth / 2 - width / 2;
      const offset = -(40 * width) + centerOffset;

      console.log('Starting animation, offset:', offset);

      // Trigger animation
      itemsEl.style.transform = `translateX(${offset}px)`;

      // Show result after animation completes (4 seconds)
      setTimeout(() => {
        console.log('Animation complete, showing result');
        this.showResult();
      }, 4000);
    }, 100);
  }

  private showResult(): void {
    console.log('Final item:', this.lootBoxHelper.finalItem);
    this.finalItem = this.lootBoxHelper.finalItem;

    if (this.finalItem) {
      const typeId = this.lootBoxHelper.returnTypeId(this.finalItem);
      console.log('Saving loot with typeId:', typeId);
      this.saveLoot(typeId);
      this.resultText = `You got: ${this.finalItem.name}`;
    } else {
      this.resultText = 'You got: Unknown';
    }

    console.log('Showing popup with text:', this.resultText);
    this.showPopup = true;
    this.isOpening = false;
    this.cdr.detectChanges();
    console.log('showPopup is now:', this.showPopup);
  }
  saveLoot(typeId: number) {
    this.stoveApi.createStove(typeId, 1).subscribe({
      error: (err) => console.error('Failed to save stove:', err)
    });
  }

  resetAll(): void {
    this.showOverlay = false;
    this.showPopup = false;
    this.isOpening = false;
    const itemsEl = this.itemsElement?.nativeElement;
    if (itemsEl) {
      itemsEl.style.transform = 'translateX(0px)';
    }
  }
}
