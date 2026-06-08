# Task 3: "How It Works" Page

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 1h  
**Type:** Frontend (Angular)

---

## Description

Create a single beautiful page (`/how-it-works`) that explains EmberExchange's core loop using a visual infographic. This is the page you send non-gamers to when they ask "what is this site?"

---

## User Story

> As a visitor who has never played a collection/trading game, I want a single page that explains the whole concept in plain English so I can decide whether to sign up.

---

## Definition of Done

- [ ] **Route:** `/how-it-works` lazy-loaded, no auth required.
- [ ] **Accessible from:** landing page CTA ("How does it work?"), footer link, and optionally the login page.
- [ ] **Visual infographic:** A 3–4 step horizontal (desktop) / vertical (mobile) flow diagram:
  1. **Open Lootboxes** → get random stoves
  2. **Collect & Trade** → sell on marketplace or trade with friends
  3. **Upgrade** → forge better stoves or salvage for Sparks
  4. **Play & Earn** → bet coins in Poker, Blackjack, Roulette
- [ ] **Icons / illustrations:** Use existing stove sprites, coin icons, and card sprites. No new art needed.
- [ ] **Plain English copy:** Every step has a headline + 1 sentence description. No acronyms or unexplained jargon.
- [ ] **Responsive:** Looks good at 375px, 768px, and 1440px.
- [ ] **CTA at bottom:** "Ready to start? Register" button.

---

## Implementation Hints

### Suggested Component

```
src/frontend/app/pages/how-it-works/
  how-it-works.component.ts
  how-it-works.component.html
  how-it-works.component.scss
```

### Routing

```typescript
// app.routes.ts
{
  path: 'how-it-works',
  loadComponent: () => import('./pages/how-it-works/how-it-works.component').then(m => m.HowItWorksComponent)
}
```

### Page Structure

```html
<section class="hero">
  <h1>How EmberExchange Works</h1>
  <p>Collect rare digital stoves. Trade them. Play games. All in one place.</p>
</section>

<section class="steps">
  @for (step of steps; track step.id) {
    <div class="step-card">
      <img [src]="step.icon" [alt]="step.title" />
      <h3>{{ step.title }}</h3>
      <p>{{ step.description }}</p>
    </div>
  }
</section>

<section class="cta">
  <a routerLink="/register" class="btn-primary">Create Free Account</a>
</section>
```

### Step Data

```typescript
const STEPS = [
  {
    id: 1,
    title: 'Open Lootboxes',
    description: 'Spend coins to open lootboxes and receive random stoves. Each stove has a rarity — from Common to Legendary.',
    icon: 'assets/icons/lootbox.png'
  },
  {
    id: 2,
    title: 'Collect & Trade',
    description: 'Sell your stoves on the public marketplace or trade directly with friends via chat. Prices are set by players, not us.',
    icon: 'assets/icons/marketplace.png'
  },
  {
    id: 3,
    title: 'Upgrade Your Collection',
    description: 'Sacrifice 6 stoves of the same rarity in the Forge to create one even rarer stove. Salvage duplicates into Sparks.',
    icon: 'assets/icons/forge.png'
  },
  {
    id: 4,
    title: 'Play Mini-Games',
    description: 'Bet your coins in Poker, Blackjack, or European Roulette. Win big and buy even better lootboxes.',
    icon: 'assets/icons/cards.png'
  }
];
```

---

## Acceptance Criteria

1. Visiting `/how-it-works` while logged out shows the full page without redirecting to login.
2. Page explains the 4-step loop in under 30 seconds of scanning.
3. Every step has a visual icon or illustration.
4. Footer and landing page both link to this route.
5. Page passes Lighthouse accessibility audit (contrast, alt text, headings in order).

---

## Notes

- This page is your safety net during the award presentation. If a judge looks confused, open this page.
- Reuse the same warm color palette and typography as the rest of the app.
- Keep it lightweight — no API calls, no WebSockets, no heavy animations.
