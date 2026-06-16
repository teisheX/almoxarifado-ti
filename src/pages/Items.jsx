import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Edit, FileText, PlusCircle, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { exportCSV, exportPDF } from '../lib/exporters'
import { useAuth } from '../contexts/AuthContext'

export default function Items() {
  const { user, isAdmin, profile } = useAuth()
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ q: '', status: '', categoria: '', localizacao: '' })
  const [loading, setLoading] = useState(true)

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
        <button className="btn secondary" disabled={!canExport} onClick={() => exportCSV(filteredItems, user.id, filters)}><Download size={17} /> Exportar CSV</button>
        <button className="btn secondary" disabled={!canExport} onClick={() => exportPDF(filteredItems, user.id, filters)}><FileText size={17} /> Exportar PDF</button>
        {!canExport && <small>Exportação desabilitada para supervisor.</small>}
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
