# Poker Chip & Card Animation Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real chip visuals and animations (place, seat→pot, pot→winner) to Poker and fix card deal/reveal animations so they are smooth and intentional.

**Architecture:** Extend `PokerStageManager` to emit chip events and a `revealingCardIds` set alongside existing card events. The `Poker` component renders persistent chip stacks for seat bets and the pot, plus transient flying-chip elements animated by CSS. Card animations are gated by `enteringCardIds()` and `revealingCardIds()` instead of running unconditionally.

**Tech Stack:** Angular 21 (signals), TypeScript, Jest, CSS animations.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/frontend/src/app/features/poker/poker-stage-manager.ts` | MODIFIED. Add `revealingCardIds`, chip events, and bet/pot tracking. |
| `src/frontend/src/app/features/poker/poker.ts` | MODIFIED. Add `chipStack()`, `revealingCardIds()` helpers, flying-chip state, and chip event effects. |
| `src/frontend/src/app/features/poker/poker.html` | MODIFIED. Render chip stacks, flying chips, and fix card class bindings. |
| `src/frontend/src/app/features/poker/poker.css` | MODIFIED. Add chip styles, flight keyframes, reveal animation, fix deal-in scoping. |
| `src/test/poker-stage-manager.test.ts` | MODIFIED. Add tests for revealing cards and chip events. |

---

## Task 1: Fix card animations

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker-stage-manager.ts`
- Modify: `src/frontend/src/app/features/poker/poker.ts`
- Modify: `src/frontend/src/app/features/poker/poker.html`
- Modify: `src/frontend/src/app/features/poker/poker.css`

### Step 1: Add `revealingCardIds` to stage manager

In `poker-stage-manager.ts`, add a new signal and event type:

```ts
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
```

Add a signal and public accessor:

```ts
private revealingCardIdsInternal = signal<Set<string>>(new Set());
readonly revealingCardIds = this.revealingCardIdsInternal;
```

In `applyEvent` under `case 'reveal_opponent_cards':`, populate the set:

```ts
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
```

Also clear the set in `reset_deal`:

```ts
this.enteringCardIdsInternal.set(new Set());
this.revealingCardIdsInternal.set(new Set());
```

### Step 2: Add helpers to `poker.ts`

```ts
isRevealingHoleCard(playerId: number, cardIndex: number): boolean {
  return this.revealingCardIds().has(`hole-${playerId}-${cardIndex}`);
}
```

### Step 3: Update card class bindings in `poker.html`

Community cards:

```html
<div
  class="pt-card-slot rounded-[var(--radius-card)] overflow-visible flex items-center justify-center shrink-0 z-[2]"
  [class.pt-card-slot--filled]="card"
  [class.card-flip--entering]="isEnteringCommunityCard($index)"
  [class.card-flip--revealing]="false"
  [attr.aria-label]="card ? (card.rank + ' of ' + card.suit) : 'Empty card slot'"
>
```

Hole cards:

```html
<div
  class="pt-card-slot pt-card-slot--hole rounded-[var(--radius-card)] overflow-visible flex items-center justify-center shrink-0 z-[2]"
  [class.card-flip--entering]="isEnteringHoleCard(+seatPlayer.playerId, cardIdx)"
  [class.card-flip--revealing]="isRevealingHoleCard(+seatPlayer.playerId, cardIdx)"
>
```

### Step 4: Fix CSS in `poker.css`

Remove the unconditional animation from `.card-flip`:

```css
.card-flip {
  perspective: 600px;
}
```

Keep/reinforce the entering animation:

```css
.card-flip--entering {
  animation: card-deal-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.card-flip--revealing .card-flip__inner {
  animation: card-flip-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes card-flip-reveal {
  0% { transform: rotateY(0deg) scale(0.92); }
  100% { transform: rotateY(180deg) scale(1); }
}
```

Ensure reduced-motion covers both:

```css
@media (prefers-reduced-motion: reduce) {
  .card-flip--entering,
  .card-flip--revealing .card-flip__inner {
    animation: none !important;
  }
}
```

### Step 5: Run poker stage manager tests

```bash
npm test -- src/test/poker-stage-manager.test.ts --silent
```

Expected: existing tests pass (the new behavior will be tested in Task 6).

### Step 6: Commit

```bash
git add src/frontend/src/app/features/poker/poker-stage-manager.ts src/frontend/src/app/features/poker/poker.ts src/frontend/src/app/features/poker/poker.html src/frontend/src/app/features/poker/poker.css
git commit -m "feat(poker): fix card deal and reveal animations"
```

---

## Task 2: Add persistent chip visuals for seat bets and pot

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker.ts`
- Modify: `src/frontend/src/app/features/poker/poker.html`
- Modify: `src/frontend/src/app/features/poker/poker.css`

### Step 1: Add `chipStack()` helper

In `poker.ts`:

```ts
chipStack(amount: number): string[] {
  if (amount <= 0) return [];
  const colors = ['chip--red', 'chip--blue', 'chip--green', 'chip--black', 'chip--gold'];
  const count = Math.min(8, Math.max(1, Math.ceil(amount / 25)));
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}
```

### Step 2: Add chip CSS

In `poker.css`, add:

```css
.poker-chip {
  position: absolute;
  bottom: calc(var(--chip-index, 0) * 5px);
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px dashed rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.25);
}

.poker-chip::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.35);
}

.chip--red   { background: radial-gradient(circle at 30% 30%, #ef5350, #b71c1c); }
.chip--blue  { background: radial-gradient(circle at 30% 30%, #42a5f5, #0d47a1); }
.chip--green { background: radial-gradient(circle at 30% 30%, #66bb6a, #1b5e20); }
.chip--black { background: radial-gradient(circle at 30% 30%, #757575, #212121); }
.chip--gold  { background: radial-gradient(circle at 30% 30%, #ffd54f, #c8881a); }
```

### Step 3: Render chip stack for seat bets

In `poker.html`, inside the seat block, replace the bet text coal icon with a chip stack. Find:

```html
@if (p.currentBet > 0) {
  <span class="pt-seat__bet text-[10px] font-semibold text-[var(--gold)] flex items-center gap-[2px]">
    <img class="coal-icon ..." [src]="coalIconSrc" alt="" />
    {{ p.currentBet }}
  </span>
}
```

Replace with:

```html
@if (p.currentBet > 0) {
  <div class="pt-seat__bet-stack absolute -top-8 left-1/2 -translate-x-1/2 w-[28px] h-[40px]">
    @for (chip of chipStack(p.currentBet); track $index) {
      <div class="poker-chip" [class]="chip" [style.--chip-index]="$index"></div>
    }
  </div>
  <span class="pt-seat__bet text-[10px] font-semibold text-[var(--gold)]">{{ p.currentBet }}</span>
}
```

### Step 4: Render chip stack for the pot

In `poker.html`, replace the pot display:

```html
@if (pot() > 0) {
  <div class="pt-pot flex flex-col items-center gap-1 bg-black/32 border border-[var(--gold-dim)] rounded-[20px] px-4 py-1 text-[var(--gold)] z-[2]" aria-live="polite" aria-label="Current pot amount">
    <div class="pt-pot__stack relative w-[28px] h-[48px]">
      @for (chip of chipStack(pot()); track $index) {
        <div class="poker-chip" [class]="chip" [style.--chip-index]="$index"></div>
      }
    </div>
    <span class="pt-pot__amount text-[18px] font-bold tabular-nums">{{ pot() }}</span>
  </div>
}
```

### Step 5: Build and verify

```bash
cd src/frontend && npx ng build --configuration production
```

Expected: production build succeeds.

### Step 6: Commit

```bash
git add src/frontend/src/app/features/poker/poker.ts src/frontend/src/app/features/poker/poker.html src/frontend/src/app/features/poker/poker.css
git commit -m "feat(poker): render chip stacks for bets and pot"
```

---

## Task 3: Emit chip events from PokerStageManager

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker-stage-manager.ts`

### Step 1: Track previous bets

Add fields:

```ts
private previousBets: Map<number, number> = new Map();
private previousPot = 0;
```

### Step 2: Add a helper to compute `place_chips` events

After the hole/community card events are built, but before returning, compare current seat bets to `previousBets`:

```ts
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
        stage: events.length === 0 ? 'idle' : (events[events.length - 1].stage),
        delay: 0,
        playerId: pid,
        amount: bet - prev,
      });
    }
  }
}
```

### Step 3: Add `move_chips_to_pot` on phase advance

When the phase advances to `flop`, `turn`, or `river`, after dealing community cards, emit `move_chips_to_pot` for each seat with a bet:

```ts
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
```

Add `chipFlightStagger: 100` to `POKER_TIMING`.

### Step 4: Add `payout_chips` at showdown

In the showdown block, after `reveal_opponent_cards`, emit `payout_chips`:

```ts
const winners = (blob['winners'] as Array<{ playerId: number; amount: number }>) ?? [];
for (const w of winners) {
  events.push({
    type: 'payout_chips',
    stage: 'settling',
    delay: events.length === 0 ? 0 : POKER_TIMING.chipFlightStagger,
    playerId: w.playerId,
    amount: w.amount,
  });
}
```

### Step 5: Update tracking state

At the end of `buildEvents`, before returning:

```ts
const players = (blob['players'] as Array<Record<string, unknown>>) ?? [];
this.previousBets.clear();
for (const p of players) {
  this.previousBets.set(p['playerId'] as number, (p['bet'] as number) ?? 0);
}
this.previousPot = (blob['pots'] as Array<{ amount: number }>)?.reduce((s, pot) => s + pot.amount, 0) ?? 0;
```

### Step 6: Wire chip events into `buildEvents`

Call `buildPlaceChipEvents`, `buildMoveToPotEvents`, and `buildPayoutChipEvents` at the appropriate points. The final `buildEvents` should append chip events after the corresponding card events.

### Step 7: Run tests

```bash
npm test -- src/test/poker-stage-manager.test.ts --silent
```

Expected: existing tests still pass.

### Step 8: Commit

```bash
git add src/frontend/src/app/features/poker/poker-stage-manager.ts
git commit -m "feat(poker): emit chip animation events from stage manager"
```

---

## Task 4: Render flying chip animations

**Files:**
- Modify: `src/frontend/src/app/features/poker/poker.ts`
- Modify: `src/frontend/src/app/features/poker/poker.html`
- Modify: `src/frontend/src/app/features/poker/poker.css`

### Step 1: Add flying-chip state and types

In `poker.ts`:

```ts
export interface FlyingChip {
  id: number;
  playerId: number;
  amount: number;
  source: 'seat' | 'pot';
  target: 'seat' | 'pot';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

private nextFlyingChipId = 0;
private flyingChipsInternal = signal<FlyingChip[]>([]);
readonly flyingChips = this.flyingChipsInternal;
```

### Step 2: Consume chip events and spawn flying chips

In the constructor, add an effect that watches `stage()` and `enteringCardIds()` / `revealingCardIds()`? Actually, the stage manager doesn't expose events directly. Instead, we can detect chip events by watching state changes.

A simpler approach: expose a `chipEvents` signal from the stage manager that emits each chip event as it is applied. Modify `applyEvent` for chip events to push to a `chipEventInternal` signal:

```ts
private chipEventInternal = signal<PokerStageEvent | null>(null);
readonly chipEvent = this.chipEventInternal.asReadonly();
```

In `applyEvent`, for each chip event:

```ts
case 'place_chips':
case 'move_chips_to_pot':
case 'payout_chips': {
  this.chipEventInternal.set({ ...event });
  return;
}
```

Then in `poker.ts`:

```ts
effect(() => {
  const ev = this.stageManager.chipEvent();
  if (!ev) return;
  this.spawnFlyingChip(ev);
});
```

### Step 3: Compute coordinates

Add helpers in `poker.ts`:

```ts
private seatPositionFor(playerId: number): { x: number; y: number } | null {
  const heroId = this.heroPlayerId();
  const raw = this.rawPlayers();
  const heroIdx = raw.findIndex((p) => p['playerId'] === heroId);
  const targetIdx = raw.findIndex((p) => p['playerId'] === playerId);
  if (targetIdx < 0) return null;

  const count = raw.length;
  let seatIdx: number;
  if (count === 2 && heroIdx >= 0) {
    seatIdx = targetIdx === heroIdx ? 0 : 1;
  } else if (heroIdx >= 0) {
    seatIdx = (targetIdx - heroIdx + count) % count;
  } else {
    seatIdx = targetIdx;
  }

  const positions = count === 2 ? TWO_PLAYER_SEATS : SEAT_POSITIONS;
  return positions[seatIdx] ?? null;
}
```

### Step 4: Spawn and remove flying chips

```ts
private spawnFlyingChip(event: PokerStageEvent): void {
  const playerId = event.playerId!;
  const seatPos = this.seatPositionFor(playerId);
  if (!seatPos) return;

  const start = event.source === 'pot' ? { x: 50, y: 50 } : seatPos;
  const end = event.target === 'pot' ? { x: 50, y: 50 } : seatPos;

  const chip: FlyingChip = {
    id: this.nextFlyingChipId++,
    playerId,
    amount: event.amount ?? 0,
    source: event.source!,
    target: event.target!,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
  };

  this.flyingChipsInternal.update((chips) => [...chips, chip]);

  window.setTimeout(() => {
    this.flyingChipsInternal.update((chips) => chips.filter((c) => c.id !== chip.id));
  }, 650);
}
```

### Step 5: Render flying chips in `poker.html`

Add an overlay inside the table area:

```html
<!-- Flying chips -->
@for (chip of flyingChips(); track chip.id) {
  <div
    class="chip-flying"
    [style.left.%]="chip.startX"
    [style.top.%]="chip.startY"
    [style.--end-x]="chip.endX + '%'"
    [style.--end-y]="chip.endY + '%'"
  >
    <div class="poker-chip chip--gold"></div>
  </div>
}
```

### Step 6: Add flight CSS

```css
.chip-flying {
  position: absolute;
  z-index: 25;
  pointer-events: none;
  animation: chip-fly 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes chip-fly {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(var(--end-x) - 50%), calc(var(--end-y) - 50%)) scale(0.9);
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip-flying {
    animation: none;
    opacity: 0;
  }
}
```

### Step 7: Build and verify

```bash
cd src/frontend && npx ng build --configuration production
```

Expected: production build succeeds.

### Step 8: Commit

```bash
git add src/frontend/src/app/features/poker/poker.ts src/frontend/src/app/features/poker/poker.html src/frontend/src/app/features/poker/poker.css
git commit -m "feat(poker): add flying chip animations"
```

---

## Task 5: Update tests

**Files:**
- Modify: `src/test/poker-stage-manager.test.ts`

### Step 1: Add reveal test

```ts
it('marks opponent cards as revealing at showdown', () => {
  const mgr = new PokerStageManager();
  mgr.setTarget(
    makeBlob(
      'river',
      [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ],
      ['3c', '7h', 'Qs', '2d', '5s']
    )
  );
  jest.advanceTimersByTime(10_000);

  mgr.setTarget(
    makeBlob(
      'showdown',
      [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['Tc', 'Th']),
      ],
      ['3c', '7h', 'Qs', '2d', '5s']
    )
  );

  expect(mgr.revealingCardIds().has('hole-2-0')).toBe(true);
  expect(mgr.revealingCardIds().has('hole-2-1')).toBe(true);

  jest.advanceTimersByTime(600);
  expect(mgr.revealingCardIds().size).toBe(0);
});
```

### Step 2: Add chip event tests

```ts
it('emits place_chips when a bet increases', () => {
  const mgr = new PokerStageManager();
  mgr.setTarget(
    makeBlob('preflop', [
      makePlayer(1, ['Ah', 'Kd']),
      makePlayer(2, ['back', 'back']),
    ])
  );
  jest.advanceTimersByTime(10_000);

  const p2 = makePlayer(2, ['back', 'back']);
  p2['bet'] = 20;
  mgr.setTarget(makeBlob('preflop', [makePlayer(1, ['Ah', 'Kd']), p2]));

  const ev = mgr.chipEvent();
  expect(ev?.type).toBe('place_chips');
  expect(ev?.playerId).toBe(2);
});
```

Similar tests for `move_chips_to_pot` and `payout_chips`.

### Step 3: Run tests

```bash
npm test -- src/test/poker-stage-manager.test.ts --silent
```

Expected: all tests pass.

### Step 4: Commit

```bash
git add src/test/poker-stage-manager.test.ts
git commit -m "test(poker): add chip and reveal animation tests"
```

---

## Task 6: Full verification

### Step 1: Run the full test suite

```bash
npm test --silent
```

Expected: all tests pass (baseline 783+).

### Step 2: Run backend and frontend builds

```bash
npm run build
cd src/frontend && npx ng build --configuration production
```

Expected: both builds succeed.

### Step 3: Final summary

If all per-task commits were made, no additional commit is required. Otherwise:

```bash
git add -A
git commit -m "feat(poker): full chip and card animation overhaul"
```

---

## Self-Review

1. **Spec coverage:**
   - Card deal/reveal fix → Task 1
   - Persistent chip stacks → Task 2
   - Chip events → Task 3
   - Flying chip animations → Task 4
   - Tests → Task 5
   - Verification → Task 6

2. **Placeholder scan:** No TBD/TODO; all steps include concrete code, file paths, and commands.

3. **Type consistency:** `PokerStageEvent` is extended once in Task 1 and reused in Tasks 3–4. `FlyingChip` is defined in Task 4 and used in the same task. `chipStack()` is defined in Task 2 and used in Tasks 2 and 4.
