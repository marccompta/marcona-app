import { describe, expect, it, vi } from 'vitest'
import { createTapQueue, duelOutcomes, type DuelChoice, type LockIn } from '../../src/lib/games'

const saved: LockIn = { event_id: 'e', saved: true, revealed: false }
const revealed: LockIn = { event_id: 'e', saved: true, revealed: true }

// A send that waits until the test answers it.
function heldSend() {
  const sent: { choice: DuelChoice; requestId: string; answer: (value: LockIn) => void; fail: (error: unknown) => void }[] = []
  const send = (choice: DuelChoice, requestId: string) =>
    new Promise<LockIn>((answer, fail) => sent.push({ choice, requestId, answer, fail }))
  return { sent, send }
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

describe('duel payouts', () => {
  it('REQ-140 to REQ-143: the spec table, rounded down', () => {
    const settings = { both_trust: 150, betrayer: 250, betrayed: 0, both_betray: 50 }
    expect(duelOutcomes(11, settings)).toEqual({ bothTrust: 16, betrayer: 27, betrayed: 0, bothBetray: 5 })
  })
})

describe('the tap queue', () => {
  it('REQ-202: sends a tap at once, and tells who asked', async () => {
    const { sent, send } = heldSend()
    const onResult = vi.fn()
    const queue = createTapQueue({ send, onResult, onFailed: vi.fn() })

    queue.tap('confia')
    expect(sent.map((tap) => tap.choice)).toEqual(['confia'])
    expect(onResult).not.toHaveBeenCalled()

    sent[0].answer(saved)
    await settle()
    expect(onResult).toHaveBeenCalledWith('confia', saved)
  })

  it('REQ-202: taps go one at a time, and only the newest waiting tap is kept', async () => {
    const { sent, send } = heldSend()
    const queue = createTapQueue({ send, onResult: vi.fn(), onFailed: vi.fn() })

    queue.tap('confia')
    queue.tap('traeix')
    queue.tap('confia')
    queue.tap('traeix')
    expect(sent).toHaveLength(1)

    sent[0].answer(saved)
    await settle()
    expect(sent.map((tap) => tap.choice)).toEqual(['confia', 'traeix'])

    sent[1].answer(saved)
    await settle()
    expect(sent).toHaveLength(2)
  })

  it('REQ-204: once the game is revealed, a waiting tap is dropped', async () => {
    const { sent, send } = heldSend()
    const queue = createTapQueue({ send, onResult: vi.fn(), onFailed: vi.fn() })

    queue.tap('confia')
    queue.tap('traeix')
    sent[0].answer(revealed)
    await settle()
    expect(sent).toHaveLength(1)
  })

  it('REQ-062: a lost reply is retried once, with the same request ID', async () => {
    const { sent, send } = heldSend()
    const onResult = vi.fn()
    const queue = createTapQueue({ send, onResult, onFailed: vi.fn(), retryMs: 0 })

    queue.tap('traeix')
    sent[0].fail(new TypeError('Failed to fetch'))
    await settle()
    await settle()
    expect(sent).toHaveLength(2)
    expect(sent[1].requestId).toBe(sent[0].requestId)

    sent[1].answer(saved)
    await settle()
    expect(onResult).toHaveBeenCalledWith('traeix', saved)
  })

  it('REQ-019: a second lost reply is reported, and a later tap has a new ID', async () => {
    const { sent, send } = heldSend()
    const onFailed = vi.fn()
    const queue = createTapQueue({ send, onResult: vi.fn(), onFailed, retryMs: 0 })
    const lost = new TypeError('Failed to fetch')

    queue.tap('traeix')
    sent[0].fail(lost)
    await settle()
    await settle()
    sent[1].fail(lost)
    await settle()
    expect(onFailed).toHaveBeenCalledWith(lost)

    queue.tap('traeix')
    expect(sent[2].requestId).not.toBe(sent[0].requestId)
  })

  it('REQ-019: a refusal from the server is not retried', async () => {
    const { sent, send } = heldSend()
    const onFailed = vi.fn()
    const queue = createTapQueue({ send, onResult: vi.fn(), onFailed, retryMs: 0 })
    const refused = { code: 'P0001', message: 'event_not_open' }

    queue.tap('confia')
    sent[0].fail(refused)
    await settle()
    await settle()
    expect(sent).toHaveLength(1)
    expect(onFailed).toHaveBeenCalledWith(refused)
  })
})
