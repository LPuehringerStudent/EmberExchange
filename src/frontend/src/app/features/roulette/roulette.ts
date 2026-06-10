import {
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';

interface RoulettePlayerView {
  playerId: number;
  username: string;
  activeTitle: string | null;
  activeBanner: string | null;
  stack: number;
  bets: { betType: string; amount: number; number?: number }[];
  result: 'won' | 'lost' | 'playing';
}

interface WinnerView {
  playerId: number;
  amount: number;
  betType: string;
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

// European roulette wheel order (clockwise from 0 at top)
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const WHEEL_CX = 110;
const WHEEL_CY = 110;
const WHEEL_OUTER_R = 100;
const WHEEL_INNER_R = 32;
const WHEEL_TEXT_R = 68;
const TOTAL_SEGMENTS = 37;
const WHEEL_SPIN_MS = 3600;

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roulette.html',
  styleUrl: './roulette.css',
})
export class RouletteComponent {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly stateBlob = this.ws.stateBlob;
  readonly lastError = this.ws.lastError;

  readonly phase = computed(() => (this.stateBlob()?.['phase'] as string) ?? 'betting');
  readonly players = computed(() => (this.stateBlob()?.['players'] as RoulettePlayerView[]) ?? []);
  readonly winningNumber = computed(() => (this.stateBlob()?.['winningNumber'] as number | null) ?? null);
  readonly winningColor = computed(() => (this.stateBlob()?.['winningColor'] as string | null) ?? null);
  readonly winners = computed(() => (this.stateBlob()?.['winners'] as WinnerView[]) ?? []);
  readonly validActions = computed(() => (this.stateBlob()?.['validActions'] as Array<{ type: string }>) ?? []);
  readonly allBets = computed(() => (this.stateBlob()?.['bets'] as Array<{ playerId: number; betType: string; amount: number; number?: number }>) ?? []);

  readonly myPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

  readonly myPlayer = computed(() =>
    this.players().find((p) => p.playerId === this.myPlayerId())
  );

  readonly myBets = computed(() => this.myPlayer()?.bets ?? []);
  readonly myStack = computed(() => this.myPlayer()?.stack ?? 0);
  readonly myTotalBet = computed(() => this.myBets().reduce((sum, b) => sum + b.amount, 0));

  readonly selectedChip = signal<number>(10);
  readonly canBet = computed(() => this.validActions().some((a) => a.type === 'bet'));
  readonly canSpin = computed(() => this.validActions().some((a) => a.type === 'spin'));
  readonly canNextHand = computed(() => this.validActions().some((a) => a.type === 'next_hand'));

  readonly wheelRotation = signal<number>(0);
  readonly resultRevealed = signal<boolean>(false);

  readonly wheelOrder = WHEEL_ORDER;
  readonly displayPlayers = signal<RoulettePlayerView[]>([]);
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  readonly gridNumbers = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  constructor() {
    let lastWinningNumber: number | null = null;
    let lastPhase = '';

    effect(() => {
      const num = this.winningNumber();
      const phase = this.phase();

      // Reset wheel when entering betting phase
      if (phase === 'betting' && lastPhase !== 'betting') {
        this.wheelRotation.set(0);
        this.resultRevealed.set(false);
        this.clearRevealTimer();
      }
      lastPhase = phase;

      if (phase === 'betting' || this.resultRevealed()) {
        this.displayPlayers.set(this.players());
      }

      // Animate wheel when a new winning number arrives
      if (num !== null && num !== lastWinningNumber && phase === 'settled') {
        lastWinningNumber = num;
        this.resultRevealed.set(false);
        this.displayPlayers.set(this.playersBeforePayout());
        this.patchHeaderCoinsFromDisplay();
        this.animateToNumber(num);
        this.clearRevealTimer();
        this.revealTimer = setTimeout(() => {
          this.resultRevealed.set(true);
          this.displayPlayers.set(this.players());
          this.patchHeaderCoinsFromDisplay();
        }, WHEEL_SPIN_MS);
      }

      if (phase === 'betting') {
        lastWinningNumber = null;
      }
    });
  }

  private clearRevealTimer(): void {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
  }

  private playersBeforePayout(): RoulettePlayerView[] {
    const settledPlayers = this.players();

    return settledPlayers.map((player) => {
      const winner = this.getWinnerForPlayer(player.playerId);
      const displayedStack = Math.max(0, player.stack - (winner?.amount ?? 0));

      return {
        ...player,
        stack: displayedStack,
        result: 'playing',
      };
    });
  }

  private patchHeaderCoinsFromDisplay(): void {
    const me = this.displayPlayers().find((player) => player.playerId === this.myPlayerId());
    if (me) {
      this.auth.patchCurrentUserCoins(me.stack);
    }
  }

  private animateToNumber(num: number): void {
    const index = WHEEL_ORDER.indexOf(num);
    if (index < 0) return;

    const segAngle = 360 / TOTAL_SEGMENTS;
    // Target the CENTER of the winning segment (not the edge)
    const targetVisual = (index + 0.5) * segAngle; // clockwise degrees from top

    // Normalize current visual angle to [0, 360)
    const current = this.wheelRotation();
    const currentVisual = ((Math.abs(current) % 360) + 360) % 360;

    // Clockwise distance from current visual to target visual
    const visualDelta = (targetVisual - currentVisual + 360) % 360;

    // Always spin at least 5 full rotations + the delta
    const nextRotation = current - (360 * 5 + visualDelta);

    // Force a layout frame so the browser sees the starting rotation
    // before we apply the target (triggers CSS transition)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.wheelRotation.set(nextRotation);
      });
    });
  }

  getSegmentPath(index: number): string {
    const segAngle = (2 * Math.PI) / TOTAL_SEGMENTS;
    const start = index * segAngle - Math.PI / 2;
    const end = (index + 1) * segAngle - Math.PI / 2;

    const x1 = WHEEL_CX + WHEEL_OUTER_R * Math.cos(start);
    const y1 = WHEEL_CY + WHEEL_OUTER_R * Math.sin(start);
    const x2 = WHEEL_CX + WHEEL_OUTER_R * Math.cos(end);
    const y2 = WHEEL_CY + WHEEL_OUTER_R * Math.sin(end);
    const x3 = WHEEL_CX + WHEEL_INNER_R * Math.cos(end);
    const y3 = WHEEL_CY + WHEEL_INNER_R * Math.sin(end);
    const x4 = WHEEL_CX + WHEEL_INNER_R * Math.cos(start);
    const y4 = WHEEL_CY + WHEEL_INNER_R * Math.sin(start);

    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${WHEEL_OUTER_R} ${WHEEL_OUTER_R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${WHEEL_INNER_R} ${WHEEL_INNER_R} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
  }

  getTextTransform(index: number): string {
    const segAngle = 360 / TOTAL_SEGMENTS;
    const mid = (index + 0.5) * segAngle - 90;
    const rad = mid * Math.PI / 180;
    const x = WHEEL_CX + WHEEL_TEXT_R * Math.cos(rad);
    const y = WHEEL_CY + WHEEL_TEXT_R * Math.sin(rad);
    return `translate(${x.toFixed(1)}, ${y.toFixed(1)})`;
  }

  getNumberColor(n: number): string {
    return getColor(n);
  }

  selectChip(value: number): void {
    this.selectedChip.set(value);
  }

  placeBet(betType: string, number?: number): void {
    if (!this.canBet()) return;
    const amount = this.selectedChip();
    const remaining = this.myStack() - this.myTotalBet();
    if (amount > remaining) return;

    const actionData: Record<string, unknown> = { betType, amount };
    if (betType === 'straight' && number !== undefined) {
      actionData['number'] = number;
    }

    this.ws.sendAction('bet', actionData);
  }

  spin(): void {
    if (!this.canSpin()) return;
    this.ws.sendAction('spin', {});
  }

  nextHand(): void {
    if (!this.canNextHand()) return;
    this.ws.sendAction('next_hand', {});
  }

  readonly isHost = computed(() => {
    const me = this.auth.getCurrentUser()?.playerId ?? 0;
    const ps = this.ws.playersInRoom();
    const connected = ps.filter(p => p.connectionState === 'connected');
    if (connected.length > 0) {
      const host = connected.sort((a, b) => a.seatIndex - b.seatIndex)[0];
      return host?.playerId === me;
    }
    // Fallback when room state isn't synced (e.g. after reconnect): solo player is host
    const gamePlayers = this.players();
    return gamePlayers.length === 1 && gamePlayers[0].playerId === me;
  });

  getWinnerForPlayer(playerId: number): WinnerView | undefined {
    return this.winners().find((w) => w.playerId === playerId);
  }

  getPayoutDisplay(betType: string): string {
    switch (betType) {
      case 'straight': return '35:1';
      case 'dozen1':
      case 'dozen2':
      case 'dozen3':
      case 'column1':
      case 'column2':
      case 'column3':
        return '2:1';
      default:
        return '1:1';
    }
  }

  colBetType(col: number): string {
    return `column${col}`;
  }

  dozenBetType(dozen: number): string {
    return `dozen${dozen}`;
  }

  /** Sum of all my bets on a specific bet type/number */
  getBetAmountFor(betType: string, number?: number): number {
    return this.myBets()
      .filter((b) => {
        if (b.betType !== betType) return false;
        if (betType === 'straight' && number !== undefined) {
          return b.number === number;
        }
        return true;
      })
      .reduce((sum, b) => sum + b.amount, 0);
  }

  /** Whether I have any bet on this field */
  hasBetOn(betType: string, number?: number): boolean {
    return this.getBetAmountFor(betType, number) > 0;
  }

  getPlayerName(playerId: number): string {
    const p = this.players().find((pl) => pl.playerId === playerId);
    return p?.username ?? `Player ${playerId}`;
  }

  formatBets(bets: Array<{ betType: string; amount: number; number?: number }>): string {
    if (bets.length === 0) return 'None';
    return bets.map((b) => `${b.amount} on ${b.betType}${b.number !== undefined ? ' ' + b.number : ''}`).join(', ');
  }
}
