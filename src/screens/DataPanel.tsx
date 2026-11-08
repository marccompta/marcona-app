import { useEffect, useState, type FormEvent } from 'react'
import { formatCount } from '../i18n/format'
import { text } from '../i18n/text'
import { exportFileNames, fetchExport, ledgerCsv, wipeTestData } from '../lib/readiness'
import { Field, Outcome, plainInput, useAction } from '../shell/Form'

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
// server checks it again.
function Wipe({ onChange }: { onChange: () => void }) {
  const [word, setWord] = useState('')
  const { busy, outcome, run } = useAction()
  const { units } = text.admin

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (word !== text.admin.wipeWord) return
    const done = await run(async () => {
      const wiped = await wipeTestData(word)
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
    <form className="panel" onSubmit={submit} noValidate>
      <h3>{text.admin.wipeTitle}</h3>
      <p>{text.admin.wipeIntro}</p>
      <Field label={text.admin.wipeLabel}>
        <input value={word} onChange={(event) => setWord(event.target.value)} {...plainInput} />
      </Field>
      <Outcome outcome={outcome} />
      <button type="submit" className="secondary secondary--danger" disabled={busy || word !== text.admin.wipeWord}>
        {text.admin.wipe}
      </button>
    </form>
  )
}

export function DataPanel({ onChange }: { onChange: () => void }) {
  return (
    <>
      <h2 className="section-title">{text.admin.data}</h2>
      <Export />
      <Wipe onChange={onChange} />
    </>
  )
}
