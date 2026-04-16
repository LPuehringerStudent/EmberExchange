import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { LootBoxHelper, LootItem } from '../../../../../middleground/LootboxHelper';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lootbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lootbox.component.html',
  imports: [NgOptimizedImage],
  styleUrls: ['./lootbox.component.css'],
})
export class LootboxComponent implements AfterViewInit, OnInit {
  itemsElement = viewChild<ElementRef<HTMLElement>>('itemsContainer');

  // ── State ──────────────────────────────────────────────────
  lootboxCount = signal<number>(10); // hardcoded until wired to backend
  isOpening    = signal<boolean>(false);
  playingGif   = signal<boolean>(false);
  showOverlay  = signal<boolean>(false);
  showPopup    = signal<boolean>(false);
  resultText   = signal<string>('');

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  playerId: number | null    = null;

  /** Possible stove drops shown in the "possible rewards" banner */
  readonly previewDrops = [
    { label: 'Stove I',   src: '/assets/stove_sprites/stove-1.png', rarity: 'common',    rarityLabel: 'Common'    },
    { label: 'Stove II',  src: '/assets/stove_sprites/stove-2.png', rarity: 'rare',      rarityLabel: 'Rare'      },
    { label: 'Stove III', src: '/assets/stove_sprites/stove-3.png', rarity: 'legendary', rarityLabel: 'Legendary' },
  ];

  private lootBoxHelper = new LootBoxHelper();
  private stoveApi      = inject(StoveService);
  private cdr           = inject(ChangeDetectorRef);
  private authService   = inject(AuthService);
  private router        = inject(Router);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.playerId = user.playerId;
    // In production: this.lootboxCount.set(user.lootboxCount);
  }

  ngAfterViewInit(): void {}

  canOpen(): boolean {
    return !this.isOpening() && this.lootboxCount() > 0 && this.playerId !== null;
  }

  openBox(): void {
    if (!this.canOpen()) return;

    this.isOpening.set(true);
    this.playingGif.set(true);
    this.showPopup.set(false);
    this.lootboxCount.update(c => Math.max(0, c - 1));
    this.cdr.detectChanges();

    // Let the opening gif play (~1.4 s), then launch the roller
    setTimeout(() => {
      this.playingGif.set(false);
      this.lootBoxHelper.buildStrip();
      this.items = this.lootBoxHelper.items;
      this.showOverlay.set(true);
      this.cdr.detectChanges();

      setTimeout(() => {
        const itemsEl = this.itemsElement()?.nativeElement;
        if (!itemsEl) { this.isOpening.set(false); return; }

        const itemEl = itemsEl.querySelector('.item') as HTMLElement;
        if (!itemEl)  { this.isOpening.set(false); return; }

        const style     = window.getComputedStyle(itemEl);
        const itemWidth = itemEl.offsetWidth
          + parseInt(style.marginLeft  ?? '0')
          + parseInt(style.marginRight ?? '0');
        const rollerEl    = document.getElementById('roller');
        const rollerWidth = rollerEl?.offsetWidth ?? 620;
        const offset      = -(40 * itemWidth) + rollerWidth / 2 - itemWidth / 2;

        itemsEl.style.transform = `translateX(${offset}px)`;
        setTimeout(() => this.showResult(), 4000);
      }, 100);
    }, 1400);
  }

  private showResult(): void {
    this.finalItem = this.lootBoxHelper.finalItem;

    if (this.finalItem && this.playerId !== null) {
      const typeId = this.lootBoxHelper.returnTypeId(this.finalItem);
      this.saveLoot(typeId);
      this.resultText.set(`You received: ${this.finalItem.name}`);
    } else {
      this.resultText.set('You received: Unknown item');
    }

    this.showOverlay.set(false);
    this.showPopup.set(true);
    this.isOpening.set(false);
    this.cdr.detectChanges();
  }

  saveLoot(typeId: number): void {
    if (this.playerId === null) return;
    this.stoveApi.createStove(typeId, this.playerId).subscribe({
      error: (err: unknown) => console.error('Failed to save stove:', err),
    });
  }

  resetAll(): void {
    this.showOverlay.set(false);
    this.showPopup.set(false);
    this.isOpening.set(false);
    this.playingGif.set(false);

    const itemsEl = this.itemsElement()?.nativeElement;
    if (itemsEl) {
      itemsEl.style.transition = 'none';
      itemsEl.style.transform  = 'translateX(0px)';
    }
  }
}
