import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { byCode, errorMessage } from '../../src/i18n/errors'
import { formatCount, formatMoment, formatSigned } from '../../src/i18n/format'
import { text } from '../../src/i18n/text'
import type { Movement } from '../../src/lib/data'
import { movementLabel } from '../../src/screens/Movements'

const sql = readdirSync('supabase/migrations')
  .map((file) => readFileSync(`supabase/migrations/${file}`, 'utf8'))
  .join('\n')
const edgeFunction = readFileSync('supabase/functions/admin-users/index.ts', 'utf8')
const edgeRules = readFileSync('supabase/functions/admin-users/validate.ts', 'utf8')

describe('error codes', () => {
  it('REQ-019: every code a migration raises has Catalan text', () => {
    const codes = [...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((match) => match[1])
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) expect(byCode, code).toHaveProperty(code)
  })

  it('REQ-019: every code the Edge Function returns has Catalan text', () => {
    const codes = [
      ...[...edgeFunction.matchAll(/fail\('([a-z_]+)'/g)].map((match) => match[1]),
      ...[...edgeRules.matchAll(/: '([a-z_]+)',/g)].map((match) => match[1]),
    ]
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) expect(byCode, code).toHaveProperty(code)
  })

  it('REQ-043: reads our code from a Postgres exception', () => {
    expect(errorMessage({ code: 'P0001', message: 'insufficient_balance' })).toBe(text.errors.insufficientBalance)
  })

  it('REQ-019: never shows an unknown Postgres message', () => {
    expect(errorMessage({ code: 'P0001', message: 'Something in English' })).toBe(text.errors.unknown)
  })

  it('REQ-055: a refused call says so in Catalan', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied' })).toBe(text.errors.notAllowed)
    expect(errorMessage({ code: 'not_allowed' })).toBe(text.errors.notAllowed)
  })

  it('REQ-019: an unreachable Edge Function counts as no connection', () => {
    expect(errorMessage({ name: 'FunctionsFetchError' })).toBe(text.errors.network)
  })
})

describe('amounts', () => {
  it('REQ-069: signs every amount', () => {
    expect(formatSigned(5)).toBe('+5')
    expect(formatSigned(-1234)).toBe('-1.234')
  })

  it('REQ-016, REQ-069: gives a short time in Madrid, which fits on one line', () => {
    expect(formatMoment(new Date('2026-11-06T19:00:00Z'))).toBe('6 de nov., 20:00')
    expect(formatMoment(new Date('2026-12-31T23:30:00Z'))).toBe('1 de gen., 00:30')
  })

  it('REQ-017: counts people with the right plural', () => {
    expect(formatCount(1, text.units.people)).toBe('1 persona')
    expect(formatCount(6, text.units.people)).toBe('6 persones')
  })
})

describe('movement labels', () => {
  const movement = (fields: Partial<Movement>) => ({ kind: 'admin_adjustment', concept: null, ...fields }) as Movement

  it('REQ-069: shows the Concept when there is one', () => {
    expect(movementLabel(movement({ concept: 'Benvinguda' }))).toBe('Benvinguda')
  })

  it('REQ-069: otherwise turns the kind into Catalan', () => {
    expect(movementLabel(movement({}))).toBe(text.movements.kinds.admin_adjustment)
  })
})
