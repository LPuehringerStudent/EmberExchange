import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { ListingService, Listing } from '@core/services/listing.service';
import { TradeService } from '@core/services/trade.service';
import { StoveService, StoveType, Stove } from '@core/services/stove.service';
import { LootboxService, LootboxType } from '@core/services/lootbox.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { firstValueFrom } from 'rxjs';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';


/* ============================================================
   LOCAL TYPES
   ============================================================ */

/** A single data-point in the 30-day price history chart */
interface PricePoint {
  date:  string;
  price: number;
}


/* ============================================================
   COMPONENT
   ============================================================ */

@Component({
  selector: 'app-marketplace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CommonModule, HeatTierPipe],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.css'],
})
export class MarketplaceComponent implements OnInit {

  /* ── Tab state (signal so computed() can track it) ─────────── */
  readonly activeTab = signal<'all' | 'my'>('all');


  /* ── Listing data ─────────────────────────────────────────── */
  allListings  = signal<Listing[]>([]);
  myListings   = signal<Listing[]>([]);
  loading      = signal<boolean>(true);
  error        = signal<string | null>(null);
  processingId = signal<number | null>(null);


  /* ── User context ──────────────────────────────────────────── */
  playerId: number | null = null;
  coins = signal<number>(0);


  /* ── Item metadata maps ────────────────────────────────────── */
  stoveTypes   = signal<Map<number, StoveType>>(new Map());
  stoves       = signal<Map<number, Stove>>(new Map());
  lootboxTypes = signal<Map<number, LootboxType>>(new Map());


  /* ── Detail modal state ────────────────────────────────────── */

  /**
   * The listing currently open in the detail modal.
   * null = modal is closed.
   */
  readonly selectedListing = signal<Listing | null>(null);

  /**
   * 30-day price history shown in the modal chart.
   *
   * Currently generated from mock data. When the backend
   * exposes a price-history endpoint, replace the mock block
   * in openDetails() with:
   *   const pts = await firstValueFrom(this._listingService.getPriceHistory(listing.listingId));
   *   this.priceHistory.set(pts);
   */
  readonly priceHistory = signal<PricePoint[]>([]);


  /* ── Derived / computed state ──────────────────────────────── */

  /** Currently visible listings based on the active tab. */
  readonly currentListings = computed(() =>
    this.activeTab() === 'all' ? this.allListings() : this.myListings()
  );

  /** Lowest price across all active listings (shown in header stat). */
  readonly lowestPrice = computed(() => {
    const list = this.allListings();
    return list.length ? Math.min(...list.map(l => l.price)) : 0;
  });

  /**
   * SVG chart data computed from priceHistory.
   * Canvas dimensions: 420 × 100 px with 10px horizontal and 8px vertical padding.
   *
   * Returns:
   *   points — polyline points string for the price line
   *   area   — polygon points string for the filled area beneath the line
   *   avgY   — Y coordinate of the average-price dashed horizontal line
   *   minPrice / maxPrice — used for axis labels
   */
  readonly chartData = computed(() => {
    const history = this.priceHistory();
    if (history.length < 2) {
      return { points: '', area: '', avgY: '50', minPrice: 0, maxPrice: 0 };
    }

    const W = 420, H = 100, PX = 10, PY = 8;
    const prices = history.map(h => h.price);
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);
    const range  = max - min || 1;
    const avg    = prices.reduce((s, p) => s + p, 0) / prices.length;

    /* Map each data-point to an SVG coordinate */
    const coords = history.map((h, i) => {
      const x = PX + (i / (history.length - 1)) * (W - PX * 2);
      const y = PY + (1 - (h.price - min) / range) * (H - PY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    /* Area polygon closes back to the bottom of the chart */
    const firstX   = coords[0].split(',')[0];
    const lastX    = coords[coords.length - 1].split(',')[0];
    const bottomY  = (H - PY).toFixed(1);
    const avgY     = (PY + (1 - (avg - min) / range) * (H - PY * 2)).toFixed(1);

    return {
      points:   coords.join(' '),
      area:     `${coords.join(' ')} ${lastX},${bottomY} ${firstX},${bottomY}`,
      avgY,
      minPrice: min,
      maxPrice: max,
    };
  });

  /** Average price across the 30-day history (shown as a stat in the modal). */
  readonly averageHistoryPrice = computed(() => {
    const h = this.priceHistory();
    if (!h.length) return 0;
    return Math.round(h.reduce((s, p) => s + p.price, 0) / h.length);
  });


  /* ── Services ─────────────────────────────────────────────── */
  private _authService    = inject(AuthService);
  private _router         = inject(Router);
  private _listingService = inject(ListingService);
  private _tradeService   = inject(TradeService);
  private _stoveService   = inject(StoveService);
  private _lootboxService = inject(LootboxService);
  private _priceHistoryService = inject(PriceHistoryService);


  /* ── Lifecycle ─────────────────────────────────────────────── */

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      void this._router.navigate(['/login']);
      return;
    }
    this.playerId = user.playerId;
    this.coins.set(user.coins);
    void this.loadData();
  }


  /* ── Data loading ──────────────────────────────────────────── */

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [all, mine, types, stoveList, lootboxTypeList] = await Promise.all([
        firstValueFrom(this._listingService.getActiveListings()),
        this.playerId !== null
          ? firstValueFrom(this._listingService.getListingsBySellerId(this.playerId))
          : Promise.resolve([]),
        firstValueFrom(this._stoveService.getAllStoveTypes()),
        firstValueFrom(this._stoveService.getAllStoves()),
        firstValueFrom(this._lootboxService.getAllLootboxTypes()),
      ]);

      this.allListings.set(all);
      this.myListings.set(mine);

      const typeMap = new Map<number, StoveType>();
      for (const t of types) typeMap.set(t.typeId, t);
      this.stoveTypes.set(typeMap);

      const stoveMap = new Map<number, Stove>();
      for (const s of stoveList) stoveMap.set(s.stoveId, s);
      this.stoves.set(stoveMap);

      const lootboxTypeMap = new Map<number, LootboxType>();
      for (const lt of lootboxTypeList) lootboxTypeMap.set(lt.lootboxTypeId, lt);
      this.lootboxTypes.set(lootboxTypeMap);

    } catch (err) {
      console.error('Failed to load marketplace:', err);
      this.error.set('Failed to load marketplace listings. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }


  /* ── Detail modal ──────────────────────────────────────────── */

  /**
   * Opens the detail modal for a listing and fetches real price
   * history from the backend for stove listings.
   */
  async openDetails(listing: Listing): Promise<void> {
    this.selectedListing.set(listing);
    this.priceHistory.set([]);

    if (listing.stoveId) {
      const stove = this.stoves().get(listing.stoveId);
      const typeId = stove?.typeId;
      if (typeId) {
        try {
          const history = await firstValueFrom(
            this._priceHistoryService.getPriceHistoryByTypeId(typeId)
          );
          // Sort oldest → newest and take the last 30 entries
          const sorted = history
            .slice()
            .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());

          const points: PricePoint[] = sorted.map(h => ({
            date: new Date(h.saleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: h.salePrice,
          }));

          // If we have fewer than 2 real data-points, append the current listing price
          // so the chart always has something meaningful to show.
          if (points.length < 2) {
            points.push({
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              price: listing.price,
            });
          }
          this.priceHistory.set(points);
        } catch (err) {
          console.error('Failed to load price history:', err);
          // Fallback: just the current listing price
          this.priceHistory.set([{
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: listing.price,
          }]);
        }
      }
    } else if (listing.lootboxId) {
      // Price history is not yet tracked for lootbox types on the backend;
      // show a single data-point so the chart renders gracefully.
      this.priceHistory.set([{
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: listing.price,
      }]);
    }
  }

  closeDetails(): void {
    this.selectedListing.set(null);
    this.priceHistory.set([]);
  }

  /** Stops a click inside the modal panel from bubbling to the backdrop. */
  preventClose(event: MouseEvent): void {
    event.stopPropagation();
  }


  /* ── Trade actions ─────────────────────────────────────────── */

  async buyListing(listing: Listing): Promise<void> {
    if (this.playerId === null || listing.status !== 'active') return;

    if (this.coins() < listing.price) {
      this.error.set('You do not have enough coins to buy this item.');
      return;
    }

    this.processingId.set(listing.listingId);
    try {
      await firstValueFrom(this._tradeService.executeTrade(listing.listingId, this.playerId));
      await this._authService.refreshUser();
      this.coins.set(this._authService.getCurrentUser()?.coins ?? 0);
      this.closeDetails();
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { message?: string; error?: { error?: string } };
      this.error.set(e?.message ?? e?.error?.error ?? 'Purchase failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  async cancelListing(listing: Listing): Promise<void> {
    if (listing.status !== 'active') return;

    this.processingId.set(listing.listingId);
    try {
      await firstValueFrom(this._listingService.cancelListing(listing.listingId));
      this.closeDetails();
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { message?: string; error?: { error?: string } };
      this.error.set(e?.message ?? e?.error?.error ?? 'Cancellation failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }


  /* ── Item data helpers (unchanged from original) ───────────── */

  isStoveListing(listing: Listing): boolean   { return !!listing.stoveId; }
  isLootboxListing(listing: Listing): boolean { return !!listing.lootboxId; }

  getItemName(listing: Listing): string {
    if (listing.stoveId) {
      const stove = this.stoves().get(listing.stoveId);
      if (!stove) return `Stove #${listing.stoveId}`;
      return this.stoveTypes().get(stove.typeId)?.name ?? `Stove #${listing.stoveId}`;
    }
    if (listing.lootboxId) return `Lootbox #${listing.lootboxId}`;
    return 'Unknown Item';
  }

  getRarity(listing: Listing): string {
    if (listing.stoveId) {
      const stove = this.stoves().get(listing.stoveId);
      if (!stove) return 'common';
      return this.stoveTypes().get(stove.typeId)?.rarity?.toLowerCase() ?? 'common';
    }
    return 'common';
  }

  getHeatLevel(listing: Listing): number | null {
    if (listing.stoveId) return this.stoves().get(listing.stoveId)?.heatLevel ?? null;
    return null;
  }

  getImageUrl(listing: Listing): string {
    if (listing.stoveId) {
      const stove = this.stoves().get(listing.stoveId);
      if (!stove) return '';
      return this.stoveTypes().get(stove.typeId)?.imageUrl ?? '';
    }
    return '';
  }

  getItemMeta(listing: Listing): string {
    if (listing.stoveId)   return `Stove #${listing.stoveId}`;
    if (listing.lootboxId) return `Lootbox #${listing.lootboxId}`;
    return '';
  }

  isOwnListing(listing: Listing): boolean {
    return this.playerId !== null && listing.sellerId === this.playerId;
  }

  formatPrice(price: number): string { return price.toLocaleString(); }

  formatDate(dateString: Date | string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }
}
