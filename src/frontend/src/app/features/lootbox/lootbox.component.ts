import { AfterViewInit, Component, ElementRef, inject, viewChild, ChangeDetectorRef, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { LootBoxHelper, LootItem } from '../../../../../middleground/LootboxHelper';
import { LootboxService } from '@core/services/lootbox.service';
import { AuthService } from '@core/services/auth.service';
import { firstValueFrom } from 'rxjs';

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
  private lootboxApi = inject(LootboxService);
  private cdr = inject(ChangeDetectorRef);
  private _authService = inject(AuthService);
  private _router = inject(Router);

  canOpen(): boolean {
    return !this.isOpening && this.lootboxCount() > 0 && this.playerId !== null;
  }

  async openBox(): Promise<void> {
    if (!this.canOpen() || this.playerId === null) {
      if (this.lootboxCount() <= 0) {
        alert('You have no lootboxes available!');
      }
      return;
    }

    // Find first unopened lootbox to consume
    let lootboxId: number | null = null;
    try {
      const lootboxes = await firstValueFrom(this.lootboxApi.getLootboxesByPlayerId(this.playerId));
      if (lootboxes.length === 0) {
        alert('You have no lootboxes available!');
        this.lootboxCount.set(0);
        return;
      }
      lootboxId = lootboxes[0].lootboxId;
    } catch (err) {
      console.error('Failed to fetch lootboxes:', err);
      alert('Failed to open lootbox. Please try again.');
      return;
    }

    // Call backend to open and get guaranteed drop
    try {
      const result = await firstValueFrom(this.lootboxApi.openLootbox(lootboxId, this.playerId));
      console.log('Lootbox opened:', result);

      this.lootboxCount.update(count => Math.max(0, count - 1));
      void this._authService.refreshUser();

      this.isOpening = true;
      this.showPopup = false;

      this.lootBoxHelper.buildStripFor(result.rarity);
      this.items = this.lootBoxHelper.items;
      this.finalItem = this.lootBoxHelper.finalItem;
      this.showOverlay = true;

      setTimeout(() => {
        const itemsEl = this.itemsElement().nativeElement;
        const itemEl = itemsEl.querySelector('.item') as HTMLElement;

        if (!itemEl) {
          console.error('No item elements found');
          this.isOpening = false;
          return;
        }

        const style = window.getComputedStyle(itemEl);
        const width = itemEl.offsetWidth + parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        const rollerEl = document.getElementById('roller');
        const rollerWidth = rollerEl?.offsetWidth || 620;
        const centerOffset = rollerWidth / 2 - width / 2;
        const offset = -(40 * width) + centerOffset;

        itemsEl.style.transform = `translateX(${offset}px)`;

        setTimeout(() => {
          this.showResult(result.stoveName);
        }, 4000);
      }, 100);
    } catch (err) {
      console.error('Failed to open lootbox:', err);
      alert('Failed to open lootbox. Please try again.');
    }
  }

  private showResult(stoveName: string): void {
    this.resultText = `You got: ${stoveName}`;
    this.showPopup = true;
    this.isOpening = false;
    this.cdr.detectChanges();
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
