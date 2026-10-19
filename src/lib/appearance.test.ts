import { describe, expect, it } from 'vitest'
import { isDark } from './appearance'

describe('isDark', () => {
  it('follows the system when set to system', () => {
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
  })

  it('is light when set to light, whatever the system prefers', () => {
    expect(isDark('light', true)).toBe(false)
  })

  it('is dark when set to dark, whatever the system prefers', () => {
    expect(isDark('dark', false)).toBe(true)
  })
})
