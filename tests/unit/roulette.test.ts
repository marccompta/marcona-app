import { describe, expect, it } from 'vitest'
import { addToBoard, boardPlaces, pocketAt, pockets, stopRotation, type Colour } from '../../src/lib/roulette'

const colours: Colour[] = ['red', 'black', 'white']

describe('the wheel', () => {
  it('REQ-113: has 18 red, 18 black and 1 white pocket', () => {
    const count = (colour: Colour) => pockets.filter((pocket) => pocket === colour).length
    expect([count('red'), count('black'), count('white')]).toEqual([18, 18, 1])
  })

  it('REQ-113: never puts two reds or two blacks side by side', () => {
    const neighbours = pockets.slice(1).map((pocket, index) => [pockets[index], pocket])
    expect(neighbours.filter(([a, b]) => a === b)).toEqual([])
  })

  it('REQ-112: stops on the server result, from any position and for any pocket', () => {
    for (const result of colours) {
      for (const from of [0, 1, 89.5, 359.99, 1234.5, 100000]) {
        for (const pick of [0, 0.2, 0.5, 0.75, 0.999]) {
          expect(pocketAt(stopRotation(result, from, 540, pick)), `${result} from ${from}`).toBe(result)
        }
      }
    }
  })

  it('REQ-112: every pocket of a colour can be the one it stops on', () => {
    const stops = new Set(
      Array.from({ length: 100 }, (_, index) => stopRotation('red', 0, 540, index / 100) % 360).map((angle) => angle.toFixed(3)),
    )
    expect(stops.size).toBe(18)
  })

  it('REQ-113: always travels forward, by at least the minimum and less than a turn more', () => {
    for (const from of [0, 10, 359, 5000.5]) {
      const travel = stopRotation('black', from, 540, 0.3) - from
      expect(travel).toBeGreaterThanOrEqual(540)
      expect(travel).toBeLessThan(540 + 360)
    }
  })
})

describe('the board of last results', () => {
  const spins = (...results: Colour[]) => results.map((result, index) => ({ id: index + 1, result }))

  it('REQ-221: shows 10 places, empty until filled', () => {
    expect(boardPlaces([])).toEqual(Array(10).fill(null))
    expect(boardPlaces(addToBoard([], ...spins('red', 'white', 'black')))).toEqual(['black', 'white', 'red', ...Array(7).fill(null)])
  })

  it('REQ-220: puts a new result first, and keeps only 10', () => {
    const full = addToBoard([], ...spins('white', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'))
    const after = addToBoard(full, { id: 11, result: 'red' })
    expect(boardPlaces(after)).toEqual(['red', ...Array(8).fill('black'), 'black'])
    expect(after.map((entry) => entry.id)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  })

  it('REQ-219: never shows more than 10', () => {
    expect(boardPlaces(addToBoard([], ...spins(...Array<Colour>(12).fill('red'))))).toHaveLength(10)
  })

  it('REQ-219, REQ-220: a spin made while the first read was on its way is kept once, in order', () => {
    const spun = addToBoard([], { id: 7, result: 'white' })
    const read = spins('red', 'black', 'red', 'black', 'red', 'black', 'white')
    expect(boardPlaces(addToBoard(spun, ...read))).toEqual(['white', 'black', 'red', 'black', 'red', 'black', 'red', null, null, null])
  })
})
