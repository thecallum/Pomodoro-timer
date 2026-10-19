import { describe, expect, it } from 'vitest'
import { isDark } from './appearance'

describe('isDark', () => {
  it('follows the system only when set to system', () => {
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
  })

  it('ignores the system when set explicitly', () => {
    expect(isDark('light', true)).toBe(false)
    expect(isDark('dark', false)).toBe(true)
  })
})
