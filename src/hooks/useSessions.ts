import { useCallback, useState } from 'react'
import { type SessionRecord, addRecord, loadRecords, saveRecords, summarizeAll, summarizeDay } from '@/lib/sessions'

export function useSessions() {
  const [records, setRecords] = useState<SessionRecord[]>(loadRecords)

  const record = useCallback((session: SessionRecord) => {
    setRecords((current) => {
      const next = addRecord(current, session)
      if (next !== current) saveRecords(next)
      return next
    })
  }, [])

  return { today: summarizeDay(records, Date.now()), allTime: summarizeAll(records), record }
}
