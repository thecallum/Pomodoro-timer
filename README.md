# Pomodoro Timer

A local-first pomodoro timer: 25 minute focus, 5 minute break (started manually). Installable as a PWA. No backend; state lives in localStorage.

Stack: Vite, React, TypeScript, Tailwind v4, shadcn/ui, vite-plugin-pwa, Vitest.

## Commands

    pnpm dev        # dev server
    pnpm build      # typecheck + production build (generates the service worker)
    pnpm preview    # serve the production build (test PWA install here)
    pnpm test       # unit tests
    pnpm generate-pwa-assets   # regenerate icons from public/icon.svg

## Structure

- `src/lib/timer.ts` pure timer state machine (no React); `endsAt` timestamp based
- `src/lib/settings.ts` durations and persistence; no UI yet, add one by calling `saveSettings`
- `src/lib/alerts.ts` chime and notifications
- `src/hooks/useTimer.ts` wires the above to React
