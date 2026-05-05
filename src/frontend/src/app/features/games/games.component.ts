import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export type FilterMode = 'all' | 'most-played' | 'recently-released' | 'favorites';

export interface Friend {
  name: string;
  avatar: string;
}

export interface Game {
  id: number;
  title: string;
  genre: string;
  tags: string[];
  playCount: number;
  releaseDate: Date;
  isFavorite: boolean;
  trending: boolean;
  friendsPlayed: Friend[];
  accentColor: string;
  icon: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-games',
  imports: [CommonModule],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  private readonly router = inject(Router);

  readonly filterOpen = signal(false);
  readonly activeFilter = signal<FilterMode>('all');

  readonly allGames = signal<Game[]>([
    {
      id: 1,
      title: 'Poker',
      genre: 'Strategy',
      tags: ['Multiplayer', 'Gambling'],
      playCount: 0,
      releaseDate: new Date('05-05-2026'),
      isFavorite: false,
      trending: true,
      accentColor: '#e85d04',
      icon: '',
      description: 'Play with multiple people and find out your skills on feeling and strategy!',
      friendsPlayed: [
        { name: 'Davidus', avatar: 'D' }
      ],
      route: '/poker',
    },
    {
      id: 2,
      title: 'Blackjack',
      genre: 'Strategy',
      tags: ['Singleplayer', 'Gambling', 'Multiplayer'],
      playCount: 0,
      releaseDate: new Date('05-05-2026'),
      isFavorite: false,
      trending: true,
      accentColor: '#6eabb6',
      icon: '',
      description: 'Play with multiple people and find out your skills on feeling and strategy!',
      friendsPlayed: [
        { name: 'Davidus', avatar: 'D' }
      ],
      route: '/blackjack',
    }
  ]);

  readonly trendingGames = computed(() =>
    this.allGames().filter((g) => g.trending)
  );

  readonly filteredGames = computed(() => {
    const games = this.allGames();
    switch (this.activeFilter()) {
      case 'most-played':
        return [...games].sort((a, b) => b.playCount - a.playCount);
      case 'recently-released':
        return [...games].sort(
          (a, b) => b.releaseDate.getTime() - a.releaseDate.getTime()
        );
      case 'favorites':
        return games.filter((g) => g.isFavorite);
      default:
        return games;
    }
  });

  readonly filterLabel = computed(() => {
    switch (this.activeFilter()) {
      case 'most-played': return 'Most Played';
      case 'recently-released': return 'Recently Released';
      case 'favorites': return 'Favorites';
      default: return 'All Games';
    }
  });

  toggleFilter(): void {
    this.filterOpen.update((v) => !v);
  }

  closeFilter(): void {
    this.filterOpen.set(false);
  }

  setFilter(mode: FilterMode): void {
    this.activeFilter.set(mode);
    this.filterOpen.set(false);
  }

  toggleFavorite(game: Game, event: MouseEvent): void {
    event.stopPropagation();
    this.allGames.update((games) =>
      games.map((g) =>
        g.id === game.id ? { ...g, isFavorite: !g.isFavorite } : g
      )
    );
  }

  openGame(game: Game): void {
    this.router.navigate([game.route]);
  }

  formatPlayCount(count: number): string {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  visibleFriends(friends: Friend[]): Friend[] {
    return friends.slice(0, 3);
  }

  extraFriends(friends: Friend[]): number {
    return Math.max(0, friends.length - 3);
  }
}
