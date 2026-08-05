import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileSignature, RefreshCcw, Search, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const initialColaborador = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
  setor: ''
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
    atualizado: 'Atualizado'
  }
  return map[status] || status || '-'
}

export default function Terms() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [colaborador, setColaborador] = useState(initialColaborador)
  const [localData, setLocalData] = useState(`Itaberaí/GO, ${new Date().toLocaleDateString('pt-BR')}`)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [lastSignUrl, setLastSignUrl] = useState('')

  async function loadData() {
    const [itemsRes, termsRes] = await Promise.all([
      supabase
        .from('itens')
        .select('id,modelo,patrimonio,numero_serie,setor,time,marcas(nome),localizacoes(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('termos_responsabilidade')
        .select('*, colaboradores(nome,cpf,email,cargo,setor)')
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
    const q = search.trim().toLowerCase()
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
    setColaborador(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateTerm(e) {
    e.preventDefault()
    setMessage('')
    setLastSignUrl('')

    if (!colaborador.nome.trim()) return setMessage('Informe o nome do colaborador.')
    if (!colaborador.cpf.trim()) return setMessage('Informe o CPF do colaborador.')
    if (!colaborador.email.trim()) return setMessage('Informe o e-mail do colaborador.')
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

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar termo.')

      setMessage('Termo enviado para assinatura com sucesso.')
      setLastSignUrl(data.sign_url || '')
      setColaborador(initialColaborador)
      setSelectedIds([])
      await loadData()
    } catch (err) {
      const details = err?.context?.details || err?.details
      const detailText = details ? `\n${JSON.stringify(details, null, 2)}` : ''
      setMessage((err.message || 'Erro ao chamar a Edge Function.') + detailText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section terms-page">
      <div className="page-header">
        <div>
          <h1>Termos de responsabilidade</h1>
          <p>Gere termos de entrega de ativos e envie para assinatura digital pela ZapSign.</p>
        </div>
        <button className="btn secondary" onClick={loadData}><RefreshCcw size={18} /> Atualizar</button>
      </div>

      <div className="panel warning-panel">
        <strong>Integração ZapSign:</strong> configure o token somente no Supabase Secret <code>ZAPSIGN_API_TOKEN</code>. Nunca coloque o token da ZapSign no arquivo <code>.env</code> do frontend.
      </div>

      <form className="panel" onSubmit={handleCreateTerm}>
        <div className="section-title-row">
          <div>
            <h2>Novo termo</h2>
            <p>Preencha os dados do colaborador, selecione os ativos e envie o termo para assinatura.</p>
          </div>
          <FileSignature size={30} />
        </div>

        <div className="form-grid two-cols">
          <label>Nome do colaborador
            <input value={colaborador.nome} onChange={e => updateColaborador('nome', e.target.value)} placeholder="Ex.: João Carlos" />
          </label>
          <label>CPF
            <input value={colaborador.cpf} onChange={e => updateColaborador('cpf', e.target.value)} placeholder="000.000.000-00" />
          </label>
          <label>E-mail
            <input type="email" value={colaborador.email} onChange={e => updateColaborador('email', e.target.value)} placeholder="colaborador@email.com" />
          </label>
          <label>Telefone
            <input value={colaborador.telefone} onChange={e => updateColaborador('telefone', e.target.value)} placeholder="62999999999" />
          </label>
          <label>Cargo
            <input value={colaborador.cargo} onChange={e => updateColaborador('cargo', e.target.value)} placeholder="Ex.: Auxiliar Administrativo" />
          </label>
          <label>Setor
            <input value={colaborador.setor} onChange={e => updateColaborador('setor', e.target.value)} placeholder="Ex.: Administrativo" />
          </label>
          <label>Local e data
            <input value={localData} onChange={e => setLocalData(e.target.value)} />
          </label>
        </div>

        <div className="terms-item-selector">
          <div className="section-title-row compact">
            <div>
              <h3>Ativos do termo</h3>
              <p>{selectedItems.length} ativo(s) selecionado(s).</p>
            </div>
            {selectedItems.length > 0 && <button type="button" className="btn secondary" onClick={() => setSelectedIds([])}><X size={16} /> Limpar</button>}
          </div>

          <div className="search-field standalone"><Search size={18} /><input placeholder="Buscar por nome, patrimônio, série, setor, time ou localização..." value={search} onChange={e => setSearch(e.target.value)} /></div>

          <div className="terms-items-list">
            {filteredItems.map(item => (
              <label key={item.id} className={`term-item-option ${selectedIds.includes(item.id) ? 'selected' : ''}`}>
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
                <span>
                  <strong>{item.modelo}</strong>
                  <small>Patrimônio: {item.patrimonio || '-'} · Série: {item.numero_serie || '-'} · Marca: {item.marcas?.nome || '-'}</small>
                  <small>Setor: {item.setor || '-'} · Time: {item.time || '-'} · Local: {item.localizacoes?.nome || '-'}</small>
                </span>
              </label>
            ))}
            {!filteredItems.length && <p className="muted-text">Nenhum ativo encontrado.</p>}
          </div>
        </div>

        {message && <pre className={message.includes('sucesso') ? 'success-box' : 'error-box'}>{message}</pre>}
        {lastSignUrl && <a className="btn secondary" href={lastSignUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Abrir link de assinatura</a>}

        <div className="form-actions">
          <button className="btn primary" disabled={loading} type="submit"><Send size={18} /> {loading ? 'Enviando...' : 'Enviar para assinatura'}</button>
        </div>
      </form>

      <div className="panel responsive-table">
        <h2>Termos gerados</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Colaborador</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Assinatura</th>
              <th>PDF assinado</th>
            </tr>
          </thead>
          <tbody>
            {terms.map(term => (
              <tr key={term.id}>
                <td>{formatDate(term.created_at)}</td>
                <td>{term.colaboradores?.nome || '-'}</td>
                <td>{term.colaboradores?.cpf || '-'}</td>
                <td><span className={`status-badge ${term.status || 'rascunho'}`}>{statusLabel(term.status)}</span></td>
                <td>{term.zapsign_sign_url ? <a href={term.zapsign_sign_url} target="_blank" rel="noreferrer">Abrir link</a> : '-'}</td>
                <td>{term.pdf_assinado_url ? <a href={term.pdf_assinado_url} target="_blank" rel="noreferrer">Baixar</a> : '-'}</td>
              </tr>
            ))}
            {!terms.length && <tr><td colSpan="6">Nenhum termo gerado.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
