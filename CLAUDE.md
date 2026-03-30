# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm format       # Prettier (ts/tsx files)
pnpm typecheck    # TypeScript type checking (tsc --noEmit)
```

## Architecture

Personal portfolio site built with **Next.js 16** (app router), **React 19**, **TypeScript**, and **Tailwind CSS v4**.

### Routes

- `/` — Landing page (about, work experience, projects, socials)
- `/stats` — Live stats dashboard (GitHub, Chess.com, MonkeyType, Clash Royale)
- `/fun` — Fun hub with links to interactive experiences
- `/fun/sticker-wall` — Interactive pan/zoom canvas where visitors place stickers
- `/api/monkeytype` — Proxy for MonkeyType API
- `/api/clash-royale` — Cron endpoint that records daily Clash Royale battle counts to Turso DB
- `/api/stickers` — POST to submit stickers (AVIF, 10 MB max), GET to fetch approved stickers by viewport bounds
- `/api/stickers/[id]` — GET/PATCH for Discord webhook approve/reject flow

### Data Flow

Stats page components are **async server components** that fetch external APIs directly. Each stat section is wrapped in a `<Suspense>` boundary with skeleton fallbacks for streaming. Caching uses Next.js 16's `"use cache"` directive with `cacheLife("hours")`.

**Turso (LibSQL)** stores Clash Royale daily game counts and sticker submissions. A **GitHub Actions cron job** (`.github/workflows/clash-royale-cron.yml`) hits the `/api/clash-royale` endpoint daily at 11:59 PM CST to record data.

**Sticker Wall** — visitors upload images that are stored in **Vercel Blob**, saved to Turso with pending status, and announced to a **Discord webhook** with approve/reject links. Only approved stickers are served. The canvas uses viewport-based spatial queries with debounced fetching and overlap detection.

### Styling

- Tailwind v4 with CSS custom properties in OKLCh color space (defined in `globals.css`)
- Dark mode via `next-themes` (toggle with `d` key hotkey, defined in `theme-provider.tsx`)
- shadcn/ui components (base-mira style, config in `components.json`)
- `cn()` helper from `src/lib/utils.ts` (clsx + tailwind-merge)

### Key Libraries

- **Motion** (`motion`) — animations (pop-in, page transitions)
- **@vercel/blob** — sticker image storage
- **@jsquash/avif** — client-side AVIF encoding
- **@base-ui/react** — headless UI primitives
- **date-fns** — date utilities with UTC support

### Environment Variables

Required in `.env.local`: `APE_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLASH_ROYALE_API_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_SECRET`, `DISCORD_WEBHOOK_URL`, `NEXT_PUBLIC_SITE_URL`.

### Code Intelligence

Prefer LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).

After writing or editing code, check LSP diagnostics and fix errors before proceeding.

### Session Cleanup

Always run `pnpm format` at the end of every code change before finishing.
