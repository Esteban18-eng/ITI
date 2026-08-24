declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

// Supabase Edge Functions resolve this remote import in the Deno runtime.
// @ts-ignore
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const authorization = request.headers.get('Authorization')
  if (!authorization) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(url, serviceKey)
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Sesión inválida' }, { status: 401 })
  const { data: requester } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (requester?.role !== 'Administrador') return Response.json({ error: 'Solo un Administrador puede invitar usuarios' }, { status: 403 })

  const { email, full_name, role } = await request.json()
  if (!email || !full_name || !['Administrador', 'Docente', 'Psicólogo/Orientador'].includes(role)) return Response.json({ error: 'Datos de invitación incompletos' }, { status: 400 })
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { full_name } })
  if (inviteError || !invited.user) return Response.json({ error: inviteError?.message || 'No se pudo enviar la invitación' }, { status: 400 })
  const { data: profile, error: profileError } = await adminClient.from('profiles').insert({ id: invited.user.id, full_name, role }).select('id, full_name, role, created_at').single()
  if (profileError) return Response.json({ error: profileError.message }, { status: 400 })
  return Response.json({ profile })
})
