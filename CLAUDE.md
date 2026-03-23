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

- `/` — Landing page (about, work experience, projects)
- `/stats` — Live stats dashboard (GitHub, Chess.com, MonkeyType, Clash Royale)
- `/api/monkeytype` — Proxy for MonkeyType API
- `/api/clash-royale` — Cron endpoint that records daily Clash Royale battle counts to Turso DB

### Data Flow

Stats page components are **async server components** that fetch external APIs directly. Each stat section is wrapped in a `<Suspense>` boundary with skeleton fallbacks for streaming. Caching uses Next.js 16's `"use cache"` directive with `cacheLife("hours")`.

**Turso (LibSQL)** stores Clash Royale daily game counts. A **GitHub Actions cron job** (`.github/workflows/clash-royale-cron.yml`) hits the `/api/clash-royale` endpoint daily at 11:59 PM CST to record data.

### Styling

- Tailwind v4 with CSS custom properties in OKLCh color space (defined in `globals.css`)
- Dark mode via `next-themes` (toggle with `d` key hotkey, defined in `theme-provider.tsx`)
- shadcn/ui components (base-mira style, config in `components.json`)
- `cn()` helper from `src/lib/utils.ts` (clsx + tailwind-merge)

### Environment Variables

Required in `.env.local`: `APE_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLASH_ROYALE_API_KEY`, `CRON_SECRET`.

### Code Intelligence

Prefer LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).

After writing or editing code, check LSP diagnostics and fix errors before proceeding.
