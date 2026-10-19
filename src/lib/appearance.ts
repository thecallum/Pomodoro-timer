export type Appearance = 'system' | 'light' | 'dark'

export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark']

// Keep in sync with the inline script in index.html, which applies this before first paint.
const STORAGE_KEY = 'pomodoro:appearance'

export function isDark(appearance: Appearance, systemPrefersDark: boolean): boolean {
  return appearance === 'system' ? systemPrefersDark : appearance === 'dark'
}

export function loadAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return APPEARANCES.find((a) => a === raw) ?? 'system'
  } catch {
    return 'system'
  }
}

export function saveAppearance(appearance: Appearance): void {
  try {
    localStorage.setItem(STORAGE_KEY, appearance)
  } catch {
    // Storage unavailable (e.g. private mode): the choice just won't persist.
  }
}
