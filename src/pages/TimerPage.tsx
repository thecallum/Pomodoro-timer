import { Pause, Play, Settings, SkipForward } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import type { useTimer } from '@/hooks/useTimer'
import { type DaySummary, formatDuration } from '@/lib/sessions'
import { THEME } from '@/theme'
import { formatClock } from '@/lib/timer'

interface Props {
  timer: ReturnType<typeof useTimer>
  today: DaySummary
}

export function TimerPage({ timer, today }: Props) {
  const navigate = useNavigate()
  const theme = THEME[timer.phase]
  const clock = formatClock(timer.remainingMs)

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
        onClick={() => navigate('/settings')}
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

      <dl className={`absolute bottom-4 left-4 text-sm ${theme.muted}`}>
        <dt className="text-xs tracking-widest uppercase">Today</dt>
        <dd className="mt-1 tabular-nums">
          {today.completedCount} {today.completedCount === 1 ? 'completed session' : 'completed sessions'}
          <span aria-hidden className="mx-1.5">·</span>
          {formatDuration(today.focusedMs)} focused
        </dd>
      </dl>
    </main>
  )
}
