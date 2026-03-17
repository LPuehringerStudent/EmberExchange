import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';


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
  standalone: true,
  imports: [RouterModule],
  templateUrl: '../html/main-menu.html',
  styleUrls: ['../css/main-menu.css']
})
export class MainMenuComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gamesTrack') gamesTrack!: ElementRef;
  @ViewChild('cardsGrid') cardsGrid!: ElementRef;

  cardsHeight: number = 400; // Default fallback height
  private resizeObserver: ResizeObserver | null = null;
  private boundUpdateCardsHeight = this.updateCardsHeight.bind(this);

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

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateCardsHeight();

      if (typeof ResizeObserver !== 'undefined' && this.cardsGrid) {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateCardsHeight();
        });
        this.resizeObserver.observe(this.cardsGrid.nativeElement);
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

  private updateCardsHeight() {
    if (this.cardsGrid && this.cardsGrid.nativeElement) {
      const height = this.cardsGrid.nativeElement.offsetHeight;
      if (height > 0 && height !== this.cardsHeight) {
        this.cardsHeight = height;
      }
    }
  }

  scrollGames(direction: 'left' | 'right') {
    const track = this.gamesTrack.nativeElement;
    const scrollAmount = 200;

    if (direction === 'left') {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}
