import type { Settings } from './settings'

export type Phase = 'focus' | 'break'

/**
 * `endsAt` is a wall-clock timestamp rather than a countdown number, so the
 * remaining time is always derived from the clock. This stays accurate when the
 * tab is throttled in the background and survives page reloads.
 */
export interface TimerState {
  phase: Phase
  endsAt: number | null // set only while running
  pausedRemainingMs: number | null // set only while paused
}

export type Status = 'idle' | 'running' | 'paused'

export const INITIAL_STATE: TimerState = { phase: 'focus', endsAt: null, pausedRemainingMs: null }

export function phaseDurationMs(phase: Phase, settings: Settings): number {
  const minutes = phase === 'focus' ? settings.focusMinutes : settings.breakMinutes
  return minutes * 60_000
}

export function statusOf(state: TimerState): Status {
  if (state.endsAt !== null) return 'running'
  return state.pausedRemainingMs !== null ? 'paused' : 'idle'
}

export function isRunning(state: TimerState): boolean {
  return statusOf(state) === 'running'
}

/** Start the phase from the top, or resume it if paused. */
export function start(state: TimerState, now: number, settings: Settings): TimerState {
  switch (statusOf(state)) {
    case 'running':
      return state
    case 'paused':
      return { ...state, endsAt: now + state.pausedRemainingMs!, pausedRemainingMs: null }
    case 'idle':
      return { ...state, endsAt: now + phaseDurationMs(state.phase, settings) }
  }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.endsAt === null) return state
  return { ...state, endsAt: null, pausedRemainingMs: Math.max(0, state.endsAt - now) }
}

export function remainingMs(state: TimerState, now: number, settings: Settings): number {
  if (state.endsAt !== null) return Math.max(0, state.endsAt - now)
  return state.pausedRemainingMs ?? phaseDurationMs(state.phase, settings)
}

export function isFinished(state: TimerState, now: number): boolean {
  return state.endsAt !== null && now >= state.endsAt
}

/**
 * Move to the next phase, idle until the user starts it manually. Used both when
 * a phase runs out and when the user skips it.
 */
export function complete(state: TimerState): TimerState {
  return { phase: state.phase === 'focus' ? 'break' : 'focus', endsAt: null, pausedRemainingMs: null }
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const STORAGE_KEY = 'pomodoro:timer'

export function loadTimerState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw) as Partial<TimerState>
    const phase: Phase = parsed.phase === 'break' ? 'break' : 'focus'
    const endsAt = typeof parsed.endsAt === 'number' ? parsed.endsAt : null
    const pausedRemainingMs =
      endsAt === null && typeof parsed.pausedRemainingMs === 'number' ? parsed.pausedRemainingMs : null
    return { phase, endsAt, pausedRemainingMs }
  } catch {
    return INITIAL_STATE
  }
}

export function saveTimerState(state: TimerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
