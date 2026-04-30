# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with three independent npm packages — each has its own `package.json` and `node_modules`:

- **`client/`** — public storefront. Vite + React 19 SPA, Tailwind v3, Zustand, react-router 7, react-helmet-async. Builds to `client/dist/`, served by Nginx as the site root in production.
- **`admin/`** — admin panel SPA. Same stack as client plus `recharts` (dashboards) and `react-dropzone` (uploads). Builds to `admin/dist/`, served by Nginx at `/admin`.
- **`server/`** — Express 4 API. Prisma 6 + PostgreSQL, JWT auth, Joi validation, Multer + Sharp for image uploads, express-rate-limit. CommonJS (the two SPAs are ESM). Runs on port `5000` behind PM2 as process `arkaan-api`.

There is **no root `package.json`** — commands always run from inside one of the three subfolders.

## Common commands

### Storefront (`client/`) and admin (`admin/`) — identical scripts

```bash
npm run dev      # Vite dev server with HMR
npm run build    # production bundle to dist/
npm run lint     # eslint .
npm run preview  # serve the built dist locally
```

No test runner is configured in either app.

### API (`server/`)

```bash
npm run dev          # nodemon server.js
npm start            # production: node server.js (PM2 uses this)
npm run db:migrate   # prisma migrate dev — creates+applies a new migration
npm run db:generate  # prisma generate — regenerate the Prisma client after schema edits
npm run db:studio    # browse the DB in Prisma Studio
npm run db:seed      # node prisma/seed.js
npm run build        # prisma generate && prisma migrate deploy (used on production deploy)
```

Two extra seed scripts at the repo root of `server/`: `seed-demo.js` (sample products/categories) and `seed-prod.js` (minimal production seed).

No automated tests in this repo.

## High-level architecture

### Storefront ↔ admin ↔ API

Both SPAs talk to the API exclusively via `axios` instances at `client/src/utils/api.js` and `admin/src/utils/api.js`. Both attach the JWT from Zustand auth stores (`useAuthStore.js`) on every request and refresh on 401.

Server CORS allowlist is driven by `process.env.CLIENT_URL` and `ADMIN_URL` plus any `*.vercel.app` origin. See `server/server.js` for the route mounting order — sitemap routes are registered at `/` (so Nginx must proxy `/sitemap.xml` to Node), then every API route is mounted under `/api/...`. The Express app does **not** serve any HTML for the SPAs — Nginx serves `client/dist/index.html` and `admin/dist/index.html` directly.

### Data model and the "multi-corner store"

The Prisma model is named `Book` for legacy reasons but the storefront sells more than books — there's an Islamic Corner, Books Corner, Stationery Corner, and historically a Printing Corner. The UI copy says "product" everywhere; only schema names + i18n keys (`books.*`) still mention "book". When adding fields or copy, keep this distinction in mind.

Categories are recursive (top-level "corners" → L2 sub-corners → L3 sections), with `parentId` pointing up. Top-level cats with `parentId = null` and `isActive = true` are the corners that show on the home page.

`Book.images` is a `String[]` of additional image paths beyond `coverImage`. `ProductVariant.image` is per-variant. All three image fields point at files in `server/uploads/covers/`.

Custom fields per category use the `cf_<key>` convention — see admin Categories edit screen and `customFields` JSON columns. Variants inherit base-product custom fields and store only diff-overrides.

### Image upload pipeline

Multer writes the original to `server/uploads/<dir>/<timestamp>-<random>.<ext>`. Then `utils/images.generateVariantsSafe()` (in `server/utils/images.js`) creates three responsive WebP siblings (`-400.webp / -800.webp / -1600.webp` for products, categories, ad-grids; `-800/-1600/-2400` for banners — see `BANNER_WIDTHS`). The shared `unlinkWithVariants(absPath, widths?)` helper deletes the base + all sized siblings together; every controller that replaces or deletes an upload routes through it. Non-`ENOENT` unlink errors are logged to PM2 (`[images] unlink failed for ...`).

`server/scripts/find-orphan-images.js` audits all four upload directories against the DB; run with `--delete` to clean up.

### Auth + storefront state

Auth: `server/middleware/auth.js` validates JWTs; `server/middleware/admin.js` gates admin-only routes. Refresh tokens live in the `RefreshToken` table. Login attempts are rate-limited.

Client/admin state: Zustand stores in `src/stores/`. The auth store persists the access token to `localStorage` and exposes `isAdmin()` for client-side route gating (real authorization is server-side).

Cart and wishlist are stored in localStorage when logged out, hydrated to the server on login. The cart store re-fetches on app mount so stale variant snapshots (price, label, image) never disappear silently.

### Internationalization & RTL

Two locale JSONs per SPA: `src/locales/en.json` and `src/locales/ar.json`. `useLanguageStore.js` exposes `t(key)` which returns the literal key string when missing — keep `|| 'fallback'` patterns in mind when reading code (the fallback rarely fires because keys-as-fallback are truthy). `language === 'ar'` flips the document `dir` to `rtl` and Tailwind's `rtl:` variants take over for direction-aware styles.

### Home page composition

The home page is admin-driven. `Setting.homeLayout` (a JSON value) holds the section order. Each entry is either `{ type: 'corner', cornerId, enabled }` or a global type (`featured`, `bestsellers`, etc.). `homeController.js` filters out stale entries (deleted/deactivated/moved corners) before responding so the admin UI never shows "Unknown corner". Per-corner picks live in the `homeSectionProduct` table; products with the relevant flag (`isFeatured`, `isBestseller`, etc.) are merged in at response time.

### Production deploy notes

Production runs PM2 process `arkaan-api` from `/var/www/arkaan-bookstore/server/server.js`. Nginx serves the two SPA bundles directly and proxies `/api/*` to localhost:5000. After any pull on prod:

- Server-only changes → `pm2 restart arkaan-api`
- Client/admin changes → `npm run build` in the respective folder
- Schema changes → `npm run build` in `server/` runs `prisma generate && prisma migrate deploy`

No CI is configured — deploy is manual.
