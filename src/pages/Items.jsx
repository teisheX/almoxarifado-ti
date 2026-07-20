import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Edit, FileText, PlusCircle, Search, Trash2, Upload, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { exportCSV, exportPDF } from '../lib/exporters'
import { buildLookup, downloadCSVTemplate, getCSVValue, normalizeStatus, parseCSV } from '../lib/csvImport'
import { useAuth } from '../contexts/AuthContext'

export default function Items() {
  const { user, isAdmin, profile } = useAuth()
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ q: '', status: '', categoria: '', localizacao: '' })
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  async function loadItems() {
    setLoading(true)
    let query = supabase
      .from('itens')
      .select('*, categorias(nome), marcas(nome), localizacoes(nome)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) console.error(error)
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const filteredItems = useMemo(() => {
    const q = filters.q.toLowerCase().trim()
    return items.filter(item => {
      const textMatch = !q || [item.modelo, item.patrimonio, item.codigo_barras, item.responsavel_atual, item.marcas?.nome].some(v => String(v || '').toLowerCase().includes(q))
      const statusMatch = !filters.status || item.status === filters.status
      const categoriaMatch = !filters.categoria || item.categorias?.nome === filters.categoria
      const localizacaoMatch = !filters.localizacao || item.localizacoes?.nome === filters.localizacao
      return textMatch && statusMatch && categoriaMatch && localizacaoMatch
    })
  }, [items, filters])

  const categorias = [...new Set(items.map(i => i.categorias?.nome).filter(Boolean))]
  const localizacoes = [...new Set(items.map(i => i.localizacoes?.nome).filter(Boolean))]
  const canExport = isAdmin || profile?.supervisor_pode_exportar


  async function handleImportCSV(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Selecione um arquivo CSV válido.')
      return
    }

    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (!rows.length) throw new Error('O CSV está vazio ou sem linhas válidas.')

      const [categoriasRes, marcasRes, localizacoesRes, existentesRes] = await Promise.all([
        supabase.from('categorias').select('id,nome').eq('ativo', true),
        supabase.from('marcas').select('id,nome').eq('ativo', true),
        supabase.from('localizacoes').select('id,nome').eq('ativo', true),
        supabase.from('itens').select('patrimonio,codigo_barras').is('deleted_at', null)
      ])

      if (categoriasRes.error) throw categoriasRes.error
      if (marcasRes.error) throw marcasRes.error
      if (localizacoesRes.error) throw localizacoesRes.error
      if (existentesRes.error) throw existentesRes.error

      const categoriaMap = buildLookup(categoriasRes.data)
      const marcaMap = buildLookup(marcasRes.data)
      const localizacaoMap = buildLookup(localizacoesRes.data)
      const patrimonioExistente = new Set((existentesRes.data || []).map(i => String(i.patrimonio || '').trim()).filter(Boolean))
      const codigoExistente = new Set((existentesRes.data || []).map(i => String(i.codigo_barras || '').trim()).filter(Boolean))
      const patrimonioCSV = new Set()
      const codigoCSV = new Set()
      const errors = []

      const payload = rows.map(row => {
        const modelo = getCSVValue(row, ['modelo'])
        const marcaNome = getCSVValue(row, ['marca'])
        const patrimonio = getCSVValue(row, ['patrimonio', 'número de patrimônio', 'numero de patrimonio'])
        const codigo_barras = getCSVValue(row, ['codigo_barras', 'código de barras', 'codigo de barras'])
        const categoriaNome = getCSVValue(row, ['categoria'])
        const localizacaoNome = getCSVValue(row, ['localizacao', 'localização'])

        if (!modelo) errors.push(`Linha ${row.__linha}: modelo é obrigatório.`)
        if (!marcaNome) errors.push(`Linha ${row.__linha}: marca é obrigatória.`)
        if (!patrimonio) errors.push(`Linha ${row.__linha}: patrimônio é obrigatório.`)
        if (!codigo_barras) errors.push(`Linha ${row.__linha}: código de barras é obrigatório.`)
        if (!categoriaNome) errors.push(`Linha ${row.__linha}: categoria é obrigatória.`)
        if (!localizacaoNome) errors.push(`Linha ${row.__linha}: localização é obrigatória.`)

        if (patrimonio && patrimonioExistente.has(patrimonio)) errors.push(`Linha ${row.__linha}: patrimônio ${patrimonio} já existe no sistema.`)
        if (codigo_barras && codigoExistente.has(codigo_barras)) errors.push(`Linha ${row.__linha}: código ${codigo_barras} já existe no sistema.`)
        if (patrimonio && patrimonioCSV.has(patrimonio)) errors.push(`Linha ${row.__linha}: patrimônio ${patrimonio} duplicado no próprio CSV.`)
        if (codigo_barras && codigoCSV.has(codigo_barras)) errors.push(`Linha ${row.__linha}: código ${codigo_barras} duplicado no próprio CSV.`)

        patrimonioCSV.add(patrimonio)
        codigoCSV.add(codigo_barras)

        const marca_id = marcaMap.get(marcaNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())
        const categoria_id = categoriaMap.get(categoriaNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())
        const localizacao_id = localizacaoMap.get(localizacaoNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim())

        if (marcaNome && !marca_id) errors.push(`Linha ${row.__linha}: marca "${marcaNome}" não cadastrada.`)
        if (categoriaNome && !categoria_id) errors.push(`Linha ${row.__linha}: categoria "${categoriaNome}" não cadastrada.`)
        if (localizacaoNome && !localizacao_id) errors.push(`Linha ${row.__linha}: localização "${localizacaoNome}" não cadastrada.`)

        const quantidade = Number(getCSVValue(row, ['quantidade']) || 1)
        if (Number.isNaN(quantidade) || quantidade < 0) errors.push(`Linha ${row.__linha}: quantidade inválida.`)

        const valorRaw = getCSVValue(row, ['valor_estimado', 'valor estimado']).replace(',', '.')
        const valor_estimado = valorRaw ? Number(valorRaw) : null
        if (valorRaw && Number.isNaN(valor_estimado)) errors.push(`Linha ${row.__linha}: valor estimado inválido.`)

        return {
          modelo,
          marca_id,
          patrimonio,
          codigo_barras,
          categoria_id,
          localizacao_id,
          status: normalizeStatus(getCSVValue(row, ['status'])),
          quantidade,
          tipo: getCSVValue(row, ['tipo', 'tipo do item']) || null,
          responsavel_atual: getCSVValue(row, ['responsavel_atual', 'responsável atual', 'responsavel atual']) || null,
          observacoes: getCSVValue(row, ['observacoes', 'observações']) || null,
          fornecedor: getCSVValue(row, ['fornecedor']) || null,
          data_aquisicao: getCSVValue(row, ['data_aquisicao', 'data de aquisição', 'data de aquisicao']) || null,
          valor_estimado,
          garantia_ate: getCSVValue(row, ['garantia_ate', 'garantia até', 'garantia ate']) || null,
          criado_por: user.id,
          atualizado_por: user.id
        }
      })

      if (errors.length) {
        throw new Error(errors.slice(0, 20).join('\n') + (errors.length > 20 ? `\n...e mais ${errors.length - 20} erro(s).` : ''))
      }

      const { error } = await supabase.from('itens').insert(payload)
      if (error) throw error

      await supabase.from('audit_logs').insert({
        usuario_id: user.id,
        acao: 'import_csv_itens',
        tabela_afetada: 'itens',
        detalhes: { arquivo: file.name, quantidade_registros: payload.length }
      })

      alert(`${payload.length} item(ns) importado(s) com sucesso.`)
      loadItems()
    } catch (err) {
      alert('Erro ao importar CSV:\n' + err.message)
    } finally {
      setImporting(false)
    }
  }

  async function softDelete(item) {
    if (!confirm(`Deseja excluir o item ${item.modelo}?`)) return
    const { error } = await supabase
      .from('itens')
      .update({ deleted_at: new Date().toISOString(), atualizado_por: user.id })
      .eq('id', item.id)
    if (error) return alert('Erro ao excluir: ' + error.message)
    await supabase.from('audit_logs').insert({ usuario_id: user.id, acao: 'soft_delete_item', tabela_afetada: 'itens', registro_id: item.id, detalhes: item })
    loadItems()
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div><h1>Itens</h1><p>Consulte, filtre e exporte os itens do almoxarifado.</p></div>
        <Link className="btn primary" to="/itens/novo"><PlusCircle size={18} /> Novo item</Link>
      </div>

      <div className="filters-card">
        <div className="search-field"><Search size={18} /><input placeholder="Buscar por modelo, marca, patrimônio ou código..." value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} /></div>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Todos os status</option>
          <option value="disponivel">Disponível</option>
          <option value="em_uso">Em uso</option>
          <option value="manutencao">Manutenção</option>
          <option value="descartado">Descartado</option>
        </select>
        <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })}>
          <option value="">Todas categorias</option>{categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.localizacao} onChange={e => setFilters({ ...filters, localizacao: e.target.value })}>
          <option value="">Todas localizações</option>{localizacoes.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="export-actions">
        <label className={`btn primary ${importing ? 'disabled' : ''}`}>
          <Upload size={17} /> {importing ? 'Importando...' : 'Importar CSV'}
          <input type="file" accept=".csv,text/csv" hidden onChange={handleImportCSV} disabled={importing} />
        </label>
        <button className="btn secondary" type="button" onClick={downloadCSVTemplate}><FileDown size={17} /> Baixar modelo CSV</button>
        <button className="btn secondary" disabled={!canExport} onClick={() => exportCSV(filteredItems, user.id, filters)}><Download size={17} /> Exportar CSV</button>
        <button className="btn secondary" disabled={!canExport} onClick={() => exportPDF(filteredItems, user.id, filters)}><FileText size={17} /> Exportar PDF</button>
        {!canExport && <small>Exportação desabilitada para supervisor.</small>}
      </div>

      <div className="import-help">
        <strong>Importação CSV:</strong> use colunas como <code>modelo</code>, <code>marca</code>, <code>patrimonio</code>, <code>codigo_barras</code>, <code>categoria</code>, <code>status</code>, <code>quantidade</code> e <code>localizacao</code>. As marcas, categorias e localizações precisam existir no sistema antes da importação.
      </div>

      <div className="panel">
        {loading ? <p>Carregando...</p> : (
          <div className="responsive-table">
            <table>
              <thead><tr><th>Modelo</th><th>Marca</th><th>Patrimônio</th><th>Código</th><th>Status</th><th>Localização</th><th>Ações</th></tr></thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td data-label="Modelo">{item.modelo}</td>
                    <td data-label="Marca">{item.marcas?.nome}</td>
                    <td data-label="Patrimônio">{item.patrimonio}</td>
                    <td data-label="Código">{item.codigo_barras}</td>
                    <td data-label="Status"><span className={`badge ${item.status}`}>{item.status}</span></td>
                    <td data-label="Localização">{item.localizacoes?.nome}</td>
                    <td data-label="Ações" className="actions-cell">
                      {isAdmin && <Link className="icon-btn" to={`/itens/${item.id}/editar`}><Edit size={16} /></Link>}
                      {isAdmin && <button className="icon-btn danger" onClick={() => softDelete(item)}><Trash2 size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && <p className="empty-state">Nenhum item encontrado.</p>}
          </div>
        )}
      </div>
    </section>
  )
}
