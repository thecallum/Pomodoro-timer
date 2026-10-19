import { ArrowLeft, Bell, BellOff, Monitor, Moon, Sun, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotificationPermission } from '@/hooks/useNotificationPermission'
import { SOUNDS, playSound } from '@/lib/alerts'
import { type Appearance, APPEARANCES } from '@/lib/appearance'
import {
  MAX_MINUTES,
  MIN_MINUTES,
  SOUND_IDS,
  type Settings,
  parseMinutes,
} from '@/lib/settings'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  appearance: Appearance
  onAppearanceChange: (appearance: Appearance) => void
}

export function SettingsPage({ settings, onChange, appearance, onAppearanceChange }: Props) {
  const navigate = useNavigate()
  return (
    <main className="relative flex min-h-svh flex-col items-center px-4 pt-24">
      <Button
        variant="ghost"
        size="lg"
        className="absolute top-4 left-4 h-10 gap-2 px-3 text-base"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="size-5" />
        Back
      </Button>

      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <div className="space-y-5">
          <MinutesField
            id="focus-minutes"
            label="Focus length"
            value={settings.focusMinutes}
            onCommit={(focusMinutes) => onChange({ ...settings, focusMinutes })}
          />
          <MinutesField
            id="break-minutes"
            label="Break length"
            value={settings.breakMinutes}
            onCommit={(breakMinutes) => onChange({ ...settings, breakMinutes })}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Changes apply the next time a session is started.
        </p>

        <div className="flex items-center justify-between gap-4">
          <Label className="text-base">Appearance</Label>
          <AppearanceControl value={appearance} onChange={onAppearanceChange} />
        </div>

        <NotificationSettings settings={settings} onChange={onChange} />
      </div>
    </main>
  )
}

interface MinutesFieldProps {
  id: string
  label: string
  value: number
  onCommit: (minutes: number) => void
}

/** Keeps a text draft so the field can be empty or half-typed; only valid values are saved. */
function MinutesField({ id, label, value, onCommit }: MinutesFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const invalid = parseMinutes(draft) === null

  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={draft}
          aria-invalid={invalid}
          className="h-10 w-20 text-center text-base"
          onChange={(e) => {
            setDraft(e.target.value)
            const minutes = parseMinutes(e.target.value)
            if (minutes !== null) onCommit(minutes)
          }}
          onBlur={() => setDraft(String(value))}
        />
        <span className="text-sm text-muted-foreground">min</span>
      </div>
    </div>
  )
}

const APPEARANCE_OPTIONS = {
  system: { label: 'System', icon: Monitor },
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
} as const

function AppearanceControl({
  value,
  onChange,
}: {
  value: Appearance
  onChange: (appearance: Appearance) => void
}) {
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex gap-1 rounded-lg bg-muted p-1">
      {APPEARANCES.map((option) => {
        const { label, icon: Icon } = APPEARANCE_OPTIONS[option]
        const selected = option === value
        return (
          <Button
            key={option}
            role="radio"
            aria-checked={selected}
            variant={selected ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => onChange(option)}
          >
            <Icon />
            {label}
          </Button>
        )
      })}
    </div>
  )
}

function NotificationSettings({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (settings: Settings) => void
}) {
  const [permission, requestPermission] = useNotificationPermission()
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="volume" className="text-base">
          Volume
        </Label>
        <div className="flex items-center gap-3">
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            step={5}
            value={settings.volume}
            className="w-36 cursor-pointer accent-primary"
            onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })}
            onPointerUp={() => playSound(settings.sound, settings.volume)}
            onKeyUp={() => playSound(settings.sound, settings.volume)}
          />
          <span className="w-10 text-right text-sm text-muted-foreground">{settings.volume}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Sound</Label>
        <div role="radiogroup" aria-label="Sound" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {SOUND_IDS.map((id) => {
            const selected = id === settings.sound
            return (
              <Button
                key={id}
                role="radio"
                aria-checked={selected}
                variant={selected ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  onChange({ ...settings, sound: id })
                  playSound(id, settings.volume)
                }}
              >
                {SOUNDS[id].label}
              </Button>
            )
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onClick={() => playSound(settings.sound, settings.volume)}
        >
          <Volume2 />
          Play sound
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-base">
          {permission === 'granted' ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          <span>
            {permission === 'granted' && 'Notifications are on'}
            {permission === 'default' && 'Notifications are off'}
            {permission === 'denied' && 'Notifications are blocked'}
            {permission === 'unsupported' && 'Notifications not supported'}
          </span>
        </div>
        {permission === 'default' && <Button onClick={requestPermission}>Enable</Button>}
      </div>
      {permission === 'denied' && (
        <p className="text-sm text-muted-foreground">
          Your browser is blocking notifications for this site. Allow them in the site settings
          (the icon next to the address bar), then come back.
        </p>
      )}
    </section>
  )
}
