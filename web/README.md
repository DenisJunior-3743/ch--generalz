# University Records System — Web

The React (Vite + Tailwind CSS) frontend for the university records
system. Part of the [ch--generalz](../) monorepo — see the [root
README](../README.md) for the full project overview, and
[docs/API_REFERENCE.md](../docs/API_REFERENCE.md) for the backend API
this talks to.

## Stack

React 19, Vite 8, Tailwind CSS v4, react-router-dom, react-hook-form +
zod, axios.

## Running locally

```bash
cd web
npm install
```

Create `web/.env` (see `.env.example`):
```
VITE_API_URL=http://127.0.0.1:8000
```
Point this at wherever the backend is actually reachable — see
[docs/NETWORKING.md](../docs/NETWORKING.md) for local/same-WiFi/ngrok
setups.

```bash
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build (`dist/`)
- `npm run lint` — oxlint

## Deployment

Deployed on Vercel from the `web-deploy` branch (Root Directory: `web`).
Day-to-day work happens on `main`; merge into `web-deploy` when a change
is ready to go live.
