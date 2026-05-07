import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketService } from '../../core/services/websocket.service';
import { HttpClient } from '@angular/common/http';
import { Poker } from '../poker/poker';

interface RoomResponse {
  roomId: string;
  status: string;
  maxPlayers: number;
  gameType: string;
  settings: Record<string, unknown>;
  players: Array<{ playerId: number; seatIndex: number; connectionState: string; username?: string }>;
}

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, Poker],
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);

  roomId = signal<string>('');
  roomGameType = signal<string>('');
  maxPlayers = signal<number>(0);
  roomSettings = signal<Record<string, unknown>>({});
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  mockNotification = signal<string | null>(null);

  connectionState = this.ws.connectionState;
  players = this.ws.playersInRoom;
  lastError = this.ws.lastError;
  stateBlob = this.ws.stateBlob;

  roomStatus = computed(() => {
    const blobStatus = this.stateBlob()?.['status'] as string | undefined;
    // If WS has delivered an active game state, use that; otherwise fall back to HTTP-fetched status
    return blobStatus === 'active' ? 'active' : this._httpRoomStatus();
  });

  private _httpRoomStatus = signal<string>('');

  canStartGame = computed(() => {
    return this.roomStatus() === 'waiting' && this.players().length >= 2;
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('roomId');
    if (!id) {
      this.error.set('No room ID provided');
      this.loading.set(false);
      return;
    }

    this.roomId.set(id);

    // If it's a new room creation request
    if (id === 'new') {
      const gameType = this.route.snapshot.queryParamMap.get('gameType');
      if (!gameType) {
        this.error.set('gameType is required to create a room');
        this.loading.set(false);
        return;
      }
      try {
        const room = await this.http.post<RoomResponse>('/api/rooms', { maxPlayers: 4, gameType }).toPromise();
        if (room) {
          await this.router.navigate(['/game-room', room.roomId], { replaceUrl: true });
          return;
        }
      } catch (e) {
        this.error.set('Failed to create room');
        this.loading.set(false);
        return;
      }
    }

    // Verify room exists
    try {
      const room = await this.http.get<RoomResponse>(`/api/rooms/${id}`).toPromise();
      if (room) {
        this._httpRoomStatus.set(room.status);
        this.maxPlayers.set(room.maxPlayers);
        this.roomGameType.set(room.gameType);
        this.roomSettings.set(room.settings ?? {});
      }
    } catch (e) {
      this.error.set('Room not found');
      this.loading.set(false);
      return;
    }

    this.loading.set(false);
    this.ws.connect();
    this.ws.joinRoom(id);
  }

  ngOnDestroy(): void {
    this.ws.leaveRoom();
    this.ws.disconnect();
  }

  startGame(): void {
    this.mockNotification.set(null);
    if (this.roomGameType() === 'test') {
      this.mockNotification.set('No frontend yet');
      return;
    }
    if (!this.canStartGame()) {
      this.mockNotification.set('At least 2 players are required to start the game.');
      return;
    }
    this.ws.sendStartGame();
  }

  sendTestAction(): void {
    this.ws.sendAction('test', { data: 'hello' });
  }

  leave(): void {
    this.ws.leaveRoom();
    void this.router.navigate(['/games']);
  }
}
