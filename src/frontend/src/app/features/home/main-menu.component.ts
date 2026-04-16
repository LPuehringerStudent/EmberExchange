import { Component, ElementRef, viewChild, AfterViewInit, OnDestroy, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { OwnershipService } from '@core/services/ownership.service';
import { firstValueFrom } from 'rxjs';

interface Game {
  name: string;
  icon: string;
  reward: number;
}

interface RecentPull {
  username: string;
  itemName: string;
  stoveIcon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  timeAgo: string;
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

  games: Game[] = [
    { name: 'Dummy', icon: '⚠', reward: 50 },
    { name: 'Dummy', icon: '⚠', reward: 75 },
    { name: 'Dummy', icon: '⚠', reward: 100 },
    { name: 'Dummy', icon: '⚠', reward: 150 },
    { name: 'Dummy', icon: '⚠', reward: 200 },
    { name: 'Dummy', icon: '⚠', reward: 250 },
    { name: 'Dummy', icon: '⚠', reward: 300 },
    { name: 'Dummy', icon: '⚠', reward: 400 },
    { name: 'Dummy', icon: '⚠', reward: 500 },
    { name: 'Dummy', icon: '⚠', reward: 750 }
  ];

  recentPulls: RecentPull[] = [
    { username: 'PlayerTwo', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'legendary', timeAgo: '2m' },
    { username: 'PlayerThree', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'epic', timeAgo: '5m' },
    { username: 'PlayerFour', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'rare', timeAgo: '10m' },
    { username: 'PlayerFive', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'common', timeAgo: '15m' },
    { username: 'PlayerSix', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'epic', timeAgo: '20m' },
    { username: 'PlayerSeven', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'legendary', timeAgo: '30m' },
    { username: 'PlayerEight', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'rare', timeAgo: '45m' },
    { username: 'PlayerNine', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'common', timeAgo: '1h' },
    { username: 'PlayerTen', itemName: 'Dummy Stove', stoveIcon: '♨', rarity: 'epic', timeAgo: '2h' }
  ];

  private authService = inject(AuthService);
  private ownershipService = inject(OwnershipService);

  ngOnInit(): void {
    this.loadUserData();
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
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', this.boundUpdateCardsHeight);
  }

  private async loadUserData(): Promise<void> {
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
