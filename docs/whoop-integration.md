# WHOOP API Integration — Feasibility & Architecture Plan

**Status:** Blocked on product/repo decision — **not implemented**  
**Date:** 2026-10-09  
**Official docs:** [Overview](https://developer.whoop.com/docs/developing/overview/) · [OAuth 2.0](https://developer.whoop.com/docs/developing/oauth/) · [API reference](https://developer.whoop.com/api)

---

## 1. Inspection result (current stack)

The workspace repo (`rfrepo26`) is **Challenge Games**: static HTML/CSS/JavaScript browser games (hub, Rift Hockey, Street Racing, Curveball).

| Required for real WHOOP OAuth | Present in this repo? |
|-------------------------------|------------------------|
| Athlete recovery dashboard / account settings | **No** |
| User authentication (app accounts) | **No** |
| Backend / server that can hold a client secret | **No** |
| Database for tokens + imported metrics | **No** |
| Environment secrets management | **No** |
| HTTPS redirect URI endpoint | **No** (static pages only) |

There are **zero** matches for WHOOP, recovery scores, OAuth, HRV, or athlete check-ins in the codebase.

**Conclusion:** A “Connect WHOOP” button cannot be implemented as a *real* integration in the current static frontend alone. Exchanging an authorization code requires a **client secret** and must happen **server-side**. Putting secrets or tokens in browser JS would violate WHOOP’s model and the security requirements in this brief.

We will **not** ship a decorative Connect button or simulated “connected” state.

---

## 2. What WHOOP officially requires

### OAuth 2.0 authorization-code flow

| Item | Official value |
|------|----------------|
| Authorize | `https://api.prod.whoop.com/oauth/oauth2/auth` |
| Token | `https://api.prod.whoop.com/oauth/oauth2/token` |
| Redirect URI | Must be registered in the WHOOP Developer Dashboard (HTTPS or custom scheme) |
| State | CSRF protection (docs: 8 characters if you generate it yourself; prefer a secure random ≥8) |
| Bearer usage | `Authorization: Bearer <access_token>` on API calls |

### Scopes we would request (only what the recovery UI needs)

| Scope | Why |
|-------|-----|
| `offline` | Refresh tokens (required for ongoing sync) |
| `read:recovery` | Recovery score, HRV, resting heart rate |
| `read:sleep` | Sleep duration / stages / performance |
| `read:cycles` | Daily strain / physiological cycle |
| `read:workout` | Workout records and workout strain |
| `read:body_measurement` | **Omit unless** height/weight/max HR are shown in product |
| `read:profile` | **Omit unless** we display WHOOP name/email |

### Data endpoints (v2 — do not invent paths)

Documented collection-style resources include (paginated):

- Recovery collection / recovery for cycle — `read:recovery`
- Sleep collection / sleep by id — `read:sleep`
- Cycle collection — `read:cycles`
- Workout collection — `read:workout`

Handle: pagination cursors, missing/incomplete scores, rate limits (`429`), `401` (refresh or re-auth), time zones via WHOOP timestamps (typically ISO-8601).

### Token lifecycle (critical)

- Access tokens expire (`expires_in`, often ~3600s).
- Refresh **rotates** both access and refresh tokens; old refresh becomes invalid.
- Concurrent refresh races lose tokens — use a **per-user mutex / single-flight** refresh.
- On disconnect: call WHOOP revoke API and delete local secrets.
- Prefer background refresh ~hourly to reduce stampede risk (per WHOOP guidance).

### Developer prerequisites (outside this repo)

1. Active WHOOP membership (developer login = WHOOP account).
2. App created in [WHOOP Developer Dashboard](https://developer.whoop.com/) → Client ID + Client Secret.
3. Redirect URI registered to our backend callback (e.g. `https://<host>/api/whoop/callback`).
4. App approval before broad production launch (per WHOOP overview).

---

## 3. Recommended server-side architecture

Because this repo has no backend, **greenfield a small recovery platform** (new app or new top-level package) rather than bolting OAuth onto static game pages.

### Recommended stack (student-friendly, production-capable)

**Next.js (App Router) + PostgreSQL + Auth.js (or Lucia) + encrypted token column**

| Layer | Choice | Role |
|-------|--------|------|
| UI | Next.js React | Athlete dashboard, settings, Connect / Disconnect |
| Auth | Auth.js (email magic link or credentials) | App user sessions; **never** store WHOOP tokens in the browser |
| API routes | Next.js Route Handlers | `/api/whoop/start`, `/callback`, `/disconnect`, `/sync`, `/status` |
| DB | PostgreSQL (Neon/Supabase/local Docker) | Users, `whoop_connections`, metric tables |
| Secrets | Server env only | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `DATABASE_URL` |
| Jobs | Vercel cron / node-cron / worker | Periodic sync + proactive token refresh |
| Webhooks | Optional later | WHOOP webhooks if enabled for the app; sync job remains fallback |

**Alternative:** Express/Fastify API + Vite React SPA — same security rules; slightly more moving parts for hosting.

### Security invariants

1. Client secret and tokens **never** in frontend, `localStorage`, public env (`NEXT_PUBLIC_*`), or logs.
2. Encrypt refresh/access tokens at rest (AES-GCM with `TOKEN_ENCRYPTION_KEY`).
3. Callback validates `state` against server-side store (Redis or DB) with TTL.
4. All WHOOP data queries scoped by `session.userId` — no IDOR.
5. `.env.example` contains **placeholders only**.

### Data model (sketch)

```
users
  id, email, …

whoop_connections
  user_id UNIQUE
  whoop_user_id (if available)
  access_token_enc, refresh_token_enc
  scopes, token_expires_at
  status: connected | needs_reauth | disconnected
  last_sync_at, last_sync_error
  created_at, updated_at

whoop_recoveries   (unique: user_id + cycle_id or whoop recovery id)
whoop_sleeps       (unique: user_id + sleep_id)
whoop_cycles       (unique: user_id + cycle_id)
whoop_workouts     (unique: user_id + workout_id)

athlete_checkins   (manual: soreness, fatigue, stress, notes, date)
```

Upserts on WHOOP resource IDs prevent duplicate sync rows.

### OAuth sequence

```
Dashboard [Connect WHOOP]
  → GET /api/whoop/start
      (create state, store server-side, redirect to WHOOP authorize URL)
  → User consents on WHOOP
  → GET /api/whoop/callback?code&state
      (validate state, exchange code server-side, encrypt+store tokens)
  → Redirect /settings?whoop=connected|error
  → Background or immediate sync of recent recovery/sleep/cycles/workouts
```

Disconnect: revoke via WHOOP API → wipe tokens → keep historical imported rows unless user requests delete → UI shows disconnected + manual entry.

### Dashboard UX states (required)

| State | UI |
|-------|----|
| Disconnected | Manual check-in form + Connect WHOOP CTA (real link only) |
| Connecting | Loading after redirect |
| Connected | Live metrics + last sync time + source badge “WHOOP” |
| Syncing | Progress / disabled refresh |
| Error / needs_reauth | Clear message + Reconnect |
| Empty (connected, no data yet) | Honest empty copy — **no fake scores** |

Manual check-ins always labeled “You entered”; WHOOP rows labeled “From WHOOP”.

---

## 4. Implementation stages (once architecture is approved)

| Stage | Deliverable | Acceptance |
|-------|-------------|------------|
| **S0** | Confirm repo/product + create app skeleton with auth + DB | Users can sign in; no WHOOP yet |
| **S1** | OAuth start/callback/disconnect + encrypted token store | Real redirect to WHOOP; failure paths; **no fake success** without credentials |
| **S2** | Sync job: recovery, sleep, cycles, workouts + pagination/upserts | DB fills from API with test account |
| **S3** | Dashboard wired to DB; manual check-ins; freshness UI | Mock data removed when connected |
| **S4** | Tests (OAuth state, refresh single-flight, sync idempotency, authz) + `.env.example` + setup docs | CI green on unit tests; manual OAuth checklist |
| **S5** | Optional webhooks + rate-limit backoff | Documented ops runbook |

**Credentials gate:** Until `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` / redirect URI exist, S1 can be coded and unit-tested with mocks, but Connect must show **“WHOOP is not configured”** rather than pretending to authorize.

---

## 5. Environment example (placeholders only)

```bash
# App
DATABASE_URL=postgresql://user:pass@localhost:5432/recovery
AUTH_SECRET=generate-a-long-random-string
APP_BASE_URL=http://localhost:3000

# WHOOP (from Developer Dashboard — never commit real values)
WHOOP_CLIENT_ID=your_whoop_client_id
WHOOP_CLIENT_SECRET=your_whoop_client_secret
WHOOP_REDIRECT_URI=http://localhost:3000/api/whoop/callback
WHOOP_AUTH_URL=https://api.prod.whoop.com/oauth/oauth2/auth
WHOOP_TOKEN_URL=https://api.prod.whoop.com/oauth/oauth2/token
WHOOP_API_BASE=https://api.prod.whoop.com/developer

# Encrypt tokens at rest (32-byte base64 recommended)
TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-key
```

---

## 6. Testing plan (before claiming “live”)

- Unit: state issue/consume, token encrypt/decrypt, refresh single-flight, upsert idempotency, user isolation.
- Integration (with sandbox/test WHOOP app): full OAuth against real authorize URL; sync one day of data; disconnect + revoke.
- Manual QA checklist: Connect → authorize → see real recovery → Disconnect → manual entry still works → second user cannot read first user’s rows.

**Do not claim the integration is live** until a real WHOOP member account completes this path with dashboard credentials.

---

## 7. Decision gates (need answers before coding)

1. **Product vs repo:** Build a new athlete recovery app in this repository, in a new repository, or was this feature meant for a different codebase?
2. **Stack approval:** Accept the Next.js + PostgreSQL recommendation, or specify another server stack you already use?
3. **WHOOP credentials:** Do you already have a WHOOP Developer Dashboard app (Client ID/Secret + membership)? If not, S1 stays infrastructure-only until you create one.

---

## 8. Explicit non-goals for this pass

- No Connect WHOOP UI on Challenge Games pages.
- No mock “connected” success.
- No client-side token storage.
- No invented WHOOP endpoints or fabricated recovery numbers.
