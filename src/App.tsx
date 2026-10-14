import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTimer } from '@/hooks/useTimer'
import { formatClock } from '@/lib/timer'

export default function App() {
  const timer = useTimer()
  const clock = formatClock(timer.remainingMs)
  const label = timer.phase === 'focus' ? 'Focus' : 'Break'

  useEffect(() => {
    document.title = timer.running ? `${clock} · ${label}` : 'Pomodoro'
  }, [clock, label, timer.running])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-8xl font-semibold tabular-nums sm:text-9xl" aria-live="off">
        {clock}
      </p>
      <div className="flex gap-3">
        {timer.running ? (
          <Button size="lg" variant="outline" onClick={timer.reset}>
            Reset
          </Button>
        ) : (
          <Button size="lg" onClick={timer.start}>
            Start {label.toLowerCase()}
          </Button>
        )}
      </div>
    </main>
  )
}
