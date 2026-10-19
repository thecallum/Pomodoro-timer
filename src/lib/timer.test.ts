import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import {
  INITIAL_STATE,
  complete,
  elapsedMs,
  formatClock,
  isFinished,
  remainingMs,
  pause,
  statusOf,
  start,
} from './timer'

const MIN = 60_000
const SETTINGS: Settings = { ...DEFAULT_SETTINGS, focusMinutes: 25, breakMinutes: 5 }

describe('timer', () => {
  it('starts a focus session of the configured length', () => {
    const state = start(INITIAL_STATE, 1000, SETTINGS)
    expect(state.phase).toBe('focus')
    expect(state.endsAt).toBe(1000 + 25 * MIN)
    expect(remainingMs(state, 1000 + 5 * MIN, SETTINGS)).toBe(20 * MIN)
  })

  it('shows the full phase duration while idle', () => {
    expect(remainingMs(INITIAL_STATE, 0, SETTINGS)).toBe(25 * MIN)
  })

  it('ignores start while already running', () => {
    const running = start(INITIAL_STATE, 0, SETTINGS)
    expect(start(running, 10_000, SETTINGS)).toBe(running)
  })

  it('finishes exactly at endsAt and never reports negative time', () => {
    const state = start(INITIAL_STATE, 0, SETTINGS)
    expect(isFinished(state, 25 * MIN - 1)).toBe(false)
    expect(isFinished(state, 25 * MIN)).toBe(true)
    expect(remainingMs(state, 30 * MIN, SETTINGS)).toBe(0)
  })

  it('moves to an idle break after focus, then back to focus', () => {
    const afterFocus = complete(start(INITIAL_STATE, 0, SETTINGS))
    expect(afterFocus).toEqual({ phase: 'break', endsAt: null, pausedRemainingMs: null, durationMs: null })
    expect(remainingMs(afterFocus, 0, SETTINGS)).toBe(5 * MIN)

    const afterBreak = complete(start(afterFocus, 0, SETTINGS))
    expect(afterBreak).toEqual({ phase: 'focus', endsAt: null, pausedRemainingMs: null, durationMs: null })
  })

  it('pauses with the remaining time frozen, and resumes from it', () => {
    const running = start(INITIAL_STATE, 0, SETTINGS)
    const paused = pause(running, 10 * MIN)
    expect(statusOf(paused)).toBe('paused')
    expect(remainingMs(paused, 99 * MIN, SETTINGS)).toBe(15 * MIN)
    expect(isFinished(paused, 99 * MIN)).toBe(false)

    const resumed = start(paused, 20 * MIN, SETTINGS)
    expect(statusOf(resumed)).toBe('running')
    expect(resumed.endsAt).toBe(35 * MIN)
  })

  it('ignores pause when not running', () => {
    expect(pause(INITIAL_STATE, 0)).toBe(INITIAL_STATE)
  })

  it('skipping a paused phase moves to the next idle phase', () => {
    const paused = pause(start(INITIAL_STATE, 0, SETTINGS), MIN)
    const next = complete(paused)
    expect(statusOf(next)).toBe('idle')
    expect(next.phase).toBe('break')
    expect(remainingMs(next, 0, SETTINGS)).toBe(5 * MIN)
  })

  it('formats the clock, rounding partial seconds up', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_000)).toBe('01:01')
    expect(formatClock(500)).toBe('00:01')
    expect(formatClock(0)).toBe('00:00')
  })

  it('tracks elapsed time excluding pauses, using the duration it started with', () => {
    expect(elapsedMs(INITIAL_STATE, 0, SETTINGS)).toBe(0)

    const running = start(INITIAL_STATE, 0, SETTINGS)
    expect(elapsedMs(running, 10 * MIN, SETTINGS)).toBe(10 * MIN)

    const paused = pause(running, 10 * MIN)
    expect(elapsedMs(paused, 50 * MIN, SETTINGS)).toBe(10 * MIN)

    // Changing settings mid-session doesn't change what this session was.
    const changed: Settings = { ...SETTINGS, focusMinutes: 50 }
    expect(elapsedMs(paused, 50 * MIN, changed)).toBe(10 * MIN)
  })
})
