import { useEffect, useState } from 'react'
import { formatCount } from '../i18n/format'
import { text } from '../i18n/text'
import { useLoad } from '../lib/data'
import { exportFileNames, fetchExport, fetchWipeState, ledgerCsv, lockWipe, wipeTestData } from '../lib/readiness'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'
import { Pending } from './Movements'

type Files = { json: { name: string; url: string }; csv: { name: string; url: string } }

// REQ-164: reads first, then offers each file as its own link, so every download
// starts from a tap. A phone may refuse a download that a script starts later.
function Export() {
  const [files, setFiles] = useState<Files | null>(null)
  const { busy, outcome, run } = useAction()

  useEffect(() => () => {
    if (files) {
      URL.revokeObjectURL(files.json.url)
      URL.revokeObjectURL(files.csv.url)
    }
  }, [files])

  async function prepare() {
    await run(async () => {
      const dump = await fetchExport()
      const names = exportFileNames(new Date())
      setFiles({
        json: {
          name: names.json,
          url: URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })),
        },
        csv: { name: names.csv, url: URL.createObjectURL(new Blob([ledgerCsv(dump)], { type: 'text/csv' })) },
      })
      return text.admin.exportReady
    })
  }

  return (
    <div className="panel">
      <p>{text.admin.exportIntro}</p>
      <button type="button" className="secondary" disabled={busy} onClick={() => void prepare()}>
        {text.admin.prepareExport}
      </button>
      <Outcome outcome={outcome} />
      {files && (
        <div className="actions">
          <a className="secondary download" href={files.json.url} download={files.json.name}>
            {text.admin.downloadJson}
          </a>
          <a className="secondary download" href={files.csv.url} download={files.csv.name}>
            {text.admin.downloadCsv}
          </a>
        </div>
      )}
    </div>
  )
}

// REQ-165, REQ-166: nothing is sent until the word is typed exactly, and the
// server checks it again. It isn't a form, so a keyboard's Enter or Go key
// never wipes: only a tap on the button does.
function Wipe({ onChange, onLocked }: { onChange: () => void; onLocked: () => void }) {
  const [word, setWord] = useState('')
  const { busy, outcome, run } = useAction()
  const { units } = text.admin

  async function wipe() {
    if (word !== text.admin.wipeWord) return
    const done = await run(async () => {
      const wiped = await wipeTestData(word).catch((error) => {
        if (error?.message === 'wipe_locked') onLocked()
        throw error
      })
      return text.admin.wiped(
        formatCount(wiped.users, units.users),
        formatCount(wiped.events, units.events),
        formatCount(wiped.movements, units.movements),
      )
    })
    setWord('')
    if (done) onChange()
  }

  return (
    <div className="panel">
      <h3>{text.admin.wipeTitle}</h3>
      <p>{text.admin.wipeIntro}</p>
      <Field label={text.admin.wipeLabel}>
        <input value={word} onChange={(event) => setWord(event.target.value)} {...plainInput} />
      </Field>
      <Outcome outcome={outcome} />
      <button
        type="button"
        className="secondary secondary--danger"
        disabled={busy || word !== text.admin.wipeWord}
        onClick={() => void wipe()}
      >
        {text.admin.wipe}
      </button>
    </div>
  )
}

// REQ-168: the first tap only asks. Once locked, the wipe disappears for good.
function Lock({ onLocked }: { onLocked: () => void }) {
  const [asking, setAsking] = useState(false)
  const { busy, outcome, run } = useAction()

  async function confirm() {
    const done = await run(async () => {
      await lockWipe()
      return text.admin.locked
    })
    setAsking(false)
    if (done) onLocked()
  }

  return (
    <div className="panel">
      <h3>{text.admin.lockTitle}</h3>
      <p>{text.admin.lockIntro}</p>
      <Outcome outcome={outcome} />
      {asking ? (
        <>
          <p className="ask">{text.admin.lockQuestion}</p>
          <div className="actions">
            <button type="button" className="secondary secondary--danger" disabled={busy} onClick={() => void confirm()}>
              {text.admin.lockConfirm}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setAsking(false)}>
              {text.admin.lockCancel}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="secondary secondary--danger" onClick={() => setAsking(true)}>
          {text.admin.lock}
        </button>
      )}
    </div>
  )
}

export function DataPanel({ onChange }: { onChange: () => void }) {
  const { state, reload } = useLoad(fetchWipeState)

  return (
    <>
      <h2 className="section-title">{text.admin.data}</h2>
      <div className="admin-panels">
        <Export />
        {state.status !== 'ready' && <Pending state={state} />}
        {state.status === 'ready' && state.data.locked && (
          <p className="confirmed" data-wipe-locked="true">
            {text.admin.locked}
          </p>
        )}
        {state.status === 'ready' && !state.data.locked && (
          <>
            <Wipe onChange={onChange} onLocked={reload} />
            <Lock onLocked={reload} />
          </>
        )}
      </div>
    </>
  )
}
