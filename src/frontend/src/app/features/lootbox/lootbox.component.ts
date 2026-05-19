import { AfterViewInit, Component, ElementRef, inject, viewChild, ChangeDetectorRef, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LootBoxHelper, LootItem } from './lootbox-helper';
import { LootboxService, Lootbox, LootboxType } from '@core/services/lootbox.service';
import { ListingService } from '@core/services/listing.service';
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
  selectedLootboxId = signal<number | null>(null);
  selectedTypeName  = signal<string>('Standard Lootbox');
  returnToInventory = signal<boolean>(false);

  // Selector state
  availableLootboxes = signal<Lootbox[]>([]);
  lootboxTypes       = signal<Map<number, LootboxType>>(new Map());
  isLoading          = signal<boolean>(false);

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  playerId: number | null = null;

  readonly previewDrops = [
    { label: 'Rusty Stove',    src: '/assets/stove_sprites/common/rusty.png',    rarity: 'common',    rarityLabel: 'Common'    },
    { label: 'Bronze Stove',   src: '/assets/stove_sprites/rare/bronze.png',   rarity: 'rare',      rarityLabel: 'Rare'      },
    { label: 'Golden Stove',   src: '/assets/stove_sprites/epic/golden.png',   rarity: 'epic',      rarityLabel: 'Epic'      },
    { label: 'Dragon Stove',   src: '/assets/stove_sprites/legendary/dragon.png',   rarity: 'legendary', rarityLabel: 'Legendary' },
  ];

  readonly acquisitionLabels: Record<string, string> = {
    free: 'Free',
    purchase: 'Purchased',
    reward: 'Reward'
  };

  private lootBoxHelper = new LootBoxHelper();
  private lootboxApi    = inject(LootboxService);
  private listingApi    = inject(ListingService);
  private cdr           = inject(ChangeDetectorRef);
  private authService   = inject(AuthService);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.playerId = user.playerId;

    // Read selected lootbox id from query param (inventory "Open" action)
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      this.selectedLootboxId.set(Number(idParam));
      this.returnToInventory.set(true);
    }

    await this.loadLootboxData();
  }

  ngAfterViewInit(): void {}

  // ── Data loading ───────────────────────────────────────────

  async loadLootboxData(): Promise<void> {
    if (!this.playerId) return;
    this.isLoading.set(true);

    try {
      const [lootboxes, listings, types] = await Promise.all([
        firstValueFrom(this.lootboxApi.getLootboxesByPlayerId(this.playerId)),
        firstValueFrom(this.listingApi.getActiveListingsBySellerId(this.playerId)),
        firstValueFrom(this.lootboxApi.getAllLootboxTypes())
      ]);

      const typeMap = new Map<number, LootboxType>();
      for (const t of types) {
        typeMap.set(t.lootboxTypeId, t);
      }
      this.lootboxTypes.set(typeMap);

      const listedLootboxIds = new Set(listings.filter(l => l.lootboxId).map(l => l.lootboxId!));
      const available = lootboxes.filter(lb => !listedLootboxIds.has(lb.lootboxId));
      this.availableLootboxes.set(available);
      this.lootboxCount.set(available.length);

      // Validate pre-selected lootbox from query param
      const targetId = this.selectedLootboxId();
      if (targetId !== null) {
        const found = available.find(lb => lb.lootboxId === targetId);
        if (!found) {
          this.resultText.set('Selected lootbox is not available (it may be listed or already opened).');
          this.showPopup.set(true);
          this.selectedLootboxId.set(null);
        }
      }
    } catch (err) {
      console.error('Failed to load lootbox data:', err);
      this.lootboxCount.set(0);
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  getLootboxTypeName(lootboxTypeId: number): string {
    return this.lootboxTypes().get(lootboxTypeId)?.name || 'Standard Lootbox';
  }

  getAcquisitionLabel(how: string): string {
    return this.acquisitionLabels[how] || how;
  }

  selectLootbox(lootboxId: number): void {
    if (this.isOpening()) return;
    this.selectedLootboxId.set(lootboxId);
    const box = this.availableLootboxes().find(b => b.lootboxId === lootboxId);
    if (box) {
      this.selectedTypeName.set(this.getLootboxTypeName(box.lootboxTypeId));
    }
  }

  canOpen(): boolean {
    return !this.isOpening() && this.lootboxCount() > 0 && this.playerId !== null && this.selectedLootboxId() !== null;
  }

  // ── Open flow ──────────────────────────────────────────────

  async openBox(): Promise<void> {
    if (this.isOpening() || this.playerId === null || this.selectedLootboxId() === null) {
      return;
    }

    // Re-fetch fresh data to validate selection is still valid
    try {
      const [lootboxes, listings, types] = await Promise.all([
        firstValueFrom(this.lootboxApi.getLootboxesByPlayerId(this.playerId)),
        firstValueFrom(this.listingApi.getActiveListingsBySellerId(this.playerId)),
        firstValueFrom(this.lootboxApi.getAllLootboxTypes())
      ]);

      const typeMap = new Map<number, string>();
      for (const t of types) {
        typeMap.set(t.lootboxTypeId, t.name);
      }

      const listedLootboxIds = new Set(listings.filter(l => l.lootboxId).map(l => l.lootboxId!));
      const available = lootboxes.filter(lb => !listedLootboxIds.has(lb.lootboxId));

      // Update selector state with fresh data
      this.availableLootboxes.set(available);
      this.lootboxCount.set(available.length);

      if (available.length === 0) {
        this.selectedLootboxId.set(null);
        this.resultText.set(lootboxes.length > 0
          ? 'All your lootboxes are listed. Cancel a listing to open them.'
          : 'You have no lootboxes available.');
        this.showPopup.set(true);
        return;
      }

      const targetId = this.selectedLootboxId();
      const target = available.find(lb => lb.lootboxId === targetId);
      if (!target) {
        this.selectedLootboxId.set(null);
        this.resultText.set('Selected lootbox is not available (it may be listed or already opened).');
        this.showPopup.set(true);
        return;
      }

      this.selectedTypeName.set(typeMap.get(target.lootboxTypeId) || 'Standard Lootbox');

      // Execute open
      const result = await firstValueFrom(this.lootboxApi.openLootbox(target.lootboxId, this.playerId));

      this.lootboxCount.update(count => Math.max(0, count - 1));
      void this.authService.refreshUser();

      // Remove opened lootbox from available list
      this.availableLootboxes.set(available.filter(lb => lb.lootboxId !== target.lootboxId));
      this.selectedLootboxId.set(null);

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
      this.resultText.set('Failed to open lootbox. Please try again.');
      this.showPopup.set(true);
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

  closePopup(): void {
    if (this.returnToInventory()) {
      void this.router.navigate(['/inventory']);
    } else {
      this.resetAll();
    }
  }
}
