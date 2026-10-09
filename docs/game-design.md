# Game Design Document — Challenge Games

**Status:** Working draft · pending design confirmation  
**Audience:** Player-facing vision for the collection and each title

---

## 1. Vision

**Challenge Games** is a tight browser arcade: three distinct games that share a mischievous sci‑fi “rift” energy, a one-click launch, and a daily reason to come back.

**Fantasy:** You open the hub, see today’s challenge, and dive into a short, high-feedback session. Wins feel earned; losses teach one readable lesson.

**Pillars**

1. **Instant play** — no accounts, no install, no waiting.
2. **Readable chaos** — twists (rifts, vortex, curveballs) are fair and telegraphed.
3. **Short loops, long hooks** — a match/race/round finishes fast; daily + unlocks create return visits.
4. **One product, three flavors** — shared chrome/settings/meta; each game keeps its own personality.

---

## 2. Target experience

| Player | What they want | How we serve it |
|--------|----------------|-----------------|
| Casual (phone/laptop between classes) | 2–5 minute session | Daily challenge + quick restarts |
| Skill-seeker | Mastery & rivalry | AI difficulty, ghost times / bests (later), clean controls |
| Student / teacher | Understandable code | Keep plain JS; hub explainers stay honest |

**Session length targets**

- Rift Hockey match: ~2–4 min  
- Street Racing race: ~2–3 min  
- Curveball round: ~1–2 min  

---

## 3. Collection fantasy & art direction

**Theme:** Everyday sport / race / wordplay cracked open by unstable rifts.

**Visual system (target)**

| Token | Direction |
|-------|-----------|
| Ink | Deep cool dark (`#060d12`–`#0b0b0b`) |
| Chalk | Soft off-white text |
| Accent A | Cyan / rift (`#3de0c5`–`#7cf0ff`) |
| Accent B | Amber heat (`#f5b942`) |
| Danger | Strike red (`#e84a3c`) |
| Type display | Bold condensed / blackletter-adjacent display (Bebas / Archivo Black) |
| Type UI | Humanist sans (DM Sans / Space Grotesk) |

Hub stays deliberately quieter (mono) so game pages feel colorful when you enter. Shared components (hub link, settings, pause) should still rhyme.

**Motion:** purposeful hits — smash flashes, rift open pulses, letter reveals — not constant particle spam. Honor `prefers-reduced-motion`.

**Audio:** short synthetic SFX + optional low music beds via Web Audio (no large binary assets required for v1). Mute persists globally.

---

## 4. Meta progression (hub)

### Daily Challenge (exists — deepen)
- Rotating featured game with a clear goal.
- Best-of-day stored locally.
- **Planned:** clearer goal copy in-game when `?daily=1`; celebration when you beat your best; 7-day activity tick marks on hub.

### Persistent profile (local only)
- Settings: master mute, music/SFX levels, reduced motion override.
- Per-game career: wins, best race place/time, Curveball streak (persisted), optional unlocks.

### Unlock examples (later milestones — only if earned by play)
- Hockey: AI difficulties, table skins, vortex intensity presets.
- Racing: alternate circuits, kart colors, item loadout toggles.
- Curveball: word packs, “hard mode” (no curveball / fewer lives).

No fake shop. Everything unlocks from play.

---

## 5. Game: Rift Hockey

### Fantasy
Air-hockey aggression on a table that’s tearing itself apart. You win by reading chaos, not memorizing scripts.

### Core loop
1. Faceoff → rally  
2. Choose: safe corner clears vs risky rift warps  
3. Charge smash for power vs control  
4. Score to 5 → rematch or menu  

### Key mechanics
| Mechanic | Player decision |
|----------|-----------------|
| Mallet aim & charge | Angle + power vs overcommit |
| Side rifts | Teleport lanes — offense and defense |
| Center vortex | Timing: shoot before it wakes / bait AI into it |
| Half-court constraint | You own your side; positioning matters |

### Progression & modes
- Vs AI (difficulty Easy / Normal / Relentless)  
- Local 2P  
- Daily: beat AI (wins counted)

### Feel targets
- Pointer control stays snappy (already tuned).  
- Every smash / goal / rift / vortex has a distinct SFX + micro-juice.  
- Pause anytime without losing clarity.

### Win / loss
- First to 5. Clear overlays, rematch, menu. No soft lock.

---

## 6. Game: Street Racing

### Fantasy
Kart-style street circuit where last place gets the greediest rift jump — comeback drama without pure RNG spite.

### Core loop
1. Grid → countdown → drive  
2. Drift for boost, grab items, watch rift window  
3. Three laps → podium  

### Key systems (already present)
- Drift charge, items (boost / banana / shells / lightning / star / phase / swap)
- AI archetypes (speed / corner / chaos)
- Orbiting rift with place-scaled jump length

### Design goals for polish
- Teach rift + drift in first 20 seconds without a wall of text.
- Touch: virtual stick + action buttons (mobile).
- Balance pass so skill > item spam, but last-place rift still creates stories.
- Career: best time, best place, cumulative rift jumps.

---

## 7. Game: Curveball

### Fantasy
Hangman at the ballpark: letters as pitches, strikes as outs, one curveball cheat pitch per at-bat.

### Core loop
1. See category + hint  
2. Guess letters  
3. Optional curveball reveal  
4. Safe (win) or strikeout → next  

### Design goals
- Persist streak/wins; celebrate personal bests.  
- Expand pools carefully (no obscure trivia traps).  
- Light SFX for hit / strike / curveball / home run.  
- Optional timed “blitz” mode later — not required for v1 polish.

---

## 8. Tutorialization principles

1. **Show, don’t essay** — first run banners / ghost prompts fade after success.  
2. **One new idea at a time** — Hockey: move → smash → rift; Racing: drive → drift → rift.  
3. **Help always available** — pause menu lists controls; never only on title screen.

---

## 9. Out of scope (for now)

- Online multiplayer / accounts / real money  
- 3D engine migration  
- User-generated content  
- Native mobile wrappers  

---

## 10. Open design decisions (need confirmation)

See roadmap “Decision gates.” Working defaults are marked ★ in [roadmap.md](./roadmap.md).
