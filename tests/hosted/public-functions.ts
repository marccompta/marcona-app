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
  revoke_sessions: { p_user_id: userId },
  rls_auto_enable: {},
  rls_report: {},
})
