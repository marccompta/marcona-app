import { text } from './text'

type ErrorLike = { code?: unknown; status?: unknown; name?: unknown }

const byCode: Record<string, string> = {
  invalid_credentials: text.errors.invalidCredentials,
  over_request_rate_limit: text.errors.rateLimited,
}

// Turns any error into Catalan. The original message is never shown.
export function errorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return text.errors.unknown
  const { code, status, name } = error as ErrorLike

  if (typeof code === 'string' && code in byCode) return byCode[code]
  if (status === 429) return text.errors.rateLimited
  if (error instanceof TypeError || name === 'AuthRetryableFetchError') return text.errors.network
  return text.errors.unknown
}
