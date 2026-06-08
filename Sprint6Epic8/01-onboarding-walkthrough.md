# Task 1: Optional Interactive Onboarding

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 2h  
**Type:** Frontend (Angular)

---

## Description

Build a dismissible, 3-step interactive walkthrough that appears once after a player's first login. The walkthrough should explain the core loop (Collect → Trade → Play) using highlighted overlays on real UI elements. Returning users can replay the tour from Settings.

---

## User Story

> As a first-time user, I want a brief guided tour so that I understand what to do without reading a manual.

---

## Definition of Done

- [ ] **Trigger logic:** Tour auto-plays on first login only. Flag stored in `PlayerSettings.hasCompletedOnboarding` (backend) with fallback to `localStorage`.
- [ ] **3 steps minimum:**
  1. **Collect** — Highlights the Lootbox/Inventory area. "Open lootboxes to collect rare stoves."
  2. **Trade** — Highlights Marketplace or Inventory sell button. "Sell or trade stoves to earn coins."
  3. **Play** — Highlights the Games card. "Play Poker, Blackjack, or Roulette to win big."
- [ ] **Dismissible at any time:** Visible "Skip Tour" button. Pressing Escape or clicking backdrop also dismisses.
- [ ] **Replayable:** Settings page has a "Replay Onboarding Tour" button.
- [ ] **Visual style:** Dark semi-transparent backdrop with a spotlight cutout around the highlighted element. Tooltip card uses existing theme variables.
- [ ] **Responsive:** Works on mobile (stacked layout) and desktop.
- [ ] **No external dependencies:** Implement with Angular components + CSS. No `driver.js` or `shepherd` unless the team already has them.

---

## Implementation Hints

### Suggested Component Structure

```
src/frontend/app/components/onboarding/
  onboarding.component.ts
  onboarding.component.html
  onboarding.component.scss
  onboarding.service.ts
```

### Step Data Model

```typescript
interface OnboardingStep {
  id: string;
  targetSelector: string;   // e.g., '[data-onboarding="lootboxes"]'
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}
```

### Backdrop Technique

Use a fixed `div` with `background: rgba(0,0,0,0.7)` and a CSS `box-shadow` or `clip-path` cutout around the target element. Calculate target position with `getBoundingClientRect()`.

### State Storage

```typescript
// Preferred: backend persistent flag
await playerSettingsService.update({ hasCompletedOnboarding: true });

// Fallback for unauthenticated / pre-settings load
localStorage.setItem('ember_onboarding_done', '1');
```

### Integration Points

- Add `data-onboarding="..."` attributes to:
  - Home dashboard lootbox card
  - Home dashboard marketplace card  
  - Home dashboard games card
- Inject `<app-onboarding *ngIf="showOnboarding()">` in `AppComponent` or `HomeComponent`.

---

## Acceptance Criteria

1. Fresh account logs in → onboarding appears within 1 second.
2. User clicks "Skip Tour" → onboarding disappears and does not reappear on next login.
3. User completes all 3 steps → same no-replay behavior.
4. User goes to Settings → clicks "Replay Onboarding Tour" → tour restarts.
5. Tour is readable and clickable on a 375px wide screen.

---

## Notes

- If the target element is not in the DOM (e.g., lazy-loaded route), skip that step gracefully.
- Keep animations under 300ms. Judges won't wait.
- Do not block the UI thread with complex calculations during the tour.
