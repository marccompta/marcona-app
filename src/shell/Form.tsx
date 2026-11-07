import { useState, type ReactNode } from 'react'
import { errorMessage } from '../i18n/errors'

export type ActionOutcome = { kind: 'done' | 'failed'; message: string } | null

// Runs one action at a time, and turns its result into a message.
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<ActionOutcome>(null)

  async function run(action: () => Promise<string>) {
    setBusy(true)
    setOutcome(null)
    try {
      const message = await action()
      setOutcome({ kind: 'done', message })
      return true
    } catch (error) {
      setOutcome({ kind: 'failed', message: errorMessage(error) })
      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, outcome, run }
}

export function Outcome({ outcome }: { outcome: ActionOutcome }) {
  if (!outcome) return null
  return outcome.kind === 'failed' ? (
    <p className="notice" role="alert">
      {outcome.message}
    </p>
  ) : (
    <p className="confirmed" role="status">
      {outcome.message}
    </p>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  )
}

export const plainInput = { autoCapitalize: 'none', autoCorrect: 'off', autoComplete: 'off', spellCheck: false }
