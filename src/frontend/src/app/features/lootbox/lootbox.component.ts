import { AfterViewInit, Component, ElementRef, inject, viewChild, ChangeDetectorRef, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { LootBoxHelper, LootItem } from '../../../../../middleground/LootboxHelper';
import { StoveService } from '@core/services/stove.service';
import { LootboxService } from '@core/services/lootbox.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-lootbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lootbox.component.html',
  imports: [NgOptimizedImage],
  styleUrls: ['./lootbox.component.css']
})

export class LootboxComponent implements AfterViewInit, OnInit {
  itemsElement = viewChild.required<ElementRef<HTMLElement>>('itemsContainer');

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  showOverlay = false;
  showPopup = false;
  resultText = '';
  isOpening = false;

  // User data
  lootboxCount = signal<number>(0);
  playerId: number | null = null;
  loading = true;

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      // Redirect to login if not authenticated
      this._router.navigate(['/login']);
      return;
    }

    this.playerId = user.playerId;
    this.lootboxCount.set(user.lootboxCount);
    this.loading = false;
  }

  private lootBoxHelper = new LootBoxHelper();
  private stoveApi = inject(StoveService);
  private lootboxApi = inject(LootboxService);
  private cdr = inject(ChangeDetectorRef);
  private _authService = inject(AuthService);
  private _router = inject(Router);

  canOpen(): boolean {
    return !this.isOpening && this.lootboxCount() > 0 && this.playerId !== null;
  }

  openBox(): void {
    if (!this.canOpen()) {
      if (this.lootboxCount() <= 0) {
        alert('You have no lootboxes available!');
      }
      return;
    }

    console.log('Opening lootbox...');
    this.isOpening = true;
    this.showPopup = false;
    this.lootBoxHelper.buildStrip();
    this.items = this.lootBoxHelper.items;
    this.showOverlay = true;

    // Decrement lootbox count locally (will be updated on server)
    this.lootboxCount.update(count => Math.max(0, count - 1));

    // Wait for DOM to render items
    setTimeout(() => {
      const itemsEl = this.itemsElement().nativeElement;
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

    if (this.finalItem && this.playerId !== null) {
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
    if (this.playerId === null) {
      console.error('Cannot save loot: no playerId');
      return;
    }

    this.lootboxApi.openLootbox(typeId, this.playerId, 'free').subscribe({
      next: (res) => {
        console.log('Lootbox opened:', res);
        void this._authService.refreshUser();
      },
      error: (err: unknown) => console.error('Failed to open lootbox:', err)
    });
  }

  resetAll(): void {
    this.showOverlay = false;
    this.showPopup = false;
    this.isOpening = false;
    const itemsEl = this.itemsElement().nativeElement;
    if (itemsEl) {
      itemsEl.style.transform = 'translateX(0px)';
    }
  }
}
