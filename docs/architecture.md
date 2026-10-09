# Technical Architecture Plan

**Constraint:** keep plain HTML/CSS/JS and static hosting unless a milestone proves otherwise.

---

## 1. Current topology

```
┌─────────────────────────────────────────┐
│ index.html          Hub + daily read UI │
└──────────────┬──────────────────────────┘
               │ navigation only
     ┌─────────┼─────────┐
     ▼         ▼         ▼
rifthockey  street-racing  hangman
 .html       /game.js      .html
 (monolith)  (monolith)    (monolith)
     │         │         │
     └─────────┴─────────┘
         localStorage (duplicated writers)
```

**Sources of truth today**

| Concern | Where it lives | Problem |
|---------|----------------|---------|
| Daily rotation order | Hub + 3 games | Drift risk |
| Daily storage schema | 4 copies | Silent incompat |
| Mute | Racing only (`audio.muted`) | Not global |
| Career stats | Curveball RAM only | Lost on refresh |

---

## 2. Target topology (incremental)

```
┌─────────────────── Hub (index.html) ───────────────────┐
│  UI · daily board · links · explainers                 │
└───────────────────────┬────────────────────────────────┘
                        │ <script src="shared/...">
┌───────────────────────▼────────────────────────────────┐
│ shared/                                                 │
│  daily.js      rotation, read/write, schema validate    │
│  settings.js   mute, volumes, reducedMotion → storage   │
│  audio.js      WebAudio bus (sfx / music / mute)        │
│  (optional later) storage.js  versioned save helpers    │
└───────┬─────────────────┬─────────────────┬────────────┘
        ▼                 ▼                 ▼
   rifthockey/       street-racing/      curveball/
   (split when       game modules        (split when
    justified)        when justified)     justified)
```

**Migration rule:** extract shared code first; split a game’s monolith only when touching that subsystem for a real feature.

---

## 3. System responsibilities

### 3.1 Shared — Daily Challenge
- `challengeForDate(Date) → { id, name, href, goal, … }`
- `readDaily(dateKey)`, `writeDaily(dateKey, patch)` with schema version
- `recordResult(gameId, payload)` — each game calls one API instead of open-coding rotation checks
- Hub remains the only rich *reader* UI; games are writers

**Schema (proposed)**

```json
{
  "v": 1,
  "gameId": "rift-hockey",
  "best": 2,
  "updatedAt": "ISO-8601"
}
```

`best` semantics stay per-game (wins count / place index / strikes).

### 3.2 Shared — Settings
- Keys: `cg-settings-v1`
- Fields: `muted`, `sfxVolume`, `musicVolume`, `reducedMotion`
- Games subscribe on boot; hub can host a settings panel later

### 3.3 Shared — Audio
- Lazy `AudioContext` on first user gesture
- `sfx(name)` / `tone(...)` helpers; Racing’s engine loop can adopt the bus
- All games respect `muted`

### 3.4 Per-game gameplay
Keep isolated. Do not force a shared entity component framework.

Suggested future split for Street Racing only (largest file):

| Module | Owns |
|--------|------|
| `track.js` | waypoints, buildTrack, sampleAt |
| `karts.js` | stepKart, AI, collisions |
| `items.js` | boxes, shells, bananas, useItem |
| `rift.js` | open timing, jump awards |
| `render.js` | draw* |
| `ui.js` | syncUI, screens |
| `main.js` | loop, input, boot |

Hockey / Curveball can stay single-file longer if shared scripts cover cross-cutting needs.

---

## 4. Game state discipline

**Rift Hockey** — explicit flags already: `running`, `waitingFaceoff`, overlays. Add `paused` and a single `phase` enum to avoid flag combos.

**Street Racing** — good string state machine: `title | countdown | race | paused | results`. Keep it; reject ad-hoc parallel booleans.

**Curveball** — `state` object is clear; add `persist()` on win/loss for career fields.

**Rule:** one writable owner per concern; UI only reads projections.

---

## 5. Persistence & validation

```
load → JSON.parse → version check → migrate → clamp fields → use
save → serialize known shape only → try/catch → ignore quota errors quietly in UI toast
```

Never `Object.assign` raw localStorage over trusted defaults without validating `gameId` / types (partially done today; strengthen).

---

## 6. Input layer

| Game | Keyboard | Pointer | Touch (target) | Gamepad (later) |
|------|----------|---------|----------------|-----------------|
| Hockey | ✓ | ✓ | ✓ (basic) | optional |
| Racing | ✓ | — | **needed** | optional |
| Curveball | ✓ | on-screen keys | ✓ | n/a |

Racing touch: on-screen steer zones + throttle/drift/item buttons overlaid; hide on fine-pointer devices via `matchMedia('(pointer: fine)')` or always-available toggle.

---

## 7. Rendering & performance

- Prefer Racing’s DPR canvas pattern for Hockey when we next touch its draw path.
- Cap particles; avoid allocating arrays every frame (Racing already filters; watch `skids`).
- No per-frame layout thrash in Curveball (rebuild keyboard only on state change — already mostly true).

---

## 8. Testing strategy

Without a bundler, start practical:

1. **Pure logic extraction** — daily scoring, standings sort, Curveball `checkWin`, rift jump fraction → `shared/*.js` functions.
2. **Node smoke tests** — `node --test` (or plain assert scripts) importing those modules via ESM, *or* duplicate tiny pure functions into `tests/` if browsers keep classic scripts.
3. **Manual QA checklist** per milestone (see roadmap).
4. Optional later: Playwright smoke against `python3 -m http.server`.

Do not disable checks to greenwash.

---

## 9. File / folder target (after M1–M2)

```
/
  index.html
  docs/
  shared/
    daily.js
    settings.js
    audio.js
  rifthockey.html          # or rifthockey/ if split
  hangman.html
  street-racing/
    index.html
    style.css
    game.js                # thins over time
  tests/                   # when pure modules exist
  README.md
  LICENSE
```

---

## 10. Security / privacy

- No secrets in repo.
- Only `localStorage`; document that clears wipe progress.
- No remote analytics unless explicitly requested later.
