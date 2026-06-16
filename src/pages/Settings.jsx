import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const tables = [
  { key: 'categorias', title: 'Categorias' },
  { key: 'marcas', title: 'Marcas' },
  { key: 'localizacoes', title: 'Localizações' }
]

export default function Settings() {
  const [active, setActive] = useState('categorias')
  const [rows, setRows] = useState([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  async function load() {
    const { data } = await supabase.from(active).select('*').order('nome')
    setRows(data || [])
  }
  useEffect(() => { load() }, [active])

  async function add(e) {
    e.preventDefault()
    if (!nome.trim()) return
    const payload = active === 'marcas' ? { nome } : { nome, descricao }
    const { error } = await supabase.from(active).insert(payload)
    if (error) return alert(error.message)
    setNome(''); setDescricao(''); load()
  }

  async function toggle(row) {
    await supabase.from(active).update({ ativo: !row.ativo }).eq('id', row.id)
    load()
  }

  return (
    <section className="page-section">
      <div className="page-header"><div><h1>Cadastros administrativos</h1><p>Gerencie categorias, marcas e localizações.</p></div></div>
      <div className="tabs">{tables.map(t => <button key={t.key} className={active === t.key ? 'active' : ''} onClick={() => setActive(t.key)}>{t.title}</button>)}</div>
      <form className="panel settings-form" onSubmit={add}>
        <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
        {active !== 'marcas' && <input placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />}
        <button className="btn primary">Adicionar</button>
      </form>
      <div className="panel responsive-table">
        <table><thead><tr><th>Nome</th><th>Descrição</th><th>Ativo</th><th>Ação</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.nome}</td><td>{r.descricao}</td><td>{r.ativo ? 'Sim' : 'Não'}</td><td><button className="btn secondary" onClick={() => toggle(r)}>{r.ativo ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table>
      </div>
    </section>
  )
}
