import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketService } from '../../core/services/websocket.service';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Poker } from '../poker/poker';
import { BlackjackComponent } from '../blackjack/blackjack';
import { RouletteComponent } from '../roulette/roulette';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

interface RoomResponse {
  roomId: string;
  status: string;
  maxPlayers: number;
  gameType: string;
  settings: Record<string, unknown>;
  players: Array<{ playerId: number; seatIndex: number; connectionState: string; username?: string }>;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #e85d04, #f48c06)',
  'linear-gradient(135deg, #6eabb6, #4a90a4)',
  'linear-gradient(135deg, #c62828, #e53935)',
  'linear-gradient(135deg, #2e7d32, #43a047)',
  'linear-gradient(135deg, #6a1b9a, #8e24aa)',
  'linear-gradient(135deg, #f9a825, #fbc02d)',
];

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [
    CommonModule, Poker, BlackjackComponent, RouletteComponent, PageBackgroundComponent,
  ],
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebSocketService);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  roomId = signal<string>('');
  roomGameType = signal<string>('');
  maxPlayers = signal<number>(0);
  roomSettings = signal<Record<string, unknown>>({});
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  toast = signal<string | null>(null);

  chatOpen = signal<boolean>(false);
  chatInput = signal<string>('');

  connectionState = this.ws.connectionState;
  players = this.ws.playersInRoom;
  lastError = this.ws.lastError;
  stateBlob = this.ws.stateBlob;
  roomChatMessages = this.ws.roomChatMessages;
  chatUnread = this.ws.roomChatUnread;

  roomStatus = computed(() => {
    const blobStatus = this.stateBlob()?.['status'] as string | undefined;
    return blobStatus === 'active' ? 'active' : this._httpRoomStatus();
  });

  private _httpRoomStatus = signal<string>('');

  minPlayers = computed(() => {
    const gt = this.roomGameType();
    if (gt === 'blackjack' || gt === 'roulette') return 1;
    return 2;
  });

  currentPlayerId = computed(() => this.auth.getCurrentUser()?.playerId ?? 0);

  isHost = computed(() => {
    const me = this.currentPlayerId();
    const ps = this.players();
    // Host = first connected player (lowest seatIndex)
    const host = ps.filter(p => p.connectionState === 'connected').sort((a, b) => a.seatIndex - b.seatIndex)[0];
    return host?.playerId === me;
  });

  canStartGame = computed(() => {
    return this.roomStatus() === 'waiting' && this.players().length >= this.minPlayers() && this.isHost();
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('roomId');
    if (!id) {
      this.error.set('No room ID provided');
      this.loading.set(false);
      return;
    }

    this.roomId.set(id);

    if (id === 'new') {
      const gameType = this.route.snapshot.queryParamMap.get('gameType');
      if (!gameType) {
        this.error.set('gameType is required to create a room');
        this.loading.set(false);
        return;
      }
      try {
        const room = await this.api.post<RoomResponse>('/rooms', { maxPlayers: 4, gameType }).toPromise();
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

    try {
      const room = await this.api.get<RoomResponse>(`/rooms/${id}`).toPromise();
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
    this.toast.set(null);
    if (this.roomGameType() === 'test') {
      this.showToast('No frontend yet');
      return;
    }
    if (!this.canStartGame()) {
      this.showToast(`At least ${this.minPlayers()} players are required. Only the host can start.`);
      return;
    }
    this.ws.sendStartGame();
  }

  showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(null), 4000);
  }

  sendChat(): void {
    const text = this.chatInput().trim();
    if (!text) return;
    this.ws.sendRoomChat(text);
    this.chatInput.set('');
  }

  toggleChat(): void {
    const willOpen = !this.chatOpen();
    this.chatOpen.set(willOpen);
    if (willOpen) {
      this.ws.roomChatUnread.set(0);
    }
  }

  leave(): void {
    this.ws.leaveRoom();
    void this.router.navigate(['/games']);
  }

  getInitials(username?: string): string {
    if (!username) return '?';
    return username.slice(0, 2).toUpperCase();
  }

  getAvatarColor(playerId: number): string {
    return AVATAR_COLORS[playerId % AVATAR_COLORS.length];
  }

  connectionDotClass(state: string): string {
    switch (state) {
      case 'connected': return 'bg-emerald-500';
      case 'disconnected': return 'bg-red-500';
      case 'away': return 'bg-amber-500';
      default: return 'bg-text-muted';
    }
  }
}
