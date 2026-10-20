import type { SoundId, Settings } from './settings'
import type { Phase } from './timer'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  return (audioContext ??= new AudioContext())
}

interface Note {
  frequency: number
  /** Seconds after the sound starts. */
  at: number
  duration: number
}

export const SOUNDS: Record<
  SoundId,
  {
    label: string
    wave: OscillatorType
    notes: Note[]
  }
> = {
  chime: {
    label: 'Chime',
    wave: 'sine',
    notes: [
      { frequency: 880, at: 0, duration: 0.5 },
      { frequency: 1174.66, at: 0.25, duration: 0.5 },
    ],
  },
  bell: {
    label: 'Bell',
    wave: 'triangle',
    notes: [{ frequency: 660, at: 0, duration: 1.4 }],
  },
  beep: {
    label: 'Beep',
    wave: 'square',
    notes: [
      { frequency: 800, at: 0, duration: 0.15 },
      { frequency: 800, at: 0.25, duration: 0.15 },
      { frequency: 800, at: 0.5, duration: 0.15 },
    ],
  },
  pop: {
    label: 'Pop',
    wave: 'sine',
    notes: [{ frequency: 440, at: 0, duration: 0.12 }],
  },
  marimba: {
    label: 'Marimba',
    wave: 'triangle',
    notes: [
      { frequency: 523.25, at: 0, duration: 0.3 },
      { frequency: 659.25, at: 0.2, duration: 0.3 },
      { frequency: 783.99, at: 0.4, duration: 0.4 },
    ],
  },
  alarm: {
    label: 'Alarm',
    wave: 'square',
    notes: [0, 0.4, 0.8].flatMap((at) => [
      { frequency: 600, at, duration: 0.2 },
      { frequency: 900, at: at + 0.2, duration: 0.2 },
    ]),
  },
}

/**
 * Call from a user gesture (the Start click): browsers only allow notification
 * permission prompts and audio playback after user interaction.
 */
export function prepareAlerts(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
  void getAudioContext().resume()
}

export function alertPhaseComplete(finished: Phase, settings: Settings): void {
  playSound(settings.sound, settings.volume)
  const title = finished === 'focus' ? 'Focus session complete' : 'Break is over'
  const body = finished === 'focus' ? 'Time for a break.' : 'Ready for the next focus session?'
  void showNotification(title, body)
}

async function showNotification(title: string, body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // Prefer the service worker (works in the installed PWA); fall back to a plain notification.
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(title, { body, icon: '/pwa-192x192.png', tag: 'pomodoro' })
  } else {
    new Notification(title, { body, tag: 'pomodoro' })
  }
}

/** Leaves headroom so the loudest setting doesn't clip. */
const MAX_GAIN = 0.5

/** Exponential ramps can't touch 0, so notes fade in from and out to this instead. */
const SILENT_GAIN = 0.0001

const ATTACK_SECONDS = 0.02

/** Play a sound at the given volume (0-100). Also used for the preview in settings. */
export function playSound(sound: SoundId, volume: number): void {
  const ctx = getAudioContext()
  void ctx.resume()

  // Squared, so the low end of the slider is much quieter than a straight line would be.
  const peakGain = (volume / 100) ** 2 * MAX_GAIN
  const isSilent = peakGain <= 0
  if (isSilent) return

  const { wave, notes } = SOUNDS[sound]
  for (const note of notes) {
    playNote(ctx, wave, note, peakGain)
  }
}

function playNote(ctx: AudioContext, wave: OscillatorType, note: Note, peakGain: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const startTime = ctx.currentTime + note.at
  const endTime = startTime + note.duration

  osc.type = wave
  osc.frequency.value = note.frequency
  gain.gain.setValueAtTime(SILENT_GAIN, startTime)
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + ATTACK_SECONDS)
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, endTime)

  osc.connect(gain).connect(ctx.destination)
  osc.start(startTime)
  osc.stop(endTime)
}
