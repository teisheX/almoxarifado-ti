import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Laptop, Package, PlusCircle, Wrench, ScanLine, FileText } from 'lucide-react'
import heroImage from '../assets/images/almoxarifado-ti-hero.png'
import scannerImage from '../assets/images/scanner-codigo-barras-ti.png'
import reportsImage from '../assets/images/relatorios-pdf-csv-ti.png'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('itens')
        .select('id, modelo, patrimonio, status, created_at, categorias(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const total = items.length
  const disponiveis = items.filter(i => i.status === 'disponivel').length
  const uso = items.filter(i => i.status === 'em_uso').length
  const manutencao = items.filter(i => i.status === 'manutencao').length

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Controle corporativo de ativos</span>
          <h1>{isAdmin ? 'Dashboard do Administrador' : 'Dashboard do Supervisor'}</h1>
          <p>Resumo visual do almoxarifado de TI, com itens, patrimônio, status, relatórios e rastreamento por código de barras.</p>
          <div className="hero-actions">
            <Link className="btn primary" to="/itens/novo"><PlusCircle size={18} /> Novo item</Link>
            <Link className="btn secondary" to="/itens"><ScanLine size={18} /> Consultar itens</Link>
          </div>
        </div>
        <img src={heroImage} alt="Sistema profissional de almoxarifado de TI" />
      </div>

      <div className="cards-grid">
        <Stat icon={<Package />} label="Total de itens" value={total} />
        <Stat icon={<CheckCircle />} label="Disponíveis" value={disponiveis} />
        <Stat icon={<Laptop />} label="Em uso" value={uso} />
        <Stat icon={<Wrench />} label="Manutenção" value={manutencao} />
      </div>

      <div className="feature-image-grid">
        <article className="image-feature-card">
          <img src={scannerImage} alt="Leitura de código de barras em item de TI" />
          <div>
            <ScanLine size={22} />
            <h3>Cadastro com código de barras</h3>
            <p>Use o celular ou leitor para localizar e registrar ativos com mais agilidade.</p>
          </div>
        </article>
        <article className="image-feature-card">
          <img src={reportsImage} alt="Relatórios e exportação PDF e CSV" />
          <div>
            <FileText size={22} />
            <h3>Relatórios profissionais</h3>
            <p>Exporte listas filtradas em PDF e CSV para auditoria e acompanhamento.</p>
          </div>
        </article>
      </div>

      <div className="panel">
        <h2>Últimos itens cadastrados</h2>
        {loading ? <p>Carregando...</p> : (
          <div className="responsive-table">
            <table>
              <thead><tr><th>Modelo</th><th>Patrimônio</th><th>Categoria</th><th>Status</th></tr></thead>
              <tbody>
                {items.slice(0, 8).map(item => (
                  <tr key={item.id}>
                    <td>{item.modelo}</td>
                    <td>{item.patrimonio}</td>
                    <td>{item.categorias?.nome}</td>
                    <td><span className={`badge ${item.status}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="hint-card"><AlertTriangle size={18} /> Supervisor pode cadastrar e consultar itens. Edição/exclusão são restritas ao administrador.</div>
      )}
    </section>
  )
}

function Stat({ icon, label, value }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div>
}
