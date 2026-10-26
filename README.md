# Pomodoro Timer

A local-first pomodoro timer: 25 minute focus, 5 minute break (started manually). Installable as a PWA. No backend; state lives in localStorage.

Stack: Vite, React, TypeScript, Tailwind v4, shadcn/ui, vite-plugin-pwa, Vitest.

## Commands

    pnpm dev        # dev server
    pnpm build      # typecheck + production build (generates the service worker)
    pnpm preview    # serve the production build (test PWA install here)
    pnpm test       # unit tests
    pnpm generate-pwa-assets   # regenerate icons from public/icon.svg

## Deployment

Hosted on Cloudflare Pages at `pomodoro.thecallum.com`. The `deploy` job in `.github/workflows/ci.yml` runs after tests pass: pushes to `main` deploy to production, and same-repo pull requests deploy to a preview URL (shown in the job summary).

One-time setup:

1. Add `thecallum.com` to Cloudflare and point the registrar's nameservers at it.
2. Create a Pages project named `pomodoro` using direct upload (Workers & Pages > Create > Pages > Upload assets).
3. Create an API token with the "Cloudflare Pages: Edit" permission and add it, plus the account ID, as the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. In the Pages project, add the custom domain `pomodoro.thecallum.com`.

## Structure

- `src/lib/timer.ts` pure timer state machine (no React); `endsAt` timestamp based
- `src/lib/settings.ts` durations and persistence; no UI yet, add one by calling `saveSettings`
- `src/lib/alerts.ts` chime and notifications
- `src/hooks/useTimer.ts` wires the above to React
