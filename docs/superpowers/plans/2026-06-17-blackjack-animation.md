# Blackjack Game-Flow Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend-only staged animation layer to Blackjack so cards deal one-by-one, the dealer draws with visible pauses, and results reveal with satisfying highlights — without changing the backend.

**Architecture:** A new `BlackjackStageManager` class receives the authoritative WebSocket state, compares it to the currently displayed state, and replays card differences through a timed event queue. The existing `BlackjackComponent` renders from the manager’s `displayedStateBlob` and disables controls while `isAnimating()` is true.

**Tech Stack:** Angular 21 signals, TypeScript, Jest with `jest.useFakeTimers()`, Tailwind CSS v4, component styles in `blackjack.css`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts` | Owns target/displayed state, diffing, event queue, timing config, reduced-motion detection, and entering-card IDs. |
| `src/test/blackjack-stage-manager.test.ts` | Unit tests for deal sequence, dealer draw, reduced motion, and jump detection. |
| `src/frontend/src/app/features/blackjack/blackjack.ts` | Wires the stage manager, exposes `isAnimating`/`stage`, disables actions during animations, delays results overlay. |
| `src/frontend/src/app/features/blackjack/blackjack.html` | Renders from displayed state, shows stage messages while animating, binds entering-card class. |
| `src/frontend/src/app/features/blackjack/blackjack.css` | Moves deal-in animation to `.card-flip--entering`, adds hand highlight classes and chip-payout keyframes. |

---

## Task 1: Create `BlackjackStageManager` skeleton + snap test

**Files:**
- Create: `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts`
- Test: `src/test/blackjack-stage-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/blackjack-stage-manager.test.ts
import { BlackjackStageManager } from '../src/frontend/src/app/features/blackjack/blackjack-stage-manager';

function makeBlob(
  phase: string,
  dealerHand: string[],
  players: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    status: 'active',
    phase,
    dealerHand,
    players,
    activePlayer: -1,
    activeHandIndex: 0,
    currentBet: 20,
    validActions: [],
  };
}

describe('BlackjackStageManager', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('snaps to a betting state instantly', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(makeBlob('betting', [], []));

    expect(mgr.displayedStateBlob()?.['phase']).toBe('betting');
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: FAIL — `Cannot find module` or class not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts
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

export class BlackjackStageManager {
  readonly targetStateBlob = signal<Record<string, unknown> | null>(null);
  readonly displayedStateBlob = signal<Record<string, unknown> | null>(null);
  readonly isAnimating = signal(false);
  readonly stage = signal<BlackjackStage>('idle');
  readonly enteringCardIds = signal<Set<string>>(new Set());

  private readonly reducedMotion: boolean;

  constructor(options: StageManagerOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
  }

  setTarget(blob: Record<string, unknown> | null): void {
    this.targetStateBlob.set(blob);
    if (this.reducedMotion || !blob) {
      this.jumpTo(blob);
      return;
    }
    // Full animation logic added in later tasks.
    this.jumpTo(blob);
  }

  private jumpTo(blob: Record<string, unknown> | null): void {
    this.displayedStateBlob.set(blob ? clone(blob) : null);
    this.isAnimating.set(false);
    this.stage.set('idle');
    this.enteringCardIds.set(new Set());
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts src/test/blackjack-stage-manager.test.ts
git commit -m "feat(blackjack): add BlackjackStageManager skeleton with snap behavior"
```

---

## Task 2: Implement initial-deal animation

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts`
- Modify: `src/test/blackjack-stage-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `src/test/blackjack-stage-manager.test.ts`:

```ts
import { buildPlayerCardId, buildDealerCardId, TIMING } from '../src/frontend/src/app/features/blackjack/blackjack-stage-manager';

it('stages an initial deal one card at a time', () => {
  const mgr = new BlackjackStageManager();
  mgr.setTarget(makeBlob('betting', [], []));
  jest.advanceTimersByTime(0);

  const target = makeBlob('player_turn', ['5h', 'back'], [
    {
      playerId: 1,
      username: 'Hero',
      stack: 1000,
      hands: [['Ah', '10d']],
      bets: [20],
      result: 'playing',
    },
  ]);

  mgr.setTarget(target);

  // Reset event applies immediately (delay 0)
  expect(mgr.isAnimating()).toBe(true);
  expect(mgr.stage()).toBe('dealing');
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([]);

  // First player card
  jest.advanceTimersByTime(350);
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual(['Ah']);
  expect(mgr.enteringCardIds().has(buildPlayerCardId(1, 0, 0, 'Ah'))).toBe(true);

  // Dealer upcard
  jest.advanceTimersByTime(350);
  expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h']);

  // Second player card
  jest.advanceTimersByTime(350);
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual(['Ah', '10d']);

  // Dealer hole
  jest.advanceTimersByTime(350);
  expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', 'back']);

  // Queue finishes
  jest.advanceTimersByTime(350);
  expect(mgr.isAnimating()).toBe(false);
  expect(mgr.stage()).toBe('idle');
});
```

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: FAIL — only the reset event happens, no card events.

- [ ] **Step 2: Implement event generation and queue**

Replace the body of `BlackjackStageManager` with the full deal logic. Keep the existing public API.

```ts
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
      setTimeout(() => {
        this.applyEvent(event);
        step();
      }, event.delay);
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
```

- [ ] **Step 3: Run the test and verify it passes**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts src/test/blackjack-stage-manager.test.ts
git commit -m "feat(blackjack): stage initial deal one card at a time"
```

---

## Task 3: Implement dealer-turn animation

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts`
- Modify: `src/test/blackjack-stage-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
it('reveals the hole card and draws dealer cards one by one', () => {
  const mgr = new BlackjackStageManager();

  // Start from a fully dealt playing state
  mgr.setTarget(
    makeBlob('player_turn', ['5h', 'back'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ])
  );
  jest.advanceTimersByTime(10_000); // finish initial deal

  mgr.setTarget(
    makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ])
  );

  expect(mgr.isAnimating()).toBe(true);
  expect(mgr.stage()).toBe('dealer-turn');

  // Hole card revealed
  jest.advanceTimersByTime(TIMING.holeFlip);
  expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c']);

  // First dealer draw
  jest.advanceTimersByTime(TIMING.dealerDrawPause);
  expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);

  // Queue finishes
  jest.advanceTimersByTime(TIMING.dealerDrawPause);
  expect(mgr.isAnimating()).toBe(false);
  expect(mgr.stage()).toBe('idle');
});
```

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: FAIL — dealer cards appear instantly because dealer events are not generated.

- [ ] **Step 2: Extend `buildEvents` and `applyEvent` for dealer turn**

In `buildEvents`, after the initial-deal block, add:

```ts
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
```

In `applyEvent`, add cases:

```ts
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
```

- [ ] **Step 3: Run the test and verify it passes**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts src/test/blackjack-stage-manager.test.ts
git commit -m "feat(blackjack): stage dealer hole reveal and draws"
```

---

## Task 4: Implement player-hit and settle animations

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts`
- Modify: `src/test/blackjack-stage-manager.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests:

```ts
it('animates a player hit', () => {
  const mgr = new BlackjackStageManager();
  mgr.setTarget(
    makeBlob('player_turn', ['5h', 'back'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ])
  );
  jest.advanceTimersByTime(10_000);

  mgr.setTarget(
    makeBlob('player_turn', ['5h', 'back'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d', '3c']],
        bets: [20],
        result: 'playing',
      },
    ])
  );

  expect(mgr.isAnimating()).toBe(true);
  expect(mgr.stage()).toBe('player-turn');

  jest.advanceTimersByTime(TIMING.dealStagger);
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([
    'Ah',
    '10d',
    '3c',
  ]);

  jest.advanceTimersByTime(TIMING.dealStagger);
  expect(mgr.isAnimating()).toBe(false);
});

it('animates the settle highlight', () => {
  const mgr = new BlackjackStageManager();
  mgr.setTarget(
    makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'won',
        handResults: ['won'],
      },
    ])
  );
  jest.advanceTimersByTime(10_000);

  mgr.setTarget(
    makeBlob('settled', ['5h', '8c', 'Ks'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1020,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'won',
        handResults: ['won'],
      },
    ])
  );

  expect(mgr.isAnimating()).toBe(true);
  expect(mgr.stage()).toBe('settling');

  jest.advanceTimersByTime(TIMING.settlePause);
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].result).toBe('won');
  expect(mgr.isAnimating()).toBe(false);
});
```

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: FAIL — player hits and settle are not handled.

- [ ] **Step 2: Extend `buildEvents` and `applyEvent`**

In `buildEvents`, after the dealer block, add:

```ts
if (targetPhase === 'playing' && displayedPhase === 'playing') {
  const targetPlayers = (blob['players'] as any[]) ?? [];
  const displayedPlayers = ((this.displayedStateBlob()?.['players'] as any[]) ?? []);

  for (const tp of targetPlayers) {
    const playerId = tp['playerId'] as number;
    const dp = displayedPlayers.find((p) => p['playerId'] === playerId);
    const targetHands = (tp['hands'] as string[][]) ?? [];
    const displayedHands = ((dp?.['hands'] as string[][]) ?? []).map((h) => h ?? []);

    for (let h = 0; h < targetHands.length; h++) {
      const displayedHand = displayedHands[h] ?? [];
      for (let i = displayedHand.length; i < targetHands[h].length; i++) {
        events.push({
          type: 'player_draw',
          stage: 'player-turn',
          delay: TIMING.dealStagger,
          playerId,
          handIndex: h,
          index: i,
          card: targetHands[h][i],
        });
      }
    }
  }
}

if (targetPhase === 'showdown') {
  events.push({ type: 'settle', stage: 'settling', delay: TIMING.settlePause });
}
```

In `applyEvent`, add:

```ts
case 'player_draw': {
  const player = ((next['players'] as any[]) ?? []).find(
    (p) => p['playerId'] === event.playerId
  );
  if (player) {
    player['hands'][event.handIndex].push(event.card);
    this.markEntering(
      buildPlayerCardId(event.playerId, event.handIndex, event.index, event.card)
    );
  }
  break;
}
case 'settle': {
  const target = this.targetStateBlob();
  if (target) {
    this.displayedStateBlob.set(clone(target));
  }
  return;
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts src/test/blackjack-stage-manager.test.ts
git commit -m "feat(blackjack): stage player draws and settle reveal"
```

---

## Task 5: Add reduced-motion and jump-detection tests

**Files:**
- Modify: `src/test/blackjack-stage-manager.test.ts`

- [ ] **Step 1: Write the tests**

```ts
it('snaps instantly when reduced motion is preferred', () => {
  const mgr = new BlackjackStageManager({ reducedMotion: true });
  mgr.setTarget(
    makeBlob('player_turn', ['5h', 'back'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ])
  );

  expect(mgr.isAnimating()).toBe(false);
  expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([
    'Ah',
    '10d',
  ]);
});

it('jumps ahead on reconnect or phase skip', () => {
  const mgr = new BlackjackStageManager();
  mgr.setTarget(makeBlob('betting', [], []));
  jest.advanceTimersByTime(0);

  // Dealer phase would normally animate, but we leap from betting → dealer
  mgr.setTarget(
    makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ])
  );

  expect(mgr.isAnimating()).toBe(false);
  expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/test/blackjack-stage-manager.test.ts
git commit -m "test(blackjack): reduced motion and jump detection"
```

---

## Task 6: Move card enter animation to a modifier class

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack.css`

- [ ] **Step 1: Update CSS**

```css
/* Remove the always-on animation from .card-flip */
.card-flip {
  perspective: 800px;
  flex-shrink: 0;
}

/* Only newly entering cards animate */
.card-flip--entering {
  animation: card-deal-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
```

The existing `@keyframes card-deal-in` stays as-is.

- [ ] **Step 2: Verify no visual regressions**

Run: `npm run frontend:build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack.css
git commit -m "style(blackjack): only animate newly entering cards"
```

---

## Task 7: Add hand highlight and chip payout styles

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack.css`

- [ ] **Step 1: Add hand highlight classes**

```css
.bj-hand--win {
  outline: 2px solid rgba(74, 222, 128, 0.6);
  outline-offset: 2px;
  border-radius: 12px;
}

.bj-hand--lose {
  outline: 2px solid rgba(239, 83, 80, 0.5);
  outline-offset: 2px;
  border-radius: 12px;
}

.bj-hand--push {
  outline: 2px solid var(--border);
  outline-offset: 2px;
  border-radius: 12px;
}
```

- [ ] **Step 2: Add chip payout animation**

```css
.bj-hand--win .bj-chip,
.bj-hand--blackjack .bj-chip {
  animation: chip-payout 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes chip-payout {
  0% {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
  }
  60% {
    transform: translateX(-50%) translateY(-28px) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) translateY(-40px) scale(0.85);
    opacity: 0;
  }
}
```

- [ ] **Step 3: Build and commit**

Run: `npm run frontend:build`

Expected: Build succeeds.

```bash
git add src/frontend/src/app/features/blackjack/blackjack.css
git commit -m "style(blackjack): hand highlights and chip payout animation"
```

---

## Task 8: Wire `BlackjackStageManager` into the component

**Files:**
- Modify: `src/frontend/src/app/features/blackjack/blackjack.ts`
- Modify: `src/frontend/src/app/features/blackjack/blackjack.html`

- [ ] **Step 1: Update `blackjack.ts`**

Inject the stage manager at the top of the component class:

```ts
import { BlackjackStageManager } from './blackjack-stage-manager';

export class BlackjackComponent {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private stageManager = new BlackjackStageManager({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  readonly stateBlob = this.stageManager.displayedStateBlob;
  readonly lastError = this.ws.lastError;

  readonly isAnimating = this.stageManager.isAnimating;
  readonly stage = this.stageManager.stage;
  readonly enteringCardIds = this.stageManager.enteringCardIds;

  // ... existing computed signals stay as-is because they read stateBlob ...
```

Feed the WebSocket target into the manager in the constructor:

```ts
constructor() {
  // Feed authoritative state into the stage manager
  effect(() => {
    this.stageManager.setTarget(this.ws.stateBlob());
  });

  // existing constructor body stays below
}
```

Disable actions while animating:

```ts
  canAction(type: string): boolean {
    return !this.isAnimating() && this.validActions().some((a) => a.type === type);
  }
```

Add a stage message computed:

```ts
  readonly stageMessage = computed(() => {
    switch (this.stage()) {
      case 'dealing': return 'Dealing…';
      case 'dealer-turn': return 'Dealer is drawing…';
      case 'settling': return 'Settling…';
      default: return '';
    }
  });
```

Update the results-overlay effect in the constructor to wait for animations to finish:

```ts
  effect(() => {
    const currentPhase = this.phase();
    const animating = this.isAnimating();

    if (currentPhase !== lastPhase) {
      lastPhase = currentPhase;
      // phase announcements stay here (unchanged)
      if (currentPhase === 'insurance') { ... }
      else if (currentPhase === 'dealer') { ... }
      else if (currentPhase === 'showdown') { ... }
      else { this.showAnnouncement.set(false); }

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
```

- [ ] **Step 2: Update `blackjack.html`**

Wrap the control bar with an animation message first:

```html
<div class="bj-control-bar absolute bottom-[4%] left-1/2 -translate-x-1/2 z-20">
  @if (isAnimating()) {
    <div class="bj-control-bar__panel bj-control-bar__panel--message px-6 py-3">
      <span class="bj-controls__message text-base font-semibold text-white/80 italic">{{ stageMessage() }}</span>
    </div>
  } @else {
    <!-- existing control-bar branches stay here unchanged -->
  }
</div>
```

Bind the entering-card class on every `.card-flip`:

For dealer cards:
```html
<div
  class="card-flip card-flip--dealer"
  [class.face-down]="!card.faceUp"
  [class.face-up]="card.faceUp"
  [class.card-flip--entering]="enteringCardIds().has(card.cardId)"
>
```

For player cards:
```html
<div
  class="card-flip card-flip--player"
  [class.face-down]="!card.faceUp"
  [class.face-up]="card.faceUp"
  [class.card-flip--entering]="enteringCardIds().has(card.cardId)"
>
```

Add `cardId` to the `BlackjackCard` interface and populate it in the two `cards.map` calls:

```ts
export interface BlackjackCard {
  rank: string;
  suit: string;
  faceUp: boolean;
  cardId: string;
}
```

In `dealerHand` computed:

```ts
return cards.map((c, index) => ({
  rank: this.cardRank(c),
  suit: this.cardSuit(c),
  faceUp: c !== 'back',
  cardId: buildDealerCardId(index, c),
}));
```

In the player hands computed:

```ts
const cards: BlackjackCard[] = handCards.map((c, index) => ({
  rank: this.cardRank(c),
  suit: this.cardSuit(c),
  faceUp: c !== 'back',
  cardId: buildPlayerCardId(playerId, idx, index, c),
}));
```

Add hand-status highlight classes to `.bj-hand`:

```html
<div
  class="bj-hand flex flex-col items-center gap-1"
  [class.bj-hand--active]="hand.isCurrentTurn"
  [class.bj-hand--settled]="isShowdown()"
  [class.bj-hand--win]="hand.status === 'win' || hand.status === 'blackjack'"
  [class.bj-hand--lose]="hand.status === 'lose' || hand.status === 'bust'"
  [class.bj-hand--push]="hand.status === 'push'"
>
```

- [ ] **Step 3: Build and test**

Run: `npm run frontend:build`

Expected: Build succeeds.

Run: `npm test -- src/test/blackjack-stage-manager.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/app/features/blackjack/blackjack.ts src/frontend/src/app/features/blackjack/blackjack.html
git commit -m "feat(blackjack): wire stage manager into component and template"
```

---

## Task 9: Manual visual verification

**Files:** none (manual)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev:full`

Wait for the backend and Angular dev server to start.

- [ ] **Step 2: Play a few hands**

Open `http://localhost:4200`, join a Blackjack table, and verify:

1. After all bets, the control bar shows **“Dealing…”** and cards appear one-by-one.
2. Your own cards are visible above the control bar.
3. When it is your turn, controls appear only after dealing finishes.
4. When you hit, the new card animates in.
5. During the dealer turn, the hole card flips and each draw is visible.
6. Winning/losing hands get a colored highlight; chips hop on wins.
7. The results overlay appears after the settle animation.
8. With **prefers-reduced-motion** enabled in the OS/browser, everything snaps instantly.

- [ ] **Step 3: Commit any final tweaks**

```bash
git add -A
git commit -m "polish(blackjack): final timing tweaks from manual testing"
```

---

## Spec Coverage Check

| Spec Requirement | Task(s) |
|---|---|
| Frontend-only, no backend changes | All tasks |
| Staggered initial deal | Task 2 |
| Hole-card flip | Task 3 |
| Dealer draws one-by-one | Task 3 |
| Result/payout highlight | Task 4, Task 7 |
| `prefers-reduced-motion` | Task 1 options, Task 5, Task 8 |
| Reconnect/jump detection | Task 1 `shouldJump`, Task 5 |
| Disable controls during animation | Task 8 |
| Delay results overlay until animation ends | Task 8 |

## Placeholder Scan

No placeholders. Every step includes exact file paths, code blocks, commands, and expected outcomes.
