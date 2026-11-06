import { text } from './text'

const locale = 'ca-ES'
const timeZone = 'Europe/Madrid'

const numbers = new Intl.NumberFormat(locale, { useGrouping: true })
const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone })
const plurals = new Intl.PluralRules(locale)

export const formatNumber = (value: number) => numbers.format(value)

export const formatDate = (value: Date) => dates.format(value)

export function formatMarcones(amount: number) {
  const form = plurals.select(Math.abs(amount)) === 'one' ? 'one' : 'other'
  return `${formatNumber(amount)} ${text.units.marcones[form]}`
}
