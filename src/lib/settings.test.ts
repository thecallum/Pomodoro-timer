import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, parseMinutes } from './settings'

describe('parseMinutes', () => {
  it.each([
    ['25', 25],
    [' 1 ', 1],
    ['180', 180],
  ])('accepts %j as %i minutes', (input, expected) => {
    expect(parseMinutes(input)).toBe(expected)
  })

  it.each([
    ['empty', ''],
    ['zero', '0'],
    ['above the maximum', '181'],
    ['negative', '-5'],
    ['a decimal', '2.5'],
    ['scientific notation', '1e2'],
    ['text', 'abc'],
  ])('rejects %s', (_label, input) => {
    expect(parseMinutes(input)).toBeNull()
  })
})

describe('loadSettings', () => {
  const seed = (value: unknown) => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(value) })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('falls back to defaults for settings saved before sound options existed', () => {
    seed({ focusMinutes: 30, breakMinutes: 10 })
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, focusMinutes: 30, breakMinutes: 10 })
  })

  it('clamps volume to 100', () => {
    seed({ volume: 250 })
    expect(loadSettings().volume).toBe(100)
  })

  it('rejects unknown sounds', () => {
    seed({ sound: 'kazoo' })
    expect(loadSettings().sound).toBe(DEFAULT_SETTINGS.sound)
  })
})
