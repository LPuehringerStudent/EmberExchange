import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import {
  BlackjackStageManager,
  buildDealerCardId,
  buildPlayerCardId,
} from './blackjack-stage-manager';

export interface BlackjackCard {
  rank: string;
  suit: string;
  faceUp: boolean;
  cardId: string;
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

const BJ_SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 78 },   // 0 — bottom-center (hero)
  { x: 16, y: 62 },   // 1 — bottom-left
  { x: 32, y: 74 },   // 2 — lower-left
  { x: 68, y: 74 },   // 3 — lower-right
  { x: 84, y: 62 },   // 4 — bottom-right
];

@Component({
  selector: 'app-blackjack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blackjack.html',
  styleUrl: './blackjack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlackjackComponent implements OnDestroy {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private stageManager = new BlackjackStageManager({
    reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  readonly stateBlob = this.stageManager.displayedStateBlob;
  readonly lastError = this.ws.lastError;

  readonly isAnimating = this.stageManager.isAnimating;
  readonly stage = this.stageManager.stage;
  readonly enteringCardIds = this.stageManager.enteringCardIds;

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
    if (raw === 'player_turn') return 'playing';
    if (raw === 'dealer_turn') return 'dealer';
    if (raw === 'settled') return 'showdown';
    return raw;
  });

  readonly isBetting = computed(() => this.phase() === 'betting');
  readonly isInsurance = computed(() => this.phase() === 'insurance');
  readonly isPlaying = computed(() => this.phase() === 'playing');
  readonly isDealerTurn = computed(() => this.phase() === 'dealer');
  readonly isShowdown = computed(() => this.phase() === 'showdown');

  readonly dealerHand = computed((): BlackjackCard[] => {
    const blob = this.stateBlob();
    const cards = (blob?.['dealerHand'] as string[]) ?? [];
    return cards.map((c, index) => ({
      rank: this.cardRank(c),
      suit: this.cardSuit(c),
      faceUp: c !== 'back',
      cardId: buildDealerCardId(index),
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
    const activePlayer = (blob?.['activePlayer'] as number) ?? -1;
    const activeHandIndex = (blob?.['activeHandIndex'] as number) ?? 0;

    return this.rawPlayers().map((p) => {
      const playerId = Number(p['playerId']);
      const name = String(p['username'] ?? p['name'] ?? `Player ${playerId}`);
      const chips = Number(p['stack'] ?? 0);
      const result = String(p['result'] ?? 'playing');
      const isCurrentTurn = playerId === activePlayer;
      const handResultsArr = p['handResults'] as string[] | undefined;

      const handsArr = p['hands'] as string[][] | undefined;
      const betsArr = p['bets'] as number[] | undefined;

      const hands: BlackjackHand[] = (handsArr ?? []).map((handCards, idx) => {
        const cards: BlackjackCard[] = handCards.map((c, index) => ({
          rank: this.cardRank(c),
          suit: this.cardSuit(c),
          faceUp: c !== 'back',
          cardId: buildPlayerCardId(playerId, idx, index),
        }));
        const handResult = handResultsArr?.[idx] ?? result;
        return {
          handId: `${playerId}-${idx}`,
          cards,
          bet: betsArr?.[idx] ?? 0,
          status: this.determineHandStatus(cards, handResult),
          value: this.calculateHandValue(cards),
          isCurrentTurn: isCurrentTurn && idx === activeHandIndex,
        };
      });

      return { playerId, name, chips, hands, result, isCurrentTurn };
    });
  });

  readonly heroIndex = computed(() => {
    const heroId = this.heroPlayerId();
    return this.players().findIndex((p) => p.playerId === heroId);
  });

  readonly seatedPlayers = computed(() => {
    const players = this.players();
    const heroIdx = this.heroIndex();
    const rotated: (BlackjackPlayer | null)[] = new Array(
      BJ_SEAT_POSITIONS.length
    ).fill(null);

    if (heroIdx < 0) {
      for (let j = 0; j < Math.min(players.length, BJ_SEAT_POSITIONS.length); j++) {
        rotated[j] = players[j];
      }
      return rotated;
    }

    for (let j = 0; j < players.length; j++) {
      const seatIdx = (j - heroIdx + players.length) % players.length;
      if (seatIdx < BJ_SEAT_POSITIONS.length) {
        rotated[seatIdx] = players[j];
      }
    }
    return rotated;
  });

  readonly seatPositions = BJ_SEAT_POSITIONS;

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

  readonly betAction = computed(() => {
    return this.validActions().find((a) => a.type === 'bet');
  });

  readonly minBet = computed(() => {
    return this.betAction()?.minAmount ?? this.currentBet();
  });

  readonly maxBet = computed(() => {
    return this.betAction()?.maxAmount ?? this.currentBet();
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (
      (blob?.['winners'] as
        | Array<{ playerId: number; amount: number; handName: string }>
        | undefined) ?? []
    );
  });

  readonly canStartNewRound = computed(() => {
    return this.phase() === 'showdown';
  });

  readonly phaseLabel = computed(() => {
    const labels: Record<string, string> = {
      betting: 'Place Your Bets',
      insurance: 'Insurance?',
      playing: 'Your Turn',
      dealer: 'Dealer Playing',
      showdown: 'Showdown',
    };
    return labels[this.phase()] ?? this.phase();
  });

  readonly stageMessage = computed(() => {
    switch (this.stage()) {
      case 'dealing': return 'Dealing…';
      case 'dealer-turn': return 'Dealer is drawing…';
      case 'settling': return 'Settling…';
      default: return '';
    }
  });

  // Animation / pacing state
  showAnnouncement = signal(false);
  announcementText = signal('');
  showResultsOverlay = signal(false);

  // Betting state
  betAmount = signal<number>(20);

  // Rendering helpers
  readonly heroHasBet = computed(() => {
    return this.heroHands().some((h) => h.bet > 0);
  });

  readonly showWaitingOverlay = computed(() => {
    return this.players().length === 0;
  });

  readonly showStartHint = computed(() => {
    return this.isBetting() && this.isHeroTurn() && !this.heroHasBet();
  });

  readonly resultRows = computed(() => {
    const rows: Array<{
      name: string;
      label: string;
      amount: number;
      resultClass: string;
      handName?: string;
    }> = [];

    for (const player of this.players()) {
      for (const hand of player.hands) {
        const status = hand.status;
        let amount = 0;
        let label = this.resultLabel(status);
        let resultClass = this.resultClass(status);

        if (status === 'win' || status === 'blackjack') {
          amount = hand.bet;
        } else if (status === 'lose' || status === 'bust') {
          amount = -hand.bet;
        }

        rows.push({
          name: player.name,
          label,
          amount,
          resultClass,
          handName: player.hands.length > 1 ? `Hand ${player.hands.indexOf(hand) + 1}` : undefined,
        });
      }
    }
    return rows;
  });

  constructor() {
    // Feed authoritative state into the stage manager
    effect(() => {
      this.stageManager.setTarget(this.ws.stateBlob());
    });

    let lastPhase = '';
    let showdownTimer: number | null = null;

    effect(() => {
      const currentPhase = this.phase();
      const animating = this.isAnimating();

      if (currentPhase !== lastPhase) {
        lastPhase = currentPhase;

        // Phase announcements
        if (currentPhase === 'insurance') {
          this.announcementText.set('Dealer shows Ace — Insurance?');
          this.showAnnouncement.set(true);
          setTimeout(() => this.showAnnouncement.set(false), 2000);
        } else if (currentPhase === 'dealer') {
          this.announcementText.set("Dealer's Turn");
          this.showAnnouncement.set(true);
          setTimeout(() => this.showAnnouncement.set(false), 1500);
        } else if (currentPhase === 'showdown') {
          this.announcementText.set('Showdown');
          this.showAnnouncement.set(true);
          setTimeout(() => this.showAnnouncement.set(false), 1500);
        } else {
          this.showAnnouncement.set(false);
        }

        // Reset bet amount to min when entering betting phase
        if (currentPhase === 'betting') {
          this.betAmount.set(this.minBet());
        }
      }

      // Results overlay: only trigger once dealer/settle animation is done
      if (currentPhase === 'showdown' && !animating) {
        if (!showdownTimer) {
          showdownTimer = window.setTimeout(() => {
            this.showResultsOverlay.set(true);
          }, 2000);
        }
      } else {
        if (showdownTimer) {
          clearTimeout(showdownTimer);
          showdownTimer = null;
        }
        this.showResultsOverlay.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.stageManager.destroy();
  }

  isHeroSeat(seatIdx: number): boolean {
    return seatIdx === 0;
  }

  onNewRound(): void {
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

  executeInsurance(): void {
    this.ws.sendAction('insurance', {});
  }

  executeDeclineInsurance(): void {
    this.ws.sendAction('decline_insurance', {});
  }

  canAction(type: string): boolean {
    return !this.isAnimating() && this.validActions().some((a) => a.type === type);
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

  chipStack(bet: number): string[] {
    if (bet <= 0) return [];
    const colors = ['chip--red', 'chip--blue', 'chip--green', 'chip--black', 'chip--gold'];
    const count = Math.min(8, Math.max(1, Math.ceil(bet / 25)));
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  }

  resultClass(status: string): string {
    switch (status) {
      case 'win': return 'result--win';
      case 'blackjack': return 'result--blackjack';
      case 'lose': return 'result--lose';
      case 'bust': return 'result--lose';
      case 'push': return 'result--push';
      default: return 'result--push';
    }
  }

  resultLabel(status: string): string {
    switch (status) {
      case 'win': return 'Win';
      case 'blackjack': return 'Blackjack';
      case 'lose': return 'Lose';
      case 'bust': return 'Bust';
      case 'push': return 'Push';
      default: return status;
    }
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

  private determineHandStatus(
    cards: BlackjackCard[],
    playerResult: string
  ): string {
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
