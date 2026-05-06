import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GameService, Game } from '../../core/services/game.service';

interface RoomListItem {
  roomId: string;
  status: string;
  maxPlayers: number;
  gameType: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-game-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-lobby.component.html',
  styleUrl: './game-lobby.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameLobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private gameService = inject(GameService);

  gameType = signal<string>('');
  game = signal<Game | null>(null);
  rooms = signal<RoomListItem[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  creating = signal<boolean>(false);

  ngOnInit(): void {
    const gt = this.route.snapshot.paramMap.get('gameType');
    if (!gt) {
      this.error.set('No game type specified');
      this.loading.set(false);
      return;
    }
    this.gameType.set(gt);
    const existing = this.gameService.getGameByType(gt);
    if (existing) {
      this.game.set(existing);
    } else {
      this.gameService.fetchGames();
    }
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<RoomListItem[]>(`/api/rooms?gameType=${encodeURIComponent(this.gameType())}&status=waiting`)
      .subscribe({
        next: (data) => {
          this.rooms.set(data);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Failed to load rooms');
          this.loading.set(false);
        },
      });
  }

  createRoom(): void {
    if (this.creating()) return;
    this.creating.set(true);
    const maxPlayers = this.game()?.maxPlayers ?? 4;
    this.http
      .post<RoomListItem>('/api/rooms', {
        maxPlayers,
        gameType: this.gameType(),
      })
      .subscribe({
        next: (room) => {
          this.creating.set(false);
          void this.router.navigate(['/game-room', room.roomId]);
        },
        error: (err: Error) => {
          this.creating.set(false);
          this.error.set(err.message || 'Failed to create room');
        },
      });
  }

  joinRoom(roomId: string): void {
    void this.router.navigate(['/game-room', roomId]);
  }

  goBack(): void {
    void this.router.navigate(['/games']);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }
}
