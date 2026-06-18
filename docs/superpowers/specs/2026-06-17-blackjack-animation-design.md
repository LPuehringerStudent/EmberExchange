# Blackjack Game-Flow Animation Design

**Date:** 2026-06-17  
**Scope:** Frontend-only polish for the Blackjack game page. No backend or WebSocket protocol changes.

## Summary

The Blackjack server still resolves each round in one atomic update and sends the final `state_update` to every client. This design introduces a frontend **stage manager** that receives that authoritative state and replays the card changes with deliberate timing, creating moments of tension: a staggered initial deal, a flipped hole card, the dealer drawing one card at a time, and a highlighted result reveal.

Players who reconnect, refresh, or inspect the network payload still see the final truth immediately. The animation is purely a visual presentation layer.

## Goals

- Make the initial deal feel like cards are actually being handed out.
- Make the dealer turn suspenseful by revealing/drawing cards one at a time instead of spawning the full hand.
- Add a short, satisfying result/payout highlight before the results overlay appears.
- Keep the implementation isolated to the frontend Blackjack feature.
- Respect `prefers-reduced-motion` by snapping to the final state instantly.

## Non-Goals

- No changes to `src/backend/game-engines/blackjack-engine.ts` or WebSocket message types.
- No sound effects (the design leaves hooks for them, but they are out of scope).
- No artificial network delays or throttling.
- No animated card movement across the table (e.g., from a deck sprite to a seat); we use an in-place entrance/flip animation.

## Architecture

```
WebSocketService.stateBlob (authoritative)
           │
           ▼
BlackjackStageManager
  - targetStateBlob    (what the server says RIGHT NOW)
  - displayedStateBlob (what the UI is currently showing)
  - isAnimating        (true while staged reveal is running)
  - stage              (idle | dealing | player-turn | dealer-turn | settling)
           │
           ▼
BlackjackComponent
  - renders from displayedStateBlob
  - disables actions while isAnimating is true
  - triggers announcement/overlay based on displayed state and stage
```

`BlackjackStageManager` is a plain injectable class (not a global service) created and owned by the Blackjack component. It owns no WebSocket knowledge beyond receiving the raw state blob.

## Data Flow

1. On every `state_update`, the component writes the new blob into `stageManager.setTarget(blob)`.
2. `StageManager` compares the new target to the currently displayed state and emits a list of animation events.
3. Events are processed through a small async queue with fixed delays. Each event mutates `displayedStateBlob` incrementally.
4. The component reads `displayedStateBlob` for all rendering: dealer hand, player hands, active states, result rows, etc.
5. While the queue is running, `isAnimating` is `true`. The component uses this to disable controls and show a message such as “Dealing…” or “Dealer is drawing…”.

## Animation Events

| Event | Trigger | Visual Effect |
|---|---|---|
| `deal_player_card` | A player hand gains a card that did not exist in the previous displayed state. | New card element enters with `card-deal-in` animation. |
| `deal_dealer_upcard` | Dealer hand length goes from 0 → 1. | First dealer card enters. |
| `deal_dealer_hole` | Dealer hand length goes from 1 → 2 and the second card is `back`. | Second dealer card enters face-down. |
| `reveal_hole_card` | Target phase becomes `dealer_turn` (or dealer hand index 1 changes from `back` to real). | The face-down hole card flips to face-up. |
| `dealer_draw` | Dealer hand length grows beyond 2 while target phase is `dealer_turn`. | New dealer card enters. |
| `player_draw` | A player hand length grows during `player_turn`. | New card enters for that hand. |
| `settle` | Target phase becomes `settled` / `showdown` and dealer hand is fully revealed. | Winning/losing hands highlight; chip stack animates; results overlay delayed until this event. |
| `jump` | The target state is more than one meaningful step ahead of the displayed state (reconnect, late join, split timing mismatch). | Snap displayed state to target instantly with no animation. |

## Timing Constants

All delays are centralized in one config object so they can be tuned in one place.

```ts
const ANIMATION_TIMING = {
  dealStagger: 350,      // ms between each initial-deal card
  holeFlip: 500,         // ms for the hole-card flip
  dealerDrawPause: 700,  // ms between dealer draws
  settlePause: 400,      // ms after dealer finishes before result reveal
};
```

If `prefers-reduced-motion` is active, all delays become `0` and `jump` is used for every transition.

## Card Identity & Diffing

The raw state stores cards as strings like `"Ah"` or `"back"`. To detect additions reliably, the stage manager builds stable IDs:

- Player cards: `${playerId}-${handIndex}-${index}-${cardString}`
- Dealer cards: `dealer-${index}-${cardString}`

Because the hole card changes from `"back"` to a real card, its ID changes. The manager treats that transition as a `reveal_hole_card` event rather than a remove+add.

## State Mapping

- `displayedStateBlob.phase` equals `targetStateBlob.phase`. This keeps the existing control logic (`isBetting`, `isPlaying`, etc.) working without rewrites.
- `displayedStateBlob.dealerHand` and `displayedStateBlob.players[].hands` are staged subsets of the target arrays.
- All other fields (`winners`, `validActions`, `activePlayer`, chip stacks) are copied from the target immediately.

Controls are disabled during animation via `stageManager.isAnimating()`, not by lagging the phase.

## Component Changes

### New files

- `src/frontend/src/app/features/blackjack/blackjack-stage-manager.ts`
  - Owns target/displayed signals, diffing, queue, and timing config.
  - Exposes `setTarget(blob)`, `displayedStateBlob`, `isAnimating`, `stage`.

### Modified files

- `src/frontend/src/app/features/blackjack/blackjack.ts`
  - Inject `BlackjackStageManager`.
  - Replace `stateBlob` reads with `stageManager.displayedStateBlob` for derived card state.
  - Pass `stageManager.isAnimating()` into `canAction`/button disabled states.
  - Use `stageManager.stage()` to drive the “Dealing…” / “Dealer is drawing…” messages.
  - Delay the results overlay until `phase === 'showdown' && !isAnimating()`.

- `src/frontend/src/app/features/blackjack/blackjack.html`
  - Render from displayed state.
  - Show animated stage messages while `isAnimating()`.
  - Keep the conditional front-face image for face-down cards.

- `src/frontend/src/app/features/blackjack/blackjack.css`
  - Add `.card-flip--entering` modifier for the deal-in animation.
  - Add hand highlight classes: `.bj-hand--win`, `.bj-hand--lose`, `.bj-hand--push`.
  - Add chip-payout animation keyframes.

## Edge Cases & Error Handling

- **Reconnect / late join:** If the target phase jumped ahead by more than one stage, `stageManager` snaps to the target immediately.
- **User action during animation:** Buttons are disabled while `isAnimating()` is true. Any in-flight `player_action` response that arrives mid-animation is queued as the next target.
- **Split:** A new hand is treated like a new player; its cards are dealt with the same stagger.
- **Double:** The single extra card is animated as a `player_draw` event.
- **Blackjack on deal:** If a hand is already blackjack after two cards, the result highlight still waits until the settle stage so it does not distract from the deal animation.
- **Reduced motion:** The queue runs with zero delay; `displayedStateBlob` becomes `targetStateBlob` on the next tick.

## Accessibility

- Honor `prefers-reduced-motion: reduce`.
- Keep `aria-live` announcements for phase changes; do not announce every card individually to avoid screen-reader chatter.
- Disable controls during animation with `aria-disabled` and a visible reason (the stage message).

## Testing

- Unit-test `BlackjackStageManager` with synthetic state blobs:
  - deal sequence,
  - dealer draw sequence,
  - hole-card reveal,
  - jump detection,
  - reduced-motion snap.
- Visually verify on a real Blackjack table that dealer cards appear one by one and the results overlay waits for the animation.

## Open Questions / Tuning

- Exact timing constants may need adjustment after play-testing; they are in one config object.
- Whether the initial deal should be “one card per player, repeat” or “each player gets both cards, then dealer” is left to implementation, with the ability to change the event ordering in the stage manager.
