import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Variáveis do Supabase não configuradas na Edge Function" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token de autorização não informado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requesterData, error: requesterError } = await userClient.auth.getUser();
    if (requesterError || !requesterData?.user) {
      return new Response(JSON.stringify({ error: "Usuário solicitante inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = requesterData.user.id;

    const { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from("profiles")
      .select("id, role, ativo")
      .eq("id", requesterId)
      .single();

    if (requesterProfileError || !requesterProfile || requesterProfile.role !== "admin" || requesterProfile.ativo !== true) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem editar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      user_id,
      nome,
      email,
      password,
      role,
      ativo,
      supervisor_pode_exportar,
      localizacao_id,
    } = body;

    if (!user_id || !nome || !email || !role) {
      return new Response(JSON.stringify({ error: "ID, nome, e-mail e perfil são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rolesPermitidas = ["admin", "supervisor", "leitor"];
    if (!rolesPermitidas.includes(role)) {
      return new Response(JSON.stringify({ error: "Perfil inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role === "leitor" && !localizacao_id) {
      return new Response(JSON.stringify({ error: "Usuário leitor precisa ter uma localização vinculada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password && password.length < 6) {
      return new Response(JSON.stringify({ error: "A nova senha precisa ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user_id === requesterId && (role !== "admin" || ativo === false)) {
      return new Response(JSON.stringify({ error: "Você não pode remover seu próprio acesso administrativo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUpdate: Record<string, unknown> = {
      email,
      email_confirm: true,
      user_metadata: { nome },
    };

    if (password) {
      authUpdate.password = password;
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user_id, authUpdate);
    if (authUpdateError) {
      return new Response(JSON.stringify({ error: authUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        nome,
        email,
        role,
        ativo: ativo ?? true,
        supervisor_pode_exportar: role === "supervisor" ? Boolean(supervisor_pode_exportar) : false,
        localizacao_id: role === "leitor" ? localizacao_id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (profileUpdateError) {
      return new Response(JSON.stringify({ error: profileUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("audit_logs").insert({
      usuario_id: requesterId,
      acao: "EDITAR_USUARIO",
      tabela_afetada: "profiles",
      registro_id: user_id,
      detalhes: { nome, email, role, ativo, localizacao_id: role === "leitor" ? localizacao_id : null },
    });

    return new Response(JSON.stringify({ success: true, message: "Usuário atualizado com sucesso" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message ?? "Erro interno ao editar usuário" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
