import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playSound } from '@/lib/alerts'
import { renderApp } from '@/test-utils'

vi.mock('@/lib/alerts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/alerts')>()),
  playSound: vi.fn(),
}))

const user = userEvent.setup()

const savedSettings = () => JSON.parse(localStorage.getItem('pomodoro:settings')!)
const focusLengthInput = () => screen.getByLabelText('Focus length')
const breakLengthInput = () => screen.getByLabelText('Break length')

async function replaceText(input: HTMLElement, text: string) {
  await user.clear(input)
  await user.paste(text)
}

let notificationPermission: NotificationPermission

function stubNotification(permission: NotificationPermission) {
  notificationPermission = permission
  const requestPermission = vi.fn(() => {
    notificationPermission = 'granted'
    return Promise.resolve(notificationPermission)
  })
  vi.stubGlobal('Notification', {
    get permission() {
      return notificationPermission
    },
    requestPermission,
  })
  return requestPermission
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('focus and break length', () => {
  it('shows the current lengths', () => {
    renderApp('/settings')

    expect(focusLengthInput()).toHaveValue(25)
    expect(breakLengthInput()).toHaveValue(5)
  })

  it('saves a valid length', async () => {
    renderApp('/settings')

    await replaceText(focusLengthInput(), '30')
    await replaceText(breakLengthInput(), '10')

    expect(savedSettings()).toMatchObject({ focusMinutes: 30, breakMinutes: 10 })
  })

  it.each(['1', '180'])('accepts %s minutes, the edge of the allowed range', async (minutes) => {
    renderApp('/settings')

    await replaceText(focusLengthInput(), minutes)

    expect(savedSettings().focusMinutes).toBe(Number(minutes))
    expect(focusLengthInput()).toHaveAttribute('aria-invalid', 'false')
  })

  it.each(['', '0', '181', '2.5'])('rejects "%s" without saving it', async (input) => {
    renderApp('/settings')

    await replaceText(focusLengthInput(), input)

    expect(localStorage.getItem('pomodoro:settings')).toBeNull()
    expect(focusLengthInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('goes back to the last saved length when left with an invalid one', async () => {
    renderApp('/settings')
    await replaceText(focusLengthInput(), '30')
    await replaceText(focusLengthInput(), '0')

    await user.tab()

    expect(focusLengthInput()).toHaveValue(30)
    expect(savedSettings().focusMinutes).toBe(30)
  })
})

describe('volume', () => {
  it('shows the current volume', () => {
    renderApp('/settings')

    expect(screen.getByLabelText('Volume')).toHaveValue('70')
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('saves a new volume', () => {
    renderApp('/settings')

    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '40' } })

    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(savedSettings().volume).toBe(40)
  })

  it('previews the sound at the new volume when the slider is released', () => {
    renderApp('/settings')
    const slider = screen.getByLabelText('Volume')
    fireEvent.change(slider, { target: { value: '40' } })

    fireEvent.pointerUp(slider)

    expect(playSound).toHaveBeenCalledExactlyOnceWith('chime', 40)
  })

  it('previews the sound when a key is released on the slider', () => {
    renderApp('/settings')

    fireEvent.keyUp(screen.getByLabelText('Volume'))

    expect(playSound).toHaveBeenCalledExactlyOnceWith('chime', 70)
  })

  it('does not preview the sound while the slider is still being dragged', () => {
    renderApp('/settings')

    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '40' } })

    expect(playSound).not.toHaveBeenCalled()
  })
})

describe('sound', () => {
  it('has the current sound selected', () => {
    renderApp('/settings')

    expect(screen.getByRole('radio', { name: 'Chime' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Bell' })).not.toBeChecked()
  })

  it('selects, saves and previews a new sound', async () => {
    renderApp('/settings')

    await user.click(screen.getByRole('radio', { name: 'Bell' }))

    expect(screen.getByRole('radio', { name: 'Bell' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Chime' })).not.toBeChecked()
    expect(savedSettings().sound).toBe('bell')
    expect(playSound).toHaveBeenCalledExactlyOnceWith('bell', 70)
  })

  it('previews the current sound from the play button', async () => {
    renderApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Play sound' }))

    expect(playSound).toHaveBeenCalledExactlyOnceWith('chime', 70)
  })
})

describe('appearance', () => {
  it('has system selected by default', () => {
    renderApp('/settings')

    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
  })

  it('switches to dark and back to light', async () => {
    renderApp('/settings')

    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('saves the choice', async () => {
    renderApp('/settings')

    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(localStorage.getItem('pomodoro:appearance')).toBe('dark')
  })
})

describe('notifications', () => {
  it('says they are off and offers to enable them when permission has not been asked', () => {
    stubNotification('default')
    renderApp('/settings')

    expect(screen.getByText('Notifications are off')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument()
  })

  it('asks for permission and then says they are on', async () => {
    const requestPermission = stubNotification('default')
    renderApp('/settings')

    await user.click(screen.getByRole('button', { name: 'Enable' }))

    expect(requestPermission).toHaveBeenCalledOnce()
    expect(await screen.findByText('Notifications are on')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument()
  })

  it('says they are on when permission was already granted', () => {
    stubNotification('granted')
    renderApp('/settings')

    expect(screen.getByText('Notifications are on')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument()
  })

  it('says they are blocked and explains how to allow them when permission was denied', () => {
    stubNotification('denied')
    renderApp('/settings')

    expect(screen.getByText('Notifications are blocked')).toBeInTheDocument()
    expect(screen.getByText(/Allow them in the site settings/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument()
  })

  it('says they are not supported when the browser has no Notification', () => {
    renderApp('/settings')

    expect(screen.getByText('Notifications not supported')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument()
  })
})
