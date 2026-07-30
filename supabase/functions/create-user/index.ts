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

    const { data: adminProfile, error: profileError } = await userClient
      .from('profiles')
      .select('id, role, ativo')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !adminProfile || adminProfile.role !== 'admin' || !adminProfile.ativo) {
      return jsonResponse({ error: 'Apenas administradores podem criar usuários.' }, 403)
    }

    const body = await req.json()
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = String(body.role || 'leitor')
    const localizacaoId = body.localizacao_id ? String(body.localizacao_id) : null
    const supervisorPodeExportar = Boolean(body.supervisor_pode_exportar)

    if (!nome) return jsonResponse({ error: 'Nome é obrigatório.' }, 400)
    if (!email) return jsonResponse({ error: 'E-mail é obrigatório.' }, 400)
    if (!password || password.length < 6) return jsonResponse({ error: 'Senha precisa ter pelo menos 6 caracteres.' }, 400)
    if (!['admin', 'supervisor', 'leitor'].includes(role)) return jsonResponse({ error: 'Perfil inválido.' }, 400)
    if (role === 'leitor' && !localizacaoId) return jsonResponse({ error: 'Leitor precisa ter uma localização vinculada.' }, 400)

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (createError) {
      return jsonResponse({ error: createError.message }, 400)
    }

    const newAuthUser = created.user

    if (!newAuthUser) {
      return jsonResponse({ error: 'Usuário não foi criado no Supabase Auth.' }, 500)
    }

    const { error: profileUpsertError } = await serviceClient
      .from('profiles')
      .upsert({
        id: newAuthUser.id,
        nome,
        email,
        role,
        ativo: true,
        localizacao_id: role === 'leitor' ? localizacaoId : null,
        supervisor_pode_exportar: role === 'supervisor' ? supervisorPodeExportar : false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileUpsertError) {
      return jsonResponse({ error: profileUpsertError.message }, 400)
    }

    await serviceClient.from('audit_logs').insert({
      usuario_id: authData.user.id,
      acao: 'CRIAR_USUARIO',
      tabela_afetada: 'profiles',
      registro_id: newAuthUser.id,
      detalhes: {
        nome,
        email,
        role,
        localizacao_id: role === 'leitor' ? localizacaoId : null
      }
    })

    return jsonResponse({
      ok: true,
      user: {
        id: newAuthUser.id,
        nome,
        email,
        role
      }
    })
  } catch (error) {
    return jsonResponse({ error: error?.message || 'Erro inesperado ao criar usuário.' }, 500)
  }
})
