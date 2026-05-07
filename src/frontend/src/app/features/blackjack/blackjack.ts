import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';

export interface BlackjackCard {
  rank: string;
  suit: string;
  faceUp?: boolean;
}

export interface BlackjackHand {
  handId: string;
  cards: BlackjackCard[];
  bet: number;
  status: 'active' | 'stood' | 'bust' | 'blackjack' | 'surrender' | 'push' | 'win' | 'lose';
  value: number;
  isCurrentTurn: boolean;
}

export interface BlackjackPlayer {
  playerId: string;
  name: string;
  chips: number;
  hands: BlackjackHand[];
  isDealer?: boolean;
  isCurrentTurn?: boolean;
}

export interface ValidAction {
  type: 'hit' | 'stand' | 'double' | 'split' | 'surrender' | 'bet' | 'deal';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  handId?: string;
}

const SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 85 }, // 0 — bottom-center (hero)
  { x: 20, y: 75 }, // 1 — bottom-left
  { x: 15, y: 40 }, // 2 — mid-left
  { x: 30, y: 15 }, // 3 — top-left
  { x: 70, y: 15 }, // 4 — top-right
  { x: 85, y: 40 }, // 5 — mid-right
  { x: 80, y: 75 }, // 6 — bottom-right
];

@Component({
  selector: 'app-blackjack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blackjack.component.html',
  styleUrl: './blackjack.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlackjackComponent {
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
  readonly isBetting = computed(() => this.phase() === 'betting');
  readonly isDealing = computed(() => this.phase() === 'dealing');
  readonly isPlaying = computed(() => this.phase() === 'playing');
  readonly isShowdown = computed(() => this.phase() === 'showdown');

  readonly dealer = computed(() => {
    const blob = this.stateBlob();
    const dealerData = blob?.['dealer'] as Record<string, unknown> | undefined;
    if (!dealerData) return null;

    return this.mapPlayer(dealerData, -1, true);
  });

  readonly dealerUpCard = computed(() => {
    const blob = this.stateBlob();
    const upCard = blob?.['dealerUpCard'] as string | undefined;
    if (!upCard) return null;
    return this.parseCard(upCard);
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
   * Rotate players so hero is at seat index 0.
   * Dealer is handled separately and not included in seats.
   */
  readonly seatedPlayers = computed(() => {
    const players = this.rawPlayers();
    const heroIdx = this.heroIndex();
    const rotated: (BlackjackPlayer | null)[] = new Array(SEAT_POSITIONS.length).fill(null);

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

  readonly heroPlayer = computed(() => {
    const players = this.seatedPlayers();
    return players[0]; // Hero is always at index 0 after rotation
  });

  readonly heroHands = computed(() => {
    return this.heroPlayer()?.hands ?? [];
  });

  readonly activeHand = computed(() => {
    const hands = this.heroHands();
    return hands.find(h => h.isCurrentTurn) ?? hands[0] ?? null;
  });

  readonly isHeroTurn = computed(() => {
    const blob = this.stateBlob();
    const activePlayer = blob?.['activePlayer'] as number | undefined;
    return activePlayer === this.heroPlayerId();
  });

  readonly validActions = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['validActions'] as ValidAction[]) ?? [];
  });

  readonly currentBet = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['currentBet'] as number) ?? 0;
  });

  readonly minBet = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['minBet'] as number) ?? 1;
  });

  readonly maxBet = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['maxBet'] as number) ?? 100;
  });

  readonly phaseLabel = computed(() => {
    const phase = this.phase();
    const labels: Record<string, string> = {
      waiting: 'Waiting to start',
      betting: 'Place your bets',
      dealing: 'Dealing cards',
      playing: 'Your turn',
      showdown: 'Showdown',
    };
    return labels[phase] ?? phase;
  });

  readonly seatPositions = SEAT_POSITIONS;

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['winners'] as Array<{ playerId: number; amount: number }> | undefined) ?? [];
  });

  readonly canStartNewRound = computed(() => {
    return this.phase() === 'showdown' || this.phase() === 'waiting';
  });

  // Betting state
  betAmount = signal<number>(10);

  readonly betAction = computed(() => {
    return this.validActions().find(a => a.type === 'bet');
  });

  isHero(seatIdx: number): boolean {
    return seatIdx === 0;
  }

  onNewRound(): void {
    this.ws.sendAction('next_hand', {});
  }

  initBetAmount(): void {
    this.betAmount.set(this.minBet());
  }

  executeBet(): void {
    const action = this.betAction();
    if (!action) return;
    const amount = this.betAmount();
    const min = action.minAmount ?? this.minBet();
    const max = action.maxAmount ?? this.maxBet();
    const clamped = Math.max(min, Math.min(max, amount));
    this.ws.sendAction('bet', { amount: clamped });
  }

  executeAction(action: ValidAction): void {
    const data: Record<string, unknown> = {};
    if (typeof action.amount === 'number') {
      data['amount'] = action.amount;
    }
    if (action.handId) {
      data['handId'] = action.handId;
    }
    this.ws.sendAction(action.type, data);
  }

  executeHit(): void {
    const hand = this.activeHand();
    if (!hand) return;
    this.ws.sendAction('hit', { handId: hand.handId });
  }

  executeStand(): void {
    const hand = this.activeHand();
    if (!hand) return;
    this.ws.sendAction('stand', { handId: hand.handId });
  }

  executeDouble(): void {
    const hand = this.activeHand();
    if (!hand) return;
    this.ws.sendAction('double', { handId: hand.handId });
  }

  executeSplit(): void {
    const hand = this.activeHand();
    if (!hand) return;
    this.ws.sendAction('split', { handId: hand.handId });
  }

  executeSurrender(): void {
    const hand = this.activeHand();
    if (!hand) return;
    this.ws.sendAction('surrender', { handId: hand.handId });
  }

  canDouble(): boolean {
    return this.validActions().some(a => a.type === 'double');
  }

  canSplit(): boolean {
    return this.validActions().some(a => a.type === 'split');
  }

  canSurrender(): boolean {
    return this.validActions().some(a => a.type === 'surrender');
  }

  getHandValueDisplay(hand: BlackjackHand): string {
    if (hand.status === 'bust') return 'Bust';
    if (hand.status === 'blackjack') return 'Blackjack';
    return hand.value.toString();
  }

  getHandStatusClass(hand: BlackjackHand): string {
    return hand.status;
  }

  getPlayerName(playerId: number): string {
    const p = this.rawPlayers().find(pl => pl['playerId'] === playerId);
    return String(p?.['username'] ?? p?.['name'] ?? `Player ${playerId}`);
  }

  cardSpriteSrc(card: BlackjackCard): string {
    return `assets/poker_cards/${card.suit}_${card.rank}.png`;
  }

  cardBackSrc(): string {
    return 'assets/poker_cards/back.png';
  }

  private mapPlayer(
    p: Record<string, unknown> | undefined,
    seatIdx: number,
    isDealer = false
  ): BlackjackPlayer | null {
    if (!p) return null;

    const playerId = String(p['playerId'] ?? '');
    const name = isDealer
      ? 'Dealer'
      : String(p['username'] ?? p['name'] ?? `Player ${p['playerId']}`);
    const chips = Number(p['stack'] ?? p['chips'] ?? 0);
    const isHeroPlayer = p['playerId'] === this.heroPlayerId();

    // Map hands
    const rawHands = p['hands'] as Array<Record<string, unknown>> | undefined;
    const hands: BlackjackHand[] = rawHands?.map((h, idx) => {
      const handId = String(h['handId'] ?? `${playerId}-${idx}`);
      const rawCards = h['cards'] as string[] | undefined;
      const showCards = isDealer
        ? this.isShowdown() || this.isWaiting() // Dealer shows all at end
        : isHeroPlayer || this.isShowdown();    // Players show if hero or showdown

      const cards: BlackjackCard[] = rawCards?.map(c => ({
        rank: this.cardRank(c),
        suit: this.cardSuit(c),
        faceUp: showCards && c !== 'back',
      })) ?? [];

      // For dealer, only show first card during play (unless showdown)
      if (isDealer && !this.isShowdown() && !this.isWaiting() && cards.length > 1) {
        cards[1] = { ...cards[1], faceUp: false };
      }

      return {
        handId,
        cards,
        bet: Number(h['bet'] ?? h['betAmount'] ?? 0),
        status: (h['status'] as BlackjackHand['status']) ?? 'active',
        value: Number(h['handValue'] ?? h['value'] ?? this.calculateHandValue(cards)),
        isCurrentTurn: Boolean(h['turn'] ?? h['isCurrentTurn']),
      };
    }) ?? [];

    // If no hands array but has direct cards (simple state)
    if (hands.length === 0 && !isDealer) {
      const rawCards = p['hand'] as string[] | undefined;
      if (rawCards) {
        const showCards = isHeroPlayer || this.isShowdown();
        const cards: BlackjackCard[] = rawCards.map(c => ({
          rank: this.cardRank(c),
          suit: this.cardSuit(c),
          faceUp: showCards && c !== 'back',
        }));
        hands.push({
          handId: `${playerId}-0`,
          cards,
          bet: Number(p['bet'] ?? p['currentBet'] ?? 0),
          status: (p['handStatus'] as BlackjackHand['status']) ?? 'active',
          value: Number(p['handValue'] ?? this.calculateHandValue(cards)),
          isCurrentTurn: Boolean(p['turn'] ?? p['isCurrentTurn']),
        });
      }
    }

    return {
      playerId,
      name,
      chips,
      hands,
      isDealer,
      isCurrentTurn: Boolean(p['turn'] ?? p['isCurrentTurn']),
    };
  }

  private parseCard(card: string | undefined): BlackjackCard | null {
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

  private calculateHandValue(cards: BlackjackCard[]): number {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
      const rank = card.rank;
      if (['king', 'queen', 'jack', '10'].includes(rank)) {
        value += 10;
      } else if (rank === 'ace') {
        aces++;
        value += 11;
      } else {
        value += parseInt(rank, 10);
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }
}
