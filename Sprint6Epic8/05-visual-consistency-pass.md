# Task 5: Visual Consistency Pass

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 2h  
**Type:** Frontend (Angular / CSS)

---

## Description

A polish sprint across the entire frontend. Add loading skeletons, unify empty states, smooth page transitions, and fix mobile layout issues. This makes the app feel professional rather than "student project."

---

## User Story

> As a user (and judge), I want the app to feel smooth and consistent everywhere, not just on the home page.

---

## Definition of Done

- [ ] **Loading skeletons:** Every page that fetches data on load shows a skeleton screen instead of a blank page or spinner.
  - `/marketplace`
  - `/inventory`
  - `/collections`
  - `/quests`
  - `/hall-of-glory/:username`
  - `/shop`
  - `/admin/*`
- [ ] **Consistent empty states:** Every list/grid has a designed empty state (illustration or icon + friendly text + CTA button if applicable).
  - Empty inventory → "No stoves yet. Open a lootbox!"
  - Empty marketplace → "No listings yet. Be the first to sell!"
  - Empty friends list → "No friends yet. Send a request!"
  - Empty quests → "All quests complete! Check back tomorrow."
- [ ] **Page transitions:** Route changes have a subtle fade-in (150–200ms). Use Angular route animations or a global wrapper.
- [ ] **Mobile breakpoint polish:** Test and fix at:
  - 375px (iPhone SE) — no horizontal scroll, tap targets ≥ 44px
  - 768px (iPad) — sidebars collapse correctly
  - 1440px (desktop) — no excessive whitespace, grids look balanced
- [ ] **No console warnings:** Clean up any `console.log`, `console.warn`, or Angular deprecation warnings.
- [ ] **Focus states:** All interactive elements have visible focus rings for keyboard navigation.

---

## Implementation Hints

### Skeleton Component

```typescript
// shared/components/skeleton/skeleton.component.ts
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="skeleton" [style.width]="width()" [style.height]="height()"></div>`,
  styles: [`
    .skeleton {
      background: linear-gradient(90deg, var(--surface-color) 25%, var(--border-color) 50%, var(--surface-color) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
      border-radius: 4px;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class SkeletonComponent {
  width = input<string>('100%');
  height = input<string>('16px');
}
```

### Route Fade Animation

```typescript
// app.config.ts or app.component.ts
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    // ...
  ]
};
```

```typescript
// route animation trigger
export const fadeInAnimation = trigger('routeAnimations', [
  transition('* <=> *', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ])
]);
```

### Empty State Pattern

```html
@if (items().length === 0 && !loading()) {
  <div class="empty-state">
    <img src="assets/empty-inventory.png" alt="" />
    <h3>No stoves yet</h3>
    <p>Open a lootbox to get your first stove.</p>
    <a routerLink="/lootboxes" class="btn-primary">Open Lootbox</a>
  </div>
}
```

---

## Acceptance Criteria

1. Throttle network to "Slow 3G" in DevTools → every major page shows skeletons, not blank white.
2. Create a fresh account → every empty list has a friendly message and a CTA.
3. Resize browser to 375px wide → no horizontal scrollbar on any page.
4. Press Tab through the home page → every button and link has a visible focus indicator.
5. Open browser console → zero warnings or errors on initial load.

---

## Notes

- This is a "death by a thousand cuts" task. Do 80% of the pages well rather than 100% poorly.
- Prioritize the pages judges are most likely to see: Landing, Home, Marketplace, Inventory, Games.
- Don't refactor component architecture — just polish what's there.
- If a page already looks good, skip it. Move on.
