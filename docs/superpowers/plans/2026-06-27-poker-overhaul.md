# Poker (Texas Hold'em) Frontend Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Poker frontend up to the same animation, multiplayer-sync, and UX standard as the recent Blackjack overhaul by introducing a `PokerStageManager`, staged card/community animations, reduced-motion support, pending-action locking, and fixing the backend MiniGameSession recording bug for poker showdowns.

**Architecture:** Introduce a `PokerStageManager` (mirroring `BlackjackStageManager`) that buffers authoritative `stateBlob` updates and emits a queued animation event stream (`reset_deal`, `deal_hole_card`, `deal_community_card`, `reveal_opponent_cards`, `settle`). The `Poker` component will consume `displayedStateBlob` from the stage manager instead of `ws.stateBlob` directly. Action buttons will use a pending-action lock to prevent double-submission. The backend fix normalizes MiniGameSession recording to also fire on `showdown`.

**Tech Stack:** Angular 21 (signals), TypeScript, Jest, WebSocket, existing `WebSocketService`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/frontend/src/app/features/poker/poker-stage-manager.ts` | NEW. Buffers state blobs, builds animation event queues, exposes `displayedStateBlob`, `isAnimating`, `stage`, `enteringCardIds`. |
| `src/frontend/src/app/features/poker/poker.ts` | MODIFIED. Consume stage manager, add pending-action lock, drop dead signals, integrate stage helpers. |
| `src/frontend/src/app/features/poker/poker.html` | MODIFIED. Bind to `displayedStateBlob`, `enteringCardIds`, `stageMessage`, reduced-motion class. |
| `src/frontend/src/app/features/poker/poker.css` | MODIFIED. Add `card-flip--entering`, entering chip/pot styles, reduced-motion guards. |
| `src/backend/websocket/handlers/player-action.ts` | MODIFIED. Record `MiniGameSession` on `showdown` as well as `settled`. |
| `src/test/poker-stage-manager.test.ts` | NEW. Unit tests for stage manager event queue. |

---

## Task 1: Fix MiniGameSession recording for Poker

**Files:**
- Modify: `src/backend/websocket/handlers/player-action.ts`

**Background:** `player-action.ts` records a `MiniGameSession` only when `newPhase === "settled"`. Poker ends with phase `"showdown"`, so completed poker hands are never persisted.

- [ ] **Step 1: Locate the MiniGameSession block**

Find the block in `src/backend/websocket/handlers/player-action.ts` after a successful `engine.processAction`:

```ts
const newPhase = (result.newFullState! as Record<string, unknown>).phase as string;
if (newPhase === "settled") {
  const miniGameSessionService = new MiniGameSessionService(unit);
  ...
}
```

- [ ] **Step 2: Update the condition to include showdown**

Change the condition from:

```ts
if (newPhase === "settled") {
```

to:

```ts
if (newPhase === "settled" || newPhase === "showdown") {
```

- [ ] **Step 3: Run backend tests**

Run:

```bash
npm test -- src/test/gameEngineTests/poker-engine.test.ts --silent
```

Expected: all poker engine tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/backend/websocket/handlers/player-action.ts
git commit -m "fix(poker): record MiniGameSession at showdown"
```

---

## Task 2: Create `PokerStageManager`

**Files:**
- Create: `src/frontend/src/app/features/poker/poker-stage-manager.ts`

**Background:** Poker currently renders `ws.stateBlob` directly. Cards appear instantly. We need a stage manager to animate hole-card deals, community-card deals, and showdown reveals.

- [ ] **Step 1: Create the file with timing constants and event types**

Create `src/frontend/src/app/features/poker/poker-stage-manager.ts`:

```ts
import { signal, computed, WritableSignal } from '@angular/core';

export const POKER_TIMING = {
  dealStagger: 350,
  communityStagger: 350,
  revealStagger: 250,
  settlePause: 600,
  enteringCardDuration: 450,
};

export interface PokerStageEvent {
  type:
    | 'reset_deal'
    | 'deal_hole_card'
    | 'deal_community_card'
    | 'reveal_opponent_cards'
    | 'settle';
  stage: string;
  delay: number;
  playerId?: number;
  seatIndex?: number;
  cardIndex?: number;
  card?: string;
}

export interface PokerStageManagerOptions {
  reducedMotion?: boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class PokerStageManager {
  private readonly reducedMotion: boolean;

  private targetStateBlob = signal<Record<string, unknown> | null>(null);
  private displayedStateBlobInternal = signal<Record<string, unknown> | null>(null);
  private stageInternal = signal<string>('idle');
  private isAnimatingInternal = signal(false);
  private enteringCardIdsInternal = signal<Set<string>>(new Set());

  private queueRunning = false;
  private pendingTarget: Record<string, unknown> | null = null;
  private lastProcessedJson = '';

  readonly displayedStateBlob = this.displayedStateBlobInternal.asReadonly();
  readonly stage = this.stageInternal.asReadonly();
  readonly isAnimating = this.isAnimatingInternal.asReadonly();
  readonly enteringCardIds = this.enteringCardIdsInternal.asReadonly();

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
      return;
    }

    const events = this.buildEvents(blob);

    if (this.reducedMotion || events.length === 0) {
      this.displayedStateBlobInternal.set(clone(blob));
      this.stageInternal.set('idle');
      this.isAnimatingInternal.set(false);
      this.enteringCardIdsInternal.set(new Set());
      this.consumePending();
      return;
    }

    this.runEvents(events);
  }

  destroy(): void {
    // No timers stored; timeouts are fire-and-forget with cleanup handled by closure.
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
        this.consumePending();
        return;
      }

      const event = events[i++];
      this.stageInternal.set(event.stage);

      if (event.delay === 0) {
        this.applyEvent(event);
        step();
      } else {
        window.setTimeout(() => {
          this.applyEvent(event);
          step();
        }, event.delay);
      }
    };

    step();
  }

  private applyEvent(event: PokerStageEvent): void {
    switch (event.type) {
      case 'reset_deal':
        if (this.targetStateBlob()) {
          this.displayedStateBlobInternal.set(clone(this.targetStateBlob()));
        }
        this.enteringCardIdsInternal.set(new Set());
        return;

      case 'deal_hole_card': {
        const target = this.targetStateBlob();
        if (!target) return;
        const next = clone(target);
        const players = (next['players'] as Array<Record<string, unknown>>) ?? [];
        const tp = players.find((p) => p['playerId'] === event.playerId);
        const hand = (tp?.['hand'] as string[] | undefined) ?? [];
        if (event.cardIndex !== undefined && event.card) {
          hand[event.cardIndex] = event.card;
        }
        this.displayedStateBlobInternal.set(next);
        this.enteringCardIdsInternal.update((set) => {
          set.add(`hole-${event.playerId}-${event.cardIndex}`);
          return new Set(set);
        });
        return;
      }

      case 'deal_community_card': {
        const target = this.targetStateBlob();
        if (!target) return;
        const next = clone(target);
        const cards = (next['communityCards'] as string[]) ?? [];
        if (event.cardIndex !== undefined && event.card) {
          cards[event.cardIndex] = event.card;
        }
        this.displayedStateBlobInternal.set(next);
        this.enteringCardIdsInternal.update((set) => {
          set.add(`community-${event.cardIndex}`);
          return new Set(set);
        });
        return;
      }

      case 'reveal_opponent_cards': {
        const target = this.targetStateBlob();
        if (!target) return;
        const next = clone(target);
        this.displayedStateBlobInternal.set(next);
        this.enteringCardIdsInternal.set(new Set());
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
    const displayedPhase = String(displayed?.['phase'] ?? 'waiting');
    const targetPhase = String(blob['phase'] ?? 'waiting');

    const events: PokerStageEvent[] = [];

    // New hand: snap to the pre-deal target state, then animate hole cards.
    if (targetPhase === 'preflop' && displayedPhase !== 'preflop') {
      events.push({ type: 'reset_deal', stage: 'dealing', delay: 0 });

      const targetPlayers = (blob['players'] as Array<Record<string, unknown>>) ?? [];
      const displayedPlayers = (displayed?.['players'] as Array<Record<string, unknown>>) ?? [];

      for (let cardIdx = 0; cardIdx < 2; cardIdx++) {
        for (let seatIdx = 0; seatIdx < targetPlayers.length; seatIdx++) {
          const tp = targetPlayers[seatIdx];
          const dp = displayedPlayers[seatIdx];
          const targetHand = (tp?.['hand'] as string[] | undefined) ?? [];
          const displayedHand = (dp?.['hand'] as string[] | undefined) ?? [];
          const card = targetHand[cardIdx];
          if (!card) continue;
          if (displayedHand[cardIdx] === card) continue;

          events.push({
            type: 'deal_hole_card',
            stage: 'dealing',
            delay: events.length === 0 ? 0 : POKER_TIMING.dealStagger,
            playerId: tp?.['playerId'] as number,
            seatIndex: seatIdx,
            cardIndex: cardIdx,
            card,
          });
        }
      }
    }

    // Community cards: flop (3), turn (1), river (1).
    if (
      (targetPhase === 'flop' || targetPhase === 'turn' || targetPhase === 'river') &&
      displayedPhase !== targetPhase
    ) {
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

      for (const idx of communityIndexMap[targetPhase as keyof typeof communityIndexMap] ?? []) {
        const card = targetCommunity[idx];
        if (!card) continue;
        if (displayedCommunity[idx] === card) continue;

        events.push({
          type: 'deal_community_card',
          stage: targetPhase,
          delay: events.length === 0 ? 0 : POKER_TIMING.communityStagger,
          cardIndex: idx,
          card,
        });
      }
    }

    // Showdown: reveal all hole cards.
    if (targetPhase === 'showdown' && displayedPhase !== 'showdown') {
      events.push({ type: 'reveal_opponent_cards', stage: 'showdown', delay: 0 });
      events.push({ type: 'settle', stage: 'settling', delay: POKER_TIMING.settlePause });
    }

    return events;
  }
}
```

- [ ] **Step 2: Run a quick TypeScript check**

Run:

```bash
npx tsc --noEmit -p src/frontend/tsconfig.app.json
```

Expected: no type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/app/features/poker/poker-stage-manager.ts
git commit -m "feat(poker): add PokerStageManager for staged animations"
```

---

## Task 3: Wire `PokerStageManager` into the `Poker` component

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker.ts`
- Modify: `src/frontend/src/app/features/poker/poker.html`
- Modify: `src/frontend/src/app/features/poker/poker.css`

- [ ] **Step 1: Replace direct `stateBlob` consumption with stage manager in `poker.ts`**

Near the top of the class, add:

```ts
private stageManager = new PokerStageManager({
  reducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

readonly stateBlob = this.stageManager.displayedStateBlob;
readonly isAnimating = this.stageManager.isAnimating;
readonly stage = this.stageManager.stage;
readonly enteringCardIds = this.stageManager.enteringCardIds;
```

Remove the existing line:

```ts
readonly stateBlob = this.ws.stateBlob;
```

- [ ] **Step 2: Feed authoritative state into the stage manager**

In the constructor, add an effect:

```ts
constructor() {
  effect(() => {
    this.stageManager.setTarget(this.ws.stateBlob());
  });

  // existing phase announcement effect below...
}
```

- [ ] **Step 3: Add stage message and entering-card helpers**

Add computed signals:

```ts
readonly stageMessage = computed(() => {
  switch (this.stage()) {
    case 'dealing': return 'Dealing hole cards…';
    case 'flop': return 'The Flop…';
    case 'turn': return 'The Turn…';
    case 'river': return 'The River…';
    case 'showdown': return 'Showdown!';
    case 'settling': return 'Settling…';
    default: return '';
  }
});

isEnteringHoleCard(playerId: number, cardIndex: number): boolean {
  return this.enteringCardIds().has(`hole-${playerId}-${cardIndex}`);
}

isEnteringCommunityCard(cardIndex: number): boolean {
  return this.enteringCardIds().has(`community-${cardIndex}`);
}
```

- [ ] **Step 4: Update `poker.html` bindings**

Find the community card rendering block and add the entering class conditionally. Example pattern:

```html
<div
  class="poker-community__card"
  [class.card-flip--entering]="isEnteringCommunityCard(i)"
>
  <img ... />
</div>
```

Similarly for hole cards in seats:

```html
<div
  class="poker-seat__card"
  [class.card-flip--entering]="isEnteringHoleCard(player.playerId, j)"
>
  <img ... />
</div>
```

Add a stage message element near the table center:

```html
@if (stageMessage()) {
  <div class="poker-stage-message">{{ stageMessage() }}</div>
}
```

- [ ] **Step 5: Add CSS for entering animations and reduced motion**

In `poker.css`, add:

```css
.card-flip--entering {
  animation: card-deal-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.poker-stage-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-weight: 700;
  pointer-events: none;
  z-index: 20;
}

@media (prefers-reduced-motion: reduce) {
  .card-flip--entering {
    animation: none;
  }
}
```

- [ ] **Step 6: Build and verify**

Run:

```bash
cd src/frontend && npx ng build --configuration production
```

Expected: production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/app/features/poker/poker.ts src/frontend/src/app/features/poker/poker.html src/frontend/src/app/features/poker/poker.css
git commit -m "feat(poker): wire PokerStageManager into component"
```

---

## Task 4: Add pending-action lock and remove dead UI signals

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker.ts`
- Modify: `src/frontend/src/app/features/poker/poker.html`

- [ ] **Step 1: Add pending-action state and helper**

In `poker.ts`, add:

```ts
private pendingAction = signal<string | null>(null);

private sendActionWithPending(type: string, data: Record<string, unknown> = {}): void {
  if (this.pendingAction()) return;
  this.pendingAction.set(type);
  this.ws.sendAction(type, data);
}
```

- [ ] **Step 2: Update action execution methods**

Replace `executeAction`, `executeRaise`, `onNewRound`, and `handlePlayAgain` with locked versions:

```ts
executeAction(action: ValidAction): void {
  const data: Record<string, unknown> = {};
  if (typeof action.amount === 'number') {
    data['amount'] = action.amount;
  }
  this.sendActionWithPending(action.type, data);
}

executeRaise(): void {
  const action = this.raiseAction();
  if (!action) return;
  const amount = this.raiseAmount();
  const min = action.minAmount ?? amount;
  const max = action.maxAmount ?? amount;
  const clamped = Math.max(min, Math.min(max, amount));
  this.sendActionWithPending('raise', { amount: clamped });
}

onNewRound(): void {
  this.sendActionWithPending('next_hand', {});
}

handlePlayAgain(): void {
  this.sendActionWithPending('next_hand', {});
}
```

- [ ] **Step 3: Update `canAction` to respect pending lock and animation**

Add or update:

```ts
canAction(type: string): boolean {
  return !this.isAnimating() && !this.pendingAction() && this.validActions().some((a) => a.type === type);
}
```

- [ ] **Step 4: Add effect to clear pending action**

In the constructor, add:

```ts
effect(() => {
  const pending = this.pendingAction();
  if (!pending) return;

  const stillValid = this.validActions().some((a) => a.type === pending);
  if (!stillValid) {
    this.pendingAction.set(null);
    return;
  }

  const timer = window.setTimeout(() => this.pendingAction.set(null), 10000);
  return () => clearTimeout(timer);
});
```

- [ ] **Step 5: Remove dead signals**

Remove:

```ts
readonly gameStarted = signal(false);
readonly isLoading = signal(false);
```

Also remove any template references to `gameStarted()` or `isLoading()`.

- [ ] **Step 6: Build and verify**

Run:

```bash
cd src/frontend && npx ng build --configuration production
```

Expected: production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/app/features/poker/poker.ts src/frontend/src/app/features/poker/poker.html
git commit -m "feat(poker): add pending-action lock and remove dead signals"
```

---

## Task 5: Add unit tests for `PokerStageManager`

**Files:**
- Create: `src/test/poker-stage-manager.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/test/poker-stage-manager.test.ts`:

```ts
import { PokerStageManager, POKER_TIMING } from '../frontend/src/app/features/poker/poker-stage-manager';

jest.useFakeTimers();

function makePlayer(id: number, hand: string[]): Record<string, unknown> {
  return {
    playerId: id,
    username: `Player ${id}`,
    stack: 1000,
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    hand,
  };
}

function makeBlob(phase: string, players: Record<string, unknown>[], communityCards: string[] = []): Record<string, unknown> {
  return {
    phase,
    players,
    communityCards,
    pot: 0,
    currentBet: 20,
  };
}

describe('PokerStageManager', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('deals hole cards one at a time', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(makeBlob('preflop', [
      makePlayer(1, ['Ah', 'Kd']),
      makePlayer(2, ['back', 'back']),
    ]));

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('dealing');

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    const players = (mgr.displayedStateBlob()?.['players'] as any[]) ?? [];
    expect(players[0]?.hand).toEqual(['Ah']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger * 2);
    expect(players[1]?.hand).toEqual(['back']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger * 4);
    expect(mgr.isAnimating()).toBe(false);
  });

  it('deals the flop three cards staggered', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(makeBlob('preflop', [
      makePlayer(1, ['Ah', 'Kd']),
      makePlayer(2, ['back', 'back']),
    ]));
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(makeBlob('flop', [
      makePlayer(1, ['Ah', 'Kd']),
      makePlayer(2, ['back', 'back']),
    ], ['3c', '7h', 'Qs']));

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('flop');

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c']);

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c', '7h']);

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c', '7h', 'Qs']);
  });

  it('snaps to target on reconnect (phase skip)', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(makeBlob('waiting', [], []));
    jest.advanceTimersByTime(100);

    mgr.setTarget(makeBlob('river', [
      makePlayer(1, ['Ah', 'Kd']),
      makePlayer(2, ['back', 'back']),
    ], ['3c', '7h', 'Qs', '2d']));

    expect(mgr.isAnimating()).toBe(false);
    expect((mgr.displayedStateBlob()?.['communityCards'] as string[]).length).toBe(4);
  });
});
```

- [ ] **Step 2: Run the tests**

Run:

```bash
npm test -- src/test/poker-stage-manager.test.ts --silent
```

Expected: tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/test/poker-stage-manager.test.ts
git commit -m "test(poker): add PokerStageManager unit tests"
```

---

## Task 6: Full verification and final commit

- [ ] **Step 1: Run the full test suite**

```bash
npm test --silent
```

Expected: all tests pass (current baseline is 775).

- [ ] **Step 2: Run backend and frontend builds**

```bash
npm run build
cd src/frontend && npx ng build --configuration production
```

Expected: both builds succeed.

- [ ] **Step 3: Final summary commit (if multiple commits are not already done)**

If following the per-task commits above, no additional commit is required. Otherwise:

```bash
git add -A
git commit -m "feat(poker): overhaul animations, multiplayer sync, and UX

- Add PokerStageManager for staged hole-card, flop/turn/river, and showdown animations
- Wire stage manager into Poker component with reduced-motion support
- Add pending-action lock to prevent double action submission
- Remove dead isLoading/gameStarted signals
- Fix MiniGameSession recording for poker showdowns"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Staged animations → Task 2 + Task 3
   - Reduced motion → Task 2 (constructor option) + Task 3 (CSS media query)
   - Pending-action lock → Task 4
   - Multiplayer sync → inherits existing WebSocketService fix from Blackjack overhaul
   - MiniGameSession bug → Task 1
   - Tests → Task 5

2. **Placeholder scan:** All steps include concrete code, file paths, and commands. No "TBD"/"implement later".

3. **Type consistency:** `PokerStageManager` event types and method names are consistent across tasks.

4. **Known gaps not in scope:** Chip-stack movement animations and winner pot-delivery animations are not included; they can be added in a follow-up. The goal is parity with the Blackjack overhaul, which did not include chip animations either.
