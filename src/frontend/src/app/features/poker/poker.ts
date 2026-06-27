import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '@core/services/websocket.service';
import { AuthService } from '@core/services/auth.service';
import { PokerStageManager } from './poker-stage-manager';

export interface PokerCard {
  rank: string;
  suit: string;
  faceUp?: boolean;
}

export interface PokerPlayer {
  playerId: string;
  name: string;
  chips: number;
  currentBet: number;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  cards?: PokerCard[];
}

export interface ValidAction {
  type: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

const SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 90 }, // 0 — bottom-center  (hero)
  { x: 24, y: 82 }, // 1 — bottom-left
  { x: 10, y: 48 }, // 2 — mid-left
  { x: 50, y: 10 }, // 3 — top-center
  { x: 90, y: 48 }, // 4 — mid-right
  { x: 76, y: 82 }, // 5 — bottom-right
];

/** 2-player layout: hero at bottom, opponent at top (face to face) */
const TWO_PLAYER_SEATS: Array<{ x: number; y: number }> = [
  { x: 50, y: 90 }, // 0 — bottom-center  (hero)
  { x: 50, y: 10 }, // 1 — top-center (opponent)
];

@Component({
  selector: 'app-poker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poker.html',
  styleUrl: './poker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poker {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly heroPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

  /* ── Tiny SVG coal icon used as currency symbol ── */
  readonly coalIconSrc = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e85d04"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="9" r="3" fill="%23f48c06" opacity="0.6"/><circle cx="16" cy="15" r="2" fill="%23f48c06" opacity="0.4"/></svg>';

  private stageManager = new PokerStageManager({
    reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    heroPlayerId: this.heroPlayerId(),
  });

  readonly stateBlob = this.stageManager.displayedStateBlob;
  readonly isAnimating = this.stageManager.isAnimating;
  readonly stage = this.stageManager.stage;
  readonly enteringCardIds = this.stageManager.enteringCardIds;
  readonly revealingCardIds = this.stageManager.revealingCardIds;
  readonly lastError = this.ws.lastError;

  private readonly suitMap: Record<string, string> = {
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
    s: 'spades',
  };
  private readonly rankMap: Record<string, string> = {
    A: 'ace',
    K: 'king',
    Q: 'queen',
    J: 'jack',
    T: '10',
  };

  /* ── Local UI state ── */
  private pendingAction = signal<string | null>(null);
  readonly showPhaseOverlay = signal(false);
  readonly phaseOverlayText = signal('');

  private phaseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private prevPhase = '';

  /* ── Decorative chips scattered on the table felt ── */
  readonly tableChips: Array<{ x: number; y: number; color: string; size: number }> = [
    { x: 22, y: 28, color: '#c8561a', size: 14 },
    { x: 72, y: 24, color: '#c8881a', size: 12 },
    { x: 78, y: 68, color: '#c8561a', size: 16 },
    { x: 28, y: 72, color: '#8a5120', size: 10 },
    { x: 50, y: 18, color: '#c8881a', size: 13 },
    { x: 18, y: 52, color: '#e07840', size: 11 },
    { x: 82, y: 48, color: '#c8561a', size: 15 },
    { x: 48, y: 78, color: '#c8881a', size: 12 },
    { x: 35, y: 35, color: '#a0522d', size: 9 },
    { x: 65, y: 60, color: '#d2691e', size: 11 },
  ];

  constructor() {
    /* Keep the stage manager in sync with the hero identity */
    effect(() => {
      this.stageManager.setHeroPlayerId(this.heroPlayerId());
    });

    /* Feed authoritative state into the stage manager */
    effect(() => {
      this.stageManager.setTarget(this.ws.stateBlob());
    });

    /* Watch phase changes and trigger announcement overlay */
    effect(() => {
      const currentPhase = this.phase();
      const prev = this.prevPhase;

      if (prev && prev !== currentPhase && currentPhase !== 'waiting') {
        this.triggerPhaseAnnouncement(currentPhase);
      }
      this.prevPhase = currentPhase;
    });

    // Release action lock once the backend removes the action, or after a safety timeout.
    effect(() => {
      const pending = this.pendingAction();
      if (!pending) return;

      const stillValid = this.validActions().some((a) => a.type === pending);
      if (!stillValid) {
        this.pendingAction.set(null);
        return;
      }

      const timer = window.setTimeout(() => this.pendingAction.set(null), 10000);
      return () => clearTimeout(timer);
    });
  }

  /* ─── Computed selectors (unchanged core logic) ─── */

  readonly phase = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['phase'] as string) || 'waiting';
  });

  readonly isWaiting = computed(() => this.phase() === 'waiting');
  readonly isShowdown = computed(() => this.phase() === 'showdown');

  readonly pot = computed(() => {
    const blob = this.stateBlob();
    const pots = blob?.['pots'] as Array<{ amount: number }> | undefined;
    return pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  });

  readonly currentBet = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['currentBet'] as number) ?? 0;
  });

  readonly validActions = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['validActions'] as ValidAction[]) ?? [];
  });

  readonly isHeroTurn = computed(() => {
    const blob = this.stateBlob();
    const activePlayer = blob?.['activePlayer'] as number | undefined;
    return activePlayer === this.heroPlayerId();
  });

  readonly dealerPosition = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['dealerPosition'] as number) ?? 0;
  });

  readonly rawPlayers = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['players'] as Array<Record<string, unknown>>) ?? [];
  });

  readonly playerCount = computed(() => this.rawPlayers().length);

  readonly heroIndex = computed(() => {
    const heroId = this.heroPlayerId();
    return this.rawPlayers().findIndex((p) => p['playerId'] === heroId);
  });

  /**
   * Rotate the players array so the hero is always at seat index 0.
   * This makes the fixed SEAT_POSITIONS layout work correctly.
   * For exactly 2 players, uses a face-to-face layout.
   */
  readonly seatedPlayers = computed(() => {
    const players = this.rawPlayers();
    const heroIdx = this.heroIndex();
    const rotated: (PokerPlayer | null)[] = new Array(SEAT_POSITIONS.length).fill(null);

    /* 2-player face-to-face layout */
    if (players.length === 2 && heroIdx >= 0) {
      rotated[0] = this.mapPlayer(players[heroIdx], 0);
      const opponentIdx = heroIdx === 0 ? 1 : 0;
      rotated[1] = this.mapPlayer(players[opponentIdx], 1);
      return rotated;
    }

    if (heroIdx < 0) {
      for (let j = 0; j < Math.min(players.length, SEAT_POSITIONS.length); j++) {
        rotated[j] = this.mapPlayer(players[j], j);
      }
      return rotated;
    }

    for (let j = 0; j < players.length; j++) {
      const seatIdx = (j - heroIdx + players.length) % players.length;
      if (seatIdx < SEAT_POSITIONS.length) {
        rotated[seatIdx] = this.mapPlayer(players[j], seatIdx);
      }
    }
    return rotated;
  });

  /**
   * Seat positions to use — 2-player layout has custom positions.
   */
  readonly activeSeatPositions = computed(() => {
    if (this.playerCount() === 2) {
      return TWO_PLAYER_SEATS;
    }
    return SEAT_POSITIONS;
  });

  /**
   * For 2 players, hide empty seats. For 3+, show all.
   */
  shouldShowSeat(seatIndex: number): boolean {
    if (this.playerCount() > 2) return true;
    return this.seatedPlayers()[seatIndex] !== null;
  }

  readonly communitySlots = computed((): Array<PokerCard | null> => {
    const blob = this.stateBlob();
    const cards = (blob?.['communityCards'] as string[]) ?? [];
    return [
      this.parseCard(cards[0]),
      this.parseCard(cards[1]),
      this.parseCard(cards[2]),
      this.parseCard(cards[3]),
      this.parseCard(cards[4]),
    ];
  });

  readonly currentTurnPlayer = computed(() => {
    const players = this.seatedPlayers();
    return players.find((p) => p?.isCurrentTurn) ?? null;
  });

  readonly phaseLabel = computed(() => {
    const phase = this.phase();
    const labels: Record<string, string> = {
      waiting: 'Waiting to start',
      preflop: 'Pre-Flop',
      flop: 'Flop',
      turn: 'Turn',
      river: 'River',
      showdown: 'Showdown',
    };
    return labels[phase] ?? phase;
  });

  readonly stageMessage = computed(() => {
    switch (this.stage()) {
      case 'dealing': return 'Dealing hole cards…';
      case 'flop': return 'The Flop…';
      case 'turn': return 'The Turn…';
      case 'river': return 'The River…';
      case 'showdown': return 'Showdown!';
      case 'settling': return 'Settling…';
      default: return '';
    }
  });

  isEnteringHoleCard(playerId: number, cardIndex: number): boolean {
    return this.enteringCardIds().has(`hole-${playerId}-${cardIndex}`);
  }

  isEnteringCommunityCard(cardIndex: number): boolean {
    return this.enteringCardIds().has(`community-${cardIndex}`);
  }

  isRevealingHoleCard(playerId: number, cardIndex: number): boolean {
    return this.revealingCardIds().has(`hole-${playerId}-${cardIndex}`);
  }

  readonly seatPositions = SEAT_POSITIONS;

  readonly heroHandName = computed(() => {
    const heroIdx = this.heroIndex();
    const players = this.rawPlayers();
    const hero = players[heroIdx];
    return (hero?.['handName'] as string) ?? null;
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (
      (blob?.['winners'] as Array<{
        playerId: number;
        amount: number;
        handName: string;
      }> | undefined) ?? []
    );
  });

  readonly canStartNewRound = computed(() => {
    return this.phase() === 'showdown';
  });

  readonly raiseAction = computed(() => {
    return this.validActions().find((a) => a.type === 'raise');
  });

  raiseAmount = signal<number>(0);

  getRaiseValue(min: number): number {
    const val = this.raiseAmount();
    return val < min || val === 0 ? min : val;
  }

  isHero(seatIdx: number): boolean {
    return seatIdx === 0;
  }

  private sendActionWithPending(type: string, data: Record<string, unknown> = {}): void {
    if (this.pendingAction()) return;
    this.pendingAction.set(type);
    this.ws.sendAction(type, data);
  }

  onNewRound(): void {
    this.sendActionWithPending('next_hand', {});
  }

  getPlayerName(playerId: number): string {
    const p = this.rawPlayers().find((pl) => pl['playerId'] === playerId);
    return String(p?.['username'] ?? p?.['name'] ?? `Player ${playerId}`);
  }

  initRaiseAmount(min: number): void {
    this.raiseAmount.set(min);
  }

  decrementRaise(min: number): void {
    this.raiseAmount.set(Math.max(min, this.getRaiseValue(min) - 10));
  }

  incrementRaise(min: number, max: number): void {
    this.raiseAmount.set(Math.min(max, this.getRaiseValue(min) + 10));
  }

  executeRaise(): void {
    const action = this.raiseAction();
    if (!action) return;
    const amount = this.raiseAmount();
    const min = action.minAmount ?? amount;
    const max = action.maxAmount ?? amount;
    const clamped = Math.max(min, Math.min(max, amount));
    this.sendActionWithPending('raise', { amount: clamped });
  }

  /* ─── Phase announcement overlay ─── */

  private triggerPhaseAnnouncement(phase: string): void {
    const labels: Record<string, string> = {
      preflop: 'PRE-FLOP',
      flop: 'THE FLOP',
      turn: 'THE TURN',
      river: 'THE RIVER',
      showdown: 'SHOWDOWN',
    };
    const text = labels[phase];
    if (!text) return;

    /* Clear any pending timeout */
    if (this.phaseTimeoutId) {
      clearTimeout(this.phaseTimeoutId);
    }

    this.phaseOverlayText.set(text);
    this.showPhaseOverlay.set(true);

    if (phase === 'showdown') {
      this.phaseTimeoutId = setTimeout(() => {
        this.showPhaseOverlay.set(false);
      }, 2500);
    } else {
      this.phaseTimeoutId = setTimeout(() => {
        this.showPhaseOverlay.set(false);
      }, 2500);
    }
  }

  /* ─── Start game flow ─── */

  handleStartGame(): void {
    this.ws.sendStartGame();
  }

  /* ─── Play again flow ─── */

  handlePlayAgain(): void {
    this.sendActionWithPending('next_hand', {});
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
    const gamePlayers = this.rawPlayers();
    return gamePlayers.length === 1 && Number(gamePlayers[0]['playerId']) === me;
  });

  /* ─── Card helpers ─── */

  cardSpriteSrc(card: PokerCard): string {
    return `assets/poker_cards/${card.suit}_${card.rank}.png`;
  }

  cardBackSrc(): string {
    return 'assets/poker_cards/back.png';
  }

  executeAction(action: ValidAction): void {
    const data: Record<string, unknown> = {};
    if (typeof action.amount === 'number') {
      data['amount'] = action.amount;
    }
    this.sendActionWithPending(action.type, data);
  }

  canAction(type: string): boolean {
    return !this.isAnimating() && !this.pendingAction() && this.validActions().some((a) => a.type === type);
  }

  onStartGame(): void {
    // Handled by parent game-room component
  }

  /* ─── Private helpers ─── */

  private mapPlayer(
    p: Record<string, unknown> | undefined,
    seatIdx: number
  ): PokerPlayer | null {
    if (!p) return null;
    const playerId = String(p['playerId'] ?? '');
    const name = String(
      p['username'] ?? p['name'] ?? `Player ${p['playerId']}`
    );
    const chips = Number(p['stack'] ?? 0);
    const currentBet = Number(p['bet'] ?? 0);
    const isFolded = Boolean(p['folded']);
    const isAllIn = Boolean(p['allIn']);
    const rawPlayers = this.rawPlayers();
    const dealerPlayerId = rawPlayers[this.dealerPosition()]?.['playerId'];
    const isDealer = p['playerId'] === dealerPlayerId;
    const isCurrentTurn = p['playerId'] === this.stateBlob()?.['activePlayer'];

    const hand = p['hand'] as string[] | undefined;
    const isHeroPlayer = p['playerId'] === this.heroPlayerId();
    const showCards = isHeroPlayer || this.isShowdown();

    const cards: PokerCard[] | undefined = hand?.map((c) => ({
      rank: this.cardRank(c),
      suit: this.cardSuit(c),
      faceUp: showCards && c !== 'back',
    }));

    return {
      playerId,
      name,
      chips,
      currentBet,
      isDealer,
      isCurrentTurn,
      isFolded,
      isAllIn,
      cards,
    };
  }

  private parseCard(card: string | undefined): PokerCard | null {
    if (!card || card === 'back') return null;
    return {
      rank: this.cardRank(card),
      suit: this.cardSuit(card),
      faceUp: true,
    };
  }

  private cardRank(card: string): string {
    const r = card[0];
    return this.rankMap[r] ?? r;
  }

  private cardSuit(card: string): string {
    const s = card[1];
    return this.suitMap[s] ?? s;
  }
}
