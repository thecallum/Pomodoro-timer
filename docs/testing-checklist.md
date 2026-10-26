# Test checklist

Legend: `[x]` covered by an existing test, `[ ]` not yet covered. Ticks are based on a read of the existing tests; each unit's behaviours still need to be agreed before tests are written.

## Pure logic (`src/lib/`)

### timer.ts
- [x] `start`: idle starts a full phase, running is a no-op, paused resumes
- [x] `pause`: freezes remaining time, no-op when not running
- [x] `remainingMs`: idle shows full duration, never negative
- [x] `elapsedMs`: excludes pauses, uses the duration the phase started with
- [x] `isFinished`: exact boundary at `endsAt`
- [x] `complete`: focus to break and back, ends idle
- [x] `formatClock`: rounds partial seconds up, zero-pads
- [x] `statusOf`: idle, running, paused
- [x] `isRunning`: true only when running
- [x] `phaseDurationMs`: focus vs break
- [x] `pause` with `now` past `endsAt` clamps remaining to 0
- [x] `formatClock` with 1h+ values (180 min gives `180:00`)
- [x] `loadTimerState`: empty storage, unreadable data (logged), unknown phase falls back to focus
- [x] `loadTimerState`: restores running and paused states; ignores `pausedRemainingMs` when `endsAt` is set; ignores `durationMs` when idle; wrong types treated as missing
- [x] `saveTimerState`: writes JSON under `pomodoro:timer`
- [ ] `saveTimerState` / `loadTimerState` round trip (integration, not a unit test)

### settings.ts
- [x] `parseMinutes`: valid and invalid inputs
- [x] `loadSettings`: empty storage, unreadable data (logged), missing fields use defaults, volume clamped, unknown sound rejected
- [x] `saveSettings`: writes JSON under `pomodoro:settings`
- [ ] `saveSettings` / `loadSettings` round trip (integration, not a unit test)

### sessions.ts
- [x] `addRecord`: dedupes by id
- [x] `summarizeDay`: day boundaries, skipped sessions count time but not completions, empty
- [x] `formatDuration`: unit scaling
- [x] `loadRecords`: empty storage, unreadable data (logged), not an array, restores saved records
- [ ] `loadRecords`: malformed entries filtered out
- [x] `saveRecords`: writes JSON under `pomodoro:sessions`
- [ ] `saveRecords` / `loadRecords` round trip (integration, not a unit test)
- [ ] `summarizeDay`: day argument at different times of day gives the same day

### appearance.ts
- [x] `isDark`: system vs explicit
- [x] `loadAppearance`: default, valid values, unknown value falls back to system, storage throws (logged)
- [x] `saveAppearance`: writes the value under `pomodoro:appearance`, logs and does not throw when storage fails

### alerts.ts (browser APIs: mock `AudioContext` and `Notification`)
- [x] `playSound`: volume 0 plays nothing; volume maps to gain; one oscillator per note with the right wave and frequency
- `SOUNDS`: no runtime test, since the `Record<SoundId, ...>` type already enforces an entry per sound id
- [x] `prepareAlerts`: requests permission only when `default`; resumes the audio context; safe when `Notification` is missing; logs when the request fails
- [x] `alertPhaseComplete`: plays the sound with settings, correct title/body for focus vs break
- [x] `showNotification` (via `alertPhaseComplete`): nothing when unsupported or not granted; uses the service worker if registered; falls back to `new Notification`; logs when showing fails

### theme.ts, utils.ts
- No logic worth testing (static copy and a re-export).

## Hooks (`src/hooks/`, `renderHook` plus fake timers)

### useTimer (highest value)
- [x] Initial state: idle focus phase with full duration
- [x] `start`: becomes running, calls `prepareAlerts`, remaining counts down as time advances
- [x] `pause` then `start`: remaining frozen while paused, resumes from there
- [x] Phase runs out (focus): moves to idle break, records a completed session, plays the alert
- [x] Phase runs out (break): moves to idle focus, records no session, plays the alert
- [x] `skip` during focus after 1s or more: records a skipped session with elapsed time, no alert
- [x] `skip` during focus under 1s, during idle, or during break: records nothing
- [x] `skip` while paused: elapsed excludes paused time
- [x] Changing settings mid-phase doesn't change the running phase; applies on next start
- [x] State persists: reloading (re-mounting) restores running/paused state
- [x] Reload after a focus phase expired: rolls over to break and records the session once (including under StrictMode)
- [x] Reload after a break expired: rolls over to focus, no session
- [x] Interval is cleaned up on unmount and when not running

### useSessions
- [x] Loads existing records from storage
- [x] `record` adds a session, updates `today`, and persists
- [x] Recording the same id twice doesn't duplicate or re-save
- [ ] `today` excludes records from other days

### useSettings
- [x] Returns loaded settings (defaults when empty)
- [x] `update` changes state and persists

### useAppearance
- [x] Initial value from storage, default `system`
- [x] `update` changes state and persists
- [x] Toggles the `dark` class and `color-scheme` on `<html>` for light/dark
- [x] `system` follows `matchMedia`, including live changes
- [x] Updates the `theme-color` meta tag
- [x] Removes the media listener on unmount / when appearance changes

### useNotificationPermission
- [x] Returns `unsupported` when `Notification` is missing
- [x] Returns the current permission
- [x] `request` asks for permission and updates the state
- [x] Updates when the browser permission status changes
- [x] Copes with `navigator.permissions` missing or rejecting
- [x] Removes the listener on unmount

## Integration (RTL, jsdom, real components and hooks)

Render `<App />` in a `MemoryRouter` (`renderApp` in `src/test-utils.tsx`) with real hooks and real `localStorage`. Only browser edges are faked: audio/alerts, `Notification`, `matchMedia` and timers. Timer-driven files use `fireEvent` because user-event hangs under vitest's fake timers.

### TimerPage (`src/pages/TimerPage.test.tsx`)
- [x] Fresh timer: focus heading and hint, `25:00`, "Start focus", nothing done today
- [x] Start: clock counts down, button becomes Pause
- [x] Pause freezes the clock and shows Resume and "Paused"; Resume carries on from where it stopped
- [x] Skip: idle focus to idle break, and break back to focus
- [x] Skip part way through focus adds the time to today without a completed session
- [x] Focus runs out: idle break, completed session in today's stats (singular and plural), alert sounded
- [x] Break runs out: idle focus, today unchanged

### SettingsPage (`src/pages/SettingsPage.test.tsx`)
- [x] Focus/break length: shows current, saves valid, boundaries (1, 180), rejects empty/0/181/decimal, blur restores the last saved value
- [x] Volume: shows and saves; preview on release (pointer and key) at the new volume, not while dragging
- [x] Sound: selection saved and previewed; play button previews the current sound
- [x] Appearance: selection switches the `dark` class on `<html>` and is saved
- [x] Notifications: default (with Enable), enabling, granted, denied (with help text), unsupported

### App (`src/App.test.tsx`)
- [x] Routing: timer by default, settings and Back, direct `/settings`, unknown path redirects
- [x] Timer keeps running while on the settings page
- [x] Changed focus/break length shows on an idle timer; a running session is unaffected and the next start uses the new length
- [x] `document.title`: idle, running, paused, break, back to idle

## E2E (Playwright, real browser, production build) — run with `pnpm test:e2e`

Things jsdom can't check. Kept to a few happy paths.

- [x] Start a timer, reload the page, and it is still running (`e2e/timer-page.spec.ts`)
- [x] Complete a short session (1 minute focus, Playwright clock) and Today updates (`e2e/timer-page.spec.ts`)
- [x] A saved dark appearance is applied by the inline script in `index.html` before the app's scripts load (`e2e/appearance.spec.ts`)
- [x] App loads offline once the service worker has cached it (`e2e/pwa.spec.ts`)
