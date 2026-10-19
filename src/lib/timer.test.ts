import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import {
  INITIAL_STATE,
  complete,
  elapsedMs,
  formatClock,
  isFinished,
  isRunning,
  loadTimerState,
  remainingMs,
  pause,
  phaseDurationMs,
  saveTimerState,
  start,
  statusOf,
} from './timer'

const MIN = 60_000
const SETTINGS: Settings = { ...DEFAULT_SETTINGS, focusMinutes: 25, breakMinutes: 5 }

const running = start(INITIAL_STATE, 0, SETTINGS)
const paused = pause(running, 10 * MIN)

describe('statusOf', () => {
  it('is running when endsAt is set', () => {
    expect(statusOf(running)).toBe('running')
  })

  it('is paused when there is paused remaining time', () => {
    expect(statusOf(paused)).toBe('paused')
  })

  it('is idle when there is neither', () => {
    expect(statusOf(INITIAL_STATE)).toBe('idle')
  })
})

describe('isRunning', () => {
  it('is true for a running state', () => {
    expect(isRunning(running)).toBe(true)
  })

  it('is false for a paused state', () => {
    expect(isRunning(paused)).toBe(false)
  })

  it('is false for an idle state', () => {
    expect(isRunning(INITIAL_STATE)).toBe(false)
  })
})

describe('phaseDurationMs', () => {
  it('uses the focus duration for the focus phase', () => {
    expect(phaseDurationMs('focus', SETTINGS)).toBe(25 * MIN)
  })

  it('uses the break duration for the break phase', () => {
    expect(phaseDurationMs('break', SETTINGS)).toBe(5 * MIN)
  })
})

describe('start', () => {
  it('starts an idle phase using the configured duration', () => {
    const state = start(INITIAL_STATE, 1000, SETTINGS)
    expect(state).toEqual({
      phase: 'focus',
      endsAt: 1000 + 25 * MIN,
      pausedRemainingMs: null,
      durationMs: 25 * MIN,
    })
  })

  it('uses the break duration for an idle break', () => {
    const idleBreak = complete(running)
    expect(start(idleBreak, 0, SETTINGS).endsAt).toBe(5 * MIN)
  })

  it('resumes a paused phase from its remaining time', () => {
    const resumed = start(paused, 20 * MIN, SETTINGS)
    expect(resumed.endsAt).toBe(35 * MIN)
    expect(resumed.pausedRemainingMs).toBeNull()
  })

  it('returns the same state when already running', () => {
    expect(start(running, 10_000, SETTINGS)).toBe(running)
  })
})

describe('pause', () => {
  it('stops the timer and stores the remaining time', () => {
    expect(paused.endsAt).toBeNull()
    expect(paused.pausedRemainingMs).toBe(15 * MIN)
  })

  it('stores zero remaining time when paused after endsAt', () => {
    // The phase ended at 25 min, but the tick hadn't processed it yet when Pause was pressed.
    const pausedLate = pause(running, 26 * MIN)
    expect(pausedLate.pausedRemainingMs).toBe(0)
  })

  it('returns the same state when not running', () => {
    expect(pause(INITIAL_STATE, 0)).toBe(INITIAL_STATE)
    expect(pause(paused, 20 * MIN)).toBe(paused)
  })
})

describe('remainingMs', () => {
  it('counts down while running', () => {
    expect(remainingMs(running, 5 * MIN, SETTINGS)).toBe(20 * MIN)
  })

  it('shows the full phase duration while idle', () => {
    expect(remainingMs(INITIAL_STATE, 0, SETTINGS)).toBe(25 * MIN)
    expect(remainingMs(complete(INITIAL_STATE), 0, SETTINGS)).toBe(5 * MIN)
  })

  it('stays frozen while paused', () => {
    expect(remainingMs(paused, 10 * MIN, SETTINGS)).toBe(15 * MIN)
    expect(remainingMs(paused, 99 * MIN, SETTINGS)).toBe(15 * MIN)
  })

  it('never goes negative', () => {
    expect(remainingMs(running, 30 * MIN, SETTINGS)).toBe(0)
  })
})

describe('isFinished', () => {
  it('is false just before the end time and true at it', () => {
    expect(isFinished(running, 25 * MIN - 1)).toBe(false)
    expect(isFinished(running, 25 * MIN)).toBe(true)
  })

  it('is false while paused or idle, however much time has passed', () => {
    expect(isFinished(paused, 99 * MIN)).toBe(false)
    expect(isFinished(INITIAL_STATE, 99 * MIN)).toBe(false)
  })
})

describe('complete', () => {
  it('moves from focus to an idle break', () => {
    expect(complete(running)).toEqual({
      phase: 'break',
      endsAt: null,
      pausedRemainingMs: null,
      durationMs: null,
    })
  })

  it('moves from break to an idle focus', () => {
    const runningBreak = start(complete(running), 0, SETTINGS)
    expect(complete(runningBreak)).toEqual({
      phase: 'focus',
      endsAt: null,
      pausedRemainingMs: null,
      durationMs: null,
    })
  })

  it('moves on to the next idle phase when called on a paused phase', () => {
    expect(complete(paused)).toEqual({
      phase: 'break',
      endsAt: null,
      pausedRemainingMs: null,
      durationMs: null,
    })
  })
})

describe('elapsedMs', () => {
  it('is zero while idle', () => {
    expect(elapsedMs(INITIAL_STATE, 0, SETTINGS)).toBe(0)
  })

  it('is the time spent so far while running', () => {
    expect(elapsedMs(running, 10 * MIN, SETTINGS)).toBe(10 * MIN)
  })

  it('excludes time spent paused', () => {
    expect(elapsedMs(paused, 50 * MIN, SETTINGS)).toBe(10 * MIN)
  })

  it('does not exceed the phase duration', () => {
    expect(elapsedMs(running, 99 * MIN, SETTINGS)).toBe(25 * MIN)
  })

  it('uses the duration the phase started with, not the current settings', () => {
    const changed: Settings = { ...SETTINGS, focusMinutes: 50 }
    expect(elapsedMs(paused, 50 * MIN, changed)).toBe(10 * MIN)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [9_000, '00:09'],
    [61_000, '01:01'],
    [5 * MIN + 12_000, '05:12'],
    [25 * MIN, '25:00'],
    [59 * MIN + 59_000, '59:59'],
    [180 * MIN, '180:00'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatClock(ms)).toBe(expected)
  })

  it('rounds partial seconds up', () => {
    expect(formatClock(500)).toBe('00:01')
    expect(formatClock(1_001)).toBe('00:02')
  })
})

describe('saveTimerState', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes the state as JSON under the pomodoro:timer key', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })

    saveTimerState(paused)

    expect(setItem).toHaveBeenCalledWith('pomodoro:timer', JSON.stringify(paused))
  })
})

describe('loadTimerState', () => {
  const seed = (value: unknown) => {
    const raw = typeof value === 'string' ? value : JSON.stringify(value)
    vi.stubGlobal('localStorage', { getItem: () => raw })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns the initial state when nothing is saved', () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(loadTimerState()).toEqual(INITIAL_STATE)
  })

  it('returns the initial state and logs the error when the saved data cannot be read', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('{not json')

    expect(loadTimerState()).toEqual(INITIAL_STATE)
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('restores a running state', () => {
    const saved = { phase: 'focus', endsAt: 5000, pausedRemainingMs: null, durationMs: 1500 }
    seed(saved)
    expect(loadTimerState()).toEqual(saved)
  })

  it('restores a paused state', () => {
    const saved = { phase: 'break', endsAt: null, pausedRemainingMs: 3000, durationMs: 5000 }
    seed(saved)
    expect(loadTimerState()).toEqual(saved)
  })

  it('falls back to focus for an unknown phase', () => {
    seed({ phase: 'nap' })
    expect(loadTimerState().phase).toBe('focus')
  })

  it('drops pausedRemainingMs when endsAt is set, since the timer is running', () => {
    seed({ phase: 'focus', endsAt: 5000, pausedRemainingMs: 3000, durationMs: 1500 })
    expect(loadTimerState().pausedRemainingMs).toBeNull()
  })

  it('drops durationMs when the timer is idle', () => {
    seed({ phase: 'focus', endsAt: null, pausedRemainingMs: null, durationMs: 1500 })
    expect(loadTimerState().durationMs).toBeNull()
  })

  it('treats values of the wrong type as missing', () => {
    seed({ phase: 'focus', endsAt: 'soon', pausedRemainingMs: '3000', durationMs: '1500' })
    expect(loadTimerState()).toEqual(INITIAL_STATE)
  })
})
