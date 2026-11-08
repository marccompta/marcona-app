import { watchTables, type Change, type LiveClient, type LiveSource } from '../../src/lib/live'
import type { adminClient } from './env'

type Client = Awaited<ReturnType<typeof adminClient>>

// Subscribes as this client, and collects every change it's told about.
export async function listen(client: Client, sources: LiveSource[]) {
  const changes: Change[] = []
  let stop = () => {}
  await new Promise<void>((ready, failed) => {
    const timer = setTimeout(() => failed(new Error('Realtime did not subscribe')), 15000)
    stop = watchTables(sources, (change) => changes.push(change), {
      client: client as unknown as LiveClient,
      onReady: () => {
        clearTimeout(timer)
        ready()
      },
    })
  })
  return { changes, stop }
}

// Messages arrive a little after the commit, so checks wait for them.
export async function until(check: () => boolean, ms = 15000) {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > ms) return false
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return true
}

export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
