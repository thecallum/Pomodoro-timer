import type { Phase } from './timer'

let audioContext: AudioContext | null = null

/**
 * Call from a user gesture (the Start click): browsers only allow notification
 * permission prompts and audio playback after user interaction.
 */
export function prepareAlerts(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
  audioContext ??= new AudioContext()
  void audioContext.resume()
}

export function alertPhaseComplete(finished: Phase): void {
  playChime()
  const title = finished === 'focus' ? 'Focus session complete' : 'Break is over'
  const body = finished === 'focus' ? 'Time for a break.' : 'Ready for the next focus session?'
  void showNotification(title, body)
}

async function showNotification(title: string, body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // Prefer the service worker (works in the installed PWA); fall back to a plain notification.
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(title, { body, icon: '/pwa-192x192.png', tag: 'pomodoro' })
  } else {
    new Notification(title, { body, tag: 'pomodoro' })
  }
}

function playChime(): void {
  if (!audioContext) return
  const ctx = audioContext
  ;[880, 1174.66].forEach((frequency, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t0 = ctx.currentTime + i * 0.25
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.5)
  })
}
