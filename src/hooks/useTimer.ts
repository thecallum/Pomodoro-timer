import { useEffect, useReducer, useState } from 'react'
import { alertPhaseComplete, prepareAlerts } from '@/lib/alerts'
import { loadSettings } from '@/lib/settings'
import {
  type TimerState,
  complete,
  isFinished,
  isRunning,
  loadTimerState,
  remainingMs,
  reset,
  saveTimerState,
  start,
} from '@/lib/timer'

type Action = { type: 'start'; now: number } | { type: 'reset' } | { type: 'complete' }

// Settings have no UI yet; a future settings screen can lift this into state.
const settings = loadSettings()

function reducer(state: TimerState, action: Action): TimerState {
  switch (action.type) {
    case 'start':
      return start(state, action.now, settings)
    case 'reset':
      return reset()
    case 'complete':
      return complete(state)
  }
}

export function useTimer() {
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
    running: isRunning(state),
    remainingMs: remainingMs(state, now, settings),
    start: () => {
      prepareAlerts()
      const t = Date.now()
      setNow(t)
      dispatch({ type: 'start', now: t })
    },
    reset: () => dispatch({ type: 'reset' }),
  }
}
