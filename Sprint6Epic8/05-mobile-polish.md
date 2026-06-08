# Task 5: Mobile Responsiveness Polish

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 2.5h  
**Type:** Frontend (Angular / CSS)

---

## Description

Critical mobile responsiveness pass. The teacher and judges will likely view the site on their phones or resize the browser. Currently, most pages overflow horizontally on 375px screens or have broken layouts. This task focuses on making the core flows usable and polished on mobile.

---

## Guiding Principles

1. **No horizontal scroll at 375px.** Ever. This is the #1 sign of an unpolished site.
2. **Tap targets ≥ 44px.** Buttons, links, cards must be thumb-friendly.
3. **Stack, don't squeeze.** Multi-column layouts become single-column on mobile.
4. **Hide secondary content.** Sidebars, stat panels, and feeds can be hidden or collapsed behind toggles on mobile.
5. **Font sizes readable.** No text below 12px. Headlines scale down gracefully.

---

## Definition of Done

### P0 — Must Fix (Judges will see these)

- [ ] **Landing page (`/`)** — No horizontal scroll. Hero card fits within viewport. CTAs stack vertically. Feature preview cards become 1-column.
- [ ] **Home dashboard (`/home`)** — No horizontal scroll. Stat pills stack vertically. Feature cards grid becomes 1 or 2 columns. "Recent Pulls" sidebar is hidden or collapsible on mobile.
- [ ] **Login page** — Already works (verify it still does).
- [ ] **Register page** — Form fits within viewport. No overflow.
- [ ] **Top bar** — User dropdown, coin badges, and hamburger menu fit without overlapping.
- [ ] **Sidebar** — Already has overlay mode on mobile (verify it works).

### P1 — Should Fix (Judges might explore)

- [ ] **Inventory (`/inventory`)** — Grid becomes 1 or 2 columns. Stove cards don't overflow. Filter/sort controls stack.
- [ ] **Marketplace (`/marketplace`)** — Search bar + filters stack. Listing cards don't overflow.
- [ ] **Shop (`/shop`)** — Catalog grid becomes 1 or 2 columns. Daily reward calendar fits.
- [ ] **Settings (`/settings`)** — Sidebar tabs become a horizontal scrollable row or collapsible menu. Form fields fit.
- [ ] **Social (`/social`)** — Chat sidebar + conversation area stack or become tabbed.

### P2 — Nice to Have

- [ ] **Games lobby (`/games`)** — Room cards stack.
- [ ] **Hall of Glory (`/glory/:username`)** — Trophy case grid becomes 1 or 2 columns.
- [ ] **Quests (`/quests`)** — Quest cards stack.

---

## Implementation Strategy

### Step 1: Audit (15 min)
Open Chrome DevTools, set viewport to 375px × 667px (iPhone SE). Visit every route. Screenshot or note every page with horizontal scroll or broken layout.

### Step 2: Fix the Container (30 min)
Many overflow issues come from a missing or incorrect `max-width` / `overflow-x` on the root container. Ensure:
```css
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### Step 3: Fix Grids (45 min)
The home page uses `grid-cols-3` and `grid-cols-[1fr_360px]`. On mobile these should become:
```css
/* Home content grid */
@media (max-width: 1023px) {
  .home-grid { grid-template-columns: 1fr; }
  .recent-pulls-sidebar { display: none; } /* or collapsible */
}

/* Feature cards */
@media (max-width: 639px) {
  .feature-cards { grid-template-columns: 1fr; }
}
```

### Step 4: Fix the Top Bar (30 min)
The top bar has coin badges + username + notification bell + account dropdown. On mobile:
- Hide coin badges text (show only icons).
- Collapse username to first letter or hide entirely.
- Ensure hamburger menu is tap-friendly (44px).

### Step 5: Page-by-Page Pass (45 min)
Apply the same patterns:
- Grids → 1 column
- Side-by-side flex → column flex
- Tables → card stacks
- Wide tables → horizontal scroll container (only if unavoidable)

---

## Acceptance Criteria

1. Open every major page at 375px width → **zero horizontal scrollbars**.
2. Tap every primary button and link with a thumb → target feels natural.
3. Text is readable without zooming (minimum 12px body, 16px headlines).
4. Images scale down and don't overflow containers.
5. The site is demoable on a real phone without embarrassment.

---

## Notes

- **Do NOT rewrite components.** Use CSS media queries and Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adjust existing layouts.
- **Test on a real phone if possible.** DevTools is good, but real devices catch issues simulators miss.
- **Focus on the golden path:** Landing → Register → Home → Inventory/Marketplace/Shop. Judges won't explore every dark corner.
- The sidebar already collapses on mobile (check `shell.component.html`). Make sure that still works.
