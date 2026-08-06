import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  FileText,
  MapPin,
  Package,
  PlusCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench
} from 'lucide-react'
import logo3rn from '../assets/images/grupo-3rn-logo.png'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DashboardCard, DataTable, EmptyState, StatCard, StatusBadge } from '../components/ui'

const statusConfig = {
  disponivel: { label: 'Disponíveis', tone: 'success', icon: <CheckCircle size={22} /> },
  em_uso: { label: 'Em uso', tone: 'primary', icon: <UserRound size={22} /> },
  manutencao: { label: 'Manutenção', tone: 'warning', icon: <Wrench size={22} /> },
  baixado: { label: 'Baixados', tone: 'danger', icon: <Trash2 size={22} /> },
  descartado: { label: 'Baixados', tone: 'danger', icon: <Trash2 size={22} /> },
  transito: { label: 'Em trânsito', tone: 'warning', icon: <ArrowRightLeft size={22} /> }
}

function percent(value, total) {
  if (!total) return '0,0%'
  return `${((Number(value || 0) / total) * 100).toFixed(1).replace('.', ',')}%`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getItemLocation(item) {
  return item?.localizacoes?.nome || item?.localizacao || 'Sem localização'
}

function getItemCategory(item) {
  return item?.categorias?.nome || 'Sem categoria'
}

export default function Dashboard() {
  const { isAdmin, isLeitor, profile, user } = useAuth()
  const [items, setItems] = useState([])
  const [terms, setTerms] = useState([])
  const [logs, setLogs] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const itemsQuery = supabase
        .from('itens')
        .select('id, modelo, patrimonio, status, setor, time, responsavel_atual, created_at, updated_at, categorias(nome), localizacoes(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      const [itemsRes, termsRes, logsRes, profilesRes] = await Promise.all([
        itemsQuery,
        supabase.from('termos_responsabilidade').select('id, status, created_at, colaborador_id, colaboradores(nome)').order('created_at', { ascending: false }).limit(8),
        supabase.from('audit_logs').select('id, acao, tabela_afetada, created_at, profiles(nome,email)').order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('id, nome, email, role, ativo').limit(12)
      ])

      if (itemsRes.error) console.error('Erro ao carregar itens do dashboard', itemsRes.error)
      if (termsRes.error) console.warn('Termos indisponíveis no dashboard', termsRes.error.message)
      if (logsRes.error) console.warn('Auditoria indisponível no dashboard', logsRes.error.message)
      if (profilesRes.error) console.warn('Perfis indisponíveis no dashboard', profilesRes.error.message)

      setItems(itemsRes.data || [])
      setTerms(termsRes.data || [])
      setLogs(logsRes.data || [])
      setProfiles(profilesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const displayName = profile?.nome || user?.email?.split('@')?.[0] || 'usuário'
  const total = items.length
  const counts = useMemo(() => {
    const base = { disponivel: 0, em_uso: 0, manutencao: 0, baixado: 0, descartado: 0, outros: 0 }
    items.forEach(item => {
      const status = item.status || 'outros'
      if (base[status] !== undefined) base[status] += 1
      else base.outros += 1
    })
    base.baixado = base.baixado + base.descartado
    return base
  }, [items])

  const categoryRows = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const name = getItemCategory(item)
      map.set(name, (map.get(name) || 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])

  const locationRows = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const name = getItemLocation(item)
      map.set(name, (map.get(name) || 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])

  const sectorRows = useMemo(() => {
    const map = new Map()
    items.forEach(item => {
      const name = item.setor || item.time || 'Sem setor'
      const current = map.get(name) || { total: 0, em_uso: 0, disponivel: 0, manutencao: 0, baixado: 0 }
      current.total += 1
      if (item.status === 'em_uso') current.em_uso += 1
      if (item.status === 'disponivel') current.disponivel += 1
      if (item.status === 'manutencao') current.manutencao += 1
      if (['baixado', 'descartado'].includes(item.status)) current.baixado += 1
      map.set(name, current)
    })
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6)
  }, [items])

  const signedTerms = terms.filter(term => term.status === 'assinado').length
  const pendingTerms = terms.filter(term => term.status && term.status !== 'assinado').length
  const maintenanceItems = items.filter(item => item.status === 'manutencao').slice(0, 4)

  const statCards = [
    { title: 'Total de ativos', value: total, subtitle: 'Todos os bens cadastrados', icon: <Package size={22} />, tone: 'primary' },
    { title: 'Disponíveis', value: counts.disponivel, subtitle: `${percent(counts.disponivel, total)} do total`, icon: <CheckCircle size={22} />, tone: 'success' },
    { title: 'Em uso', value: counts.em_uso, subtitle: `${percent(counts.em_uso, total)} do total`, icon: <UserRound size={22} />, tone: 'primary' },
    { title: 'Manutenção', value: counts.manutencao, subtitle: `${percent(counts.manutencao, total)} do total`, icon: <Wrench size={22} />, tone: 'warning' },
    { title: 'Baixados', value: counts.baixado, subtitle: `${percent(counts.baixado, total)} do total`, icon: <Trash2 size={22} />, tone: 'danger' },
    { title: 'Auditoria pendente', value: pendingTerms, subtitle: `${signedTerms} termo(s) assinado(s)`, icon: <ShieldCheck size={22} />, tone: 'gold' }
  ]

  return (
    <section className="page-section dashboard-premium-page">
      <div className="dashboard-hero premium-dashboard-hero">
        <div className="dashboard-hero-copy">
          <h1>Controle patrimonial com rastreabilidade total</h1>
          <p>
            Inventarie, rastreie e gerencie todos os bens da empresa com precisão e segurança,
            mantendo histórico, responsáveis, localização, termos assinados e relatórios em um só lugar.
          </p>
          <div className="hero-features">
            <span><QrCode size={18} /> Inventário com QR Code</span>
            <span><ScanLine size={18} /> Rastreabilidade de ponta a ponta</span>
            <span><MapPin size={18} /> Localização e responsáveis</span>
            <span><FileText size={18} /> Relatórios de conformidade</span>
          </div>
          <div className="hero-actions">
            {!isLeitor && <Link className="btn primary" to="/itens/novo"><PlusCircle size={18} /> Novo ativo</Link>}
            <Link className="btn secondary" to="/itens"><ScanLine size={18} /> Consultar ativos</Link>
          </div>
        </div>
        <div className="hero-logo-panel">
          <img src={logo3rn} alt="Grupo 3RN" />
        </div>
      </div>

      <div className="cards-grid premium-stat-grid">
        {statCards.map(card => <StatCard key={card.title} {...card} />)}
      </div>

      <div className="dashboard-grid executive-grid">
        <DashboardCard title="Movimentações recentes" action={<Link to="/logs">Ver todas</Link>} className="wide-card">
          <DataTable
            rows={logs}
            emptyTitle={loading ? 'Carregando movimentações...' : 'Sem movimentações recentes'}
            emptyDescription="As ações registradas no sistema aparecerão aqui."
            columns={[
              { key: 'created_at', label: 'Data/Hora', render: row => formatDate(row.created_at) },
              { key: 'acao', label: 'Tipo', render: row => <span className="mini-badge blue">{row.acao || '-'}</span> },
              { key: 'tabela_afetada', label: 'Origem', render: row => row.tabela_afetada || '-' },
              { key: 'responsavel', label: 'Responsável', render: row => row.profiles?.nome || row.profiles?.email || '-' }
            ]}
          />
        </DashboardCard>

        <DashboardCard title="Inventário por categoria" action={<Link to="/itens">Ver relatórios</Link>}>
          {categoryRows.length ? (
            <div className="category-widget">
              <div className="donut-chart" style={{ '--p1': `${Math.min(100, (categoryRows[0]?.[1] || 0) / Math.max(total, 1) * 100)}%` }}>
                <span>{total}</span>
                <small>Total</small>
              </div>
              <div className="legend-list">
                {categoryRows.map(([name, value], index) => (
                  <div key={name} className="legend-row">
                    <i className={`dot dot-${index}`} />
                    <span>{name}</span>
                    <strong>{value} ({percent(value, total)})</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState title={loading ? 'Carregando categorias...' : 'Sem categorias'} description="Cadastre ativos com categoria para preencher este indicador." />}
        </DashboardCard>

        <DashboardCard title="Status dos ativos" action={<Link to="/itens">Ver todos</Link>}>
          <div className="status-list">
            {['em_uso', 'disponivel', 'manutencao', 'baixado'].map(status => {
              const config = statusConfig[status]
              const value = counts[status] || 0
              return (
                <div className={`status-row ${config.tone}`} key={status}>
                  <div>{config.icon}<span>{config.label}</span></div>
                  <div className="status-bar"><i style={{ width: percent(value, total) }} /></div>
                  <strong>{value} ({percent(value, total)})</strong>
                </div>
              )
            })}
          </div>
        </DashboardCard>

        <DashboardCard title="Auditoria pendente" action={<Link to="/termos">Ver termos</Link>}>
          {terms.length ? (
            <div className="audit-stack">
              {terms.slice(0, 5).map(term => (
                <div className="audit-row" key={term.id}>
                  <div>
                    <strong>{term.colaboradores?.nome || 'Colaborador'}</strong>
                    <span>{formatDate(term.created_at)}</span>
                  </div>
                  <StatusBadge status={term.status} />
                </div>
              ))}
            </div>
          ) : <EmptyState title={loading ? 'Carregando termos...' : 'Sem termos pendentes'} description="Termos enviados para assinatura aparecerão aqui." />}
        </DashboardCard>

        <DashboardCard title="Ativos por unidade / setor" className="wide-card" action={<Link to="/itens">Ver mapa</Link>}>
          {sectorRows.length ? (
            <div className="sector-table">
              <div className="sector-head"><span>Unidade / Setor</span><span>Total</span><span>Em uso</span><span>Disponíveis</span><span>Manutenção</span><span>Baixados</span></div>
              {sectorRows.map(([name, row]) => (
                <div className="sector-row" key={name}>
                  <strong>{name}</strong>
                  <span>{row.total}</span>
                  <span><i style={{ width: percent(row.em_uso, row.total) }} /> {row.em_uso} ({percent(row.em_uso, row.total)})</span>
                  <span>{row.disponivel} ({percent(row.disponivel, row.total)})</span>
                  <span>{row.manutencao} ({percent(row.manutencao, row.total)})</span>
                  <span>{row.baixado} ({percent(row.baixado, row.total)})</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title={loading ? 'Carregando setores...' : 'Sem setores cadastrados'} description="Preencha setor ou time nos ativos para criar este resumo." />}
        </DashboardCard>

        <DashboardCard title="Localização dos ativos" action={<Link to="/itens">Resumo por local</Link>}>
          {locationRows.length ? (
            <div className="location-list">
              {locationRows.map(([name, value]) => (
                <div key={name}>
                  <span><MapPin size={16} /> {name}</span>
                  <strong>{value} ativo(s)</strong>
                </div>
              ))}
            </div>
          ) : <EmptyState title={loading ? 'Carregando localizações...' : 'Sem localização'} description="Vincule localizações aos ativos para acompanhar o mapa patrimonial." />}
        </DashboardCard>

        <DashboardCard title="Manutenções programadas" action={<Link to="/itens">Ver todas</Link>}>
          {maintenanceItems.length ? (
            <div className="maintenance-list">
              {maintenanceItems.map(item => (
                <div key={item.id}>
                  <div>
                    <strong>{item.modelo}</strong>
                    <span>{item.patrimonio} · {getItemLocation(item)}</span>
                  </div>
                  <span className="mini-badge orange">Programada</span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Nenhuma manutenção ativa" description="Ativos com status de manutenção aparecerão neste bloco." />}
        </DashboardCard>
      </div>

      {!isAdmin && !isLeitor && (
        <div className="hint-card"><AlertTriangle size={18} /> Supervisor pode cadastrar e consultar itens. Edição/exclusão são restritas ao administrador.</div>
      )}
      {isLeitor && (
        <div className="hint-card"><AlertTriangle size={18} /> Perfil leitor: você visualiza somente os itens da localização vinculada ao seu usuário. Cadastro, edição, exclusão, importação e exportação são bloqueados.</div>
      )}
    </section>
  )
}
