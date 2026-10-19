import { useEffect, useState } from 'react'
import { type Appearance, isDark, loadAppearance, saveAppearance } from '@/lib/appearance'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const THEME_COLOR = { light: '#ef4444', dark: '#0a0a0a' }

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const apply = () => {
      const dark = isDark(appearance, media.matches)
      const root = document.documentElement
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])

  function update(next: Appearance) {
    setAppearance(next)
    saveAppearance(next)
  }

  return [appearance, update] as const
}
