# 3RN Ativos - Versão 2.0.0

Versão consolidada do sistema patrimonial do Grupo 3RN.

## Principais recursos

- Gestão patrimonial com cadastro, edição, busca, filtros e soft delete de itens.
- Campos de patrimônio, modelo, marca, número de série, setor, time, localização, responsável e valor estimado.
- Dashboard personalizado com nome do usuário.
- Perfis de acesso: administrador, supervisor e leitor por localização.
- Importação CSV e exportação PDF/CSV.
- QR Code para localizações.
- Painel administrativo para criar, editar, ativar/desativar e excluir usuários via Supabase Edge Functions.
- Integração ZapSign para Termo de Responsabilidade de Equipamentos.
- ZapSign em produção, sem `sandbox: true`.
- Assinatura na tela, CPF obrigatório e selfie/foto do signatário.
- Sem exigência de foto frente/verso do documento.
- Webhook ZapSign para atualizar status e salvar evidências retornadas.
- Botão gratuito de WhatsApp via `wa.me` para envio manual do link de assinatura.

## Funções Supabase necessárias

- `create-user`
- `update-user`
- `delete-user`
- `create-zapsign-term`
- `zapsign-webhook` com `--no-verify-jwt`

## Secrets necessárias

```powershell
supabase.cmd secrets set ZAPSIGN_API_TOKEN="SEU_TOKEN_ZAPSIGN"
```

## Deploy das funções

```powershell
supabase.cmd functions deploy create-user
supabase.cmd functions deploy update-user
supabase.cmd functions deploy delete-user
supabase.cmd functions deploy create-zapsign-term
supabase.cmd functions deploy zapsign-webhook --no-verify-jwt
```

## Deploy do site

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run deploy
```
