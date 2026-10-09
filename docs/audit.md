# Project Audit — Challenge Games

**Date:** 2026-10-09  
**Repo:** `rfrepo26` · plain browser games · MIT  
**Entry point:** [`index.html`](../index.html)

---

## 1. What this project is

A **student game collection hub** (“Challenge Games”) with three playable titles and a daily-challenge rotator. No install, no build, no dependencies beyond Google Fonts CDNs.

| Surface | Path | Size (approx.) | Role |
|---------|------|----------------|------|
| Hub | `index.html` | ~1.1k lines | Catalog, daily challenge UI, terminal easter egg, code explainers |
| Rift Hockey | `rifthockey.html` | ~1.2k lines | Canvas knock-hockey with rifts + vortex |
| Street Racing | `street-racing/` | HTML + CSS + **~2.1k line** `game.js` | Top-down circuit race with items + rift shortcut |
| Curveball | `hangman.html` | ~810 lines | Sports-themed hangman |

---

## 2. Architecture snapshot

```
index.html (hub)
 ├── daily challenge rotation (localStorage cg-daily-YYYY-MM-DD)
 ├── links → rifthockey.html | street-racing/ | hangman.html
 └── each game re-implements the same daily write logic independently
```

**Runtime model**

- Each game is a self-contained page (IIFE or top-level script).
- Canvas games use `requestAnimationFrame` loops with clamped `dt`.
- Persistence today = `localStorage` only (daily bests; Curveball streak/wins are **session-only**).
- Audio exists only in Street Racing (Web Audio API tones + engine oscillator).

**There is no shared module layer.** Daily-challenge keys, rotation order, and date formatting are copy-pasted in four places.

---

## 3. Feature inventory (what works today)

### Hub
- Overview-first landing; catalog cards; “How it works” explainers
- Daily challenge: `epochDay % 3` rotates Rift Hockey → Street Racing → Curveball
- Reads/displays today’s best from `localStorage`
- Easter egg: type `ryan` or 5× logo click → temporary terminal theme
- Accessible focus styles; `prefers-reduced-motion` respected on hub

### Rift Hockey
- AI and local 2P modes; first to 5
- Mouse/trackpad/touch pointer follow + WASD; charge smash (click/Space)
- Side rift teleports; center vortex pull
- Goal / win overlays; particle bursts; screen shake
- Daily: increments win count on AI victories when today is hockey day
- **Missing:** pause, mute/settings, sound, difficulty tiers, rematch flow polish beyond buttons

### Street Racing
- Full race loop: title → countdown → race → results; pause / restart / mute
- Drift charge, item boxes, AI rivals (Vee / Juno / Pix), rift rubber-band jump
- Procedural-ish circuit from waypoints; minimap; HUD; Web Audio
- Daily: best finishing place when today is racing day
- **Missing:** touch/gamepad, settings screen, tutorial, progress beyond single race, file modularity

### Curveball
- Categories (Sports / Movies / Fun Stuff); on-screen + physical keyboard
- Curveball once-per-round letter reveal; win/lose modal; streak & wins HUD
- Daily: fewest strikes on a win (≤3) when today is Curveball day
- **Missing:** audio, persisted streak/wins, settings, larger pools, difficulty

---

## 4. Strengths

1. **Playable core loops** exist for all three titles — not prototypes with dead buttons.
2. **Hub presentation** is already thoughtful (brand-first overview, restrained mono palette, educational framing).
3. **Identity hook (“rift”)** already ties Hockey and Racing together.
4. **Daily challenge** is a real meta-loop that gives reason to return.
5. Street Racing demonstrates ambition: rubber-banding rift, item ecosystem, AI styles.

---

## 5. Biggest technical risks

| Risk | Why it matters | Severity |
|------|----------------|----------|
| **Monolithic game files** | `street-racing/game.js` (~2100 lines) mixes track gen, AI, items, render, audio, UI. High regression cost. | High |
| **Duplicated daily-challenge contract** | Four copies of rotation + storage keys can drift (already easy to break hub display). | High |
| **No automated tests** | Physics, ranking, and daily scoring are easy to break silently. | High |
| **No shared settings/audio layer** | Mute/volume/persist inconsistency across games; Hockey & Curveball silent. | Medium |
| **Input coverage gaps** | Racing is keyboard-only; Hockey touch works but Racing mobile is effectively unplayable. | Medium |
| **Curveball progress not saved** | Streak/wins reset on refresh — undermines “progression” feel. | Medium |
| **CDN font dependency** | Offline / blocked Google Fonts → layout jank; no local fallback strategy beyond generic stacks. | Low–Med |
| **Fixed canvas size (Hockey)** | 420×700 internal resolution scales via CSS but isn’t DPI-aware like Racing. | Low |

---

## 6. Design / UX gaps (commercial polish bar)

- No unified **settings** (audio, reduce motion, controls remap).
- No first-run **tutorial** or contextual coaching beyond static help text.
- Visual identity is **split**: hub = B&W minimal; Hockey/Curveball = teal/amber stadium; Racing = dark neon circuit. Feels like three student projects, not one product.
- Feedback: Racing has SFX; others rely on visuals only.
- Empty/error states for `localStorage` failures are silent (catch-and-ignore).
- No pause on Hockey; no soft “are you sure?” on Racing restart mid-race.
- Accessibility: canvas games have limited screen-reader utility (acceptable for action games; still need keyboard completeness and visible focus on overlays).

---

## 7. What should *not* happen yet

- Do **not** rewrite everything into a framework (React/Phaser/etc.) without a hard requirement — would fight the “open and play” identity.
- Do **not** add new games before the existing three feel intentional and connected.
- Do **not** invent fake hub buttons (leaderboards online, accounts) without a real backend plan.

---

## 8. Recommended north star (proposal)

**Product:** Challenge Games — a small curated arcade with a shared daily ritual and a consistent rift-arcade identity.

**First vertical slice after docs:** shared daily/settings utilities + **Rift Hockey polish pass** (audio, pause, settings hookup, tighter feedback) because it is the most complete short session and the easiest title to make feel “shipped.”

See [roadmap.md](./roadmap.md) for milestones and acceptance criteria.
