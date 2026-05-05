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
  itemsElement = viewChild<ElementRef<HTMLElement>>('itemsContainer');

  // ── State ──────────────────────────────────────────────────
  lootboxCount = signal<number>(0);
  isOpening    = signal<boolean>(false);
  playingGif   = signal<boolean>(false);
  showOverlay  = signal<boolean>(false);
  showPopup    = signal<boolean>(false);
  resultText   = signal<string>('');
  resultImageUrl = signal<string>('');

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  playerId: number | null = null;

  readonly previewDrops = [
    { label: 'Rusty Stove',    src: '/assets/stove_sprites/rusty.png',    rarity: 'common',    rarityLabel: 'Common'    },
    { label: 'Bronze Stove',   src: '/assets/stove_sprites/bronze.png',   rarity: 'rare',      rarityLabel: 'Rare'      },
    { label: 'Golden Stove',   src: '/assets/stove_sprites/golden.png',   rarity: 'epic',      rarityLabel: 'Epic'      },
    { label: 'Dragon Stove',   src: '/assets/stove_sprites/dragon.png',   rarity: 'legendary', rarityLabel: 'Legendary' },
  ];

  private lootBoxHelper = new LootBoxHelper();
  private lootboxApi    = inject(LootboxService);
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
    this.lootboxCount.set(user.lootboxCount);
  }

  ngAfterViewInit(): void {}

  canOpen(): boolean {
    return !this.isOpening() && this.lootboxCount() > 0 && this.playerId !== null;
  }

  async openBox(): Promise<void> {
    if (!this.canOpen() || this.playerId === null) {
      if (this.lootboxCount() <= 0) {
        alert('You have no lootboxes available!');
      }
      return;
    }

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

    try {
      const result = await firstValueFrom(this.lootboxApi.openLootbox(lootboxId, this.playerId));
      console.log('Lootbox opened:', result);

      this.lootboxCount.update(count => Math.max(0, count - 1));
      void this.authService.refreshUser();

      this.isOpening.set(true);
      this.playingGif.set(true);
      this.showPopup.set(false);
      this.cdr.detectChanges();

      setTimeout(() => {
        this.playingGif.set(false);
        this.lootBoxHelper.buildStripFor(result.rarity);
        this.items = this.lootBoxHelper.items;
        this.finalItem = this.lootBoxHelper.finalItem;
        this.showOverlay.set(true);
        this.cdr.detectChanges();

        setTimeout(() => {
          const itemsEl = this.itemsElement()?.nativeElement;
          if (!itemsEl) { this.isOpening.set(false); return; }

          const itemEl = itemsEl.querySelector('.item') as HTMLElement;
          if (!itemEl) { this.isOpening.set(false); return; }

          const style = window.getComputedStyle(itemEl);
          const itemWidth = itemEl.offsetWidth
            + parseInt(style.marginLeft || '0')
            + parseInt(style.marginRight || '0');
          const rollerEl = document.getElementById('roller');
          const rollerWidth = rollerEl?.offsetWidth || 620;
          const offset = -(40 * itemWidth) + rollerWidth / 2 - itemWidth / 2;

          itemsEl.style.transform = `translateX(${offset}px)`;
          setTimeout(() => this.showResult(result.stoveName, result.imageUrl), 4000);
        }, 100);
      }, 1400);
    } catch (err) {
      console.error('Failed to open lootbox:', err);
      alert('Failed to open lootbox. Please try again.');
      this.isOpening.set(false);
      this.playingGif.set(false);
    }
  }

  private showResult(stoveName: string, imageUrl: string): void {
    this.resultText.set(`You got: ${stoveName}`);
    this.resultImageUrl.set(imageUrl);
    this.showOverlay.set(false);
    this.showPopup.set(true);
    this.isOpening.set(false);
    this.cdr.detectChanges();
  }

  resetAll(): void {
    this.showOverlay.set(false);
    this.showPopup.set(false);
    this.isOpening.set(false);
    this.playingGif.set(false);

    const itemsEl = this.itemsElement()?.nativeElement;
    if (itemsEl) {
      itemsEl.style.transition = 'none';
      itemsEl.style.transform = 'translateX(0px)';
    }
  }
}
