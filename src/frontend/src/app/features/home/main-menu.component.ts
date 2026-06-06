import { Component, ElementRef, viewChild, AfterViewInit, OnDestroy, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { OwnershipService } from '@core/services/ownership.service';
import { LootboxService, RecentPull } from '@core/services/lootbox.service';
import { OnboardingService } from '@core/services/onboarding.service';
import { firstValueFrom } from 'rxjs';

interface Game {
  name: string;
  icon: string;
  reward: number;
}



@Component({
  selector: 'app-main-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent implements AfterViewInit, OnDestroy, OnInit {
  gamesTrack = viewChild.required<ElementRef>('gamesTrack');
  cardsGrid = viewChild.required<ElementRef>('cardsGrid');

  cardsHeight: number = 400;
  private resizeObserver: ResizeObserver | null = null;
  private boundUpdateCardsHeight = this.updateCardsHeight.bind(this);

  // User data signals
  username = signal<string>('Player');
  coins = signal<number>(0);
  stoveCount = signal<number>(0);
  lootboxCount = signal<number>(0);
  loading = signal<boolean>(true);

  // Mini-games available in the platform
  games = [
    { title: 'Poker', route: '/games/poker/lobby', players: '2-8', tag: 'Multiplayer' },
    { title: 'Blackjack', route: '/games/blackjack/lobby', players: '1-7', tag: 'Gambling' }
  ];

  recentPulls = signal<RecentPull[]>([]);
  private onboardingLoadPromise: Promise<void> | null = null;

  private authService = inject(AuthService);
  private ownershipService = inject(OwnershipService);
  private lootboxService = inject(LootboxService);
  private onboardingService = inject(OnboardingService);

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecentPulls();
    this.onboardingLoadPromise = this.onboardingService.loadState();
  }

  private async loadRecentPulls(): Promise<void> {
    try {
      const pulls = await firstValueFrom(this.lootboxService.getRecentPulls(20));
      this.recentPulls.set(pulls);
    } catch (err) {
      console.error('Failed to load recent pulls:', err);
      this.recentPulls.set([]);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateCardsHeight();

      if (typeof ResizeObserver !== 'undefined' && this.cardsGrid()) {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateCardsHeight();
        });
        this.resizeObserver.observe(this.cardsGrid().nativeElement);
      }
    }, 0);
    window.addEventListener('resize', this.boundUpdateCardsHeight);

    // Wait for onboarding state to load, then start tour if needed
    this.onboardingLoadPromise?.then(() => {
      setTimeout(() => {
        this.onboardingService.startTourIfNeeded();
      }, 500);
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', this.boundUpdateCardsHeight);
  }

  private async loadUserData(): Promise<void> {
    this.loading.set(true);
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username.set(user.username);
      this.coins.set(user.coins);
      this.lootboxCount.set(user.lootboxCount);

      // Load stove count from ownership API
      try {
        const ownerships = await firstValueFrom(this.ownershipService.getOwnershipsByPlayerId(user.playerId));
        this.stoveCount.set(ownerships.length);
      } catch (error) {
        console.error('Failed to load stove count:', error);
      }
    }
    this.loading.set(false);
  }

  private updateCardsHeight() {
    const grid = this.cardsGrid();
    if (grid && grid.nativeElement) {
      const height = grid.nativeElement.offsetHeight;
      if (height > 0 && height !== this.cardsHeight) {
        this.cardsHeight = height;
      }
    }
  }

  scrollGames(direction: 'left' | 'right') {
    const track = this.gamesTrack().nativeElement;
    const scrollAmount = 200;

    if (direction === 'left') {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}
