import { describe, expect, it } from 'vitest'
import { type SessionRecord, addRecord, formatDuration, summarizeDay } from './sessions'

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
  it('ignores a record whose id already exists', () => {
    const first = record('a', at(9), 25 * MIN)
    const once = addRecord([], first)
    expect(addRecord(once, first)).toBe(once)
    expect(addRecord(once, record('b', at(10), MIN))).toHaveLength(2)
  })
})

describe('formatDuration', () => {
  it('scales from seconds to minutes to hours', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45_500)).toBe('45s')
    expect(formatDuration(MIN)).toBe('1m 0s')
    expect(formatDuration(5 * MIN + 12_000)).toBe('5m 12s')
    expect(formatDuration(59 * MIN + 59_000)).toBe('59m 59s')
    expect(formatDuration(75 * MIN + 30_000)).toBe('1h 15m')
    expect(formatDuration(120 * MIN)).toBe('2h 0m')
  })
})
