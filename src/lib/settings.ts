export interface Settings {
  focusMinutes: number
  breakMinutes: number
}

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  breakMinutes: 5,
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
    }
  } catch {
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
