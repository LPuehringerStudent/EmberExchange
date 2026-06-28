# WMC-3 Presentation Plan — EmberExchange

**Date:** 29 June 2026  
**Slot:** ~8 minutes total (aim for 6 minutes talk + 2 minutes demo video + buffer for questions)  
**Goal:** Leave the jury with the impression that EmberExchange is a polished, full-stack product, not just a school project.

## Overall Narrative

> “A marketplace and collection game built around virtual stoves, with gambling, trading, and an AI guide — all in one smooth web app.”

Lead with the **product hook** (collecting and trading stoves is fun and visual), then prove it with **tech depth** (real-time games, AI assistant, security). Finish with a short, punchy demo video that the jury remembers after you leave the stage.

---

## 6-Minute Talk Sketch

### 1. Hook — 0:00–0:30
- Open with the landing page on the projector.
- One-liner: *“What if Steam Marketplace, CS:GO cases, and a casino card room had a baby — and that baby sold stoves?”*
- Why stoves? Unique, memorable, instantly gives the project personality.

### 2. The Product — 0:30–1:30
- **Core loop** in one slide:
  1. Earn coins / claim daily reward.
  2. Open lootboxes to get rare stoves.
  3. Trade stoves on the marketplace.
  4. Play games to earn more.
- Show the home dashboard, inventory, and marketplace in 2–3 quick screengrabs.
- Mention the economy: coin balance, supply-limited lootboxes, 30-day price history, ownership chain.

### 3. Live Demo / Core Features — 1:30–3:30
Pick **two** of the most visual features and run through them live (or in the video if risky):

- **Lootbox opening** — animated reveal, rarity glow, reward added to inventory.
- **Marketplace** — filter by rarity, inspect a stove, view price chart and ownership history, buy/sell.
- **Daily reward claim** — quick, satisfying feedback (coins added, streak updated).

Tip: keep the live part to ~2 minutes and use the video for anything timing-sensitive (games, AI chat).

### 4. Tech Highlights — 3:30–5:00
- **Full-stack TypeScript:** Angular 21 + Express + PostgreSQL.
- **Real-time multiplayer:** WebSocket card games (Poker, Blackjack, Roulette) with in-memory game engines and per-player state.
- **Security stack:** rate limiting, Cloudflare Turnstile, honeypots, IP bans, behavior guard, request logging.
- **AI onboarding helper:** Kimi K2.6 + Code 2.7, tool calls that navigate, highlight UI, claim rewards, and answer questions from project context.

Keep this fast — one keyword or icon per bullet on a slide.

### 5. Closing — 5:00–6:00
- Return to the landing page / logo.
- One-sentence takeaway: *“EmberExchange is a complete, secure, real-time trading and gambling platform — and we built it ourselves.”*
- Optional: invite the jury to try the assistant or open a lootbox.

---

## 2-Minute Demo Video Storyboard

A looping, no-voiceover montage with upbeat background music. Each shot is 10–20 seconds.

| Time | Shot | Why it impresses |
|------|------|------------------|
| 0:00 | Slow landing-page hero pan, logo reveal. | First impression / branding. |
| 0:15 | Login / Google OAuth → home screen. | Smooth auth, personalized dashboard. |
| 0:30 | Daily reward claim: button press, coin counter animates, streak updates. | Instant feedback, polish. |
| 0:50 | Lootbox inventory → click open → spinner/reveal → rare stove appears with glow. | Visual reward moment. |
| 1:10 | Marketplace browse with rarity filters, click a legendary stove, price chart, ownership chain. | Depth of the economy. |
| 1:30 | Blackjack or Poker room: cards dealt, chips, chat, real-time turn. | “This is multiplayer live.” |
| 1:45 | Open AI assistant, ask “Where can I gamble?” → chips appear → click → navigate to games. | Modern AI integration. |
| 1:55 | Final shot: profile page with animated stats, then cut to logo. | Personalization + memorable end frame. |

---

## Most Visually Impressive Features (Ranked)

Use these as the backbone of both the live demo and the video:

1. **Lootbox opening animation** — anticipation, rarity reveal, reward feedback.
2. **Real-time card games** — moving cards, chips, turn timers, multiplayer feel.
3. **AI assistant drawer** — smooth slide-out, markdown responses, clickable action chips.
4. **Marketplace price charts + ownership chain** — looks like a real trading platform.
5. **Daily reward / animated coin counters** — small but satisfying.
6. **Responsive dark orange theme** — cohesive, professional, stands out from generic Bootstrap projects.

---

## Backup Ideas

- If live internet is risky, run the video twice and skip live clicking.
- Prepare a single “wow” sentence for the Q&A: *“Everything you saw is persisted in PostgreSQL, secured by rate limits and bot detection, and deployed automatically from GitHub to Render.”*
