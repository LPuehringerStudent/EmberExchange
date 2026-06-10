import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface Game {
  gameType: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  ruleset: string;
  description: string;
  genre: string;
  tags: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private api = inject(ApiService);

  private _games = signal<Game[]>([]);
  readonly games = this._games.asReadonly();

  private _loading = signal<boolean>(false);
  readonly loading = this._loading.asReadonly();

  private _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  fetchGames(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.get<Game[]>('/games').subscribe({
      next: (data) => {
        this._games.set(data);
        this._loading.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message || 'Failed to load games');
        this._loading.set(false);
      },
    });
  }

  getGameByType(gameType: string): Game | undefined {
    return this._games().find((g) => g.gameType === gameType);
  }
}
