import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionRecord } from '@/lib/sessions'
import { useSessions } from './useSessions'

const MIN = 60_000
const NOW = new Date(2026, 9, 14, 12, 0).getTime()

const setItem = vi.fn()

const session = (id: string, focusedMs: number, completed = true): SessionRecord => ({
  id,
  endedAt: NOW - 5 * MIN,
  focusedMs,
  completed,
})

function seedSavedSessions(records: SessionRecord[]) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'pomodoro:sessions' ? JSON.stringify(records) : null),
    setItem,
  })
}

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

describe('today', () => {
  it('is empty when no sessions are saved', () => {
    const { result } = renderHook(() => useSessions())

    expect(result.current.today).toEqual({ completedCount: 0, focusedMs: 0 })
  })

  it("summarises today's saved sessions", () => {
    seedSavedSessions([session('a', 25 * MIN), session('b', 10 * MIN, false)])

    const { result } = renderHook(() => useSessions())

    expect(result.current.today).toEqual({ completedCount: 1, focusedMs: 35 * MIN })
  })
})

describe('allTime', () => {
  it('is empty when no sessions are saved', () => {
    const { result } = renderHook(() => useSessions())

    expect(result.current.allTime).toEqual({ completedCount: 0, focusedMs: 0 })
  })

  it('summarises saved sessions from every day', () => {
    const lastMonth = { ...session('old', 25 * MIN), endedAt: NOW - 30 * 24 * 60 * MIN }
    seedSavedSessions([lastMonth, session('a', 25 * MIN), session('b', 10 * MIN, false)])

    const { result } = renderHook(() => useSessions())

    expect(result.current.allTime).toEqual({ completedCount: 2, focusedMs: 60 * MIN })
    expect(result.current.today).toEqual({ completedCount: 1, focusedMs: 35 * MIN })
  })
})

describe('record', () => {
  it("adds the session to today's summary", () => {
    const { result } = renderHook(() => useSessions())

    act(() => result.current.record(session('a', 25 * MIN)))

    expect(result.current.today).toEqual({ completedCount: 1, focusedMs: 25 * MIN })
  })

  it("adds the session to the all time summary", () => {
    const { result } = renderHook(() => useSessions())

    act(() => result.current.record(session('a', 25 * MIN)))

    expect(result.current.allTime).toEqual({ completedCount: 1, focusedMs: 25 * MIN })
  })

  it('saves the new session along with the existing ones', () => {
    const existing = session('a', 25 * MIN)
    const added = session('b', 10 * MIN, false)
    seedSavedSessions([existing])
    const { result } = renderHook(() => useSessions())

    act(() => result.current.record(added))

    expect(setItem).toHaveBeenCalledWith('pomodoro:sessions', JSON.stringify([existing, added]))
  })

  it('ignores a session with an id that was already recorded', () => {
    const { result } = renderHook(() => useSessions())

    act(() => result.current.record(session('a', 25 * MIN)))
    act(() => result.current.record(session('a', 25 * MIN)))

    expect(result.current.today).toEqual({ completedCount: 1, focusedMs: 25 * MIN })
    expect(setItem).toHaveBeenCalledOnce()
  })
})
