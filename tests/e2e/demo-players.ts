import { mkdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Logging a demo player in resets their password and ends their other sessions.
// There are only two of them, and La minoria needs both, so the smoke tests that
// play them take turns, across engines and workers. Making a folder is atomic,
// so it serves as the lock. One left by a crashed run counts as free after a while.
const lock = join(tmpdir(), 'marcona-demo-players.lock')
const stale = 3 * 60_000

export async function withDemoPlayers<T>(play: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      mkdirSync(lock)
      break
    } catch {
      try {
        if (Date.now() - statSync(lock).mtimeMs > stale) rmSync(lock, { recursive: true, force: true })
      } catch {
        // Freed by its owner between the two calls.
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  try {
    return await play()
  } finally {
    rmSync(lock, { recursive: true, force: true })
  }
}
