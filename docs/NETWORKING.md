# Networking — CORS, Connectivity, and Where to Touch What

This is the reference for "why can't the frontend reach the backend" and
"where do I actually change something to fix it." Read this whenever
connectivity breaks — a `Network Error` on a phone, a red CORS error in
the browser console, or `ERR_CONNECTION_REFUSED`. For environment setup
(Docker, Postgres, venv) see [SETUP_GUIDE.md](SETUP_GUIDE.md) instead —
this doc is purely about how the frontend and backend find and are
allowed to talk to each other.

---

## 1. What CORS actually is (the concept, not this project's config yet)

**The rule it exists to enforce:** a web page loaded from origin A cannot
read the response of a request it makes to origin B, unless B explicitly
says "I allow requests from A." Browsers enforce this automatically —
it's not something your frontend code can opt out of, and it's not a
backend bug when it happens.

**"Origin" is stricter than most people expect** — it's the exact
combination of scheme + host + port. `http://localhost:5173` and
`http://localhost:8000` are *different origins* (different port), and
`http://localhost:5173` and `https://localhost:5173` are *different
origins* too (different scheme). This is why "it works when I open the
API directly in the browser, but not when my frontend calls it" is such
a common confusion — a direct browser navigation isn't subject to CORS
at all; only a page's own JavaScript calling a *different* origin is.

**`localhost` and `127.0.0.1` are also different origins**, even though
they both mean "this machine" — a real incident, not a hypothetical:
Vite was opened via `http://127.0.0.1:5173` instead of
`http://localhost:5173`, and every request failed with `CORS Missing
Allow Origin` even though `localhost:5173` was already allow-listed.
Confirmed via ngrok's request inspector (`http://127.0.0.1:4040` — logs
every request through a tunnel, including the exact `Origin` header sent
— the fastest way to check this instead of guessing) that the failing
request's `Origin` was literally `http://127.0.0.1:5173`. Fix was adding
that exact origin alongside `localhost` in `main.py`'s `allow_origins`
(§2) — both are worth allow-listing explicitly, since which one a
browser or a teammate happens to type is out of your control.

**What actually happens on a blocked request:** the browser sends the
request (for a `POST`/`PUT`/etc., it usually sends an automatic
`OPTIONS` "preflight" request first, asking permission), the server
responds, but the browser looks at the response's `Access-Control-*`
headers — if the calling page's origin isn't allowed, the browser
**discards the response** before your JavaScript ever sees it. The
request often still shows as "succeeded" server-side (check your
backend's terminal logs) even though the frontend sees nothing but a
network error — that mismatch is the single most common source of
confusion here: **the backend did its job; the browser threw the answer
away.**

**Who decides what's allowed:** the *server being called* — in this
project, that's always the FastAPI backend, since the frontend is the
one making cross-origin calls to it. The backend declares which origins
it trusts via response headers; `CORSMiddleware` (below) is what adds
those headers automatically.

---

## 2. How this project configures it — `main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=(
        r"https://.*\.(ngrok-free\.app|ngrok-free\.dev|ngrok\.io|ngrok\.app)"
        r"|http://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):5173"
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Four settings, each answering a different question:

- **`allow_origins`** — an exact-match allowlist. `http://localhost:5173`
  and `http://127.0.0.1:5173` cover Vite's default dev server opened
  either way — both listed explicitly since (per the incident above)
  they're different origins to a browser despite meaning the same
  machine. This is a literal string comparison — `http://localhost:5174`
  (a different port) would **not** match either entry and would need
  adding explicitly if you ever used it.
- **`allow_origin_regex`** — for origins that can't be pinned to one
  exact string. Two real cases this project has actually hit:
  1. **ngrok tunnels** — every `ngrok http` run can hand out a different
     random subdomain (unless you've reserved a static one — see §4c),
     so there's no single fixed URL to allow-list. The regex matches
     *any* hostname ending in one of ngrok's domains instead of one
     specific one.
  2. **A phone on the same WiFi** — reaching the Vite dev server via the
     PC's LAN IP (e.g. `http://192.168.1.42:5173`) instead of
     `localhost`. That's a different origin than `localhost:5173` as far
     as the browser is concerned, and the specific IP changes machine to
     machine — so the regex matches any private-network IP address
     (`192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`) on Vite's port instead
     of one fixed address.
- **`allow_methods=["*"]`** — permits every HTTP verb (`GET`, `POST`,
  `PUT`, `PATCH`, `DELETE`) from an allowed origin. Without this, only a
  narrow default set of "simple" methods would be allowed and every
  `PATCH`/`DELETE` call from the frontend would be silently blocked.
- **`allow_headers=["*"]`** — permits any request header, notably
  `Authorization: Bearer <token>` — required for essentially every
  endpoint since Phase 10. Without this, the preflight `OPTIONS` request
  would reject the *actual* request before it ever reached FastAPI,
  because the browser wouldn't be pre-authorized to send that header.

**The one thing this file controls, and the one thing it doesn't:** this
config decides *which frontend origins are allowed to receive
responses from this backend*. It has nothing to do with where the
backend itself is reachable from (that's a networking/binding question —
§4) or with authentication (a request can pass CORS and still get `401`
if it has no valid token — those are two completely independent checks
that both have to pass).

---

## 3. How the frontend actually finds the backend

CORS only decides *whether a request is allowed through* — something
else has to decide *what URL the frontend even calls in the first
place*. That's a plain configuration value on the frontend side, not a
backend concern at all — typically an environment variable like
`VITE_API_URL`, read once and used as the base for every `fetch()` call
(see `apiFetch` in [API_REFERENCE.md](API_REFERENCE.md)'s "Minimal
fetch examples" section).

**This is the actual value that has to change per scenario below** —
CORS on the backend doesn't need touching between these scenarios nearly
as often as this one frontend config value does.

---

## 4. The three connectivity scenarios this project actually uses

### (a) Local dev — both on the same machine (the default)

- Backend: `uvicorn main:app --reload` → `http://127.0.0.1:8000`
- Frontend: `npm run dev` → `http://localhost:5173`
- Frontend's `VITE_API_URL` → `http://127.0.0.1:8000`

Nothing special needed — `allow_origins` already covers this exact
origin. This is the case that "just works" with zero networking
configuration.

### (b) A phone (or another device) on the same WiFi

Needed once you want to test on a real phone without going through a
public tunnel. Requires *two* things beyond scenario (a):

1. **Both dev servers must bind to `0.0.0.0`**, not just `127.0.0.1` —
   by default, `127.0.0.1` only accepts connections from the same
   machine, refusing anything arriving over the LAN:
   - Backend: `uvicorn main:app --reload --host 0.0.0.0`
   - Frontend (Vite): `npm run dev -- --host` (or `server: { host: true
     }` in `vite.config.js`) — Vite then prints a `Network:` URL
     alongside the usual `Local:` one; that's the LAN IP to use.
2. **Frontend's `VITE_API_URL` must point at the PC's LAN IP**, not
   `localhost` — e.g. `http://192.168.1.42:8000`. This is the mistake
   that caused the very first "Network error" investigated in this
   project: code running *on the phone* that calls `127.0.0.1` is asking
   the phone to find a backend on *itself*, not your PC.

**A real trap worth remembering:** if the frontend is served over
**HTTPS** (e.g. still tunneled through ngrok) while the backend is
reached over plain **HTTP** on the LAN, browsers block that combination
outright ("mixed content") — a silent failure that looks identical to a
CORS error. Keep both sides on the same scheme for this scenario: plain
HTTP frontend *and* HTTP backend, both via LAN IP, no ngrok involved at
all.

**Windows Firewall:** the first time a dev server binds to `0.0.0.0`,
Windows will usually prompt to allow it through the firewall for
Private networks — accept that, or LAN devices won't reach it even with
everything else correct.

### (c) Fully public — ngrok tunnels

Needed for access from anywhere, not just the same WiFi (e.g. testing
over mobile data, or sharing a live link with someone remote).

- Backend tunnel: `ngrok http --domain=sharita-beerier-reputably.ngrok-free.dev 8000`
  — a **reserved, static** domain, chosen deliberately so this URL never
  changes across restarts (see the note below on why that matters).
- Frontend tunnel: its own separate `ngrok http <port>` (static or
  random, depending on what's reserved for it).
- Frontend's `VITE_API_URL` → the backend's ngrok URL (currently
  `https://sharita-beerier-reputably.ngrok-free.dev`).

**Why the backend domain specifically needed to be static:** the
backend's URL is a *config value baked into the frontend* — every
restart of a random-domain tunnel meant manually updating
`VITE_API_URL` and rebuilding/restarting the frontend to match. The
frontend's own tunnel URL is just a *link people open*, which is
annoying to have change but doesn't break anything code-side — so it
was the backend that got the one reserved free-tier static domain.

**A second reason this domain needed to be static, added later:**
`PUBLIC_BASE_URL` (a `.env` value, currently set to this same
`https://sharita-beerier-reputably.ngrok-free.dev`) is what the backend
uses to build every stored `photo_url` — see
[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) §18 and
[API_REFERENCE.md](API_REFERENCE.md)'s "Profile Photo" section. Unlike
`VITE_API_URL`, this one isn't just a live config value the frontend
reads on startup — it gets **baked into data already saved in Postgres**
the moment a photo is uploaded (`users.photo_url`). If this domain ever
changed, every previously-uploaded photo's URL would break (`404`) even
though the image itself is still sitting safely in GridFS — a stale
link, not a missing file. Changing `PUBLIC_BASE_URL` is not just a
config edit, it also means re-deriving `photo_url = {new
PUBLIC_BASE_URL}/files/{photo_file_id}` for every row that has one.

**No `--host 0.0.0.0` needed here** — ngrok connects to
`http://localhost:8000` directly, from the same machine, then exposes
*that* publicly. The "bind to `0.0.0.0`" requirement is specific to
scenario (b), where a different physical device connects over the LAN
directly.

---

## 5. Quick reference — where to touch, for what

| Symptom / task | Touch this |
|---|---|
| Frontend can't reach backend at all (`Network Error`, `ERR_CONNECTION_REFUSED`) | Frontend's `VITE_API_URL` — does it match the scenario you're actually running (§4)? |
| Browser console shows a CORS error specifically | `main.py`'s `CORSMiddleware` — is the frontend's *exact* origin covered by `allow_origins` or `allow_origin_regex`? |
| Works on PC, fails on phone (same WiFi) | Both dev servers need `--host 0.0.0.0` (§4b), and `VITE_API_URL` needs the LAN IP, not `localhost` |
| Works on PC, fails on phone (different network / mobile data) | Need the ngrok scenario (§4c), not the LAN one — different networks can't reach a LAN IP at all |
| A brand-new frontend port/origin you haven't used before | Add it to `allow_origins` in `main.py` (exact match) if it's a fixed one, or extend `allow_origin_regex` if it'll vary |
| Backend ngrok URL needs to stop changing every restart | Reserve a static domain in the ngrok dashboard, then always start with `ngrok http --domain=<your-domain> 8000` |
| Requests reach the backend (visible in its terminal logs) but the frontend sees nothing | This is almost always CORS, not a real network failure — the backend answered, the browser discarded it. Check the exact origin again |
| `401 Unauthorized` on every request | Not a networking issue at all — this means the request *got there* and CORS *passed*; see [API_REFERENCE.md](API_REFERENCE.md)'s auth section instead |
| A profile photo's `photo_url` 404s, or an `<img>` shows broken | Check `.env`'s `PUBLIC_BASE_URL` matches the backend's *current* live domain — if it was ever changed after photos were already uploaded, old `photo_url` values in Postgres still point at the old domain (see §4c above) |

---

## 6. Fast diagnosis checklist

When something doesn't connect, check in this order — each step rules
out a whole category:

1. **Is the backend even running?** `curl http://127.0.0.1:8000/health`
   from the same machine the backend is on. If this fails, nothing else
   matters yet — fix this first.
2. **Is the *calling device* using the right base URL for the current
   scenario?** `localhost`/`127.0.0.1` only ever means "this exact
   device," never the PC, from any other device's perspective.
3. **Open the browser's DevTools console on the failing device.** A CORS
   error names itself explicitly ("has been blocked by CORS policy") —
   if you see that exact phrase, it's definitely CORS (§2), not a dead
   backend or wrong URL.
4. **Check the backend's own terminal output.** If a request shows up
   there with a normal status code, the network path works fine and the
   problem is entirely on the browser/CORS side, not connectivity.
5. **If frontend is HTTPS and backend is plain HTTP**, that's mixed
   content (§4b's trap) before it's anything else — match the schemes.
6. **If you're going through ngrok, don't guess the origin — look it
   up.** `http://127.0.0.1:4040` (ngrok's local dashboard, on whichever
   agent is tunneling the backend) has a request inspector showing every
   request that passed through, including the exact `Origin` header it
   sent and the status code it got back. This is how the
   `127.0.0.1:5173` vs `localhost:5173` incident above was actually
   found — faster and more reliable than asking "what URL is open in
   your browser," since it shows the literal value the browser sent.
