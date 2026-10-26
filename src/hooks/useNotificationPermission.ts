import { useEffect, useState } from 'react'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

function current(): NotificationPermissionState {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

/** Tracks the notification permission, including changes made in the browser's site settings. */
export function useNotificationPermission() {
  const [permission, setPermission] = useState(current)

  useEffect(() => {
    let status: PermissionStatus | undefined
    const sync = () => setPermission(current())
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((s) => {
        status = s
        s.addEventListener('change', sync)
      })
      .catch((error) => console.error('Failed to query notification permission:', error))
    return () => status?.removeEventListener('change', sync)
  }, [])

  function request() {
    if (!('Notification' in window)) return
    Notification.requestPermission()
      .then(() => setPermission(current()))
      .catch((error) => console.error('Failed to request notification permission:', error))
  }

  return [permission, request] as const
}
