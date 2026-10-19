import { ArrowLeft, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Appearance, APPEARANCES } from '@/lib/appearance'
import { MAX_MINUTES, MIN_MINUTES, type Settings, parseMinutes } from '@/lib/settings'

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
