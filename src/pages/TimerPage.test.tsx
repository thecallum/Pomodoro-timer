import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alertPhaseComplete } from '@/lib/alerts'
import { renderApp } from '@/test-utils'

vi.mock('@/lib/alerts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/alerts')>()),
  prepareAlerts: vi.fn(),
  alertPhaseComplete: vi.fn(),
}))

const SECOND = 1000
const MIN = 60 * SECOND
const NOW = new Date(2026, 9, 14, 12, 0).getTime()

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
// fireEvent rather than user-event: user-event's async waits hang under vitest's fake timers.
const clickButton = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const todaySummary = () => screen.getByText(/completed session/)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('a fresh timer', () => {
  it('offers to start a full focus session', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
    expect(screen.getByText('Time to concentrate')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument()
  })

  it('shows nothing done today', () => {
    renderApp()

    expect(todaySummary()).toHaveTextContent('0 completed sessions·0s focused')
  })
})

describe('start', () => {
  it('counts down and offers to pause', () => {
    renderApp()

    clickButton('Start focus')
    advance(5 * SECOND)

    expect(screen.getByText('24:55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start focus' })).not.toBeInTheDocument()
  })
})

describe('pause and resume', () => {
  it('freezes the clock and offers to resume', () => {
    renderApp()
    clickButton('Start focus')
    advance(5 * SECOND)

    clickButton('Pause')
    advance(30 * SECOND)

    expect(screen.getByText('24:55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
  })

  it('says the timer is paused instead of showing the hint', () => {
    renderApp()
    clickButton('Start focus')

    clickButton('Pause')

    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.queryByText('Time to concentrate')).not.toBeInTheDocument()
  })

  it('carries on counting down from where it paused', () => {
    renderApp()
    clickButton('Start focus')
    advance(5 * SECOND)
    clickButton('Pause')
    advance(30 * SECOND)

    clickButton('Resume')
    advance(5 * SECOND)

    expect(screen.getByText('24:50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByText('Time to concentrate')).toBeInTheDocument()
  })
})

describe('skip', () => {
  it('moves from an idle focus to an idle break', () => {
    renderApp()

    clickButton('Skip')

    expect(screen.getByRole('heading', { name: 'Break' })).toBeInTheDocument()
    expect(screen.getByText('Step away for a bit')).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start break' })).toBeInTheDocument()
  })

  it('moves from a break back to an idle focus', () => {
    renderApp()
    clickButton('Skip')
    clickButton('Start break')

    clickButton('Skip')

    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start focus' })).toBeInTheDocument()
  })

  it('adds the time focused to today without counting a completed session', () => {
    renderApp()
    clickButton('Start focus')
    advance(10 * SECOND)

    clickButton('Skip')

    expect(todaySummary()).toHaveTextContent('0 completed sessions·10s focused')
  })
})

describe('a phase running out', () => {
  it('moves a finished focus to an idle break', () => {
    renderApp()
    clickButton('Start focus')

    advance(25 * MIN)

    expect(screen.getByRole('heading', { name: 'Break' })).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start break' })).toBeInTheDocument()
  })

  it('adds a completed session to today', () => {
    renderApp()
    clickButton('Start focus')

    advance(25 * MIN)

    expect(todaySummary()).toHaveTextContent('1 completed session·25m 0s focused')
  })

  it('adds up several completed sessions', () => {
    renderApp()
    for (let session = 0; session < 2; session++) {
      clickButton('Start focus')
      advance(25 * MIN)
      clickButton('Skip')
    }

    expect(todaySummary()).toHaveTextContent('2 completed sessions·50m 0s focused')
  })

  it('moves a finished break to an idle focus without changing today', () => {
    renderApp()
    clickButton('Skip')
    clickButton('Start break')

    advance(5 * MIN)

    expect(screen.getByRole('heading', { name: 'Focus' })).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(todaySummary()).toHaveTextContent('0 completed sessions·0s focused')
  })

  it('sounds the alert', () => {
    renderApp()
    clickButton('Start focus')

    advance(25 * MIN)

    expect(alertPhaseComplete).toHaveBeenCalledOnce()
  })
})
