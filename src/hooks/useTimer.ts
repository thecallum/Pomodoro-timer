import { useEffect, useReducer, useState } from 'react'
import { alertPhaseComplete, prepareAlerts } from '@/lib/alerts'
import type { Settings } from '@/lib/settings'
import {
  type TimerState,
  complete,
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

/**
 * Changed durations apply from the next time a phase is started: a running or
 * paused phase keeps the time it already has.
 */
export function useTimer(settings: Settings) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const saved = loadTimerState()
    // A phase that expired while the app was closed just rolls over to the next one.
    return isFinished(saved, Date.now()) ? complete(saved) : saved
  })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => saveTimerState(state), [state])

  useEffect(() => {
    if (!isRunning(state)) return
    const id = setInterval(() => {
      const t = Date.now()
      if (isFinished(state, t)) {
        dispatch({ type: 'complete' })
        alertPhaseComplete(state.phase)
      }
      setNow(t)
    }, 250)
    return () => clearInterval(id)
  }, [state])

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
    skip: () => dispatch({ type: 'skip' }),
  }
}
