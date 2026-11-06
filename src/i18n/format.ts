import { text } from './text'

const locale = 'ca-ES'
const timeZone = 'Europe/Madrid'

const numbers = new Intl.NumberFormat(locale, { useGrouping: true })
const signedNumbers = new Intl.NumberFormat(locale, { useGrouping: true, signDisplay: 'always' })
const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone })
const moments = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone,
})
const plurals = new Intl.PluralRules(locale)

export const formatNumber = (value: number) => numbers.format(value)

export const formatSigned = (value: number) => signedNumbers.format(value)

export const formatDate = (value: Date) => dates.format(value)

// For lists of movements, where every row has one. MarcOna is a single day, so
// the year adds nothing.
export const formatMoment = (value: Date) => moments.format(value)

export function formatCount(amount: number, unit: { one: string; other: string }) {
  const form = plurals.select(Math.abs(amount)) === 'one' ? 'one' : 'other'
  return `${formatNumber(amount)} ${unit[form]}`
}

export const formatMarcones = (amount: number) => formatCount(amount, text.units.marcones)
