import { describe, expect, it } from 'vitest'
import { parseMinutes } from './settings'

describe('parseMinutes', () => {
  it('accepts whole numbers in range', () => {
    expect(parseMinutes('25')).toBe(25)
    expect(parseMinutes(' 1 ')).toBe(1)
    expect(parseMinutes('180')).toBe(180)
  })

  it('rejects empty, zero, out of range, and non-integers', () => {
    for (const input of ['', '0', '181', '-5', '2.5', '1e2', 'abc']) {
      expect(parseMinutes(input)).toBeNull()
    }
  })
})
