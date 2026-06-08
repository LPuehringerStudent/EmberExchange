import { AfterViewInit, Component, ElementRef, inject, viewChild, ChangeDetectorRef, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LootBoxHelper, LootItem } from './lootbox-helper';
import { LootboxService, Lootbox, LootboxType } from '@core/services/lootbox.service';
import { ListingService } from '@core/services/listing.service';
import { AuthService } from '@core/services/auth.service';
import { PityService, PityProgress } from '@core/services/pity.service';
import { firstValueFrom } from 'rxjs';
import { InfoTooltipComponent } from '../../shared/components/info-tooltip/info-tooltip.component';

export interface DropRateEntry {
  rarity: string;
  rate: string;
}

export interface PreviewDrop {
  label: string;
  src: string;
  rarity: string;
  rarityLabel: string;
}

export interface DragonDrop {
  label: string;
  src: string;
  rarity: string;
  rarityLabel: string;
}

const DROP_RATES: Record<number, DropRateEntry[]> = {
  1: [ // Standard Lootbox
    { rarity: 'common', rate: '75%' },
    { rarity: 'rare', rate: '20%' },
    { rarity: 'epic', rate: '4%' },
    { rarity: 'legendary', rate: '1%' },
    { rarity: 'secret', rate: '0%' },
  ],
  2: [ // Golden Lootbox
    { rarity: 'common', rate: '45%' },
    { rarity: 'rare', rate: '35%' },
    { rarity: 'epic', rate: '15%' },
    { rarity: 'legendary', rate: '4%' },
    { rarity: 'secret', rate: '1%' },
  ],
  3: [ // Legendary Crate
    { rarity: 'common', rate: '0%' },
    { rarity: 'rare', rate: '25%' },
    { rarity: 'epic', rate: '40%' },
    { rarity: 'legendary', rate: '30%' },
    { rarity: 'secret', rate: '5%' },
  ],
  4: [ // Dragon Crate
    { rarity: 'common', rate: '30%' },
    { rarity: 'rare', rate: '30%' },
    { rarity: 'epic', rate: '25%' },
    { rarity: 'legendary', rate: '12%' },
    { rarity: 'secret', rate: '3%' },
  ],
  5: [ // Winter Crate
    { rarity: 'common', rate: '49%' },
    { rarity: 'rare', rate: '30%' },
    { rarity: 'epic', rate: '15%' },
    { rarity: 'legendary', rate: '5%' },
    { rarity: 'secret', rate: '1%' },
  ],
};

const PREVIEW_DROPS: PreviewDrop[] = [
  { label: 'Rusty Stove',    src: '/assets/stove_sprites/common/rusty.png',    rarity: 'common',    rarityLabel: 'Common'    },
  { label: 'Bronze Stove',   src: '/assets/stove_sprites/rare/bronze.png',   rarity: 'rare',      rarityLabel: 'Rare'      },
  { label: 'Golden Stove',   src: '/assets/stove_sprites/epic/golden.png',   rarity: 'epic',      rarityLabel: 'Epic'      },
  { label: 'Dragon Stove',   src: '/assets/stove_sprites/legendary/dragon.png',   rarity: 'legendary', rarityLabel: 'Legendary' },
  { label: 'Earthbound Stove', src: '/assets/stove_sprites/secret/earthbound-stove.png', rarity: 'secret', rarityLabel: 'Secret' },
];

const DRAGON_DROPS: DragonDrop[] = [
  { label: 'Dragon Stove',            src: '/assets/stove_sprites/legendary/dragon.png',                   rarity: 'legendary', rarityLabel: 'Legendary' },
  { label: 'Red Dragon Stove',        src: '/assets/stove_sprites/legendary/red-dragon-stove.png',         rarity: 'epic',      rarityLabel: 'Epic' },
  { label: 'White Dragon Stove',      src: '/assets/stove_sprites/epic/white-dragon-stove.png',           rarity: 'rare',      rarityLabel: 'Rare' },
  { label: 'Galactic Dragon Stove',   src: '/assets/stove_sprites/secret/galactic-dragon-stove.png',       rarity: 'legendary', rarityLabel: 'Legendary' },
  { label: 'Standard Dragon',         src: '/assets/stove_sprites/new_stoves/standard-dragon.png',         rarity: 'common',    rarityLabel: 'Common' },
  { label: 'Dirt Dragon',             src: '/assets/stove_sprites/new_stoves/dirt-dragon.png',             rarity: 'common',    rarityLabel: 'Common' },
  { label: 'Green Dragon',            src: '/assets/stove_sprites/new_stoves/green-dragon.png',            rarity: 'rare',      rarityLabel: 'Rare' },
  { label: 'Black Dragon',            src: '/assets/stove_sprites/new_stoves/black-dragon.png',            rarity: 'epic',      rarityLabel: 'Epic' },
  { label: 'Shiny Celestial Dragon',  src: '/assets/stove_sprites/new_stoves/shiny-celestial-dragon.png',  rarity: 'secret',    rarityLabel: 'Secret' },
];

const WINTER_DROPS: DragonDrop[] = [
  { label: 'Mistle Stove',           src: '/assets/stove_sprites/winter_stove/mistle_stove.png',           rarity: 'rare',      rarityLabel: 'Rare' },
  { label: 'Pine Stove',             src: '/assets/stove_sprites/winter_stove/pine_stove.png',             rarity: 'common',    rarityLabel: 'Common' },
  { label: 'Snowman Stove',          src: '/assets/stove_sprites/winter_stove/snowman_stove.png',          rarity: 'common',    rarityLabel: 'Common' },
  { label: 'Lantern Stove',          src: '/assets/stove_sprites/winter_stove/lantern_stove.png',          rarity: 'rare',      rarityLabel: 'Rare' },
  { label: 'Pinetree Stove',         src: '/assets/stove_sprites/winter_stove/pinetree_stove.png',         rarity: 'epic',      rarityLabel: 'Epic' },
  { label: 'Festival Stove',         src: '/assets/stove_sprites/winter_stove/festival_stove.png',         rarity: 'secret',    rarityLabel: 'Secret' },
  { label: 'Snowgod Stove',          src: '/assets/stove_sprites/winter_stove/snowgod_stove.png',          rarity: 'epic',      rarityLabel: 'Epic' },
  { label: 'Ultimate Snowman Stove', src: '/assets/stove_sprites/winter_stove/ultimate_snowman_stove.png', rarity: 'legendary', rarityLabel: 'Legendary' },
];

@Component({
  selector: 'app-lootbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lootbox.component.html',
  imports: [NgOptimizedImage, InfoTooltipComponent],
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

  // Pity state
  pityCounters = signal<Record<number, PityProgress>>({});

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  playerId: number | null = null;

  readonly previewDrops = PREVIEW_DROPS;
  readonly dragonDrops  = DRAGON_DROPS;
  readonly winterDrops  = WINTER_DROPS;
  readonly dropRates    = DROP_RATES;

  readonly acquisitionLabels: Record<string, string> = {
    free: 'Free',
    purchase: 'Purchased',
    reward: 'Reward'
  };

  private lootBoxHelper = new LootBoxHelper();
  private lootboxApi    = inject(LootboxService);
  private listingApi    = inject(ListingService);
  private pityApi       = inject(PityService);
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
    await this.loadPityData();
  }

  async loadPityData(): Promise<void> {
    try {
      const counters = await firstValueFrom(this.pityApi.getPityCounters());
      this.pityCounters.set({
        1: counters.standard,
        2: counters.golden,
        3: counters.legendary,
        4: counters.dragon,
        5: counters.winter,
      });
    } catch (err) {
      console.error('Failed to load pity data:', err);
    }
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
        } else {
          this.selectedTypeName.set(this.getLootboxTypeName(found.lootboxTypeId));
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

  getSelectedLootboxTypeId(): number | null {
    const selectedId = this.selectedLootboxId();
    if (selectedId === null) return null;
    const box = this.availableLootboxes().find(b => b.lootboxId === selectedId);
    return box?.lootboxTypeId ?? null;
  }

  isDragonCrate(): boolean {
    return this.getSelectedLootboxTypeId() === 4;
  }

  isWinterCrate(): boolean {
    return this.getSelectedLootboxTypeId() === 5;
  }

  getRatesLabel(): string {
    const typeId = this.getSelectedLootboxTypeId();
    if (typeId === null) return 'Standard Lootbox rates';
    const name = this.getLootboxTypeName(typeId);
    return `${name} rates`;
  }

  getDropRate(rarity: string): string {
    const typeId = this.getSelectedLootboxTypeId() ?? 1; // default to Standard
    const table = this.dropRates[typeId];
    if (!table) return '-';
    const entry = table.find(r => r.rarity === rarity);
    return entry?.rate ?? '-';
  }

  getAcquisitionLabel(how: string): string {
    return this.acquisitionLabels[how] || how;
  }

  getSelectorChestImage(typeName: string): string {
    const name = typeName.toLowerCase();
    if (name.includes('dragon')) {
      return 'assets/animation/dragon-chest-idle-animation.gif';
    }
    if (name.includes('winter')) {
      return 'assets/animation/winter-chest-idle-animation.gif';
    }
    if (name.includes('legendary')) {
      return 'assets/animation/legendary-chest-idle-animation.gif';
    }
    if (name.includes('golden')) {
      return 'assets/animation/chest-idle-gold.gif';
    }
    return 'assets/animation/chest-idle.gif';
  }

  selectLootbox(lootboxId: number): void {
    if (this.isOpening()) return;
    this.selectedLootboxId.set(lootboxId);
    const box = this.availableLootboxes().find(b => b.lootboxId === lootboxId);
    if (box) {
      this.selectedTypeName.set(this.getLootboxTypeName(box.lootboxTypeId));
    }
  }

  getPityForSelected(): PityProgress | undefined {
    const typeId = this.getSelectedLootboxTypeId() ?? 1;
    return this.pityCounters()[typeId];
  }

  canOpen(): boolean {
    return !this.isOpening() && this.lootboxCount() > 0 && this.playerId !== null && this.selectedLootboxId() !== null;
  }

  getChestImage(): string {
    const typeName = this.selectedTypeName().toLowerCase();
    if (typeName.includes('dragon')) {
      return 'assets/animation/dragon-chest-idle-animation.gif';
    }
    if (typeName.includes('winter')) {
      return 'assets/animation/winter-chest-idle-animation.gif';
    }
    if (typeName.includes('legendary')) {
      return 'assets/animation/legendary-chest-idle-animation.gif';
    }
    if (typeName.includes('golden')) {
      return 'assets/animation/chest-idle-gold.gif';
    }
    return 'assets/animation/chest-idle.gif';
  }

  getOpeningImage(): string {
    const typeName = this.selectedTypeName().toLowerCase();
    if (typeName.includes('dragon')) {
      return 'assets/animation/dragon-chest-opening-animation.gif';
    }
    if (typeName.includes('winter')) {
      return 'assets/animation/winter-chest-opening-animation.gif';
    }
    if (typeName.includes('legendary')) {
      return 'assets/animation/legendary-chest-open-animation.gif';
    }
    return 'assets/animation/chest-opening.gif';
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
