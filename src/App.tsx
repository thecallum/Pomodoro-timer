import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useSettings } from '@/hooks/useSettings'
import { useTimer } from '@/hooks/useTimer'
import { formatClock } from '@/lib/timer'
import { SettingsPage } from '@/pages/SettingsPage'
import { TimerPage } from '@/pages/TimerPage'
import { THEME } from '@/theme'

// The timer lives here, above the routes, so it keeps running while on /settings.
export default function App() {
  const [settings, setSettings] = useSettings()
  const timer = useTimer(settings)
  const heading = THEME[timer.phase].heading
  const clock = formatClock(timer.remainingMs)

  useEffect(() => {
    const prefix = timer.status === 'paused' ? '⏸ ' : ''
    document.title = timer.status === 'idle' ? 'Pomodoro' : `${prefix}${clock} · ${heading}`
  }, [clock, heading, timer.status])

  return (
    <Routes>
      <Route path="/" element={<TimerPage timer={timer} />} />
      <Route
        path="/settings"
        element={<SettingsPage settings={settings} onChange={setSettings} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
