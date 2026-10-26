export const SOUND_IDS = ['chime', 'bell', 'beep', 'pop', 'marimba', 'alarm'] as const
export type SoundId = (typeof SOUND_IDS)[number]

export interface Settings {
  focusMinutes: number
  breakMinutes: number
  /** Alert volume, 0-100. */
  volume: number
  sound: SoundId
}

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  breakMinutes: 5,
  volume: 70,
  sound: 'chime',
}

export const MIN_MINUTES = 1
export const MAX_MINUTES = 180

/** Parse user input as a whole number of minutes, or null if it isn't valid. */
export function parseMinutes(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null
  const minutes = Number(input)
  return minutes >= MIN_MINUTES && minutes <= MAX_MINUTES ? minutes : null
}

const STORAGE_KEY = 'pomodoro:settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      focusMinutes: positiveOr(parsed.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
      breakMinutes: positiveOr(parsed.breakMinutes, DEFAULT_SETTINGS.breakMinutes),
      volume: volumeOr(parsed.volume, DEFAULT_SETTINGS.volume),
      sound: SOUND_IDS.includes(parsed.sound as SoundId)
        ? (parsed.sound as SoundId)
        : DEFAULT_SETTINGS.sound,
    }
  } catch (error) {
    console.error('Failed to load settings, using defaults:', error)
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function volumeOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback
}
