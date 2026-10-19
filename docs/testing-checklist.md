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
- [ ] `loadAppearance`: default, valid values, unknown value falls back to system, storage throws
- [ ] `saveAppearance`: writes the value, swallows storage errors

### alerts.ts (browser APIs: mock `AudioContext` and `Notification`)
- [ ] `playSound`: volume 0 plays nothing; volume maps to gain; one oscillator per note with the right wave and frequency
- [ ] `SOUNDS`: every `SoundId` has an entry (guards against adding a sound id without a definition)
- [ ] `prepareAlerts`: requests permission only when `default`; resumes the audio context; safe when `Notification` is missing
- [ ] `alertPhaseComplete`: plays the sound with settings, correct title/body for focus vs break
- [ ] `showNotification` (via `alertPhaseComplete`): nothing when unsupported or not granted; uses the service worker if registered; falls back to `new Notification`

### theme.ts, utils.ts
- No logic worth testing (static copy and a re-export).

## Hooks (`src/hooks/`, `renderHook` plus fake timers)

### useTimer (highest value)
- [ ] Initial state: idle focus phase with full duration
- [ ] `start`: becomes running, calls `prepareAlerts`, remaining counts down as time advances
- [ ] `pause` then `start`: remaining frozen while paused, resumes from there
- [ ] Phase runs out (focus): moves to idle break, records a completed session, plays the alert
- [ ] Phase runs out (break): moves to idle focus, records no session, plays the alert
- [ ] `skip` during focus after 1s or more: records a skipped session with elapsed time, no alert
- [ ] `skip` during focus under 1s, during idle, or during break: records nothing
- [ ] `skip` while paused: elapsed excludes paused time
- [ ] Changing settings mid-phase doesn't change the running phase; applies on next start
- [ ] State persists: reloading (re-mounting) restores running/paused state
- [ ] Reload after a focus phase expired: rolls over to break and records the session once (including under StrictMode)
- [ ] Reload after a break expired: rolls over to focus, no session
- [ ] Interval is cleaned up on unmount and when not running

### useSessions
- [ ] Loads existing records from storage
- [ ] `record` adds a session, updates `today`, and persists
- [ ] Recording the same id twice doesn't duplicate or re-save
- [ ] `today` excludes records from other days

### useSettings
- [ ] Returns loaded settings (defaults when empty)
- [ ] `update` changes state and persists

### useAppearance
- [ ] Initial value from storage, default `system`
- [ ] `update` changes state and persists
- [ ] Toggles the `dark` class and `color-scheme` on `<html>` for light/dark
- [ ] `system` follows `matchMedia`, including live changes
- [ ] Updates the `theme-color` meta tag
- [ ] Removes the media listener on unmount / when appearance changes

### useNotificationPermission
- [ ] Returns `unsupported` when `Notification` is missing
- [ ] Returns the current permission
- [ ] `request` asks for permission and updates the state
- [ ] Updates when the browser permission status changes
- [ ] Copes with `navigator.permissions` missing or rejecting
- [ ] Removes the listener on unmount

## Integration (RTL, real components) — to detail once the hook tests are done

- [ ] TimerPage: start, pause, resume, skip buttons and the clock display
- [ ] TimerPage: today's stats update after a completed focus session
- [ ] TimerPage: heading and hint change between focus and break
- [ ] SettingsPage: change focus/break minutes (valid, invalid input, boundaries) and see them saved
- [ ] SettingsPage: change volume and sound, preview plays, values persist to localStorage
- [ ] SettingsPage: appearance setting switches theme
- [ ] SettingsPage: notification permission states (granted, denied, default, unsupported)
- [ ] App: routing between timer and settings; settings changes affect the timer
