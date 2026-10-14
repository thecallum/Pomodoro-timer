import { useState } from 'react'
import { type Settings, loadSettings, saveSettings } from '@/lib/settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function update(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  return [settings, update] as const
}
