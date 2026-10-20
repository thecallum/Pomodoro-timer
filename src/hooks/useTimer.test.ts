import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareAlerts } from '@/lib/alerts'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import type { TimerState } from '@/lib/timer'
import { useTimer } from './useTimer'

vi.mock('@/lib/alerts', () => ({ prepareAlerts: vi.fn(), alertPhaseComplete: vi.fn() }))

const MIN = 60_000
const NOW = new Date(2026, 9, 14, 12, 0).getTime()
const SETTINGS = { ...DEFAULT_SETTINGS, focusMinutes: 25, breakMinutes: 5 }

const onSession = vi.fn()

function seedSavedTimer(state: TimerState) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'pomodoro:timer' ? JSON.stringify(state) : null),
    setItem: vi.fn(),
  })
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const renderTimer = () => renderHook(() => useTimer(SETTINGS, onSession))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('initial state', () => {
  it('is an idle focus phase with the full duration when nothing is saved', () => {
    const { result } = renderTimer()

    expect(result.current.phase).toBe('focus')
    expect(result.current.status).toBe('idle')
    expect(result.current.remainingMs).toBe(25 * MIN)
  })

  it('continues a saved paused timer from where it was paused', () => {
    seedSavedTimer({ phase: 'focus', endsAt: null, pausedRemainingMs: 10 * MIN, durationMs: 25 * MIN })

    const { result } = renderTimer()

    expect(result.current.status).toBe('paused')
    expect(result.current.remainingMs).toBe(10 * MIN)
  })

  it('continues a saved running timer, counting down from the clock', () => {
    seedSavedTimer({ phase: 'focus', endsAt: NOW + 10 * MIN, pausedRemainingMs: null, durationMs: 25 * MIN })

    const { result } = renderTimer()
    advance(MIN)

    expect(result.current.status).toBe('running')
    expect(result.current.remainingMs).toBe(9 * MIN)
  })
})

describe('start', () => {
  it('prepares the alerts', () => {
    const { result } = renderTimer()

    act(() => result.current.start())

    expect(prepareAlerts).toHaveBeenCalledOnce()
  })

  it('starts the timer running', () => {
    const { result } = renderTimer()

    act(() => result.current.start())

    expect(result.current.status).toBe('running')
  })
})

describe('pause', () => {
  it('pauses the timer, freezing the remaining time', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(5 * MIN)

    act(() => result.current.pause())
    advance(5 * MIN)

    expect(result.current.status).toBe('paused')
    expect(result.current.remainingMs).toBe(20 * MIN)
  })
})

describe('skip', () => {
  it('moves on to the break without recording a session when skipped immediately', () => {
    const { result } = renderTimer()
    act(() => result.current.start())

    act(() => result.current.skip())

    expect(result.current.phase).toBe('break')
    expect(onSession).not.toHaveBeenCalled()
  })

  it('records the elapsed time as a skipped session when skipped part way through', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(10 * MIN)

    act(() => result.current.skip())

    expect(onSession).toHaveBeenCalledOnce()
    expect(onSession).toHaveBeenCalledWith(
      expect.objectContaining({ focusedMs: 10 * MIN, completed: false }),
    )
  })

  it.todo('records nothing when skipping a break')
  it.todo('records nothing when skipping while idle')
  it.todo('does not count paused time in the skipped session')
})

describe('phase running out', () => {
  it.todo('moves a finished focus phase to an idle break, records the session and plays the alert')
  it.todo('moves a finished break to an idle focus, records nothing and plays the alert')
})

describe('settings changes', () => {
  it.todo('does not change a running phase, and applies from the next start')
})

describe('reload recovery', () => {
  it.todo('rolls an expired saved focus phase over to break and records the session once')
  it.todo('rolls an expired saved break over to focus without recording a session')
})

describe('persistence', () => {
  it.todo('saves the timer state whenever it changes')
  it.todo('stops ticking when unmounted')
})
