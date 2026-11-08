import { text } from './text'

type ErrorLike = { code?: unknown; message?: unknown; status?: unknown; name?: unknown; details?: unknown }

// Supabase Auth's codes, and the ones our own functions return. A test checks
// that every code in the migrations and the Edge Function is listed here.
export const byCode: Record<string, string> = {
  invalid_credentials: text.errors.invalidCredentials,
  over_request_rate_limit: text.errors.rateLimited,
  user_banned: text.errors.accountRemoved,
  not_allowed: text.errors.notAllowed,
  '42501': text.errors.notAllowed,
  concept_required: text.errors.conceptRequired,
  invalid_amount: text.errors.invalidAmount,
  invalid_action: text.errors.unknown,
  insufficient_balance: text.errors.insufficientBalance,
  forced_insufficient_balance: text.errors.insufficientBalance,
  user_not_found: text.errors.userNotFound,
  event_name_required: text.errors.eventNameRequired,
  event_name_too_long: text.errors.eventNameTooLong,
  invalid_buy_in: text.errors.invalidBuyIn,
  invalid_percentages: text.errors.invalidPercentages,
  no_invitees: text.errors.noInvitees,
  invalid_invitee: text.errors.invalidInvitee,
  event_not_open: text.errors.eventNotOpen,
  event_not_found: text.errors.eventNotFound,
  invitation_not_pending: text.errors.invitationNotPending,
  not_enough_participants: text.errors.notEnoughParticipants,
  invalid_winners: text.errors.invalidWinners,
  invalid_bet: text.errors.invalidBet,
  invalid_choice: text.errors.invalidChoice,
  bet_too_high: text.errors.betTooHigh,
  roulette_closed: text.errors.rouletteClosed,
  invalid_white_chance: text.errors.invalidWhiteChance,
  invalid_max_bet_percent: text.errors.invalidMaxBetPercent,
  invalid_roulette_settings: text.errors.unknown,
  game_decides_winners: text.errors.gameDecidesWinners,
  game_not_choosing: text.errors.gameNotChoosing,
  invalid_game_choice: text.errors.invalidGameChoice,
  invalid_game_percentage: text.errors.invalidGamePercentage,
  invalid_duel_order: text.errors.invalidDuelOrder,
  game_description_required: text.errors.gameDescriptionRequired,
  game_description_too_long: text.errors.gameDescriptionTooLong,
  game_off: text.errors.gameOff,
  game_not_found: text.errors.gameNotFound,
  duel_needs_two_players: text.errors.duelNeedsTwoPlayers,
  minoria_needs_three_players: text.errors.minoriaNeedsThreePlayers,
  not_enough_players: text.errors.notEnoughPlayers,
  game_not_inviting: text.errors.gameNotInviting,
  game_has_no_start: text.errors.unknown,
  invalid_game_options: text.errors.unknown,
  ledger_is_append_only: text.errors.unknown,
  invalid_username: text.errors.invalidUsername,
  username_taken: text.errors.usernameTaken,
  weak_password: text.errors.weakPassword,
  same_password: text.errors.samePassword,
  cannot_remove_self: text.errors.cannotRemoveSelf,
  user_in_open_event: text.errors.userInOpenEvent,
  unknown_action: text.errors.unknown,
  failed: text.errors.unknown,
}

// P0001 is what `raise exception` gives, and the message holds our code.
const raisedByPostgres = 'P0001'

// Turns any error into Catalan. The original message is never shown.
export function errorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return text.errors.unknown
  const { code, message, status, name, details } = error as ErrorLike

  // REQ-189: the only refusal that carries data, the usernames who can't pay.
  if (code === raisedByPostgres && message === 'forced_insufficient_balance' && typeof details === 'string') {
    return text.errors.forcedInsufficientBalance(details)
  }
  if (code === raisedByPostgres && typeof message === 'string' && message in byCode) return byCode[message]
  if (typeof code === 'string' && code in byCode) return byCode[code]
  if (status === 429) return text.errors.rateLimited
  if (error instanceof TypeError || name === 'AuthRetryableFetchError' || name === 'FunctionsFetchError') {
    return text.errors.network
  }
  return text.errors.unknown
}
