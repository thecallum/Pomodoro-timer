import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alertPhaseComplete, playSound, prepareAlerts } from './alerts'
import { DEFAULT_SETTINGS } from './settings'

const CURRENT_TIME = 10

function createFakeAudioContext() {
  const oscillators: ReturnType<typeof createFakeOscillator>[] = []
  const gains: ReturnType<typeof createFakeGain>[] = []

  const ctx = {
    currentTime: CURRENT_TIME,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => {
      const osc = createFakeOscillator()
      oscillators.push(osc)
      return osc
    }),
    createGain: vi.fn(() => {
      const gain = createFakeGain()
      gains.push(gain)
      return gain
    }),
  }
  return { ctx, oscillators, gains }
}

function createFakeOscillator() {
  return {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn((node: unknown) => node),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createFakeGain() {
  return {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn((node: unknown) => node),
  }
}

// alerts.ts creates its AudioContext once and keeps it, so every test shares this one
// fake and starts from a cleared record of what was created.
const fake = createFakeAudioContext()

beforeEach(() => {
  fake.oscillators.length = 0
  fake.gains.length = 0
  vi.clearAllMocks()
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return fake.ctx
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubNotification(permission: NotificationPermission) {
  const NotificationMock = Object.assign(
    vi.fn(function () {}),
    { permission, requestPermission: vi.fn(() => Promise.resolve(permission)) },
  )
  vi.stubGlobal('Notification', NotificationMock)
  vi.stubGlobal('window', { Notification: NotificationMock })
  return NotificationMock
}

function stubNoNotificationSupport() {
  vi.stubGlobal('window', {})
}

function stubServiceWorker(registration: unknown) {
  vi.stubGlobal('navigator', { serviceWorker: { getRegistration: () => Promise.resolve(registration) } })
}

const silenceConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {})
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('playSound', () => {
  it('plays nothing at volume 0', () => {
    playSound('chime', 0)

    expect(fake.ctx.createOscillator).not.toHaveBeenCalled()
    expect(fake.oscillators).toHaveLength(0)
  })

  it.each([
    ['bell', 1],
    ['chime', 2],
    ['alarm', 6],
  ] as const)('plays every note of %s (%i notes)', (sound, noteCount) => {
    playSound(sound, 70)

    expect(fake.oscillators).toHaveLength(noteCount)
    for (const osc of fake.oscillators) {
      expect(osc.start).toHaveBeenCalledOnce()
      expect(osc.stop).toHaveBeenCalledOnce()
    }
  })

  it("uses the sound's wave type and each note's frequency", () => {
    playSound('chime', 70)

    expect(fake.oscillators.map((osc) => osc.type)).toEqual(['sine', 'sine'])
    expect(fake.oscillators.map((osc) => osc.frequency.value)).toEqual([880, 1174.66])
  })

  it("starts each note at its offset and stops it after the note's duration", () => {
    playSound('chime', 70)

    const [first, second] = fake.oscillators
    expect(first.start).toHaveBeenCalledWith(CURRENT_TIME)
    expect(first.stop).toHaveBeenCalledWith(CURRENT_TIME + 0.5)
    expect(second.start.mock.calls[0][0]).toBeCloseTo(CURRENT_TIME + 0.25)
    expect(second.stop.mock.calls[0][0]).toBeCloseTo(CURRENT_TIME + 0.75)
  })

  it.each([
    [100, 0.5],
    [50, 0.125],
  ])('at volume %i the note fades in to a peak gain of %s', (volume, expectedPeak) => {
    playSound('pop', volume)

    const [attack] = fake.gains[0].gain.exponentialRampToValueAtTime.mock.calls
    expect(attack[0]).toBeCloseTo(expectedPeak)
  })

  it('still plays and logs the error when the audio context cannot be resumed', async () => {
    const consoleError = silenceConsoleError()
    fake.ctx.resume.mockReturnValueOnce(Promise.reject(new Error('blocked')))

    playSound('bell', 70)
    await flushPromises()

    expect(fake.oscillators).toHaveLength(1)
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('prepareAlerts', () => {
  it('requests notification permission when it has not been decided', () => {
    const NotificationMock = stubNotification('default')

    prepareAlerts()

    expect(NotificationMock.requestPermission).toHaveBeenCalledOnce()
  })

  it.each(['granted', 'denied'] as const)('does not request permission when it is already %s', (permission) => {
    const NotificationMock = stubNotification(permission)

    prepareAlerts()

    expect(NotificationMock.requestPermission).not.toHaveBeenCalled()
  })

  it('resumes the audio context', () => {
    stubNotification('granted')

    prepareAlerts()

    expect(fake.ctx.resume).toHaveBeenCalledOnce()
  })

  it('still resumes the audio context when notifications are unsupported', () => {
    stubNoNotificationSupport()

    expect(() => prepareAlerts()).not.toThrow()
    expect(fake.ctx.resume).toHaveBeenCalledOnce()
  })

  it('does not throw and logs the error when the permission request fails', async () => {
    const consoleError = silenceConsoleError()
    const NotificationMock = stubNotification('default')
    NotificationMock.requestPermission.mockReturnValueOnce(Promise.reject(new Error('blocked')))

    expect(() => prepareAlerts()).not.toThrow()
    await flushPromises()

    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('alertPhaseComplete', () => {
  const settings = { ...DEFAULT_SETTINGS, sound: 'bell' as const, volume: 70 }

  it("plays the settings' sound", () => {
    stubNoNotificationSupport()

    alertPhaseComplete('focus', settings)

    expect(fake.oscillators).toHaveLength(1)
    expect(fake.oscillators[0].type).toBe('triangle')
  })

  describe('notification', () => {
    const registration = () => ({ showNotification: vi.fn(() => Promise.resolve()) })

    it.each([
      ['focus', 'Focus session complete', 'Time for a break.'],
      ['break', 'Break is over', 'Ready for the next focus session?'],
    ] as const)('after a %s phase the title is "%s"', async (finished, title, body) => {
      stubNotification('granted')
      const reg = registration()
      stubServiceWorker(reg)

      alertPhaseComplete(finished, settings)
      await flushPromises()

      expect(reg.showNotification).toHaveBeenCalledWith(title, expect.objectContaining({ body }))
    })

    it('is not shown when notifications are unsupported', async () => {
      stubNoNotificationSupport()
      const reg = registration()
      stubServiceWorker(reg)

      alertPhaseComplete('focus', settings)
      await flushPromises()

      expect(reg.showNotification).not.toHaveBeenCalled()
    })

    it.each(['default', 'denied'] as const)('is not shown when permission is %s', async (permission) => {
      const NotificationMock = stubNotification(permission)
      const reg = registration()
      stubServiceWorker(reg)

      alertPhaseComplete('focus', settings)
      await flushPromises()

      expect(reg.showNotification).not.toHaveBeenCalled()
      expect(NotificationMock).not.toHaveBeenCalled()
    })

    it('goes through the service worker when one is registered', async () => {
      const NotificationMock = stubNotification('granted')
      const reg = registration()
      stubServiceWorker(reg)

      alertPhaseComplete('focus', settings)
      await flushPromises()

      expect(reg.showNotification).toHaveBeenCalledWith('Focus session complete', {
        body: 'Time for a break.',
        icon: '/pwa-192x192.png',
        tag: 'pomodoro',
      })
      expect(NotificationMock).not.toHaveBeenCalled()
    })

    it('falls back to a plain notification when no service worker is registered', async () => {
      const NotificationMock = stubNotification('granted')
      stubServiceWorker(undefined)

      alertPhaseComplete('focus', settings)
      await flushPromises()

      expect(NotificationMock).toHaveBeenCalledWith('Focus session complete', {
        body: 'Time for a break.',
        tag: 'pomodoro',
      })
    })

    it('does not throw and logs the error when showing it fails', async () => {
      const consoleError = silenceConsoleError()
      stubNotification('granted')
      stubServiceWorker({ showNotification: () => Promise.reject(new Error('blocked')) })

      expect(() => alertPhaseComplete('focus', settings)).not.toThrow()
      await flushPromises()

      expect(consoleError).toHaveBeenCalledOnce()
    })
  })
})
