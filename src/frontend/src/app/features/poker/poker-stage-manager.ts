import { signal } from '@angular/core';

export const POKER_TIMING = {
  dealStagger: 350,
  communityStagger: 350,
  revealPause: 400,
  settlePause: 600,
  enteringCardDuration: 450,
};

export interface PokerStageEvent {
  type:
    | 'reset_deal'
    | 'deal_hole_card'
    | 'deal_community_card'
    | 'reveal_opponent_cards'
    | 'settle'
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
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizePhase(raw: string): string {
  return raw || 'waiting';
}

export class PokerStageManager {
  private readonly reducedMotion: boolean;

  private targetStateBlob = signal<Record<string, unknown> | null>(null);
  private displayedStateBlobInternal = signal<Record<string, unknown> | null>(null);
  private stageInternal = signal<string>('idle');
  private isAnimatingInternal = signal(false);
  private enteringCardIdsInternal = signal<Set<string>>(new Set());
  private revealingCardIdsInternal = signal<Set<string>>(new Set());

  private queueRunning = false;
  private pendingTarget: Record<string, unknown> | null = null;
  private lastProcessedJson = '';

  readonly displayedStateBlob = this.displayedStateBlobInternal;
  readonly stage = this.stageInternal;
  readonly isAnimating = this.isAnimatingInternal;
  readonly enteringCardIds = this.enteringCardIdsInternal;
  readonly revealingCardIds = this.revealingCardIdsInternal;

  constructor(options: PokerStageManagerOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
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
    // No persistent timers; setTimeout callbacks are fire-and-forget.
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
    switch (event.type) {
      case 'reset_deal': {
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
        const target = this.targetStateBlob();
        if (!target) return;
        this.displayedStateBlobInternal.set(clone(target));

        const ids = new Set<string>();
        const players = (target['players'] as Array<Record<string, unknown>>) ?? [];
        for (const p of players) {
          const pid = p['playerId'] as number;
          const hand = (p['hand'] as string[]) ?? [];
          for (let i = 0; i < hand.length; i++) {
            ids.add(`hole-${pid}-${i}`);
          }
        }
        this.revealingCardIdsInternal.set(ids);

        window.setTimeout(() => this.revealingCardIdsInternal.set(new Set()), 500);
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
    }
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
    }

    // Showdown: reveal all hole cards, then settle.
    if (targetPhase === 'showdown' && displayedPhase !== 'showdown') {
      // If we somehow jumped to showdown from far away, just snap.
      const riverOrShowdown = displayedPhase === 'river' || displayedPhase === 'showdown';
      if (!riverOrShowdown) {
        return [{ type: 'reveal_opponent_cards', stage: 'idle', delay: 0 }];
      }

      events.push({ type: 'reveal_opponent_cards', stage: 'showdown', delay: 0 });
      events.push({ type: 'settle', stage: 'settling', delay: POKER_TIMING.settlePause });
    }

    return events;
  }
}
