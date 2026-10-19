import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDark, loadAppearance, saveAppearance } from './appearance'

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

describe('loadAppearance', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns system when nothing is saved', () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(loadAppearance()).toBe('system')
  })

  it.each(['system', 'light', 'dark'])('restores a saved value of %s', (saved) => {
    vi.stubGlobal('localStorage', { getItem: () => saved })
    expect(loadAppearance()).toBe(saved)
  })

  it('falls back to system for an unknown saved value', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'purple' })
    expect(loadAppearance()).toBe('system')
  })

  it('returns system and logs the error when storage cannot be read', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage blocked')
      },
    })

    expect(loadAppearance()).toBe('system')
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('saveAppearance', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('writes the value under the pomodoro:appearance key', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })

    saveAppearance('dark')

    expect(setItem).toHaveBeenCalledWith('pomodoro:appearance', 'dark')
  })

  it('does not throw and logs the error when storage cannot be written', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('storage blocked')
      },
    })

    expect(() => saveAppearance('dark')).not.toThrow()
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
