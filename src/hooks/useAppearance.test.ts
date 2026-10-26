import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppearance } from './useAppearance'

const LIGHT_THEME_COLOR = '#ef4444'
const DARK_THEME_COLOR = '#0a0a0a'

const setItem = vi.fn()

let systemPrefersDark: boolean
let mediaChangeListeners: Set<() => void>
let themeColorMeta: HTMLMetaElement

function seedSavedAppearance(appearance: string) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (key === 'pomodoro:appearance' ? appearance : null),
    setItem,
  })
}

function changeSystemPreference(prefersDark: boolean) {
  systemPrefersDark = prefersDark
  act(() => {
    for (const listener of mediaChangeListeners) listener()
  })
}

beforeEach(() => {
  systemPrefersDark = false
  mediaChangeListeners = new Set()
  vi.stubGlobal('localStorage', { getItem: () => null, setItem })
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemPrefersDark
    },
    addEventListener: (_type: string, listener: () => void) => mediaChangeListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      mediaChangeListeners.delete(listener),
  }))

  themeColorMeta = document.createElement('meta')
  themeColorMeta.name = 'theme-color'
  themeColorMeta.content = LIGHT_THEME_COLOR
  document.head.append(themeColorMeta)
})

afterEach(() => {
  themeColorMeta.remove()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('appearance', () => {
  it('is system when nothing is saved', () => {
    const { result } = renderHook(() => useAppearance())

    expect(result.current[0]).toBe('system')
  })

  it('is the saved appearance when one exists', () => {
    seedSavedAppearance('dark')

    const { result } = renderHook(() => useAppearance())

    expect(result.current[0]).toBe('dark')
  })
})

describe('update', () => {
  it('changes the appearance', () => {
    const { result } = renderHook(() => useAppearance())

    act(() => result.current[1]('dark'))

    expect(result.current[0]).toBe('dark')
  })

  it('saves the new appearance', () => {
    const { result } = renderHook(() => useAppearance())

    act(() => result.current[1]('light'))

    expect(setItem).toHaveBeenCalledWith('pomodoro:appearance', 'light')
  })
})

describe('applying the appearance', () => {
  it('turns dark mode on for dark', () => {
    seedSavedAppearance('dark')

    renderHook(() => useAppearance())

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('turns dark mode off for light, even when the system prefers dark', () => {
    systemPrefersDark = true
    seedSavedAppearance('light')

    renderHook(() => useAppearance())

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('switches between light and dark when updated', () => {
    seedSavedAppearance('light')
    const { result } = renderHook(() => useAppearance())

    act(() => result.current[1]('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => result.current[1]('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('sets the theme colour to match', () => {
    const { result } = renderHook(() => useAppearance())

    act(() => result.current[1]('dark'))
    expect(themeColorMeta.content).toBe(DARK_THEME_COLOR)

    act(() => result.current[1]('light'))
    expect(themeColorMeta.content).toBe(LIGHT_THEME_COLOR)
  })

  it('does not fail when the page has no theme colour tag', () => {
    themeColorMeta.remove()

    expect(() => renderHook(() => useAppearance())).not.toThrow()
  })
})

describe('system appearance', () => {
  it('follows the system preference', () => {
    systemPrefersDark = true

    renderHook(() => useAppearance())

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('follows the system preference as it changes', () => {
    renderHook(() => useAppearance())

    changeSystemPreference(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(themeColorMeta.content).toBe(DARK_THEME_COLOR)

    changeSystemPreference(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(themeColorMeta.content).toBe(LIGHT_THEME_COLOR)
  })

  it('ignores system preference changes when light or dark is chosen', () => {
    seedSavedAppearance('light')
    renderHook(() => useAppearance())

    changeSystemPreference(true)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('system preference listener', () => {
  it('is removed on unmount', () => {
    const { unmount } = renderHook(() => useAppearance())
    expect(mediaChangeListeners.size).toBe(1)

    unmount()

    expect(mediaChangeListeners.size).toBe(0)
  })

  it('is replaced rather than added to when the appearance changes', () => {
    const { result } = renderHook(() => useAppearance())

    act(() => result.current[1]('dark'))

    expect(mediaChangeListeners.size).toBe(1)
  })
})
