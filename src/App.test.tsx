import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test-utils'

vi.mock('@/lib/alerts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/alerts')>()),
  prepareAlerts: vi.fn(),
  alertPhaseComplete: vi.fn(),
}))

const SECOND = 1000
const NOW = new Date(2026, 9, 14, 12, 0).getTime()

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
// fireEvent rather than user-event: user-event's async waits hang under vitest's fake timers.
const clickButton = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const setMinutes = (label: string, minutes: number) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(minutes) } })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('routing', () => {
  it('opens on the timer', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
  })

  it('opens the settings from the timer and returns with Back', () => {
    renderApp()

    clickButton('Settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    clickButton('Back')
    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
  })

  it('can open directly on the settings', () => {
    renderApp('/settings')

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('redirects an unknown address to the timer', () => {
    renderApp('/nowhere')

    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
  })
})

describe('the timer while on the settings page', () => {
  it('keeps counting down', () => {
    renderApp()
    clickButton('Start focus')
    advance(5 * SECOND)

    clickButton('Settings')
    advance(10 * SECOND)
    clickButton('Back')

    expect(screen.getByText('24:45')).toBeInTheDocument()
  })
})

describe('changing the lengths in the settings', () => {
  it('shows a changed focus length on an idle timer', () => {
    renderApp()

    clickButton('Settings')
    setMinutes('Focus length', 10)
    clickButton('Back')

    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('shows a changed break length on an idle break', () => {
    renderApp()

    clickButton('Settings')
    setMinutes('Break length', 2)
    clickButton('Back')
    clickButton('Skip')

    expect(screen.getByText('02:00')).toBeInTheDocument()
  })

  it('leaves a running session alone and applies from the next one', () => {
    renderApp()
    clickButton('Start focus')
    advance(5 * SECOND)

    clickButton('Settings')
    setMinutes('Focus length', 10)
    clickButton('Back')
    expect(screen.getByText('24:55')).toBeInTheDocument()

    clickButton('Skip')
    clickButton('Skip')
    clickButton('Start focus')
    advance(1 * SECOND)
    expect(screen.getByText('09:59')).toBeInTheDocument()
  })
})

describe('the page title', () => {
  it('is just the app name while idle', () => {
    renderApp()

    expect(document.title).toBe('Pomodoro')
  })

  it('shows the clock and phase while running', () => {
    renderApp()

    clickButton('Start focus')
    advance(1 * SECOND)

    expect(document.title).toBe('24:59 · Focus')
  })

  it('marks the clock as paused', () => {
    renderApp()
    clickButton('Start focus')
    advance(1 * SECOND)

    clickButton('Pause')

    expect(document.title).toBe('⏸ 24:59 · Focus')
  })

  it('shows the break phase', () => {
    renderApp()
    clickButton('Skip')

    clickButton('Start break')

    expect(document.title).toBe('05:00 · Break')
  })

  it('goes back to the app name when the timer stops', () => {
    renderApp()
    clickButton('Start focus')

    clickButton('Skip')

    expect(document.title).toBe('Pomodoro')
  })
})
