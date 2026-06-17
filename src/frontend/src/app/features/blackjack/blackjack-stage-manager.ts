import { signal } from '@angular/core';

export type BlackjackStage =
  | 'idle'
  | 'dealing'
  | 'player-turn'
  | 'dealer-turn'
  | 'settling';

export interface StageManagerOptions {
  reducedMotion?: boolean;
}

export const TIMING = {
  dealStagger: 350,
  holeFlip: 500,
  dealerDrawPause: 700,
  settlePause: 400,
  enteringCardDuration: 500,
};

type AnimationEvent =
  | { type: 'reset_deal'; stage: BlackjackStage; delay: number }
  | { type: 'deal_player_card'; stage: BlackjackStage; delay: number; playerId: number; handIndex: number; index: number; card: string }
  | { type: 'deal_dealer_upcard'; stage: BlackjackStage; delay: number; card: string }
  | { type: 'deal_dealer_hole'; stage: BlackjackStage; delay: number }
  | { type: 'reveal_hole_card'; stage: BlackjackStage; delay: number; card: string }
  | { type: 'dealer_draw'; stage: BlackjackStage; delay: number; index: number; card: string }
  | { type: 'player_draw'; stage: BlackjackStage; delay: number; playerId: number; handIndex: number; index: number; card: string }
  | { type: 'settle'; stage: BlackjackStage; delay: number };

export function buildPlayerCardId(
  playerId: number,
  handIndex: number,
  index: number,
  card: string
): string {
  return `${playerId}-${handIndex}-${index}-${card}`;
}

export function buildDealerCardId(index: number, card: string): string {
  return `dealer-${index}-${card}`;
}

export class BlackjackStageManager {
  readonly targetStateBlob = signal<Record<string, unknown> | null>(null);
  readonly displayedStateBlob = signal<Record<string, unknown> | null>(null);
  readonly isAnimating = signal(false);
  readonly stage = signal<BlackjackStage>('idle');
  readonly enteringCardIds = signal<Set<string>>(new Set());

  private readonly reducedMotion: boolean;
  private queueRunning = false;
  private pendingTarget: Record<string, unknown> | null = null;

  constructor(options: StageManagerOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
  }

  setTarget(blob: Record<string, unknown> | null): void {
    this.targetStateBlob.set(blob);
    if (this.queueRunning) {
      this.pendingTarget = blob;
      return;
    }
    if (this.reducedMotion || !blob || this.shouldJump(blob)) {
      this.jumpTo(blob);
      return;
    }
    const events = this.buildEvents(blob);
    if (events.length === 0) {
      this.displayedStateBlob.set(clone(blob));
      this.stage.set('idle');
      return;
    }
    this.runEvents(events);
  }

  private shouldJump(blob: Record<string, unknown>): boolean {
    const displayedPhase = normalizePhase(
      String(this.displayedStateBlob()?.['phase'] ?? '')
    );
    const targetPhase = normalizePhase(String(blob['phase'] ?? ''));
    if (targetPhase === 'betting') return true;
    if (!displayedPhase || displayedPhase === targetPhase) return false;

    // Normal flow can skip insurance (betting -> playing), so allow that single step.
    if (displayedPhase === 'betting' && targetPhase === 'playing') return false;

    const order = ['betting', 'insurance', 'playing', 'dealer', 'showdown'];
    const dIdx = order.indexOf(displayedPhase);
    const tIdx = order.indexOf(targetPhase);
    if (dIdx < 0 || tIdx < 0) return true;
    return tIdx < dIdx || tIdx - dIdx > 1;
  }

  private jumpTo(blob: Record<string, unknown> | null): void {
    this.displayedStateBlob.set(blob ? clone(blob) : null);
    this.isAnimating.set(false);
    this.stage.set('idle');
    this.enteringCardIds.set(new Set());
    this.queueRunning = false;
    this.pendingTarget = null;
  }

  private buildEvents(blob: Record<string, unknown>): AnimationEvent[] {
    const targetPhase = normalizePhase(String(blob['phase'] ?? ''));
    const displayedPhase = normalizePhase(
      String(this.displayedStateBlob()?.['phase'] ?? '')
    );
    const events: AnimationEvent[] = [];

    if (targetPhase === 'playing' && displayedPhase !== 'playing') {
      events.push({ type: 'reset_deal', stage: 'dealing', delay: 0 });

      const players = (blob['players'] as any[]) ?? [];
      const hands = players.flatMap((p) =>
        ((p['hands'] as string[][]) ?? []).map((hand, handIndex) => ({
          playerId: p['playerId'] as number,
          handIndex,
          cards: hand,
        }))
      );

      // First card to every hand
      for (const hand of hands) {
        events.push({
          type: 'deal_player_card',
          stage: 'dealing',
          delay: TIMING.dealStagger,
          playerId: hand.playerId,
          handIndex: hand.handIndex,
          index: 0,
          card: hand.cards[0],
        });
      }

      const dealerHand = (blob['dealerHand'] as string[]) ?? [];
      if (dealerHand.length > 0) {
        events.push({
          type: 'deal_dealer_upcard',
          stage: 'dealing',
          delay: TIMING.dealStagger,
          card: dealerHand[0],
        });
      }

      // Second card to every hand
      for (const hand of hands) {
        if (hand.cards.length > 1) {
          events.push({
            type: 'deal_player_card',
            stage: 'dealing',
            delay: TIMING.dealStagger,
            playerId: hand.playerId,
            handIndex: hand.handIndex,
            index: 1,
            card: hand.cards[1],
          });
        }
      }

      if (dealerHand.length > 1) {
        events.push({
          type: 'deal_dealer_hole',
          stage: 'dealing',
          delay: TIMING.dealStagger,
        });
      }
    }

    const dealerTarget = (blob['dealerHand'] as string[]) ?? [];
    const dealerDisplayed = ((this.displayedStateBlob()?.['dealerHand'] as string[]) ?? []);

    if (targetPhase === 'dealer' || targetPhase === 'showdown') {
      if (dealerDisplayed[1] === 'back' && dealerTarget[1] && dealerTarget[1] !== 'back') {
        events.push({
          type: 'reveal_hole_card',
          stage: 'dealer-turn',
          delay: events.length === 0 ? 0 : TIMING.holeFlip,
          card: dealerTarget[1],
        });
      }

      for (let i = 2; i < dealerTarget.length; i++) {
        if (i >= dealerDisplayed.length || dealerDisplayed[i] !== dealerTarget[i]) {
          events.push({
            type: 'dealer_draw',
            stage: 'dealer-turn',
            delay: TIMING.dealerDrawPause,
            index: i,
            card: dealerTarget[i],
          });
        }
      }
    }

    return events;
  }

  private runEvents(events: AnimationEvent[]): void {
    this.queueRunning = true;
    this.isAnimating.set(true);
    let i = 0;

    const step = () => {
      if (i >= events.length) {
        this.queueRunning = false;
        this.isAnimating.set(false);
        this.stage.set('idle');
        if (this.pendingTarget !== null) {
          const next = this.pendingTarget;
          this.pendingTarget = null;
          this.setTarget(next);
        }
        return;
      }

      const event = events[i++];
      this.stage.set(event.stage);
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

  private applyEvent(event: AnimationEvent): void {
    const target = this.targetStateBlob();
    const next = clone(this.displayedStateBlob() ?? {});

    switch (event.type) {
      case 'reset_deal': {
        if (target) {
          this.displayedStateBlob.set(this.blankStateFrom(target));
        }
        return;
      }
      case 'deal_player_card': {
        const player = ((next['players'] as any[]) ?? []).find(
          (p) => p['playerId'] === event.playerId
        );
        if (player) {
          player['hands'][event.handIndex].push(event.card);
          this.markEntering(
            buildPlayerCardId(
              event.playerId,
              event.handIndex,
              event.index,
              event.card
            )
          );
        }
        break;
      }
      case 'deal_dealer_upcard': {
        (next['dealerHand'] as string[]).push(event.card);
        this.markEntering(buildDealerCardId(0, event.card));
        break;
      }
      case 'deal_dealer_hole': {
        (next['dealerHand'] as string[]).push('back');
        break;
      }
      case 'reveal_hole_card': {
        const hand = next['dealerHand'] as string[];
        hand[1] = event.card;
        this.markEntering(buildDealerCardId(1, event.card));
        break;
      }
      case 'dealer_draw': {
        (next['dealerHand'] as string[]).push(event.card);
        this.markEntering(buildDealerCardId(event.index, event.card));
        break;
      }
      default:
        break;
    }

    this.displayedStateBlob.set(next);
  }

  private markEntering(id: string): void {
    const ids = new Set(this.enteringCardIds());
    ids.add(id);
    this.enteringCardIds.set(ids);
    setTimeout(() => {
      const updated = new Set(this.enteringCardIds());
      updated.delete(id);
      this.enteringCardIds.set(updated);
    }, TIMING.enteringCardDuration);
  }

  private blankStateFrom(target: Record<string, unknown>): Record<string, unknown> {
    const copy = clone(target);
    copy['dealerHand'] = [];
    const players = (copy['players'] as any[]) ?? [];
    for (const player of players) {
      const hands = (player['hands'] as string[][]) ?? [];
      player['hands'] = hands.map(() => []);
    }
    return copy;
  }
}

function normalizePhase(raw: string): string {
  if (raw === 'player_turn') return 'playing';
  if (raw === 'dealer_turn') return 'dealer';
  if (raw === 'settled') return 'showdown';
  return raw;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
