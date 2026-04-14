import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ListingService, Listing } from '@core/services/listing.service';
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

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _listingService = inject(ListingService);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      this._router.navigate(['/login']);
      return;
    }

    this.playerId = user.playerId;
    this.loadListings();
  }

  async loadListings(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load all listings
      const all = await firstValueFrom(this._listingService.getAllListings());
      this.allListings.set(all);

      // Load my listings if logged in
      if (this.playerId !== null) {
        const mine = await firstValueFrom(this._listingService.getListingsBySellerId(this.playerId));
        this.myListings.set(mine);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
      this.error.set('Failed to load marketplace listings. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }

  formatDate(dateString: Date | string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
