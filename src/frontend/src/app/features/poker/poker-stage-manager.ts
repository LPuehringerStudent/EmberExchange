import { signal } from '@angular/core';

export const POKER_TIMING = {
  dealStagger: 350,
  communityStagger: 350,
  revealPause: 400,
  settlePause: 600,
  revealDuration: 500,
  chipFlightStagger: 100,
};

export interface PokerStageEvent {
  type:
    | 'reset_deal'
    | 'deal_hole_card'
    | 'deal_community_card'
    | 'reveal_opponent_cards'
    | 'settle'
    // Reserved for chip animation events implemented in Task 3
    | 'place_chips'
    | 'move_chips_to_pot'
    | 'payout_chips';
  stage: string;
  delay: number;
  playerId?: number;
  cardIndex?: number;
  card?: string;
  amount?: number;
}

export interface PokerStageManagerOptions {
  reducedMotion?: boolean;
  heroPlayerId?: number | null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizePhase(raw: string): string {
  return raw || 'waiting';
}

export class PokerStageManager {
  private readonly reducedMotion: boolean;
  private heroPlayerId: number | null = null;

  private targetStateBlob = signal<Record<string, unknown> | null>(null);
  private displayedStateBlobInternal = signal<Record<string, unknown> | null>(null);
  private stageInternal = signal<string>('idle');
  private isAnimatingInternal = signal(false);
  private enteringCardIdsInternal = signal<Set<string>>(new Set());
  private revealingCardIdsInternal = signal<Set<string>>(new Set());

  private queueRunning = false;
  private pendingTarget: Record<string, unknown> | null = null;
  private lastProcessedJson = '';
  private revealTimeoutId: ReturnType<typeof window.setTimeout> | null = null;

  private previousBets: Map<number, number> = new Map();
  private previousPot = 0;

  private chipEventQueueInternal = signal<PokerStageEvent[]>([]);
  readonly chipEventQueue = this.chipEventQueueInternal.asReadonly();

  readonly displayedStateBlob = this.displayedStateBlobInternal;
  readonly stage = this.stageInternal;
  readonly isAnimating = this.isAnimatingInternal;
  readonly enteringCardIds = this.enteringCardIdsInternal;
  readonly revealingCardIds = this.revealingCardIdsInternal;

  constructor(options: PokerStageManagerOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
    this.heroPlayerId = options.heroPlayerId ?? null;
  }

  setHeroPlayerId(id: number | null): void {
    this.heroPlayerId = id;
  }

  clearChipEvents(): void {
    this.chipEventQueueInternal.set([]);
  }

  setTarget(blob: Record<string, unknown> | null): void {
    if (this.queueRunning) {
      if (JSON.stringify(blob) !== this.lastProcessedJson) {
        this.pendingTarget = blob;
      }
      return;
    }

    if (blob === this.targetStateBlob()) {
      return;
    }

    this.lastProcessedJson = JSON.stringify(blob);
    this.targetStateBlob.set(blob);

    if (blob === null) {
      this.displayedStateBlobInternal.set(null);
      this.stageInternal.set('idle');
      this.isAnimatingInternal.set(false);
      this.enteringCardIdsInternal.set(new Set());
      this.revealingCardIdsInternal.set(new Set());
      return;
    }

    const events = this.buildEvents(blob);

    if (this.reducedMotion || events.length === 0) {
      this.displayedStateBlobInternal.set(clone(blob));
      this.stageInternal.set('idle');
      this.isAnimatingInternal.set(false);
      this.enteringCardIdsInternal.set(new Set());
      this.revealingCardIdsInternal.set(new Set());
      this.consumePending();
      return;
    }

    this.runEvents(events);
  }

  destroy(): void {
    if (this.revealTimeoutId) {
      window.clearTimeout(this.revealTimeoutId);
      this.revealTimeoutId = null;
    }
  }

  private consumePending(): void {
    if (this.pendingTarget) {
      const next = this.pendingTarget;
      this.pendingTarget = null;
      this.setTarget(next);
    }
  }

  private runEvents(events: PokerStageEvent[]): void {
    this.queueRunning = true;
    this.isAnimatingInternal.set(true);
    let i = 0;

    const step = (): void => {
      if (i >= events.length) {
        if (this.revealTimeoutId) {
          window.clearTimeout(this.revealTimeoutId);
          this.revealTimeoutId = null;
        }
        this.queueRunning = false;
        this.isAnimatingInternal.set(false);
        this.stageInternal.set('idle');
        this.enteringCardIdsInternal.set(new Set());
        this.revealingCardIdsInternal.set(new Set());
        this.consumePending();
        return;
      }

      const event = events[i++];
      this.stageInternal.set(event.stage);

      if (event.delay === 0) {
        this.applyEvent(event);
        step();
      } else {
        setTimeout(() => {
          this.applyEvent(event);
          step();
        }, event.delay);
      }
    };

    step();
  }

  private applyEvent(event: PokerStageEvent): void {
    const clearRevealTimeout = (): void => {
      if (this.revealTimeoutId) {
        window.clearTimeout(this.revealTimeoutId);
        this.revealTimeoutId = null;
      }
    };

    switch (event.type) {
      case 'reset_deal': {
        clearRevealTimeout();
        const target = this.targetStateBlob();
        if (!target) return;
        const reset = clone(target);
        const players = (reset['players'] as Array<Record<string, unknown>>) ?? [];
        for (const p of players) {
          p['hand'] = [];
        }
        reset['communityCards'] = [];
        reset['validActions'] = [];
        this.displayedStateBlobInternal.set(reset);
        this.enteringCardIdsInternal.set(new Set());
        this.revealingCardIdsInternal.set(new Set());
        return;
      }

      case 'deal_hole_card': {
        const target = this.targetStateBlob();
        if (!target) return;
        const next = clone(this.displayedStateBlobInternal() ?? target);
        const players = (next['players'] as Array<Record<string, unknown>>) ?? [];
        const tp = players.find((p) => p['playerId'] === event.playerId);
        if (!tp) return;
        const hand = (tp['hand'] as string[]) ?? [];
        if (event.cardIndex !== undefined && event.card) {
          hand[event.cardIndex] = event.card;
        }
        tp['hand'] = hand;
        this.displayedStateBlobInternal.set(next);
        this.enteringCardIdsInternal.set(
          new Set([...(this.enteringCardIdsInternal() as Set<string>), `hole-${event.playerId}-${event.cardIndex}`])
        );
        return;
      }

      case 'deal_community_card': {
        const target = this.targetStateBlob();
        if (!target) return;
        const next = clone(this.displayedStateBlobInternal() ?? target);
        const cards = (next['communityCards'] as string[]) ?? [];
        if (event.cardIndex !== undefined && event.card) {
          cards[event.cardIndex] = event.card;
        }
        this.displayedStateBlobInternal.set(next);
        this.enteringCardIdsInternal.set(
          new Set([...(this.enteringCardIdsInternal() as Set<string>), `community-${event.cardIndex}`])
        );
        return;
      }

      case 'reveal_opponent_cards': {
        clearRevealTimeout();

        const target = this.targetStateBlob();
        if (!target) return;
        this.displayedStateBlobInternal.set(clone(target));

        const ids = new Set<string>();
        const players = (target['players'] as Array<Record<string, unknown>>) ?? [];
        for (const p of players) {
          const pid = p['playerId'] as number;
          if (pid === this.heroPlayerId) continue;
          const hand = (p['hand'] as string[]) ?? [];
          for (let i = 0; i < hand.length; i++) {
            if (hand[i] === 'back') continue;
            ids.add(`hole-${pid}-${i}`);
          }
        }
        this.revealingCardIdsInternal.set(ids);

        this.revealTimeoutId = window.setTimeout(() => {
          this.revealingCardIdsInternal.set(new Set());
          this.revealTimeoutId = null;
        }, POKER_TIMING.revealDuration) as unknown as ReturnType<typeof window.setTimeout>;
        return;
      }

      case 'settle': {
        const target = this.targetStateBlob();
        if (target) {
          this.displayedStateBlobInternal.set(clone(target));
        }
        this.enteringCardIdsInternal.set(new Set());
        return;
      }

      case 'place_chips':
      case 'move_chips_to_pot':
      case 'payout_chips': {
        this.chipEventQueueInternal.update((q) => [...q, event]);
        return;
      }
    }
  }

  private buildPlaceChipEvents(
    blob: Record<string, unknown>,
    events: PokerStageEvent[]
  ): void {
    const players = (blob['players'] as Array<Record<string, unknown>>) ?? [];
    for (const p of players) {
      const pid = p['playerId'] as number;
      const bet = (p['bet'] as number) ?? 0;
      const prev = this.previousBets.get(pid) ?? 0;
      if (bet > prev) {
        events.push({
          type: 'place_chips',
          stage: events.length === 0 ? 'idle' : events[events.length - 1].stage,
          delay: 0,
          playerId: pid,
          amount: bet - prev,
        });
      }
    }
  }

  private buildMoveToPotEvents(
    blob: Record<string, unknown>,
    events: PokerStageEvent[]
  ): void {
    const players = (blob['players'] as Array<Record<string, unknown>>) ?? [];
    for (const p of players) {
      const pid = p['playerId'] as number;
      const bet = (p['bet'] as number) ?? 0;
      if (bet > 0) {
        events.push({
          type: 'move_chips_to_pot',
          stage: 'settling',
          delay: events.length === 0 ? 0 : POKER_TIMING.chipFlightStagger,
          playerId: pid,
          amount: bet,
        });
      }
    }
  }

  private buildPayoutChipEvents(
    blob: Record<string, unknown>,
    events: PokerStageEvent[]
  ): void {
    const winners = (blob['winners'] as Array<{ playerId: number; amount: number }>) ?? [];
    for (const w of winners) {
      if (w.amount > 0) {
        events.push({
          type: 'payout_chips',
          stage: 'settling',
          delay: events.length === 0 ? 0 : POKER_TIMING.chipFlightStagger,
          playerId: w.playerId,
          amount: w.amount,
        });
      }
    }
  }

  private syncTrackingState(blob: Record<string, unknown>): void {
    const players = (blob['players'] as Array<Record<string, unknown>>) ?? [];
    this.previousBets.clear();
    for (const p of players) {
      this.previousBets.set(p['playerId'] as number, (p['bet'] as number) ?? 0);
    }
    this.previousPot = (blob['pots'] as Array<{ amount: number }>)?.reduce((s, pot) => s + pot.amount, 0) ?? 0;
  }

  private buildEvents(blob: Record<string, unknown>): PokerStageEvent[] {
    const displayed = this.displayedStateBlobInternal();
    const displayedPhase = normalizePhase(String(displayed?.['phase'] ?? ''));
    const targetPhase = normalizePhase(String(blob['phase'] ?? ''));

    const events: PokerStageEvent[] = [];
    let hasAnimatedCard = false;

    // New hand: clear the board, then animate hole cards being dealt.
    if (targetPhase === 'preflop' && displayedPhase !== 'preflop') {
      events.push({ type: 'reset_deal', stage: 'dealing', delay: 0 });

      const targetPlayers = (blob['players'] as Array<Record<string, unknown>>) ?? [];

      for (let cardIdx = 0; cardIdx < 2; cardIdx++) {
        for (const tp of targetPlayers) {
          const targetHand = (tp?.['hand'] as string[] | undefined) ?? [];
          const card = targetHand[cardIdx];
          if (!card) continue;

          events.push({
            type: 'deal_hole_card',
            stage: 'dealing',
            delay: hasAnimatedCard ? POKER_TIMING.dealStagger : 0,
            playerId: tp?.['playerId'] as number,
            cardIndex: cardIdx,
            card,
          });
          hasAnimatedCard = true;
        }
      }
    }

    // Community cards: flop (3), turn (1), river (1).
    if (targetPhase === 'flop' || targetPhase === 'turn' || targetPhase === 'river') {
      const phaseOrder = ['preflop', 'flop', 'turn', 'river'];
      const displayedIdx = phaseOrder.indexOf(displayedPhase);
      const targetIdx = phaseOrder.indexOf(targetPhase);

      // Jump if we skipped a phase (reconnect / late join).
      if (targetIdx < 0 || displayedIdx < 0 || targetIdx - displayedIdx > 1) {
        this.syncTrackingState(blob);
        return [{ type: 'reveal_opponent_cards', stage: 'idle', delay: 0 }];
      }

      const communityIndexMap: Record<string, number[]> = {
        flop: [0, 1, 2],
        turn: [3],
        river: [4],
      };
      const targetCommunity = (blob['communityCards'] as string[]) ?? [];
      const displayedCommunity = (displayed?.['communityCards'] as string[]) ?? [];

      for (const idx of communityIndexMap[targetPhase] ?? []) {
        const card = targetCommunity[idx];
        if (!card) continue;
        if (displayedCommunity[idx] === card) continue;

        events.push({
          type: 'deal_community_card',
          stage: targetPhase,
          delay: hasAnimatedCard ? POKER_TIMING.communityStagger : 0,
          cardIndex: idx,
          card,
        });
        hasAnimatedCard = true;
      }

      this.buildMoveToPotEvents(blob, events);
    }

    // Showdown: reveal all hole cards, then settle.
    if (targetPhase === 'showdown' && displayedPhase !== 'showdown') {
      // If we somehow jumped to showdown from far away, just snap.
      const riverOrShowdown = displayedPhase === 'river' || displayedPhase === 'showdown';
      if (!riverOrShowdown) {
        this.syncTrackingState(blob);
        return [{ type: 'reveal_opponent_cards', stage: 'idle', delay: 0 }];
      }

      events.push({ type: 'reveal_opponent_cards', stage: 'showdown', delay: 0 });

      this.buildPayoutChipEvents(blob, events);

      events.push({ type: 'settle', stage: 'settling', delay: POKER_TIMING.settlePause });
    }

    this.buildPlaceChipEvents(blob, events);

    this.syncTrackingState(blob);

    return events;
  }
}
