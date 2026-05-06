import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketService } from '../../core/services/websocket.service';
import { HttpClient } from '@angular/common/http';

interface RoomResponse {
  roomId: string;
  status: string;
  maxPlayers: number;
  players: Array<{ playerId: number; seatIndex: number; connectionState: string }>;
}

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);

  roomId = signal<string>('');
  roomStatus = signal<string>('');
  maxPlayers = signal<number>(0);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  connectionState = this.ws.connectionState;
  players = this.ws.playersInRoom;
  lastError = this.ws.lastError;

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
        this.roomStatus.set(room.status);
        this.maxPlayers.set(room.maxPlayers);
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

  sendTestAction(): void {
    this.ws.sendAction('test', { data: 'hello' });
  }

  leave(): void {
    this.ws.leaveRoom();
    void this.router.navigate(['/games']);
  }
}
