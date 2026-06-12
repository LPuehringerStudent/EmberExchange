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
import { PageBackgroundComponent } from '../../shared/components/page-background/page-background.component';

export type FilterMode = 'all' | 'most-played' | 'recently-released' | 'favorites';

export interface Friend {
  name: string;
  avatar: string;
}

export interface DisplayGame {
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
  iconPath: string;
  iconAlt: string;
  description: string;
  route: string;
}

const GAME_ENRICHMENTS: Record<string, { accentColor: string; iconPath: string; iconAlt: string; playCount: number }> = {
  poker: { accentColor: '#e85d04', iconPath: 'icon/poker.png', iconAlt: 'Poker', playCount: 1240 },
  blackjack: { accentColor: '#6eabb6', iconPath: 'icon/blackjack.png', iconAlt: 'Blackjack', playCount: 890 },
  roulette: { accentColor: '#c62828', iconPath: 'icon/roulette.png', iconAlt: 'Roulette', playCount: 2100 },
};

const DEFAULT_GAME_ENRICHMENT = {
  accentColor: '#e85d04',
  iconPath: 'icon/games.png',
  iconAlt: 'Game',
  playCount: 0,
};

@Component({
  selector: 'app-games',
  imports: [CommonModule, PageBackgroundComponent],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent implements OnInit {
  private readonly router = inject(Router);
  readonly gameService = inject(GameService);

  readonly filterOpen = signal(false);
  readonly activeFilter = signal<FilterMode>('all');

  readonly allGames = computed<DisplayGame[]>(() => {
    const apiGames = this.gameService.games();
    return apiGames.map((g, idx) => {
      const enrich = GAME_ENRICHMENTS[g.gameType] ?? DEFAULT_GAME_ENRICHMENT;
      return {
        id: idx + 1,
        title: g.name,
        genre: g.genre.charAt(0).toUpperCase() + g.genre.slice(1),
        tags: g.tags,
        playCount: enrich.playCount,
        releaseDate: g.createdAt ? new Date(g.createdAt) : new Date(),
        isFavorite: false,
        trending: enrich.playCount > 1000,
        friendsPlayed: [],
        accentColor: enrich.accentColor,
        iconPath: enrich.iconPath,
        iconAlt: enrich.iconAlt,
        description: g.description || `${g.name} - ${g.minPlayers}-${g.maxPlayers} players`,
        route: g.gameType,
      };
    });
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

  toggleFavorite(game: DisplayGame, event: MouseEvent): void {
    event.stopPropagation();
    // Favorites are in-memory only for now.
  }

  openGame(game: DisplayGame): void {
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
