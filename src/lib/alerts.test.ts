import { beforeEach, describe, expect, it, vi } from 'vitest'
import { playSound } from './alerts'

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
vi.stubGlobal(
  'AudioContext',
  vi.fn(function () {
    return fake.ctx
  }),
)

describe('playSound', () => {
  beforeEach(() => {
    fake.oscillators.length = 0
    fake.gains.length = 0
    vi.clearAllMocks()
  })

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
})
