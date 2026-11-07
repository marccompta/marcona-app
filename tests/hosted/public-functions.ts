// Every function reachable through /rest/v1/rpc, with arguments that would
// otherwise work. A unit test fails if a migration adds one that isn't here.
export const publicFunctions = (userId: string): Record<string, Record<string, unknown>> => ({
  admin_adjust: {
    p_request_id: crypto.randomUUID(),
    p_user_id: userId,
    p_action: 'add',
    p_amount: 1,
    p_concept: 'Prova',
  },
  answer_invitation: { p_request_id: crypto.randomUUID(), p_event_id: crypto.randomUUID(), p_accept: true },
  cancel_event: { p_request_id: crypto.randomUUID(), p_event_id: crypto.randomUUID() },
  complete_event: {
    p_request_id: crypto.randomUUID(),
    p_event_id: crypto.randomUUID(),
    p_first: userId,
    p_second: null,
    p_third: null,
  },
  create_event: {
    p_request_id: crypto.randomUUID(),
    p_name: 'Prova',
    p_buy_in: 1,
    p_invitees: [crypto.randomUUID()],
    p_payout_first: 50,
    p_payout_second: 30,
    p_payout_third: 20,
  },
  revoke_sessions: { p_user_id: userId },
  rls_auto_enable: {},
  rls_report: {},
})
