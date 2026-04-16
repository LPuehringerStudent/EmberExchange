import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ListingService, Listing } from '@core/services/listing.service';
import { TradeService } from '@core/services/trade.service';
import { StoveService, StoveType, Stove } from '@core/services/stove.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-marketplace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.css'],
})
export class MarketplaceComponent implements OnInit {
  activeTab: 'all' | 'my' = 'all';

  allListings = signal<Listing[]>([]);
  myListings = signal<Listing[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  playerId: number | null = null;
  coins = signal<number>(0);
  stoveTypes = signal<Map<number, StoveType>>(new Map());
  stoves = signal<Map<number, Stove>>(new Map());
  processingId = signal<number | null>(null);

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _listingService = inject(ListingService);
  private _tradeService = inject(TradeService);
  private _stoveService = inject(StoveService);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      this._router.navigate(['/login']);
      return;
    }

    this.playerId = user.playerId;
    this.coins.set(user.coins);
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [all, mine, types, stoveList] = await Promise.all([
        firstValueFrom(this._listingService.getActiveListings()),
        this.playerId !== null
          ? firstValueFrom(this._listingService.getListingsBySellerId(this.playerId))
          : Promise.resolve([]),
        firstValueFrom(this._stoveService.getAllStoveTypes()),
        firstValueFrom(this._stoveService.getAllStoves())
      ]);

      this.allListings.set(all);
      this.myListings.set(mine);

      const typeMap = new Map<number, StoveType>();
      for (const t of types) {
        typeMap.set(t.typeId, t);
      }
      this.stoveTypes.set(typeMap);

      const stoveMap = new Map<number, Stove>();
      for (const s of stoveList) {
        stoveMap.set(s.stoveId, s);
      }
      this.stoves.set(stoveMap);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
      this.error.set('Failed to load marketplace listings. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

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
      await this.loadData();
    } catch (err: any) {
      console.error('Failed to buy listing:', err);
      this.error.set(err?.error?.error || 'Purchase failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  async cancelListing(listing: Listing): Promise<void> {
    if (listing.status !== 'active') return;

    this.processingId.set(listing.listingId);
    try {
      await firstValueFrom(this._listingService.cancelListing(listing.listingId));
      await this.loadData();
    } catch (err: any) {
      console.error('Failed to cancel listing:', err);
      this.error.set(err?.error?.error || 'Cancellation failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  getStoveName(stoveId: number): string {
    const stove = this.stoves().get(stoveId);
    if (!stove) return `Stove #${stoveId}`;
    const type = this.stoveTypes().get(stove.typeId);
    return type?.name || `Stove #${stoveId}`;
  }

  getRarity(stoveId: number): string {
    const stove = this.stoves().get(stoveId);
    if (!stove) return 'common';
    const type = this.stoveTypes().get(stove.typeId);
    return type?.rarity?.toLowerCase() || 'common';
  }

  isOwnListing(listing: Listing): boolean {
    return this.playerId !== null && listing.sellerId === this.playerId;
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }

  formatDate(dateString: Date | string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
