# Task 4: Landing Page Polish

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 1h  
**Type:** Frontend (Angular)

---

## Description

Polish the existing `StartupComponent` landing page so a non-gamer understands EmberExchange in 5 seconds. Rewrite the tagline, clarify CTAs, add a preview of core features, and add subtle scroll-reveal animations.

---

## User Story

> As a visitor who lands on the site for the first time, I want to instantly understand what this website is and why I should register.

---

## Definition of Done

- [ ] **Tagline rewritten:** One sentence, jargon-free. Suggestion:  
  *"Collect, trade, and invest in rare digital stoves. Play casino games. Win big."*
- [ ] **Sub-headline:** 1–2 sentences max explaining the hook.  
  *"Open lootboxes, build your collection, and battle friends in Poker, Blackjack, and Roulette — all powered by player-driven trading."*
- [ ] **CTA buttons clarified:**
  - Primary: "Get Started — It's Free"
  - Secondary: "See How It Works" (links to `/how-it-works`)
- [ ] **Feature preview section:** Below the fold, show 3 cards with screenshots or icons:
  - "Collect Rare Stoves" (show a Legendary sprite)
  - "Trade on the Marketplace" (show a listing card)
  - "Play Mini-Games" (show Roulette wheel or cards)
- [ ] **Scroll-reveal animations:** Elements fade/slide in as user scrolls. Use CSS `@keyframes` or `IntersectionObserver`. Keep it subtle (< 400ms).
- [ ] **Social proof (optional, if time permits):** Total players registered, total stoves minted, or recent pull feed.
- [ ] **Responsive:** Hero text readable at 375px without overflow.

---

## Implementation Hints

### Current File

Likely `src/frontend/app/pages/startup/startup.component.ts` or similar.

### Tagline A/B Options

| Option | Text |
|--------|------|
| A (safe) | "Collect, trade, and invest in rare digital stoves." |
| B (fun) | "The stock market — but for stoves." |
| C (descriptive) | "Open lootboxes, trade rare stoves, and play casino games." |

**Recommendation:** Option A for the H1, Option C for the sub-headline.

### Scroll-Reveal Snippet (CSS-only)

```scss
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

```typescript
// In component
ngAfterViewInit() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
```

### Feature Preview Card Layout

```html
<section class="features">
  <div class="feature-card">
    <img src="assets/stove_sprites/legendary_stove.png" alt="Legendary stove" />
    <h3>Collect Rare Stoves</h3>
    <p>Open lootboxes and discover stoves from Common to Legendary.</p>
  </div>
  <!-- repeat for Trade and Play -->
</section>
```

---

## Acceptance Criteria

1. Landing page loads in under 2 seconds on a simulated 3G connection (lazy-load images).
2. A non-gamer can read the H1 and sub-headline and explain the site back to you.
3. Both CTA buttons work and route correctly.
4. Page is visually polished at all 3 breakpoints.
5. No horizontal scroll on mobile.

---

## Notes

- Do not auto-play audio or video. School computers may be muted and it looks unprofessional.
- If the animated fire background is heavy, consider a static CSS gradient fallback for low-end devices.
- The landing page is your 5-second pitch. Every word must earn its place.
