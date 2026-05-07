import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../core/services/game.service';

export type FilterMode = 'all' | 'most-played' | 'recently-released' | 'favorites';

export interface Friend {
  name: string;
  avatar: string;
}

export interface Game {
  gameType: string;
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
  minPlayers: number;
  maxPlayers: number;
}

const ACCENT_COLORS: Record<string, string> = {
  poker: '#e85d04',
  blackjack: '#6eabb6',
};

@Component({
  selector: 'app-games',
  imports: [CommonModule],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);

  readonly filterOpen = signal(false);
  readonly activeFilter = signal<FilterMode>('all');
  readonly apiGames = this.gameService.games;
  readonly apiLoading = this.gameService.loading;
  readonly apiError = this.gameService.error;

  // Local UI state (favorites) keyed by gameType
  readonly favorites = signal<Set<string>>(new Set());

  readonly allGames = computed<Game[]>(() => {
    const api = this.apiGames();
    const favs = this.favorites();
    return api.map((g, idx) => ({
      gameType: g.gameType,
      title: g.name,
      genre: g.genre,
      tags: g.tags,
      playCount: 0,
      releaseDate: new Date(g.createdAt),
      isFavorite: favs.has(g.gameType),
      trending: true,
      friendsPlayed: [{ name: 'Davidus', avatar: 'D' }],
      accentColor: ACCENT_COLORS[g.gameType] || `hsl(${(idx * 137) % 360}, 70%, 50%)`,
      icon: '',
      description: g.description,
      route: g.gameType,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
    }));
  });

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

  ngOnInit(): void {
    this.gameService.fetchGames();
  }

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
    this.favorites.update((set) => {
      const next = new Set(set);
      if (next.has(game.gameType)) {
        next.delete(game.gameType);
      } else {
        next.add(game.gameType);
      }
      return next;
    });
  }

  openGame(game: Game): void {
    this.router.navigate(['/games', game.route, 'lobby']);
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
