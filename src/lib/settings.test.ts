import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, parseMinutes } from './settings'

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

describe('loadSettings', () => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
  })

  it('falls back to defaults for settings saved before sound options existed', () => {
    store.set('pomodoro:settings', JSON.stringify({ focusMinutes: 30, breakMinutes: 10 }))
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, focusMinutes: 30, breakMinutes: 10 })
  })

  it('clamps volume and rejects unknown sounds', () => {
    store.set('pomodoro:settings', JSON.stringify({ volume: 250, sound: 'kazoo' }))
    expect(loadSettings()).toMatchObject({ volume: 100, sound: DEFAULT_SETTINGS.sound })
  })
})
