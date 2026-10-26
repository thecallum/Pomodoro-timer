import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings'
import { useSettings } from './useSettings'

const setItem = vi.fn()

const SAVED: Settings = { focusMinutes: 30, breakMinutes: 10, volume: 40, sound: 'bell' }

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('settings', () => {
  it('are the defaults when nothing is saved', () => {
    const { result } = renderHook(() => useSettings())

    expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
  })

  it('are the saved settings when they exist', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'pomodoro:settings' ? JSON.stringify(SAVED) : null),
      setItem,
    })

    const { result } = renderHook(() => useSettings())

    expect(result.current[0]).toEqual(SAVED)
  })
})

describe('update', () => {
  it('changes the settings', () => {
    const { result } = renderHook(() => useSettings())

    act(() => result.current[1](SAVED))

    expect(result.current[0]).toEqual(SAVED)
  })

  it('saves the new settings', () => {
    const { result } = renderHook(() => useSettings())

    act(() => result.current[1](SAVED))

    expect(setItem).toHaveBeenCalledWith('pomodoro:settings', JSON.stringify(SAVED))
  })
})
