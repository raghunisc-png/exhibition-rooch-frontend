# Exhibition Invoicing — Frontend

A mobile-first, installable web app used by sales agents at exhibition booths to capture
customer purchases, generate invoices, and send them to customers — even with no
internet connection at the booth.

## Tech stack

| Concern | Technology |
|---|---|
| Framework | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite 5](https://vitejs.dev/) |
| Routing | [react-router-dom v6](https://reactrouter.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| HTTP client | [axios](https://axios-http.com/) |
| Offline storage | [Dexie](https://dexie.org/) (IndexedDB wrapper) + `dexie-react-hooks` |
| PWA / installability | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox service worker) |
| Image handling | `browser-image-compression` (compress photos before upload), custom `CameraCapture` component |
| Production server | Nginx (Alpine), serving the static build |
| Containerization | Docker (multi-stage build) |

This repo talks to a separate [backend](../backend) (FastAPI) over a REST API. The two
are independent git repositories — see the [root README](../README.md) for how they fit
together and how to run both with `docker-compose`.

## How the app is built

- `npm run build` runs `tsc -b` (type-check + project references build) followed by
  `vite build`. Vite bundles everything into `dist/`.
- The Vite config (`vite.config.ts`) wires up two plugins:
  - `@vitejs/plugin-react` — standard React/JSX support with fast refresh.
  - `vite-plugin-pwa` — generates a service worker and web app manifest at build time so
    the app can be installed on a phone home screen and its static assets are cached for
    offline use.
- In Docker (`Dockerfile`), the build happens in a `node:20-alpine` stage, then only the
  compiled `dist/` output is copied into an `nginx:1.27-alpine` stage. `nginx.conf`
  serves it as a single-page app (falls back to `index.html` for client-side routes) and
  sets cache headers.

## Project structure

```
src/
  api/            axios client + typed API calls (auth, invoices)
  components/     shared UI: Layout, ProtectedRoute, CameraCapture, SyncStatusBadge
  context/        AuthContext — holds the logged-in agent + JWT token
  db/             offlineDb.ts — IndexedDB (Dexie) tables for offline invoice queue
                  and a read-through cache of the invoice list
  pages/          route-level screens: Login, NewInvoice, InvoiceList, InvoiceDetail
  sync/           syncManager.ts — background sync that flushes queued offline
                  invoices to the backend once connectivity returns
  types.ts        shared TypeScript types
  App.tsx         route definitions
  main.tsx        React root / app entry point
public/           static assets (icons, favicon, robots.txt) copied as-is into dist/
```

### How offline mode works

1. Creating an invoice while offline (or on a flaky connection) saves it to
   `pendingInvoices` in IndexedDB via `src/db/offlineDb.ts` instead of failing.
2. `src/sync/syncManager.ts` runs a background loop (`startAutoSync`, called once from
   `App.tsx`) that periodically tries to push any pending invoices to the backend and
   marks them `pending` / `failed` / synced accordingly.
3. `SyncStatusBadge` shows the agent how many invoices are still waiting to sync.
4. The invoice list is also cached locally (`cachedInvoices`) so agents can browse recent
   history with no connection.

### Auth

`AuthContext` holds the current session; the JWT returned by the backend is stored in
`localStorage` (see `src/api/client.ts`) and attached to every request via an axios
request interceptor. A 401 response clears the stored token. `ProtectedRoute` redirects
to `/login` when there's no valid session.

## Prerequisites

- [Node.js](https://nodejs.org/) 20.x (matches the version used in the Docker build)
- npm (comes with Node)
- The [backend](../backend) running somewhere reachable (locally on `http://localhost:8000`
  by default) — the frontend calls it directly, it does not work standalone

## Local setup

```bash
# from the frontend/ directory
npm install

cp .env.example .env
# .env only needs one variable:
#   VITE_API_BASE_URL=http://localhost:8000
# point it at wherever your backend is running

npm run dev
```

The dev server starts on **http://localhost:5173** (see `server.port` in
`vite.config.ts`). It's exposed on all network interfaces (`host: true`), so it's also
reachable from a phone on the same Wi-Fi — useful for testing camera capture and PWA
install on an actual device.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally, for a final check before deploying |
| `npm run lint` | Run ESLint over the project |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the backend API. Baked into the build at build time (Vite only exposes `VITE_`-prefixed vars to client code) — set it before `npm run build` / when passing `--build-arg VITE_API_BASE_URL=...` to Docker. |

## Running with Docker

```bash
docker build -t exhibition-frontend --build-arg VITE_API_BASE_URL=http://localhost:8000 .
docker run -p 5173:80 exhibition-frontend
```

Or, more commonly, run both frontend and backend together via `docker-compose` from the
[root of the project](../docker-compose.yml):

```bash
cd ..
docker compose up --build
```

This starts Postgres, the backend on `:8000`, and the frontend (served by Nginx) on
`:5173`.

## Notes for first-time contributors

- This is a Vite + TypeScript project, not Create React App — there's no `craco`/`webpack`
  config to worry about, everything is in `vite.config.ts`.
- There's no `package-lock.json` committed yet; the first `npm install` you run will
  generate one — commit it so builds stay reproducible.
- Tailwind classes are used directly in JSX (see `tailwind.config.js` for the content
  globs); there's no separate CSS-in-JS layer.
- The service worker (from `vite-plugin-pwa`) only activates in a production build
  (`npm run build` + `npm run preview`, or Docker) — during `npm run dev` you're working
  against unbundled source with no offline caching of the app shell itself (the
  IndexedDB offline invoice queue still works in dev, since that's plain app code).
