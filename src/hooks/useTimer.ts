import { useEffect, useReducer, useState } from 'react'
import { alertPhaseComplete, prepareAlerts } from '@/lib/alerts'
import type { SessionRecord } from '@/lib/sessions'
import type { Settings } from '@/lib/settings'
import {
  type TimerState,
  complete,
  elapsedMs,
  phaseDurationMs,
  isFinished,
  statusOf,
  isRunning,
  loadTimerState,
  remainingMs,
  pause,
  saveTimerState,
  start,
} from '@/lib/timer'

type Action =
  | { type: 'start'; now: number; settings: Settings }
  | { type: 'pause'; now: number }
  | { type: 'skip' }
  | { type: 'complete' }

function reducer(state: TimerState, action: Action): TimerState {
  switch (action.type) {
    case 'start':
      return start(state, action.now, action.settings)
    case 'pause':
      return pause(state, action.now)
    case 'skip':
    case 'complete':
      return complete(state)
  }
}

function completedSession(state: TimerState, settings: Settings): SessionRecord {
  const endedAt = state.endsAt!
  return {
    id: `completed-${endedAt}`,
    endedAt,
    focusedMs: state.durationMs ?? phaseDurationMs(state.phase, settings),
    completed: true,
  }
}

/**
 * Changed durations apply from the next time a phase is started: a running or
 * paused phase keeps the time it already has.
 */
export function useTimer(settings: Settings, onSession: (session: SessionRecord) => void) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const saved = loadTimerState()
    // A phase that expired while the app was closed just rolls over to the next one.
    if (!isFinished(saved, Date.now())) return saved
    // Safe to repeat (StrictMode runs initializers twice): records are deduplicated by id.
    if (saved.phase === 'focus') onSession(completedSession(saved, settings))
    return complete(saved)
  })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => saveTimerState(state), [state])

  useEffect(() => {
    if (!isRunning(state)) return
    const id = setInterval(() => {
      const t = Date.now()
      if (isFinished(state, t)) {
        dispatch({ type: 'complete' })
        if (state.phase === 'focus') onSession(completedSession(state, settings))
        alertPhaseComplete(state.phase)
      }
      setNow(t)
    }, 250)
    return () => clearInterval(id)
  }, [state, settings, onSession])

  return {
    phase: state.phase,
    status: statusOf(state),
    remainingMs: remainingMs(state, now, settings),
    start: () => {
      prepareAlerts()
      const t = Date.now()
      setNow(t)
      dispatch({ type: 'start', now: t, settings })
    },
    pause: () => {
      const t = Date.now()
      setNow(t)
      dispatch({ type: 'pause', now: t })
    },
    // Skipping moves on silently; only a phase running out sounds the alert.
    // A skipped focus session still logs the time actually spent on it.
    skip: () => {
      const t = Date.now()
      const elapsed = elapsedMs(state, t, settings)
      if (state.phase === 'focus' && elapsed >= 1000) {
        onSession({ id: `skipped-${t}`, endedAt: t, focusedMs: elapsed, completed: false })
      }
      dispatch({ type: 'skip' })
    },
  }
}
