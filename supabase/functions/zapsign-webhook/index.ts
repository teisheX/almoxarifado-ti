import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getNested(obj: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function getFirstSigner(payload: any) {
  const candidates = [
    payload?.signers,
    payload?.document?.signers,
    payload?.doc?.signers,
    payload?.data?.signers,
    payload?.data?.document?.signers,
    payload?.data?.doc?.signers,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate[0];
  }

  return null;
}

function normalizarStatus(payload: any) {
  const eventType = String(getNested(payload, ["event_type", "event", "type", "action"]) || "").toLowerCase();
  const status = String(getNested(payload, ["status", "doc_status", "document.status", "doc.status"]) || "").toLowerCase();
  const texto = `${eventType} ${status}`;

  if (texto.includes("doc_signed") || texto.includes("signed") || texto.includes("assinado")) return "assinado";
  if (texto.includes("finished") || texto.includes("completed") || texto.includes("concluido") || texto.includes("concluído")) return "assinado";
  if (texto.includes("rejected") || texto.includes("recusado")) return "recusado";
  if (texto.includes("deleted") || texto.includes("deletado")) return "deletado";
  if (texto.includes("expired") || texto.includes("expirado")) return "expirado";
  if (texto.includes("pending") || texto.includes("pendente")) return "enviado";
  if (texto.includes("created") || texto.includes("criado")) return "criado";

  return "atualizado";
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Método não permitido", { status: 405 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Secrets do Supabase ausentes", { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    console.log("ZAPSIGN_WEBHOOK_PAYLOAD", JSON.stringify(payload));

    const documentToken = getNested(payload, [
      "token",
      "doc_token",
      "document_token",
      "document.token",
      "doc.token",
      "data.token",
      "data.doc.token",
      "data.document.token",
    ]);

    const signedFile = getNested(payload, [
      "signed_file",
      "document.signed_file",
      "doc.signed_file",
      "data.signed_file",
      "data.doc.signed_file",
      "data.document.signed_file",
      "signed_pdf",
    ]);

    const signer = getFirstSigner(payload);

    const selfiePhotoUrl =
      signer?.selfie_photo_url ||
      signer?.selfie_photo_url2 ||
      getNested(payload, [
        "selfie_photo_url",
        "signer.selfie_photo_url",
        "data.selfie_photo_url",
      ]);

    const documentPhotoUrl =
      signer?.document_photo_url ||
      getNested(payload, [
        "document_photo_url",
        "signer.document_photo_url",
        "data.document_photo_url",
      ]);

    const documentVersePhotoUrl =
      signer?.document_verse_photo_url ||
      getNested(payload, [
        "document_verse_photo_url",
        "signer.document_verse_photo_url",
        "data.document_verse_photo_url",
      ]);

    const signatureImageUrl =
      signer?.signature_image ||
      getNested(payload, [
        "signature_image",
        "signer.signature_image",
        "data.signature_image",
      ]);

    const signerSignedAt =
      signer?.signed_at ||
      getNested(payload, [
        "signed_at",
        "signer.signed_at",
        "data.signed_at",
      ]);

    if (!documentToken) {
      console.log("WEBHOOK_SEM_TOKEN", JSON.stringify(payload));
      return new Response(
        JSON.stringify({ success: false, message: "Webhook recebido, mas sem token de documento." }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const novoStatus = normalizarStatus(payload);

    const { data, error } = await adminClient
      .from("termos_responsabilidade")
      .update({
        status: novoStatus,
        pdf_assinado_url: signedFile || null,
        signer_selfie_photo_url: selfiePhotoUrl || null,
        signer_document_photo_url: documentPhotoUrl || null,
        signer_document_verse_photo_url: documentVersePhotoUrl || null,
        signature_image_url: signatureImageUrl || null,
        signer_signed_at: signerSignedAt || null,
        signer_auth_mode: signer?.auth_mode || null,
        webhook_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("zapsign_document_token", documentToken)
      .select("id, status, zapsign_document_token");

    if (error) {
      console.error("ERRO_ATUALIZAR_TERMO_WEBHOOK", error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("WEBHOOK_TERMO_ATUALIZADO", JSON.stringify(data));

    return new Response(
      JSON.stringify({
        success: true,
        status: novoStatus,
        document_token: documentToken,
        updated: data?.length || 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("ERRO_ZAPSIGN_WEBHOOK", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
