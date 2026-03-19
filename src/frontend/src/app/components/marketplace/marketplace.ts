import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Listing, getAllListings, getListingsBySellerId } from '../../fetchers/listing.fetcher';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './marketplace.html',
  styleUrl: './marketplace.css',
})
export class Marketplace implements OnInit {
  activeTab: 'all' | 'my' = 'all';
  
  allListings = signal<Listing[]>([]);
  myListings = signal<Listing[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  playerId: number | null = null;

  private _authService = inject(AuthService);
  private _router = inject(Router);

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
      const all = await getAllListings();
      this.allListings.set(all);

      // Load my listings if logged in
      if (this.playerId !== null) {
        const mine = await getListingsBySellerId(this.playerId);
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
