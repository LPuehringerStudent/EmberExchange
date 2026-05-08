import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';


/* ============================================================
   INTERFACES
   ============================================================ */

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


/* ============================================================
   SEAT LAYOUT
   ============================================================ */

const SEAT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 90 }, // 0 — bottom-center  (hero)
  { x: 24, y: 82 }, // 1 — bottom-left
  { x: 10, y: 48 }, // 2 — mid-left
  { x: 50, y: 10 }, // 3 — top-center
  { x: 90, y: 48 }, // 4 — mid-right
  { x: 76, y: 82 }, // 5 — bottom-right
];


/* ============================================================
   COMPONENT
   ============================================================ */

@Component({
  selector: 'app-poker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poker.html',
  styleUrl: './poker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poker {

  /* ── Services ─────────────────────────────────────────────────── */

  private ws   = inject(WebSocketService);
  private auth = inject(AuthService);


  /* ── Raw state from WebSocket ─────────────────────────────────── */

  readonly stateBlob = this.ws.stateBlob;
  readonly lastError = this.ws.lastError;


  /* ── Card lookup maps ────────────────────────────────────────── */

  private readonly suitMap: Record<string, string> = {
    h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades',
  };

  private readonly rankMap: Record<string, string> = {
    A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: '10',
  };


  /* ── Derived game state ──────────────────────────────────────── */

  readonly heroPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

  readonly phase = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['phase'] as string) || 'waiting';
  });

  readonly isWaiting  = computed(() => this.phase() === 'waiting');
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
    const blob  = this.stateBlob();
    const cards = (blob?.['communityCards'] as string[]) ?? [];
    return [
      this.parseCard(cards[0]),
      this.parseCard(cards[1]),
      this.parseCard(cards[2]),
      this.parseCard(cards[3]),
      this.parseCard(cards[4]),
    ];
  });

  readonly currentTurnPlayer = computed(() =>
    this.seatedPlayers().find(p => p?.isCurrentTurn) ?? null
  );

  readonly phaseLabel = computed(() => {
    const labels: Record<string, string> = {
      waiting:  'Waiting to start',
      preflop:  'Pre-Flop',
      flop:     'Flop',
      turn:     'Turn',
      river:    'River',
      showdown: 'Showdown',
    };
    return labels[this.phase()] ?? this.phase();
  });

  readonly seatPositions = SEAT_POSITIONS;

  readonly heroHandName = computed(() => {
    const hero = this.rawPlayers()[this.heroIndex()];
    return (hero?.['handName'] as string) ?? null;
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['winners'] as Array<{ playerId: number; amount: number; handName: string }>) ?? [];
  });

  readonly canStartNewRound = computed(() => this.phase() === 'showdown');

  readonly raiseAction = computed(() =>
    this.validActions().find(a => a.type === 'raise')
  );

  raiseAmount = signal<number>(0);


  /* ============================================================
     UI ANIMATION STATE
     ============================================================ */

  /**
   * True while the "Gathering Chips" loader is playing.
   * Set to true when the user clicks Start Game, auto-clears after 3 s.
   */
  readonly gatheringVisible = signal<boolean>(false);

  /**
   * Text shown in the full-screen phase banner (e.g. "PRE-FLOP").
   * Updated each time the game phase changes.
   */
  readonly announcementText = signal<string>('');

  /**
   * Controls whether the phase banner overlay is on screen.
   * Auto-cleared after 2.5 s by triggerPhaseAnnouncement().
   */
  readonly announcementVisible = signal<boolean>(false);

  /**
   * Number of players who are actually seated (non-null entries).
   * Used in the template to hide empty seat placeholders in small games.
   * When there are only 2 players we hide the 4 empty seat outlines.
   */
  readonly activeSeatCount = computed(() =>
    this.seatedPlayers().filter(p => p !== null).length
  );

  /**
   * Base64 data URI for the coal currency icon.
   * Displayed next to every chip count as the in-game currency symbol.
   */
  readonly coalIconSrc =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAAAABHNCSVQICAgIfAhkiAAAAL56VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAAAYlX1P0Q7CIAx85yv2CdcWCnwOMZtZYtTs/x8sAeZm1CNQetBez13n+7ytl+m5PZb1NrupggHns89cACQ0CEAMqtHOhh6F7GZFiD3nFjWnCH/4V3BCsB8qStF2K6hHbn38kBW2ZT0KvmmjDnnQ2CXkBx8++P7AKL564M6n4Xu0C5LU2ySkQVVZpTJClpPds+D/6iJNl9/+Altt6tzZN+11BvcCMLVWXKwegSQAAAMTSURBVHic7d3RThNRGIXRQRpLo4VClHhBfP/nMlyQaKTaxrYEg2+file:g2+SYXWGt65N2Br6ci/lzptMEAAAAAAAAAAAAAADA/+akfQGj3Nx8fGpfw+/c3n56Nn/rkV61L4CXTYBUCZAqAVIlQKoESJUAqRIgVQKkata+gD9JJxxXV6vo82azsbf8+PiYLo3u46VNTOyAVAmQKgFSJUCqBEiVAKkSIFUCpEqAVNWeuqcTjsViHn3e5eVltO70LJuYHLZfonWbzSZal9rtDtG65zIxsQNSJUCqBEiVAKkSIFUCpEqAVAmQKgFSdfRnQtIJx/39fbRuuczOcKRnPZbL5dDPS6WTpGOfmNgBqRIgVQKkSoBUCZAqAVIlQKoESJUAqTr6Scj67mu0Ln3cv5myMxyjz5jM9uts3eC3dx37xMQOSJUAqRIgVQKkSoBUCZAqAVIlQKoESNXwScjot16dLRbRut1uF607OWQ/rJ6eMQkHJrHRZ0eur99F67bbXfSHWa8/D52Y2AGpEiBVAqRKgFQJkCoBUiVAqgRIlQCpqp0JWYQTjjerD9G62Sz8XY/wTEh6ffv9PlqXGj3RSe+3xQ5IlQCpEiBVAqRKgFQJkCoBUiVAqgRIVW0Skj7xn6a7od+bTjjy6xsrnsAcfkTr0onJ9flFtG6apqFnR+yAVAmQKgFSJUCqBEiVAKkSIFUCpEqAVB3974SMnkikk4Fpnr0EKp5crLPJxW7K7vfh8DNa9/o8+xc/fB/7Vq6UHZAqAVIlQKoESJUAqRIgVQKkSoBUCZCq2iQkffI+n55G657CyUUqnZikZzNGf2/r80azA1IlQKoESJUAqRIgVQKkSoBUCZAqAVI1dnzwF1ar99Ej+ov526HfO3qyMnqikzqEZ0JS3w7baJ1fTOdZESBVAqRKgFQJkCoBUiVAqgRIlQCpqk1CUq2JyWjppKFl9IQjZQekSoBUCZAqAVIlQKoESJUAqRIgAAAAAAAA/BO/AFEamNLH6FzGAAAAAElFTkSuQmCC';

  /** Tracks the last announced phase so we never repeat the same banner */
  private lastAnnouncedPhase = '';

  constructor() {
    /*
     * React to every phase change and trigger the announcement banner.
     * effect() must be called inside an injection context — the constructor
     * is the correct place for this in a standalone component.
     */
    effect(() => {
      this.triggerPhaseAnnouncement(this.phase());
    });
  }


  /* ── Actions ─────────────────────────────────────────────────── */

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

  initRaiseAmount(min: number): void {
    this.raiseAmount.set(min);
  }

  executeRaise(): void {
    const action = this.raiseAction();
    if (!action) return;
    const amount = this.raiseAmount();
    const min    = action.minAmount ?? amount;
    const max    = action.maxAmount ?? amount;
    const clamped = Math.max(min, Math.min(max, amount));
    this.ws.sendAction('raise', { amount: clamped });
  }

  executeAction(action: ValidAction): void {
    const data: Record<string, unknown> = {};
    if (typeof action.amount === 'number') data['amount'] = action.amount;
    this.ws.sendAction(action.type, data);
  }

  /**
   * Shows the gathering-chips animation for 3 s, then clears it.
   * The actual game-start signal is handled by the parent game-room component.
   */
  onStartGame(): void {
    this.gatheringVisible.set(true);
    setTimeout(() => this.gatheringVisible.set(false), 3000);
  }


  /* ── Card sprite helpers (template-facing) ───────────────────── */

  /** Returns the sprite URL for a given card. */
  cardSpriteSrc(card: PokerCard): string {
    return `assets/poker_cards/${card.suit}_${card.rank}.png`;
  }

  /** Returns the sprite URL for the back of a card. */
  cardBackSrc(): string {
    return 'assets/poker_cards/back.png';
  }


  /* ── Private helpers ───────────────────────────────────────────── */

  private mapPlayer(
    p: Record<string, unknown> | undefined,
    _seatIdx: number,
  ): PokerPlayer | null {
    if (!p) return null;
    const playerId      = String(p['playerId'] ?? '');
    const name          = String(p['username'] ?? p['name'] ?? `Player ${p['playerId']}`);
    const chips         = Number(p['stack'] ?? 0);
    const currentBet    = Number(p['bet'] ?? 0);
    const isFolded      = Boolean(p['folded']);
    const isAllIn       = Boolean(p['allIn']);
    const dealerPlayer  = this.rawPlayers()[this.dealerPosition()]?.['playerId'];
    const isDealer      = p['playerId'] === dealerPlayer;
    const isCurrentTurn = p['playerId'] === this.stateBlob()?.['activePlayer'];
    const isHeroPlayer  = p['playerId'] === this.heroPlayerId();
    const showCards     = isHeroPlayer || this.isShowdown();
    const hand          = p['hand'] as string[] | undefined;

    const cards: PokerCard[] | undefined = hand?.map(c => ({
      rank:   this.cardRank(c),
      suit:   this.cardSuit(c),
      faceUp: showCards && c !== 'back',
    }));

    return { playerId, name, chips, currentBet, isDealer, isCurrentTurn, isFolded, isAllIn, cards };
  }

  private parseCard(card: string | undefined): PokerCard | null {
    if (!card || card === 'back') return null;
    return { rank: this.cardRank(card), suit: this.cardSuit(card), faceUp: true };
  }

  private cardRank(card: string): string { return this.rankMap[card[0]] ?? card[0]; }
  private cardSuit(card: string): string { return this.suitMap[card[1]] ?? card[1]; }

  /**
   * Shows the phase announcement banner for 2.5 s whenever the phase changes.
   * The CSS animation duration is also 2.5 s so the text fades perfectly.
   */
  private triggerPhaseAnnouncement(phase: string): void {
    const phaseNames: Record<string, string> = {
      preflop:  'PRE-FLOP',
      flop:     'FLOP',
      turn:     'TURN',
      river:    'RIVER',
      showdown: 'SHOWDOWN',
    };

    const text = phaseNames[phase];
    if (!text || phase === this.lastAnnouncedPhase) return;

    this.lastAnnouncedPhase = phase;
    this.announcementText.set(text);
    this.announcementVisible.set(true);

    setTimeout(() => this.announcementVisible.set(false), 2500);
  }
}
