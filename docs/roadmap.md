# Development Roadmap

**Product context:** This repository is Challenge Games (browser arcade). A separate brief requested a real WHOOP recovery integration; that work is **blocked** until a backend product exists — see [whoop-integration.md](./whoop-integration.md).

This roadmap covers (A) Challenge Games polish and (B) Recovery/WHOOP if greenfield is approved.

---

## Decision gates ★ = working default if you reply “go with defaults”

| # | Decision | ★ Default |
|---|----------|-----------|
| D1 | Collection vs single flagship game | Keep **collection** + shared meta |
| D2 | First game polish pass | **Rift Hockey** (short loop, easiest “shipped” feel) |
| D3 | WHOOP / recovery product | **Do not** fake it on the games hub — greenfield recovery app only after you confirm D4–D6 |
| D4 | Where to build recovery | **New app** (this repo under `/recovery` **or** new repo — your call) |
| D5 | Recovery stack | **Next.js App Router + PostgreSQL + Auth.js** |
| D6 | WHOOP credentials available? | Assume **no** until you provide Dashboard app secrets via secure env |

---

## Track A — Challenge Games (from prior audit)

### A0 — Documentation *(in progress)*
- [x] Audit, GDD, architecture, this roadmap, WHOOP feasibility
- **Accept:** Docs accurate to repo; no false claims about live WHOOP

### A1 — Shared foundation
- Extract daily-challenge helpers; optional settings/audio stubs
- **Accept:** One storage contract; hub + games agree on rotation

### A2 — Rift Hockey polish
- Pause, Web Audio SFX, settings mute, clearer overlays
- **Accept:** Full match with pause/mute; manual QA checklist pass

### A3 — Street Racing depth
- Touch controls; thin `game.js`; teach rift/drift
- **Accept:** Playable on tablet; no keyboard-only dead end

### A4 — Curveball persistence
- Persist streak/wins; SFX; pool expansion
- **Accept:** Refresh keeps career stats

---

## Track B — Athlete recovery + real WHOOP *(gated)*

Only after **D4–D6** are answered.

| Milestone | Outcome | Accept |
|-----------|---------|--------|
| B0 | App skeleton: auth, DB, dashboard shell, manual check-ins | Sign-in works; manual entry works; Connect shows “not configured” if env missing |
| B1 | OAuth start/callback/disconnect + encrypted tokens | Real WHOOP authorize redirect when credentials set; state validated; secret never in client |
| B2 | Sync recovery/sleep/cycles/workouts | Idempotent upserts; pagination; last_sync_at |
| B3 | Dashboard uses imported data + manual check-ins | Source labels; no fake WHOOP values |
| B4 | Tests + setup docs + `.env.example` | OAuth/refresh/sync/authz tests; credentials setup documented |

---

## What we will not do

- Decorative Connect WHOOP on the games hub
- Client-side client secret or token storage
- Claiming “WHOOP live” without a successful authorized test
