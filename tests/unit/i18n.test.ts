import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { errorMessage } from '../../src/i18n/errors'
import { formatDate, formatMarcones, formatNumber } from '../../src/i18n/format'
import { text } from '../../src/i18n/text'

describe('formatting', () => {
  it('REQ-016: formats numbers for ca-ES', () => {
    expect(formatNumber(1234)).toBe('1.234')
    expect(formatNumber(1234567)).toBe('1.234.567')
  })

  it('REQ-016: formats dates for ca-ES in Madrid time', () => {
    // 23:30 UTC on New Year's Eve is already the next year in Madrid.
    expect(formatDate(new Date('2026-12-31T23:30:00Z'))).toBe('1 de gener del 2027, a les 0:30')
  })

  it('REQ-017: uses the singular only for exactly one', () => {
    expect(formatMarcones(1)).toBe('1 marcona')
    expect(formatMarcones(-1)).toBe('-1 marcona')
    expect(formatMarcones(0)).toBe('0 marcones')
    expect(formatMarcones(2)).toBe('2 marcones')
    expect(formatMarcones(1234)).toBe('1.234 marcones')
  })
})

describe('Supabase errors', () => {
  it('REQ-019: maps a wrong password to Catalan', () => {
    const message = errorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })
    expect(message).toBe(text.errors.invalidCredentials)
  })

  it('REQ-019: maps rate limits to Catalan', () => {
    const message = errorMessage({ code: 'over_request_rate_limit', message: 'Too many requests' })
    expect(message).toBe(text.errors.rateLimited)
    expect(errorMessage({ status: 429, message: 'Slow down' })).toBe(text.errors.rateLimited)
  })

  it('REQ-019: maps a dropped connection to Catalan', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(text.errors.network)
    expect(errorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(text.errors.network)
  })

  it('REQ-019: never shows raw text from an unknown error', () => {
    const raw = 'Database error querying schema'
    expect(errorMessage({ code: 'unexpected_failure', message: raw })).toBe(text.errors.unknown)
    expect(errorMessage(raw)).toBe(text.errors.unknown)
    expect(errorMessage(null)).toBe(text.errors.unknown)
  })
})

describe('the document', () => {
  const html = readFileSync('index.html', 'utf8')

  it('REQ-015: says it is in Catalan', () => {
    expect(html).toContain('<html lang="ca">')
  })

  it('REQ-014, REQ-018: uses the title and description from the text module', () => {
    expect(html).toContain(`<title>${text.app.name}</title>`)
    expect(html).toContain(`content="${text.app.description}"`)
  })
})
