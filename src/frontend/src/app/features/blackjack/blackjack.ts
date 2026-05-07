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
  faceUp: boolean;
}

export interface BlackjackHand {
  handId: string;
  cards: BlackjackCard[];
  bet: number;
  status: string;
  value: number;
  isCurrentTurn: boolean;
}

export interface BlackjackPlayer {
  playerId: number;
  name: string;
  chips: number;
  hands: BlackjackHand[];
  result: string;
  isCurrentTurn: boolean;
}

export interface ValidAction {
  type: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

@Component({
  selector: 'app-blackjack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blackjack.html',
  styleUrl: './blackjack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlackjackComponent {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly stateBlob = this.ws.stateBlob;
  readonly lastError = this.ws.lastError;

  private readonly suitMap: Record<string, string> = {
    h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades',
  };
  private readonly rankMap: Record<string, string> = {
    A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: '10',
  };

  readonly heroPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

  readonly phase = computed(() => {
    const blob = this.stateBlob();
    const raw = (blob?.['phase'] as string) ?? 'betting';
    // Map backend phases to UI phases
    if (raw === 'player_turn') return 'playing';
    if (raw === 'dealer_turn') return 'dealer';
    if (raw === 'settled') return 'showdown';
    return raw; // 'betting'
  });

  readonly isBetting = computed(() => this.phase() === 'betting');
  readonly isPlaying = computed(() => this.phase() === 'playing');
  readonly isDealerTurn = computed(() => this.phase() === 'dealer');
  readonly isShowdown = computed(() => this.phase() === 'showdown');

  readonly dealerHand = computed((): BlackjackCard[] => {
    const blob = this.stateBlob();
    const cards = (blob?.['dealerHand'] as string[]) ?? [];
    return cards.map((c, i) => ({
      rank: this.cardRank(c),
      suit: this.cardSuit(c),
      faceUp: c !== 'back',
    }));
  });

  readonly dealerValue = computed(() => {
    return this.calculateHandValue(this.dealerHand());
  });

  readonly rawPlayers = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['players'] as Array<Record<string, unknown>>) ?? [];
  });

  readonly players = computed((): BlackjackPlayer[] => {
    const blob = this.stateBlob();
    const activePlayer = blob?.['activePlayer'] as number ?? -1;
    const activeHandIndex = blob?.['activeHandIndex'] as number ?? 0;

    return this.rawPlayers().map((p) => {
      const playerId = Number(p['playerId']);
      const name = String(p['username'] ?? p['name'] ?? `Player ${playerId}`);
      const chips = Number(p['stack'] ?? 0);
      const result = String(p['result'] ?? 'playing');
      const isCurrentTurn = playerId === activePlayer;

      const handsArr = p['hands'] as string[][] | undefined;
      const betsArr = p['bets'] as number[] | undefined;

      const hands: BlackjackHand[] = (handsArr ?? []).map((handCards, idx) => {
        const cards: BlackjackCard[] = handCards.map((c) => ({
          rank: this.cardRank(c),
          suit: this.cardSuit(c),
          faceUp: c !== 'back',
        }));
        return {
          handId: `${playerId}-${idx}`,
          cards,
          bet: betsArr?.[idx] ?? 0,
          status: this.determineHandStatus(cards, result),
          value: this.calculateHandValue(cards),
          isCurrentTurn: isCurrentTurn && idx === activeHandIndex,
        };
      });

      return { playerId, name, chips, hands, result, isCurrentTurn };
    });
  });

  readonly heroPlayer = computed(() => {
    const heroId = this.heroPlayerId();
    return this.players().find((p) => p.playerId === heroId) ?? null;
  });

  readonly heroHands = computed(() => {
    return this.heroPlayer()?.hands ?? [];
  });

  readonly activeHand = computed(() => {
    const hands = this.heroHands();
    return hands.find((h) => h.isCurrentTurn) ?? hands[0] ?? null;
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
    return (blob?.['currentBet'] as number) ?? 20;
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['winners'] as Array<{ playerId: number; amount: number; handName: string }> | undefined) ?? [];
  });

  readonly canStartNewRound = computed(() => {
    return this.phase() === 'showdown';
  });

  readonly phaseLabel = computed(() => {
    const labels: Record<string, string> = {
      betting: 'Place Your Bets',
      playing: 'Your Turn',
      dealer: 'Dealer Playing',
      showdown: 'Showdown',
    };
    return labels[this.phase()] ?? this.phase();
  });

  // Betting state
  betAmount = signal<number>(20);

  constructor() {
    // Initialize bet amount to current bet when entering betting phase
    const initBet = () => {
      if (this.isBetting()) {
        this.betAmount.set(this.currentBet());
      }
    };
    // Re-run when phase changes to betting
    // Note: In a real reactive setup we'd use effect(), but simple call is fine
  }

  onNewRound(): void {
    this.ws.sendAction('next_hand', {});
  }

  executeBet(): void {
    const action = this.validActions().find((a) => a.type === 'bet');
    if (!action) return;
    const amount = this.betAmount();
    const min = action.minAmount ?? this.currentBet();
    const max = action.maxAmount ?? amount;
    const clamped = Math.max(min, Math.min(max, amount));
    this.ws.sendAction('bet', { amount: clamped });
  }

  executeHit(): void {
    this.ws.sendAction('hit', {});
  }

  executeStand(): void {
    this.ws.sendAction('stand', {});
  }

  executeDouble(): void {
    this.ws.sendAction('double', {});
  }

  executeSplit(): void {
    this.ws.sendAction('split', {});
  }

  canAction(type: string): boolean {
    return this.validActions().some((a) => a.type === type);
  }

  getHandValueDisplay(hand: BlackjackHand): string {
    if (hand.status === 'bust') return 'Bust!';
    if (hand.status === 'blackjack') return 'Blackjack!';
    return hand.value.toString();
  }

  getPlayerName(playerId: number): string {
    const p = this.players().find((pl) => pl.playerId === playerId);
    return p?.name ?? `Player ${playerId}`;
  }

  cardSpriteSrc(card: BlackjackCard): string {
    return `assets/poker_cards/${card.suit}_${card.rank}.png`;
  }

  cardBackSrc(): string {
    return 'assets/poker_cards/back.png';
  }

  private cardRank(card: string): string {
    return this.rankMap[card[0]] ?? card[0];
  }

  private cardSuit(card: string): string {
    return this.suitMap[card[1]] ?? card[1];
  }

  private calculateHandValue(cards: BlackjackCard[]): number {
    let value = 0;
    let aces = 0;
    for (const card of cards) {
      if (['king', 'queen', 'jack', '10'].includes(card.rank)) {
        value += 10;
      } else if (card.rank === 'ace') {
        aces++;
        value += 11;
      } else if (card.rank !== 'back') {
        value += parseInt(card.rank, 10) || 0;
      }
    }
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    return value;
  }

  private determineHandStatus(cards: BlackjackCard[], playerResult: string): string {
    const value = this.calculateHandValue(cards);
    if (value > 21) return 'bust';
    if (cards.length === 2 && value === 21) return 'blackjack';
    if (playerResult === 'won') return 'win';
    if (playerResult === 'lost') return 'lose';
    if (playerResult === 'push') return 'push';
    if (playerResult === 'bust') return 'bust';
    return 'active';
  }
}
