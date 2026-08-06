import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function limparTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function somenteNumeros(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

function gerarMarkdownTermo(params: { colaborador: any; itens: any[]; localData: string }) {
  const { colaborador, itens, localData } = params;

  const listaEquipamentos = itens
    .map((item) => {
      const modelo = limparTexto(item.modelo || "Equipamento");
      const patrimonio = limparTexto(item.patrimonio || "Sem patrimônio");
      const serie = limparTexto(item.numero_serie || "");
      const setor = limparTexto(item.setor || "");
      const time = limparTexto(item.time || "");

      let linha = `- ${modelo} | Patrimônio: ${patrimonio}`;
      if (serie) linha += ` | Nº Série: ${serie}`;
      if (setor) linha += ` | Setor: ${setor}`;
      if (time) linha += ` | Time: ${time}`;
      return linha;
    })
    .join("\n");

  return `
# TERMO DE RESPONSABILIDADE E ENTREGA DE EQUIPAMENTOS DE INFORMÁTICA

**EMPRESA:** GRUPO 3RN  
**ENDEREÇO:** Rua 21, Qd. 35, Lt. 03 – Jardim Cabral – Itaberaí/GO  

De um lado, a **EMPRESA**, e de outro lado:

**COLABORADOR:** ${limparTexto(colaborador.nome)}  
**CPF:** ${limparTexto(colaborador.cpf)}  
**CARGO:** ${limparTexto(colaborador.cargo)}  
**SETOR:** ${limparTexto(colaborador.setor)}  

Doravante denominado(a) **RESPONSÁVEL**.

## 1. DO OBJETO

1.1. O presente Termo tem por objeto o recebimento, pelo RESPONSÁVEL, dos equipamentos de informática abaixo descritos, de propriedade exclusiva da EMPRESA, destinados única e exclusivamente à execução de suas atividades profissionais:

${listaEquipamentos}

## 2. DA RESPONSABILIDADE

2.1. O RESPONSÁVEL declara que recebeu os equipamentos acima descritos em perfeitas condições de uso, comprometendo-se a zelar pela sua correta utilização, conservação e guarda.

2.2. O RESPONSÁVEL compromete-se a:

a) Utilizar os equipamentos exclusivamente para fins relacionados às atividades da EMPRESA;  

b) Não emprestar, ceder, doar, vender ou permitir o uso por terceiros não autorizados;  

c) Seguir rigorosamente as orientações de uso, segurança e manutenção fornecidas pela EMPRESA.

## 3. DE DANOS, PERDA, FURTO OU ROUBO

3.1. Em caso de danos decorrentes de mau uso, negligência, imprudência ou uso indevido, o RESPONSÁVEL poderá ser responsabilizado pelos custos de reparo ou substituição dos equipamentos, conforme avaliação da EMPRESA.

3.2. Em situações de perda, furto ou roubo, o RESPONSÁVEL deverá comunicar imediatamente a EMPRESA, apresentando, quando aplicável, o respectivo boletim de ocorrência.

## 4. DA DEVOLUÇÃO

4.1. O RESPONSÁVEL compromete-se a devolver os equipamentos à EMPRESA:

a) Sempre que solicitado;  

b) Em caso de mudança de local de trabalho;  

c) Em caso de mudança de função ou setor;  

d) No desligamento da EMPRESA, independentemente do motivo.

4.2. Os equipamentos deverão ser devolvidos em boas condições de uso, ressalvado o desgaste natural decorrente do uso regular.

## 5. DISPOSIÇÕES GERAIS

5.1. O presente Termo não transfere ao RESPONSÁVEL a propriedade dos equipamentos, que permanece integralmente pertencente à EMPRESA.

5.2. O RESPONSÁVEL declara estar ciente e de pleno acordo com todas as condições aqui estabelecidas.

5.3. Este Termo entra em vigor na data de sua assinatura pelas partes.

**Local e Data:** ${localData}

---

**RESPONSÁVEL PELO EQUIPAMENTO**  

**Nome:** ${limparTexto(colaborador.nome)}  

**CPF:** ${limparTexto(colaborador.cpf)}
`;
}

function gerarLinkWhatsapp(params: { nome: string; telefone: string; signUrl: string }) {
  const nome = limparTexto(params.nome);
  let telefone = somenteNumeros(params.telefone);
  if (!telefone || !params.signUrl) return null;
  if (!telefone.startsWith("55")) telefone = `55${telefone}`;

  const mensagem = `Olá, ${nome}.\n\nSegue o Termo de Responsabilidade dos equipamentos do Grupo 3RN para assinatura:\n\n${params.signUrl}\n\nApós assinar, o sistema atualizará o status automaticamente.`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido. Use POST." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const zapsignToken = Deno.env.get("ZAPSIGN_API_TOKEN");

    if (!supabaseUrl || !serviceRoleKey || !zapsignToken) {
      return new Response(
        JSON.stringify({
          error: "Secrets ausentes.",
          details: "Confira se SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e ZAPSIGN_API_TOKEN existem nas Edge Functions.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado." }), {
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
      return new Response(JSON.stringify({ error: "Usuário inválido.", details: requesterError?.message || null }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = requesterData.user.id;

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, ativo")
      .eq("id", requesterId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Perfil do usuário não encontrado.", details: profileError?.message || null }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.ativo || !["admin", "supervisor"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Apenas admin ou supervisor podem gerar termo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const colaborador = body?.colaborador;
    const itemIds = body?.item_ids;
    const localDataInformada = body?.local_data;

    if (!limparTexto(colaborador?.nome)) {
      return new Response(JSON.stringify({ error: "Nome do colaborador é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!limparTexto(colaborador?.email)) {
      return new Response(JSON.stringify({ error: "E-mail do colaborador é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!limparTexto(colaborador?.cpf)) {
      return new Response(JSON.stringify({ error: "CPF do colaborador é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return new Response(JSON.stringify({ error: "Selecione pelo menos um ativo para gerar o termo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cpfLimpo = somenteNumeros(colaborador.cpf);
    const telefoneLimpo = somenteNumeros(colaborador.telefone);

    if (cpfLimpo.length < 11) {
      return new Response(JSON.stringify({ error: "CPF inválido.", details: "Informe o CPF com 11 dígitos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: itens, error: itensError } = await adminClient
      .from("itens")
      .select("id, modelo, patrimonio, numero_serie, setor, time")
      .in("id", itemIds)
      .is("deleted_at", null);

    if (itensError) {
      return new Response(JSON.stringify({ error: "Erro ao buscar os ativos no banco.", details: itensError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!itens || itens.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ativo encontrado para gerar o termo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let colaboradorData: any = null;

    const { data: colaboradorExistente, error: buscaColaboradorError } = await adminClient
      .from("colaboradores")
      .select("*")
      .eq("cpf", cpfLimpo)
      .maybeSingle();

    if (buscaColaboradorError) {
      return new Response(JSON.stringify({ error: "Erro ao consultar colaborador.", details: buscaColaboradorError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const colaboradorPayload = {
      nome: limparTexto(colaborador.nome),
      cpf: cpfLimpo,
      email: limparTexto(colaborador.email).toLowerCase(),
      telefone: telefoneLimpo || null,
      cargo: limparTexto(colaborador.cargo) || null,
      setor: limparTexto(colaborador.setor) || null,
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    if (colaboradorExistente) {
      const { data, error } = await adminClient
        .from("colaboradores")
        .update(colaboradorPayload)
        .eq("id", colaboradorExistente.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar colaborador.", details: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      colaboradorData = data;
    } else {
      const { data, error } = await adminClient
        .from("colaboradores")
        .insert(colaboradorPayload)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Erro ao criar colaborador.", details: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      colaboradorData = data;
    }

    const localData = limparTexto(localDataInformada) || `Itaberaí/GO, ${new Date().toLocaleDateString("pt-BR")}`;
    const markdownTermo = gerarMarkdownTermo({ colaborador: colaboradorData, itens, localData });

    const payloadZapSign = {
      name: `Termo de Responsabilidade - ${colaboradorData.nome}`,
      markdown_text: markdownTermo,
      lang: "pt-br",

      // PRODUÇÃO: não use sandbox aqui.
      // O documento será criado como válido na ZapSign, desde que o Plano API esteja liberado.
      disable_signer_emails: false,
      signers: [
        {
          name: colaboradorData.nome,
          email: colaboradorData.email,
          cpf: cpfLimpo,

          // Assinatura desenhada na tela.
          auth_mode: "assinaturaTela",

          // Exige CPF no relatório/evidências da assinatura.
          require_cpf: true,

          // Exige selfie/foto do signatário durante a assinatura.
          require_selfie_photo: true,

          // Validação avançada opcional da ZapSign.
          // "none" mantém assinatura + coleta de fotos sem biometria paga/avançada.
          // Para prova de vida + documento, consulte seu plano e troque para "liveness-document-match".
          selfie_validation_type: "none",

          send_automatic_email: true,
          lock_name: true,
          lock_email: true,
          lock_phone: false,
          lock_cpf: true,
          phone_country: "55",
          phone_number: telefoneLimpo || "",
        },
      ],
    };

    const zapsignResponse = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zapsignToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadZapSign),
    });

    const zapsignText = await zapsignResponse.text();
    let zapsignJson: any = null;

    try {
      zapsignJson = JSON.parse(zapsignText);
    } catch (_error) {
      zapsignJson = { raw_response: zapsignText };
    }

    if (!zapsignResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Erro ao criar documento na ZapSign.",
          status: zapsignResponse.status,
          details: zapsignJson,
          payload_enviado: {
            name: payloadZapSign.name,
            markdown_text_length: markdownTermo.length,
            signers: payloadZapSign.signers,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const signer = Array.isArray(zapsignJson.signers) ? zapsignJson.signers[0] : null;
    const signUrl = signer?.sign_url || signer?.sign_url_short || signer?.url || zapsignJson.sign_url || zapsignJson.sign_url_short || null;
    const whatsappUrl = signUrl
      ? gerarLinkWhatsapp({ nome: colaboradorData.nome, telefone: colaboradorData.telefone || telefoneLimpo, signUrl })
      : null;

    const { data: termoData, error: termoError } = await adminClient
      .from("termos_responsabilidade")
      .insert({
        colaborador_id: colaboradorData.id,
        status: "enviado",
        zapsign_document_token: zapsignJson.token || null,
        zapsign_signer_token: signer?.token || null,
        zapsign_sign_url: signUrl,
        pdf_original_url: zapsignJson.original_file || null,
        webhook_payload: zapsignJson,
        local_data: localData,
        criado_por: requesterId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (termoError) {
      return new Response(
        JSON.stringify({
          error: "Documento criado na ZapSign, mas houve erro ao salvar o termo no banco.",
          details: termoError.message,
          zapsign: zapsignJson,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const termoItens = itens.map((item) => ({
      termo_id: termoData.id,
      item_id: item.id,
      modelo: item.modelo || null,
      marca: null,
      patrimonio: item.patrimonio || null,
      numero_serie: item.numero_serie || null,
      setor: item.setor || null,
      time: item.time || null,
      localizacao: null,
    }));

    const { error: termoItensError } = await adminClient.from("termo_itens").insert(termoItens);

    if (termoItensError) {
      return new Response(
        JSON.stringify({
          error: "Documento criado e termo salvo, mas houve erro ao salvar os ativos do termo.",
          details: termoItensError.message,
          termo: termoData,
          zapsign: zapsignJson,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await adminClient.from("audit_logs").insert({
      usuario_id: requesterId,
      acao: "GERAR_TERMO_ZAPSIGN",
      tabela_afetada: "termos_responsabilidade",
      registro_id: termoData.id,
      detalhes: {
        colaborador: colaboradorData.nome,
        email: colaboradorData.email,
        zapsign_document_token: zapsignJson.token || null,
        quantidade_itens: itens.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Termo criado com sucesso na ZapSign em produção, com assinatura na tela e selfie.",
        termo: termoData,
        sign_url: signUrl,
        whatsapp_url: whatsappUrl,
        zapsign: zapsignJson,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("ERRO_CREATE_ZAPSIGN_TERM", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao gerar termo.", details: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
