import { Pause, Play, Settings, SkipForward } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTimer } from '@/hooks/useTimer'
import { formatClock } from '@/lib/timer'

const THEME = {
  focus: {
    page: 'bg-red-50 text-red-950',
    muted: 'text-red-900/60',
    action: 'bg-red-500 text-white hover:bg-red-600',
    heading: 'Focus',
    hint: 'Time to concentrate',
  },
  break: {
    page: 'bg-emerald-50 text-emerald-950',
    muted: 'text-emerald-900/60',
    action: 'bg-emerald-600 text-white hover:bg-emerald-700',
    heading: 'Break',
    hint: 'Step away for a bit',
  },
} as const

export default function App() {
  const timer = useTimer()
  const theme = THEME[timer.phase]
  const clock = formatClock(timer.remainingMs)

  useEffect(() => {
    const prefix = timer.status === 'paused' ? '⏸ ' : ''
    document.title =
      timer.status === 'idle' ? 'Pomodoro' : `${prefix}${clock} · ${theme.heading}`
  }, [clock, theme.heading, timer.status])

  const primary = {
    idle: { label: `Start ${theme.heading.toLowerCase()}`, icon: Play, onClick: timer.start },
    running: { label: 'Pause', icon: Pause, onClick: timer.pause },
    paused: { label: 'Resume', icon: Play, onClick: timer.start },
  }[timer.status]
  const PrimaryIcon = primary.icon

  return (
    <main
      className={`relative flex min-h-svh flex-col items-center justify-center gap-10 px-4 transition-colors duration-500 ${theme.page}`}
    >
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Settings"
        className="absolute top-4 right-4 hover:bg-black/5"
      >
        <Settings className="size-5" />
      </Button>

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{theme.heading}</h1>
        <p className={`mt-1 text-sm ${theme.muted}`}>
          {timer.status === 'paused' ? 'Paused' : theme.hint}
        </p>
      </div>

      <p
        className={`text-8xl font-semibold tabular-nums transition-opacity sm:text-9xl ${
          timer.status === 'paused' ? 'opacity-50' : ''
        }`}
        aria-live="off"
      >
        {clock}
      </p>

      <div className="flex items-center gap-3">
        <Button size="lg" className={`h-12 w-40 gap-2 text-base ${theme.action}`} onClick={primary.onClick}>
          <PrimaryIcon className="size-5" />
          {primary.label}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-12 gap-2 px-4 text-base hover:bg-black/5"
          onClick={timer.skip}
        >
          <SkipForward className="size-5" />
          Skip
        </Button>
      </div>
    </main>
  )
}
