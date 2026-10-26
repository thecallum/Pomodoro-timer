import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type SessionRecord,
  addRecord,
  formatDuration,
  loadRecords,
  saveRecords,
  summarizeDay,
} from './sessions'

const MIN = 60_000
const at = (h: number, m = 0, d = 14) => new Date(2026, 9, d, h, m).getTime()
const record = (id: string, endedAt: number, focusedMs: number, completed = true): SessionRecord => ({
  id,
  endedAt,
  focusedMs,
  completed,
})

describe('summarizeDay', () => {
  it('counts completed sessions but sums time from skipped ones too', () => {
    const records = [
      record('a', at(9), 25 * MIN),
      record('b', at(10), 25 * MIN),
      record('c', at(11), 10 * MIN, false),
    ]
    expect(summarizeDay(records, at(15))).toEqual({ completedCount: 2, focusedMs: 60 * MIN })
  })

  it('only includes the given local day', () => {
    const records = [
      record('yesterday', at(23, 59, 13), 25 * MIN),
      record('today', at(0, 0, 14), 25 * MIN),
      record('tomorrow', at(0, 0, 15), 25 * MIN),
    ]
    expect(summarizeDay(records, at(12))).toEqual({ completedCount: 1, focusedMs: 25 * MIN })
  })

  it('is zero when there are no sessions', () => {
    expect(summarizeDay([], at(12))).toEqual({ completedCount: 0, focusedMs: 0 })
  })
})

describe('addRecord', () => {
  it('appends a record with a new id', () => {
    const first = record('a', at(9), 25 * MIN)
    const second = record('b', at(10), MIN)
    expect(addRecord([first], second)).toEqual([first, second])
  })

  it('returns the same list when the id already exists', () => {
    const first = record('a', at(9), 25 * MIN)
    const records = [first]
    expect(addRecord(records, first)).toBe(records)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [45_500, '45s'],
    [MIN, '1m 0s'],
    [5 * MIN + 12_000, '5m 12s'],
    [59 * MIN + 59_000, '59m 59s'],
    [75 * MIN + 30_000, '1h 15m'],
    [120 * MIN, '2h 0m'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('loadRecords', () => {
  const seed = (raw: string | null) => {
    vi.stubGlobal('localStorage', { getItem: () => raw })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns an empty list when nothing is saved', () => {
    seed(null)
    expect(loadRecords()).toEqual([])
  })

  it('returns an empty list and logs the error when the saved data cannot be read', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('{not json')

    expect(loadRecords()).toEqual([])
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('returns an empty list when the saved data is not an array', () => {
    seed(JSON.stringify({ id: 'a' }))
    expect(loadRecords()).toEqual([])
  })

  it('restores saved records', () => {
    const records = [record('a', at(9), 25 * MIN), record('b', at(10), 10 * MIN, false)]
    seed(JSON.stringify(records))
    expect(loadRecords()).toEqual(records)
  })
})

describe('saveRecords', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes the records as JSON under the pomodoro:sessions key', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })
    const records = [record('a', at(9), 25 * MIN)]

    saveRecords(records)

    expect(setItem).toHaveBeenCalledWith('pomodoro:sessions', JSON.stringify(records))
  })
})
