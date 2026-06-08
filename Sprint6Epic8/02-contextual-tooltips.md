# Task 2: Contextual Tooltips

**Epic:** First Impressions & Onboarding  
**Priority:** P0  
**Estimate:** 1.5h  
**Type:** Frontend (Angular)

---

## Description

Add small `?` hover icons next to game-specific jargon throughout the app. Hovering (or tapping on mobile) reveals a 1–2 sentence plain-English explanation. This solves the teacher's feedback that the site is "complex for someone who never got in touch with these type of games."

---

## User Story

> As a new user, I want to hover over confusing terms to instantly understand what they mean, so I don't feel lost.

---

## Definition of Done

- [ ] **Reusable tooltip component:** `<app-info-tooltip text="...">` or similar. Uses existing theme. No external UI libraries.
- [ ] **Covered terms (minimum):**
  - **Rarity** (Common → Rare → Epic → Legendary → Limited → Secret)
  - **Heat Level** (affects value / factory output)
  - **Pity Counter** (guaranteed legendary drop after X rolls)
  - **Sparks** (currency from salvaging stoves)
  - **Forgery** (sacrifice 6 stoves → craft 1 better stove)
  - **Loadout / Attunement** (if loadouts ship; otherwise defer)
- [ ] **Placement:** Tooltip icon appears inline next to the label or in the section header.
- [ ] **Mobile support:** Tap to toggle tooltip (not hover-only).
- [ ] **Accessibility:** Tooltip content is readable by screen readers (`aria-describedby`).
- [ ] **Max width:** 280px. Text wraps. No scrollbars.

---

## Implementation Hints

### Component Signature

```typescript
@Component({
  selector: 'app-info-tooltip',
  standalone: true,
  template: `
    <span class="tooltip-trigger" (click)="toggle()" tabindex="0" [attr.aria-describedby]="id">
      ?
    </span>
    @if (visible()) {
      <div class="tooltip-body" [id]="id" role="tooltip">
        {{ text() }}
      </div>
    }
  `
})
export class InfoTooltipComponent {
  text = input.required<string>();
  visible = signal(false);
  id = `tt-${Math.random().toString(36).slice(2)}`;

  toggle() { this.visible.update(v => !v); }
}
```

### Tooltip Text Content (plain English)

| Term | Tooltip Text |
|------|-------------|
| Rarity | "How rare this stove is. Higher rarity means fewer exist and they're worth more." |
| Heat Level | "A score from 1–100. Hotter stoves are more valuable and produce more in the Factory." |
| Pity Counter | "Your 'bad luck protection.' After enough rolls without a Legendary, your next drop is guaranteed to be one." |
| Sparks | "A currency you get by breaking down unwanted stoves. Spend Sparks to re-roll a stove's Heat." |
| Forgery | "Sacrifice 6 stoves of the same rarity to create 1 stove of the next-higher rarity." |

### Styling

```scss
.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--surface-color);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-left: 4px;
}

.tooltip-body {
  position: absolute;
  max-width: 280px;
  padding: 8px 12px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-size: 13px;
  line-height: 1.4;
  z-index: 1000;
}
```

---

## Acceptance Criteria

1. User hovers over `?` next to "Rarity" → tooltip appears within 200ms.
2. User taps `?` on mobile → tooltip toggles.
3. All listed terms have tooltips on at least one screen where they appear.
4. Tooltips do not overflow the viewport on 375px screens.

---

## Notes

- Keep text under 25 words per tooltip. Judges scan, they don't read.
- If a term appears in multiple places (e.g., Rarity in inventory AND marketplace), you only need one tooltip instance per page — don't spam icons.
