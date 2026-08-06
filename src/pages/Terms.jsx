import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, ExternalLink, FileSignature, MessageCircle, RefreshCcw, Search, Send, ShieldCheck, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const initialColaborador = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
  setor: ''
}

function text(value) {
  return String(value ?? '').trim()
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

function statusLabel(status) {
  const map = {
    rascunho: 'Rascunho',
    enviado: 'Enviado',
    criado: 'Criado',
    assinado: 'Assinado',
    recusado: 'Recusado',
    deletado: 'Deletado',
    atualizado: 'Atualizado',
    expirado: 'Expirado'
  }
  return map[status] || status || '-'
}

function buildWhatsappUrl({ nome, telefone, signUrl }) {
  let phone = onlyDigits(telefone)
  if (!phone || !signUrl) return ''
  if (!phone.startsWith('55')) phone = `55${phone}`

  const mensagem = `Olá, ${text(nome)}.\n\nSegue o Termo de Responsabilidade dos equipamentos do Grupo 3RN para assinatura:\n\n${signUrl}\n\nApós assinar, o sistema atualizará o status automaticamente.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`
}

async function readFunctionError(error) {
  let message = error?.message || 'Erro ao chamar a Edge Function.'

  try {
    const context = error?.context
    if (context && typeof context.json === 'function') {
      const details = await context.json()
      if (details?.error) message = details.error
      if (details?.details) {
        message += `\n${typeof details.details === 'string' ? details.details : JSON.stringify(details.details, null, 2)}`
      }
      if (details?.status) message += `\nStatus: ${details.status}`
    }
  } catch (_err) {
    // mantém mensagem padrão
  }

  return message
}

export default function Terms() {
  const [items, setItems] = useState([])
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [colaborador, setColaborador] = useState(initialColaborador)
  const [localData, setLocalData] = useState(`Itaberaí/GO, ${new Date().toLocaleDateString('pt-BR')}`)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [lastSignUrl, setLastSignUrl] = useState('')
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState('')

  async function loadData() {
    const [itemsRes, termsRes] = await Promise.all([
      supabase
        .from('itens')
        .select('id,modelo,patrimonio,numero_serie,setor,time,marcas(nome),localizacoes(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('termos_responsabilidade')
        .select('*, colaboradores(nome,cpf,email,telefone,cargo,setor)')
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    if (itemsRes.error) console.error(itemsRes.error)
    if (termsRes.error) console.error(termsRes.error)

    setItems(itemsRes.data || [])
    setTerms(termsRes.data || [])
  }

  useEffect(() => { loadData() }, [])

  const filteredItems = useMemo(() => {
    const q = text(search).toLowerCase()
    if (!q) return items

    return items.filter(item => [
      item.modelo,
      item.patrimonio,
      item.numero_serie,
      item.setor,
      item.time,
      item.marcas?.nome,
      item.localizacoes?.nome
    ].some(value => String(value || '').toLowerCase().includes(q)))
  }, [items, search])

  const selectedItems = useMemo(() => {
    const set = new Set(selectedIds)
    return items.filter(item => set.has(item.id))
  }, [items, selectedIds])

  function toggleItem(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id])
  }

  function updateColaborador(field, value) {
    setColaborador(prev => ({ ...prev, [field]: value ?? '' }))
  }

  async function handleCreateTerm(e) {
    e.preventDefault()
    setMessage('')
    setLastSignUrl('')
    setLastWhatsappUrl('')

    if (!text(colaborador.nome)) return setMessage('Informe o nome do colaborador.')
    if (!text(colaborador.cpf)) return setMessage('Informe o CPF do colaborador.')
    if (!text(colaborador.email)) return setMessage('Informe o e-mail do colaborador.')
    if (!selectedIds.length) return setMessage('Selecione pelo menos um ativo para gerar o termo.')

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('create-zapsign-term', {
        body: {
          colaborador,
          item_ids: selectedIds,
          local_data: localData
        }
      })

      if (error) throw new Error(await readFunctionError(error))
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar termo.')

      setMessage(data.message || 'Termo enviado para assinatura com sucesso.')
      setLastSignUrl(data.sign_url || '')
      setLastWhatsappUrl(data.whatsapp_url || buildWhatsappUrl({ nome: colaborador.nome, telefone: colaborador.telefone, signUrl: data.sign_url }))
      setColaborador(initialColaborador)
      setSelectedIds([])
      await loadData()
    } catch (err) {
      setMessage(err?.message || 'Erro ao gerar termo.')
    } finally {
      setLoading(false)
    }
  }

  const signedCount = terms.filter(term => term.status === 'assinado').length
  const pendingCount = terms.filter(term => ['enviado', 'criado', 'atualizado'].includes(term.status)).length
  const hasColaboradorBase = Boolean(text(colaborador.nome) && text(colaborador.cpf) && text(colaborador.email))

  return (
    <section className="page-section terms-page terms-premium-page">
      <div className="terms-hero panel">
        <div className="terms-hero-copy">
          <span className="eyebrow"><ShieldCheck size={16} /> ZapSign em produção</span>
          <h1>Termos de responsabilidade</h1>
          <p>Gere o termo de entrega dos ativos, envie para assinatura digital e acompanhe o retorno da ZapSign em uma tela mais simples e organizada.</p>
          <div className="terms-hero-actions">
            <button className="btn secondary" onClick={loadData} type="button"><RefreshCcw size={18} /> Atualizar dados</button>
          </div>
        </div>
        <div className="terms-hero-stats">
          <div className="terms-mini-stat">
            <span>Termos gerados</span>
            <strong>{terms.length}</strong>
            <small>histórico recente</small>
          </div>
          <div className="terms-mini-stat success">
            <span>Assinados</span>
            <strong>{signedCount}</strong>
            <small>com retorno validado</small>
          </div>
          <div className="terms-mini-stat warning">
            <span>Pendentes</span>
            <strong>{pendingCount}</strong>
            <small>aguardando assinatura</small>
          </div>
        </div>
      </div>

      <div className="terms-security-note">
        <ShieldCheck size={18} />
        <span><strong>Integração segura:</strong> o token da ZapSign fica somente no Supabase Secret <code>ZAPSIGN_API_TOKEN</code>. O termo é enviado em produção, com assinatura na tela e selfie, sem exigir foto frente e verso do documento.</span>
      </div>

      <form className="terms-workspace" onSubmit={handleCreateTerm}>
        <div className="terms-form-card panel">
          <div className="terms-card-header">
            <div>
              <span className="step-badge">1</span>
              <h2>Dados do colaborador</h2>
              <p>Informe quem ficará responsável pelos equipamentos.</p>
            </div>
            <UserRound size={28} />
          </div>

          <div className="form-grid two-cols premium-form-grid">
            <label>Nome do colaborador
              <input value={colaborador.nome ?? ''} onChange={e => updateColaborador('nome', e.target.value)} placeholder="Ex.: João Carlos" />
            </label>
            <label>CPF
              <input value={colaborador.cpf ?? ''} onChange={e => updateColaborador('cpf', e.target.value)} placeholder="000.000.000-00" />
            </label>
            <label>E-mail
              <input type="email" value={colaborador.email ?? ''} onChange={e => updateColaborador('email', e.target.value)} placeholder="colaborador@email.com" />
            </label>
            <label>Telefone
              <input value={colaborador.telefone ?? ''} onChange={e => updateColaborador('telefone', e.target.value)} placeholder="62999999999" />
            </label>
            <label>Cargo
              <input value={colaborador.cargo ?? ''} onChange={e => updateColaborador('cargo', e.target.value)} placeholder="Ex.: Auxiliar Administrativo" />
            </label>
            <label>Setor
              <input value={colaborador.setor ?? ''} onChange={e => updateColaborador('setor', e.target.value)} placeholder="Ex.: Administrativo" />
            </label>
            <label className="span-two">Local e data
              <input value={localData ?? ''} onChange={e => setLocalData(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="terms-form-card panel">
          <div className="terms-card-header">
            <div>
              <span className="step-badge">2</span>
              <h2>Selecionar ativos</h2>
              <p>Escolha os equipamentos que farão parte do termo.</p>
            </div>
            <FileSignature size={28} />
          </div>

          <div className="terms-selection-summary">
            <div>
              <strong>{selectedItems.length}</strong>
              <span>ativo(s) selecionado(s)</span>
            </div>
            {selectedItems.length > 0 && <button type="button" className="btn secondary slim" onClick={() => setSelectedIds([])}><X size={16} /> Limpar</button>}
          </div>

          {selectedItems.length > 0 && (
            <div className="selected-assets-strip">
              {selectedItems.slice(0, 6).map(item => (
                <button type="button" key={item.id} className="selected-asset-pill" onClick={() => toggleItem(item.id)} title="Clique para remover">
                  <CheckCircle2 size={14} /> {item.modelo || 'Ativo'} <small>{item.patrimonio || 'Sem patrimônio'}</small>
                </button>
              ))}
              {selectedItems.length > 6 && <span className="selected-more">+{selectedItems.length - 6} ativo(s)</span>}
            </div>
          )}

          <div className="search-field terms-search-field"><Search size={18} /><input placeholder="Buscar ativo por nome, patrimônio, série, setor, time ou localização..." value={search ?? ''} onChange={e => setSearch(e.target.value)} /></div>

          <div className="terms-items-list premium-assets-list">
            {filteredItems.map(item => {
              const selected = selectedIds.includes(item.id)
              return (
                <label key={item.id} className={`term-item-option premium-asset-option ${selected ? 'selected' : ''}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleItem(item.id)} />
                  <span className="asset-check-ui"><CheckCircle2 size={16} /></span>
                  <span className="asset-option-content">
                    <strong>{item.modelo || '-'}</strong>
                    <small>Patrimônio: {item.patrimonio || '-'} · Série: {item.numero_serie || '-'} · Marca: {item.marcas?.nome || '-'}</small>
                    <small>Setor: {item.setor || '-'} · Time: {item.time || '-'} · Local: {item.localizacoes?.nome || '-'}</small>
                  </span>
                </label>
              )
            })}
            {!filteredItems.length && <div className="empty-state-mini">Nenhum ativo encontrado para a busca informada.</div>}
          </div>
        </div>

        <div className="terms-submit-card panel">
          <div className="terms-card-header compact-header">
            <div>
              <span className="step-badge">3</span>
              <h2>Enviar para assinatura</h2>
              <p>Revise os dados e gere o link de assinatura.</p>
            </div>
            <Send size={26} />
          </div>

          <div className="terms-checklist">
            <span className={hasColaboradorBase ? 'done' : ''}><CheckCircle2 size={16} /> Dados obrigatórios</span>
            <span className={selectedIds.length ? 'done' : ''}><CheckCircle2 size={16} /> Ativos selecionados</span>
            <span className="done"><CheckCircle2 size={16} /> Selfie habilitada</span>
            <span className="done"><CheckCircle2 size={16} /> Produção sem sandbox</span>
          </div>

          {message && <pre className={message.toLowerCase().includes('sucesso') ? 'success-box' : 'error-box'}>{message}</pre>}

          <div className="form-actions sticky-actions">
            {lastSignUrl && <a className="btn secondary" href={lastSignUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Abrir assinatura</a>}
            {lastWhatsappUrl && <a className="btn secondary" href={lastWhatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Enviar WhatsApp</a>}
            <button className="btn primary" disabled={loading} type="submit"><Send size={18} /> {loading ? 'Enviando...' : 'Enviar para assinatura'}</button>
          </div>
        </div>
      </form>

      <div className="panel terms-history-card responsive-table">
        <div className="terms-card-header table-header-title">
          <div>
            <h2>Termos gerados</h2>
            <p>Acompanhe assinatura, WhatsApp, PDF assinado e evidências da ZapSign.</p>
          </div>
          <Clock3 size={24} />
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Colaborador</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Assinatura</th>
              <th>WhatsApp</th>
              <th>PDF</th>
              <th>Evidências</th>
            </tr>
          </thead>
          <tbody>
            {terms.map(term => {
              const whatsappUrl = buildWhatsappUrl({
                nome: term.colaboradores?.nome,
                telefone: term.colaboradores?.telefone,
                signUrl: term.zapsign_sign_url
              })

              return (
                <tr key={term.id}>
                  <td>{formatDate(term.created_at)}</td>
                  <td><strong>{term.colaboradores?.nome || '-'}</strong><small className="table-subtext">{term.colaboradores?.email || ''}</small></td>
                  <td>{term.colaboradores?.cpf || '-'}</td>
                  <td><span className={`status-badge ${term.status || 'rascunho'}`}>{statusLabel(term.status)}</span></td>
                  <td>{term.zapsign_sign_url ? <a className="table-action-link" href={term.zapsign_sign_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir</a> : '-'}</td>
                  <td>{whatsappUrl ? <a className="table-action-link whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Enviar</a> : '-'}</td>
                  <td>{term.pdf_assinado_url ? <a className="table-action-link" href={term.pdf_assinado_url} target="_blank" rel="noreferrer">Baixar</a> : '-'}</td>
                  <td>
                    <div className="evidence-links">
                      {term.signer_selfie_photo_url && <a href={term.signer_selfie_photo_url} target="_blank" rel="noreferrer">Selfie</a>}
                      {term.signature_image_url && <a href={term.signature_image_url} target="_blank" rel="noreferrer">Assinatura</a>}
                      {!term.signer_selfie_photo_url && !term.signature_image_url && '-'}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!terms.length && <tr><td colSpan="8">Nenhum termo gerado.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
