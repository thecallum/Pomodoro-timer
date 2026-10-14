import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import {
  INITIAL_STATE,
  complete,
  formatClock,
  isFinished,
  remainingMs,
  reset,
  start,
} from './timer'

const MIN = 60_000

describe('timer', () => {
  it('starts a focus session of the configured length', () => {
    const state = start(INITIAL_STATE, 1000, DEFAULT_SETTINGS)
    expect(state.phase).toBe('focus')
    expect(state.endsAt).toBe(1000 + 25 * MIN)
    expect(remainingMs(state, 1000 + 5 * MIN, DEFAULT_SETTINGS)).toBe(20 * MIN)
  })

  it('shows the full phase duration while idle', () => {
    expect(remainingMs(INITIAL_STATE, 0, DEFAULT_SETTINGS)).toBe(25 * MIN)
  })

  it('ignores start while already running', () => {
    const running = start(INITIAL_STATE, 0, DEFAULT_SETTINGS)
    expect(start(running, 10_000, DEFAULT_SETTINGS)).toBe(running)
  })

  it('finishes exactly at endsAt and never reports negative time', () => {
    const state = start(INITIAL_STATE, 0, DEFAULT_SETTINGS)
    expect(isFinished(state, 25 * MIN - 1)).toBe(false)
    expect(isFinished(state, 25 * MIN)).toBe(true)
    expect(remainingMs(state, 30 * MIN, DEFAULT_SETTINGS)).toBe(0)
  })

  it('moves to an idle break after focus, then back to focus', () => {
    const afterFocus = complete(start(INITIAL_STATE, 0, DEFAULT_SETTINGS))
    expect(afterFocus).toEqual({ phase: 'break', endsAt: null })
    expect(remainingMs(afterFocus, 0, DEFAULT_SETTINGS)).toBe(5 * MIN)

    const afterBreak = complete(start(afterFocus, 0, DEFAULT_SETTINGS))
    expect(afterBreak).toEqual({ phase: 'focus', endsAt: null })
  })

  it('reset returns to an idle focus session', () => {
    expect(reset()).toEqual(INITIAL_STATE)
  })

  it('formats the clock, rounding partial seconds up', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_000)).toBe('01:01')
    expect(formatClock(500)).toBe('00:01')
    expect(formatClock(0)).toBe('00:00')
  })
})
