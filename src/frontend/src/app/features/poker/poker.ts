import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';


/**
 * The four phases a poker round moves through.
 *
 *   idle       — no game running, "Start Game" button is visible
 *   gathering  — chip-gathering animation plays
 *   dealing    — cards are being dealt
 *   playing    — round is live, players take turns
 *   finished   — round ended, winner shown
 */
export type RoundState = 'idle' | 'gathering' | 'dealing' | 'playing' | 'finished';

export interface PokerCard {
  rank: string;
  suit: string;
  faceUp?: boolean;
}

export interface PokerPlayer {
  playerId:       string;
  name:           string;
  chips:          number;
  isDealer?:      boolean;
  isCurrentTurn?: boolean;
  isFolded?:      boolean;
  isConnected?:   boolean;
  cards?:         PokerCard[];
}

export interface CommunityCards {
  flop:   PokerCard[];   // 0–3 cards
  turn?:  PokerCard;
  river?: PokerCard;
}


const SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 92 }, // 0 — bottom-center  (hero)
  { x: 18, y: 80 }, // 1 — bottom-left
  { x:  4, y: 48 }, // 2 — mid-left
  { x: 50, y:  6 }, // 3 — top-center
  { x: 96, y: 48 }, // 4 — mid-right
  { x: 82, y: 80 }, // 5 — bottom-right
];



@Component({
  selector: 'app-poker',
  templateUrl: './poker.html',
  styleUrl: './poker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poker {


  players= input<PokerPlayer[]>([]);
  heroSeatIdx= input<number>(0);
  cardAssetsPath= input<string>('assets/cards/');
  readonly phase= signal<RoundState>('idle');
  readonly pot= signal<number>(0);
  readonly community= signal<CommunityCards>({ flop: [] });
  readonly startGame = output<void>();
  readonly isIdle= computed(() => this.phase() === 'idle');
  readonly isGathering= computed(() => this.phase() === 'gathering');
  readonly isDealing= computed(() => this.phase() === 'dealing');
  readonly isPlaying= computed(() => this.phase() === 'playing');
  readonly isFinished= computed(() => this.phase() === 'finished');
  readonly seatedPlayers= computed(() => {
    const list= this.players();
    return SEAT_POSITIONS.map((_, i) => list[i] ?? null);
  });

  readonly communitySlots= computed((): Array<PokerCard | null> => {
    const c= this.community();
    return [
      c.flop[0] ?? null,
      c.flop[1] ?? null,
      c.flop[2] ?? null,
      c.turn    ?? null,
      c.river   ?? null,
    ];
  });
  readonly currentTurnPlayer= computed(() =>
    this.players().find(p=> p.isCurrentTurn) ?? null
  );
  readonly phaseLabel = computed(() => {
    const labels: Record<RoundState, string> = {
      idle:      'Waiting to start',
      gathering: 'Gathering chips',
      dealing:   'Dealing cards',
      playing:   'Round in progress',
      finished:  'Round finished',
    };
    return labels[this.phase()];
  });
  readonly seatPositions = SEAT_POSITIONS;

  onStartGame(): void {
    this.phase.set('gathering');
    setTimeout(() => {
      this.phase.set('dealing');
    }, 2500);
    setTimeout(() => {
      this.phase.set('playing');
    }, 3500);
    this.startGame.emit();
  }
  isHero(seatIdx: number): boolean {
    return seatIdx === this.heroSeatIdx();
  }

  cardSpriteSrc(card: PokerCard): string {
    return `${this.cardAssetsPath()}${card.suit}_${card.rank}.png`;
  }
  cardBackSrc(): string {
    return `${this.cardAssetsPath()}back.png`;
  }
}
