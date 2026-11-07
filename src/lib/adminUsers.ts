import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminUsersRequest =
  | { action: 'create'; username: string; password: string; isTest?: boolean }
  | { action: 'reset'; userId: string; password: string }
  | { action: 'remove'; userId: string }

// Calls the admin-users Edge Function. A refusal rejects with { code }, which
// errorMessage() turns into Catalan.
export async function callAdminUsers<Result = { userId: string; username: string }>(
  client: SupabaseClient,
  request: AdminUsersRequest,
): Promise<Result> {
  const { data, error } = await client.functions.invoke('admin-users', { body: request })
  if (!error) return data as Result

  const response: unknown = error.context
  if (response instanceof Response) {
    const body = await response.clone().json().catch(() => null)
    if (typeof body?.error === 'string') throw { code: body.error }
  }
  throw error
}
