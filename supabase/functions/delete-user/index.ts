import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Variáveis do Supabase não configuradas na Edge Function.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: authData, error: authError } = await userClient.auth.getUser()

    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401)
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: adminProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, role, ativo, email')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !adminProfile || adminProfile.role !== 'admin' || !adminProfile.ativo) {
      return jsonResponse({ error: 'Apenas administradores podem excluir usuários.' }, 403)
    }

    const body = await req.json()
    const userId = String(body.user_id || '').trim()

    if (!userId) {
      return jsonResponse({ error: 'ID do usuário é obrigatório.' }, 400)
    }

    if (userId === authData.user.id) {
      return jsonResponse({ error: 'Você não pode excluir o próprio usuário logado.' }, 400)
    }

    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('id, nome, email, role')
      .eq('id', userId)
      .maybeSingle()

    await serviceClient.from('audit_logs').insert({
      usuario_id: authData.user.id,
      acao: 'EXCLUIR_USUARIO',
      tabela_afetada: 'profiles',
      registro_id: userId,
      detalhes: {
        usuario_excluido: targetProfile || null
      }
    })

    const { error: deleteProfileError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      return jsonResponse({ error: deleteProfileError.message }, 400)
    }

    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      return jsonResponse({ error: deleteAuthError.message }, 400)
    }

    return jsonResponse({
      ok: true,
      message: 'Usuário excluído com sucesso.'
    })
  } catch (error) {
    return jsonResponse({ error: error?.message || 'Erro inesperado ao excluir usuário.' }, 500)
  }
})
