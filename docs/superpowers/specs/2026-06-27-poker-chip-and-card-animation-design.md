# Poker Chip & Card Animation Overhaul — Design Spec

> **Goal:** Bring Poker's visual polish and motion up to Blackjack's level: real chip stacks, animated chip flights (bet → pot → winner), and card deal/reveal animations that feel smooth and intentional.

---

## 1. Current State

- Poker has a working `PokerStageManager` that stages hole-card, flop/turn/river, and showdown events.
- Cards currently render with a static `card-deal-in` animation on the `.card-flip` wrapper, which makes every card animate on every render and can look jittery or invisible depending on timing.
- Bets and pot are shown as text with a coal icon (`<img class="coal-icon">`). There are no physical chip visuals.
- There is no animation when a player bets, when chips move into the pot, or when the pot is awarded to a winner.

## 2. Desired End State

Poker should feel as tactile as Blackjack:

1. **Card animations** — cards visibly deal in, community cards spread out one-by-one, and opponent hole cards flip over at showdown.
2. **Chip visuals** — every bet and the main pot are represented by stacks of colored chips instead of text + coal icon.
3. **Chip motion** —
   - Chips pop in when a bet is placed or increased.
   - Chips fly from betting seats into the center pot when a betting round ends.
   - Chips fly from the pot to winning seats at showdown.
4. **Reduced motion** — all flights and bounces respect `prefers-reduced-motion: reduce` and snap instantly.

## 3. Architecture

The existing `PokerStageManager` is extended to emit chip-specific events in addition to card events. The `Poker` component consumes those events and renders transient "flying chip" elements with CSS animations, while persistent seat/pot chip stacks render from normal state.

### 3.1 Stage manager events

New event types added to `PokerStageEvent`:

```ts
| 'place_chips'      // chips appear at a seat
| 'move_chips_to_pot' // chips fly from seats to the pot
| 'payout_chips'     // chips fly from pot to winning seats
```

Event payload fields:

```ts
{
  playerId?: number;   // seat source/target
  amount: number;      // chip value represented
  source: 'seat' | 'pot';
  target: 'seat' | 'pot';
}
```

### 3.2 When events fire

- **`place_chips`** — whenever a seat's `currentBet` increases within the same phase (e.g. a player calls or raises). Fires immediately after the player action is reflected in the displayed state.
- **`move_chips_to_pot`** — when the phase advances from one street to the next (`preflop → flop`, `flop → turn`, `turn → river`) and non-zero bets exist. One event per betting seat.
- **`payout_chips`** — at `showdown`, after opponent cards are revealed. One event per winning seat, with amount equal to the winner's payout.

### 3.3 Rendering layers

Three visual layers in the template:

1. **Persistent chip stacks** — rendered for each seat's `currentBet` and for the pot. These use a `chipStack(amount)` helper (same concept as Blackjack).
2. **Flying chips layer** — absolutely positioned over the table. Stage-manager chip events spawn temporary chip elements that animate from source coordinates to target coordinates, then are removed.
3. **Cards layer** — unchanged spatially, but animation classes are tied to `enteringCardIds()` and a new `revealingCardIds()` set so animations only run when cards actually enter or flip.

## 4. Card Animation Details

### 4.1 Fix the deal-in animation

- Remove the unconditional `animation: card-deal-in` from `.card-flip`.
- Apply `card-flip--entering` only when the card's id is in `enteringCardIds()`.
- Ensure the `@keyframes card-deal-in` starts off-table/scale 0 and lands at natural size, similar to Blackjack.

### 4.2 Reveal animation at showdown

- Add a `revealingCardIds` set to the stage manager.
- When `reveal_opponent_cards` fires, populate `revealingCardIds` with all opponent card ids.
- Apply a `card-flip--revealing` class that triggers the existing 3D flip (rotate Y 180°) plus a subtle pop-in.
- Clear the set after the flip duration.

### 4.3 Timing

- `POKER_TIMING.dealStagger` and `POKER_TIMING.communityStagger` may be increased slightly (e.g. 400–450 ms) if playtesting still feels rushed.
- Flip/reveal duration: 500 ms.

## 5. Chip Visual Details

### 5.1 Chip stack helper

Port Blackjack's `chipStack(amount)` helper to Poker:

```ts
chipStack(amount: number): string[] {
  if (amount <= 0) return [];
  const colors = ['chip--red', 'chip--blue', 'chip--green', 'chip--black', 'chip--gold'];
  const count = Math.min(8, Math.max(1, Math.ceil(amount / 25)));
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}
```

### 5.2 CSS chip classes

Reuse Blackjack's chip palette and styling:

```css
.poker-chip {
  position: absolute;
  bottom: calc(var(--chip-index, 0) * 5px);
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px dashed rgba(255,255,255,0.7);
  box-shadow: 0 2px 5px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.25);
}

.chip--red   { background: radial-gradient(circle at 30% 30%, #ef5350, #b71c1c); }
.chip--blue  { background: radial-gradient(circle at 30% 30%, #42a5f5, #0d47a1); }
.chip--green { background: radial-gradient(circle at 30% 30%, #66bb6a, #1b5e20); }
.chip--black { background: radial-gradient(circle at 30% 30%, #757575, #212121); }
.chip--gold  { background: radial-gradient(circle at 30% 30%, #ffd54f, #c8881a); }
```

### 5.3 Seat bet chips

- Render a chip stack between the seat chip and the hole cards.
- Show the numeric bet amount below or beside the stack.
- When `place_chips` fires, temporarily overlay a flying chip that scales up from the seat.

### 5.4 Pot chips

- Replace the center pot's coal icon with a chip stack.
- Scale the stack height with pot size (capped at ~12 chips).
- When `move_chips_to_pot` events arrive, flying chips land on this stack.

## 6. Chip Flight Animations

### 6.1 Coordinate system

- Flying chips use `position: fixed` or table-percent coordinates so they can move between seat positions and the pot.
- Source/target coordinates are derived from the seat's `SEAT_POSITIONS` percentages and the pot's center position.

### 6.2 Place animation

```css
@keyframes chip-place {
  0%   { transform: translateX(-50%) translateY(-30px) scale(0.6); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
}
```

### 6.3 Flight animation

```css
@keyframes chip-fly-to-pot {
  0%   { transform: translate(var(--start-x), var(--start-y)) scale(1); opacity: 1; }
  100% { transform: translate(var(--end-x), var(--end-y)) scale(0.85); opacity: 0.9; }
}

@keyframes chip-fly-to-seat {
  0%   { transform: translate(var(--start-x), var(--start-y)) scale(0.85); opacity: 0.9; }
  100% { transform: translate(var(--end-x), var(--end-y)) scale(1); opacity: 1; }
}
```

Duration: 600 ms with `cubic-bezier(0.22, 1, 0.36, 1)`.

### 6.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .poker-chip,
  .card-flip--entering,
  .card-flip--revealing,
  .chip-flying {
    animation: none !important;
    transition: none !important;
  }
}
```

## 7. Component Changes

### 7.1 `poker-stage-manager.ts`

- Add `revealingCardIds` signal.
- Track previous phase and previous bets to detect bet increases and phase transitions.
- Emit chip events:
  - After `deal_hole_card` / `deal_community_card` events, compare old vs new bets and emit `place_chips` for increases.
  - When advancing phase, emit `move_chips_to_pot` for each seat with `currentBet > 0`.
  - At showdown, after reveal, emit `payout_chips` for each winner.
- Clear `revealingCardIds` after flip duration.

### 7.2 `poker.ts`

- Add `chipStack(amount)` helper.
- Add `revealingCardIds()` and `isRevealingCard(...)` helpers.
- Maintain a `flyingChips` signal array for transient chip elements with source/target/amount/timer metadata.
- Add effects to spawn/clean flying chips when stage-manager chip events fire.

### 7.3 `poker.html`

- Replace coal icon bet/pot displays with chip stacks.
- Add a flying-chips container overlaying the table.
- Update card class bindings to use both `enteringCardIds` and `revealingCardIds`.

### 7.4 `poker.css`

- Add chip styles and flight keyframes.
- Remove unconditional `card-deal-in` from `.card-flip`.
- Add `card-flip--revealing` flip animation.

## 8. Testing

- Extend `src/test/poker-stage-manager.test.ts` with:
  - `place_chips` emitted when a bet increases.
  - `move_chips_to_pot` emitted on phase advance.
  - `payout_chips` emitted at showdown.
  - `revealingCardIds` populated at showdown.
- Add a visual smoke test: build succeeds and no runtime errors in the component.

## 9. Out of Scope

- Sound effects.
- Avatar/profile flair animations.
- Advanced 3D chip physics (stack tipping, scattering).
- Mobile-specific layout redesign.

## 10. Success Criteria

- [ ] Card deal and reveal animations are clearly visible and smooth.
- [ ] Bets and pot are shown as colored chip stacks, not coal icons.
- [ ] Chips visibly move from seats to pot when a betting round ends.
- [ ] Chips visibly move from pot to winning seats at showdown.
- [ ] `prefers-reduced-motion: reduce` disables all motion.
- [ ] All 783+ tests still pass; builds remain clean.
