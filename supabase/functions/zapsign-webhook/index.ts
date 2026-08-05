import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return new Response("Variáveis Supabase ausentes", { status: 500 });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    const documentToken = payload?.token || payload?.doc_token || payload?.document_token || payload?.doc?.token || payload?.document?.token;
    const rawStatus = payload?.status || payload?.doc_status || payload?.event_type || payload?.event || payload?.type;
    const signedFile = payload?.signed_file || payload?.doc?.signed_file || payload?.document?.signed_file || payload?.signed_pdf;

    if (!documentToken) return new Response(JSON.stringify({ success: true, ignored: "sem token" }), { status: 200 });

    const statusText = String(rawStatus || "").toLowerCase();
    let novoStatus = "atualizado";
    if (statusText.includes("signed") || statusText.includes("assinado") || statusText.includes("completed") || statusText.includes("finalizado")) novoStatus = "assinado";
    if (statusText.includes("rejected") || statusText.includes("recusado")) novoStatus = "recusado";
    if (statusText.includes("deleted") || statusText.includes("deletado")) novoStatus = "deletado";
    if (statusText.includes("created") || statusText.includes("criado")) novoStatus = "criado";

    await adminClient
      .from("termos_responsabilidade")
      .update({
        status: novoStatus,
        pdf_assinado_url: signedFile || null,
        webhook_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("zapsign_document_token", documentToken);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Erro no webhook" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
