import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';

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

  readonly stateBlob = this.ws.stateBlob;
  readonly lastError = this.ws.lastError;

  private readonly suitMap: Record<string, string> = {
    h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades'
  };
  private readonly rankMap: Record<string, string> = {
    A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: '10'
  };

  readonly heroPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

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

  readonly heroIndex = computed(() => {
    const heroId = this.heroPlayerId();
    return this.rawPlayers().findIndex(p => p['playerId'] === heroId);
  });

  /**
   * Rotate the players array so the hero is always at seat index 0.
   * This makes the fixed SEAT_POSITIONS layout work correctly.
   */
  readonly seatedPlayers = computed(() => {
    const players = this.rawPlayers();
    const heroIdx = this.heroIndex();
    const rotated: (PokerPlayer | null)[] = new Array(SEAT_POSITIONS.length).fill(null);

    if (heroIdx < 0) {
      // Hero not in game — show players as-is, empty seats for remaining slots
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
    return players.find(p => p?.isCurrentTurn) ?? null;
  });

  readonly phaseLabel = computed(() => {
    const phase = this.phase();
    const labels: Record<string, string> = {
      waiting:   'Waiting to start',
      preflop:   'Pre-Flop',
      flop:      'Flop',
      turn:      'Turn',
      river:     'River',
      showdown:  'Showdown',
    };
    return labels[phase] ?? phase;
  });

  readonly seatPositions = SEAT_POSITIONS;

  readonly heroHandName = computed(() => {
    const heroIdx = this.heroIndex();
    const players = this.rawPlayers();
    const hero = players[heroIdx];
    return (hero?.['handName'] as string) ?? null;
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['winners'] as Array<{ playerId: number; amount: number; handName: string }> | undefined) ?? [];
  });

  readonly canStartNewRound = computed(() => {
    return this.phase() === 'showdown';
  });

  isHero(seatIdx: number): boolean {
    return seatIdx === 0; // hero is always rotated to index 0
  }

  onNewRound(): void {
    this.ws.sendAction('next_hand', {});
  }

  getPlayerName(playerId: number): string {
    const p = this.rawPlayers().find(pl => pl['playerId'] === playerId);
    return String(p?.['username'] ?? p?.['name'] ?? `Player ${playerId}`);
  }

  private mapPlayer(p: Record<string, unknown> | undefined, seatIdx: number): PokerPlayer | null {
    if (!p) return null;
    const playerId = String(p['playerId'] ?? '');
    const name = String(p['username'] ?? p['name'] ?? `Player ${p['playerId']}`);
    const chips = Number(p['stack'] ?? 0);
    const currentBet = Number(p['bet'] ?? 0);
    const isFolded = Boolean(p['folded']);
    const isAllIn = Boolean(p['allIn']);
    const rawPlayers = this.rawPlayers();
    const dealerPlayerId = rawPlayers[this.dealerPosition()]?.['playerId'];
    const isDealer = p['playerId'] === dealerPlayerId;
    const isCurrentTurn = p['playerId'] === this.stateBlob()?.['activePlayer'];

    // Cards: face-up for hero or during showdown, back for everyone else
    const hand = p['hand'] as string[] | undefined;
    const isHeroPlayer = p['playerId'] === this.heroPlayerId();
    const showCards = isHeroPlayer || this.isShowdown();

    const cards: PokerCard[] | undefined = hand?.map(c => ({
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
    this.ws.sendAction(action.type, data);
  }

  onStartGame(): void {
    // Handled by parent game-room component
  }
}
