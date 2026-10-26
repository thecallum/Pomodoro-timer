/**
 * A focus session that was worked on. `focusedMs` is the time actually spent
 * (excluding pauses), so a skipped session still counts for the time put in.
 */
export interface SessionRecord {
  id: string
  endedAt: number
  focusedMs: number
  completed: boolean // ran to the end rather than being skipped
}

export interface DaySummary {
  completedCount: number
  focusedMs: number
}

const STORAGE_KEY = 'pomodoro:sessions'

/** Adding a record with an existing id is a no-op, so recording is safe to repeat. */
export function addRecord(records: SessionRecord[], record: SessionRecord): SessionRecord[] {
  return records.some((r) => r.id === record.id) ? records : [...records, record]
}

export function summarizeDay(records: SessionRecord[], day: number): DaySummary {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const endMs = end.getTime()

  return summarizeAll(records.filter((r) => r.endedAt >= startMs && r.endedAt < endMs))
}

export function summarizeAll(records: SessionRecord[]): DaySummary {
  let completedCount = 0
  let focusedMs = 0
  for (const r of records) {
    focusedMs += r.focusedMs
    if (r.completed) completedCount += 1
  }
  return { completedCount, focusedMs }
}

/** Scales its units with the amount: "45s", "5m 12s", "1h 15m". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function loadRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecord)
  } catch (error) {
    console.error('Failed to load sessions, starting with none:', error)
    return []
  }
}

export function saveRecords(records: SessionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.endedAt === 'number' &&
    typeof r.focusedMs === 'number' &&
    typeof r.completed === 'boolean'
  )
}
