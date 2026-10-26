import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alertPhaseComplete, prepareAlerts } from '@/lib/alerts'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings'
import type { TimerState } from '@/lib/timer'
import { useTimer } from './useTimer'

vi.mock('@/lib/alerts', () => ({ prepareAlerts: vi.fn(), alertPhaseComplete: vi.fn() }))

const MIN = 60_000
const NOW = new Date(2026, 9, 14, 12, 0).getTime()
const SETTINGS: Settings = { ...DEFAULT_SETTINGS, focusMinutes: 25, breakMinutes: 5 }

const onSession = vi.fn()
const setItem = vi.fn()

function seedSavedTimer(state: TimerState) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'pomodoro:timer' ? JSON.stringify(state) : null),
    setItem,
  })
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

const renderTimer = (options?: { wrapper: typeof StrictMode }) =>
  renderHook((props: { settings: Settings }) => useTimer(props.settings, onSession), {
    initialProps: { settings: SETTINGS },
    ...options,
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubGlobal('localStorage', { getItem: () => null, setItem })
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

  it('follows a changed focus duration while idle', () => {
    const { result, rerender } = renderTimer()

    rerender({ settings: { ...SETTINGS, focusMinutes: 50 } })

    expect(result.current.remainingMs).toBe(50 * MIN)
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

  it('resumes a paused timer from the remaining time', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(5 * MIN)
    act(() => result.current.pause())
    advance(3 * MIN)

    act(() => result.current.start())
    advance(MIN)

    expect(result.current.status).toBe('running')
    expect(result.current.remainingMs).toBe(19 * MIN)
  })

  it('uses a changed duration from the next start', () => {
    const { result, rerender } = renderTimer()
    rerender({ settings: { ...SETTINGS, focusMinutes: 50 } })

    act(() => result.current.start())
    advance(250)

    expect(result.current.remainingMs).toBe(50 * MIN - 250)
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

  it('leaves zero time remaining when paused after the phase has already ended', () => {
    const { result } = renderTimer()
    act(() => result.current.start())

    // The clock passes the end time without the tick getting a chance to finish the phase.
    vi.setSystemTime(NOW + 26 * MIN)
    act(() => result.current.pause())

    expect(result.current.status).toBe('paused')
    expect(result.current.remainingMs).toBe(0)
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

  it('records nothing when skipped just under a second in', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(999)

    act(() => result.current.skip())

    expect(onSession).not.toHaveBeenCalled()
  })

  it('records the session when skipped a second in', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(1000)

    act(() => result.current.skip())

    expect(onSession).toHaveBeenCalledOnce()
    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ focusedMs: 1000, completed: false }))
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

  it('does not count time spent paused', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(10 * MIN)
    act(() => result.current.pause())
    advance(20 * MIN)

    act(() => result.current.skip())

    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ focusedMs: 10 * MIN }))
  })

  it('moves from idle focus to the break without recording a session', () => {
    const { result } = renderTimer()

    act(() => result.current.skip())

    expect(result.current.phase).toBe('break')
    expect(result.current.status).toBe('idle')
    expect(onSession).not.toHaveBeenCalled()
  })

  it('moves from a running break to focus without recording a session', () => {
    const { result } = renderTimer()
    act(() => result.current.skip())
    act(() => result.current.start())
    advance(2 * MIN)

    act(() => result.current.skip())

    expect(result.current.phase).toBe('focus')
    expect(result.current.status).toBe('idle')
    expect(onSession).not.toHaveBeenCalled()
  })

  it('does not play the alert', () => {
    const { result } = renderTimer()
    act(() => result.current.start())
    advance(10 * MIN)

    act(() => result.current.skip())

    expect(alertPhaseComplete).not.toHaveBeenCalled()
  })
})

describe('countdown', () => {
  it('lowers the remaining time as the 250ms ticks fire', () => {
    const { result } = renderTimer()
    act(() => result.current.start())

    advance(250)
    expect(result.current.remainingMs).toBe(25 * MIN - 250)

    advance(250)
    expect(result.current.remainingMs).toBe(25 * MIN - 500)
  })

  it('stops ticking when paused', () => {
    const { result } = renderTimer()
    act(() => result.current.start())

    act(() => result.current.pause())

    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops ticking when unmounted', () => {
    const { result, unmount } = renderTimer()
    act(() => result.current.start())

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('phase running out', () => {
  function runFocusPhaseToTheEnd() {
    const hook = renderTimer()
    act(() => hook.result.current.start())
    advance(25 * MIN)
    return hook
  }

  function runBreakPhaseToTheEnd() {
    const hook = renderTimer()
    act(() => hook.result.current.skip())
    act(() => hook.result.current.start())
    advance(5 * MIN)
    return hook
  }

  it('moves a finished focus phase to an idle break', () => {
    const { result } = runFocusPhaseToTheEnd()

    expect(result.current.phase).toBe('break')
    expect(result.current.status).toBe('idle')
  })

  it('records a finished focus phase as a completed session ending at its scheduled end', () => {
    runFocusPhaseToTheEnd()

    expect(onSession).toHaveBeenCalledOnce()
    expect(onSession).toHaveBeenCalledWith({
      id: `completed-${NOW + 25 * MIN}`,
      endedAt: NOW + 25 * MIN,
      focusedMs: 25 * MIN,
      completed: true,
    })
  })

  it('plays the alert for a finished focus phase', () => {
    runFocusPhaseToTheEnd()

    expect(alertPhaseComplete).toHaveBeenCalledOnce()
    expect(alertPhaseComplete).toHaveBeenCalledWith('focus', SETTINGS)
  })

  it('moves a finished break to an idle focus phase, recording nothing', () => {
    const { result } = runBreakPhaseToTheEnd()

    expect(result.current.phase).toBe('focus')
    expect(result.current.status).toBe('idle')
    expect(onSession).not.toHaveBeenCalled()
  })

  it('plays the alert for a finished break', () => {
    runBreakPhaseToTheEnd()

    expect(alertPhaseComplete).toHaveBeenCalledOnce()
    expect(alertPhaseComplete).toHaveBeenCalledWith('break', SETTINGS)
  })

  it('still ends a running phase at its original time when the duration setting changes', () => {
    const { result, rerender } = renderTimer()
    act(() => result.current.start())
    advance(5 * MIN)

    rerender({ settings: { ...SETTINGS, focusMinutes: 50 } })
    expect(result.current.remainingMs).toBe(20 * MIN)
    advance(20 * MIN)

    expect(result.current.phase).toBe('break')
    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ focusedMs: 25 * MIN }))
  })
})

describe('reload recovery', () => {
  it('rolls an expired saved focus phase over to an idle break and records it as completed', () => {
    seedSavedTimer({ phase: 'focus', endsAt: NOW - MIN, pausedRemainingMs: null, durationMs: 25 * MIN })

    const { result } = renderTimer()

    expect(result.current.phase).toBe('break')
    expect(result.current.status).toBe('idle')
    expect(onSession).toHaveBeenCalledWith({
      id: `completed-${NOW - MIN}`,
      endedAt: NOW - MIN,
      focusedMs: 25 * MIN,
      completed: true,
    })
  })

  it('rolls an expired saved break over to an idle focus phase, recording nothing', () => {
    seedSavedTimer({ phase: 'break', endsAt: NOW - MIN, pausedRemainingMs: null, durationMs: 5 * MIN })

    const { result } = renderTimer()

    expect(result.current.phase).toBe('focus')
    expect(result.current.status).toBe('idle')
    expect(onSession).not.toHaveBeenCalled()
  })

  it('records the same session every time when React runs the initialiser twice', () => {
    seedSavedTimer({ phase: 'focus', endsAt: NOW - MIN, pausedRemainingMs: null, durationMs: 25 * MIN })

    renderTimer({ wrapper: StrictMode })

    const ids = onSession.mock.calls.map(([session]) => session.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids)).toEqual(new Set([`completed-${NOW - MIN}`]))
  })
})

describe('persistence', () => {
  it('saves the timer state when it changes', () => {
    const { result } = renderTimer()

    act(() => result.current.start())

    const [key, value] = setItem.mock.lastCall!
    expect(key).toBe('pomodoro:timer')
    expect(JSON.parse(value)).toEqual({
      phase: 'focus',
      endsAt: NOW + 25 * MIN,
      pausedRemainingMs: null,
      durationMs: 25 * MIN,
    })
  })
})
