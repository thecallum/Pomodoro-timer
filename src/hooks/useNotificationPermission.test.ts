import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationPermission } from './useNotificationPermission'

type PermissionChangeListener = () => void

let notificationPermission: NotificationPermission
let requestPermission: ReturnType<typeof vi.fn>
let permissionStatusListeners: Set<PermissionChangeListener>
let queryPermission: ReturnType<typeof vi.fn>

const silenceConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {})

function stubNotification(permission: NotificationPermission) {
  notificationPermission = permission
  requestPermission = vi.fn(() => Promise.resolve(notificationPermission))
  vi.stubGlobal('Notification', {
    get permission() {
      return notificationPermission
    },
    requestPermission,
  })
}

function stubPermissionsApi() {
  permissionStatusListeners = new Set()
  const status = {
    addEventListener: (_type: string, listener: PermissionChangeListener) =>
      permissionStatusListeners.add(listener),
    removeEventListener: (_type: string, listener: PermissionChangeListener) =>
      permissionStatusListeners.delete(listener),
  }
  queryPermission = vi.fn(() => Promise.resolve(status))
  vi.stubGlobal('navigator', { permissions: { query: queryPermission } })
}

function changePermissionInBrowserSettings(permission: NotificationPermission) {
  notificationPermission = permission
  act(() => {
    for (const listener of permissionStatusListeners) listener()
  })
}

function removeNotificationSupport() {
  Reflect.deleteProperty(window, 'Notification')
  Reflect.deleteProperty(globalThis, 'Notification')
}

async function renderHookAndSettle() {
  const rendered = renderHook(() => useNotificationPermission())
  await act(async () => {})
  return rendered
}

beforeEach(() => {
  stubNotification('default')
  stubPermissionsApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('permission', () => {
  it.each(['default', 'granted', 'denied'] as const)('is %s when the browser says so', async (permission) => {
    stubNotification(permission)

    const { result } = await renderHookAndSettle()

    expect(result.current[0]).toBe(permission)
  })

  it('is unsupported when the browser has no Notification', async () => {
    removeNotificationSupport()

    const { result } = await renderHookAndSettle()

    expect(result.current[0]).toBe('unsupported')
  })

  it('follows changes made in the browser site settings', async () => {
    const { result } = await renderHookAndSettle()

    changePermissionInBrowserSettings('denied')

    expect(result.current[0]).toBe('denied')
  })
})

describe('request', () => {
  it('asks the browser for permission and shows the answer', async () => {
    const { result } = await renderHookAndSettle()
    requestPermission.mockImplementationOnce(() => {
      notificationPermission = 'granted'
      return Promise.resolve('granted')
    })

    await act(async () => result.current[1]())

    expect(requestPermission).toHaveBeenCalledOnce()
    expect(result.current[0]).toBe('granted')
  })

  it('does nothing when the browser has no Notification', async () => {
    removeNotificationSupport()
    const { result } = await renderHookAndSettle()

    await act(async () => result.current[1]())

    expect(result.current[0]).toBe('unsupported')
  })

  it('logs and keeps the permission when the request fails', async () => {
    const consoleError = silenceConsoleError()
    const { result } = await renderHookAndSettle()
    requestPermission.mockImplementationOnce(() => Promise.reject(new Error('blocked')))

    await act(async () => result.current[1]())

    expect(consoleError).toHaveBeenCalledOnce()
    expect(result.current[0]).toBe('default')
  })
})

describe('permissions API', () => {
  it('is queried for notifications', async () => {
    await renderHookAndSettle()

    expect(queryPermission).toHaveBeenCalledWith({ name: 'notifications' })
  })

  it('is optional: the permission still shows when it is missing', async () => {
    vi.stubGlobal('navigator', {})

    const { result } = await renderHookAndSettle()

    expect(result.current[0]).toBe('default')
  })

  it('logs and keeps the permission when the query rejects', async () => {
    const consoleError = silenceConsoleError()
    queryPermission.mockImplementationOnce(() => Promise.reject(new Error('unsupported name')))

    const { result } = await renderHookAndSettle()

    expect(consoleError).toHaveBeenCalledOnce()
    expect(result.current[0]).toBe('default')
  })

  it('stops being listened to on unmount', async () => {
    const { unmount } = await renderHookAndSettle()
    expect(permissionStatusListeners.size).toBe(1)

    unmount()

    expect(permissionStatusListeners.size).toBe(0)
  })
})
