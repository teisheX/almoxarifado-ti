import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [exportsLog, setExportsLog] = useState([])

  useEffect(() => {
    supabase.from('audit_logs').select('*, profiles(nome,email)').order('created_at', { ascending: false }).limit(100).then(({ data }) => setLogs(data || []))
    supabase.from('export_logs').select('*, profiles(nome,email)').order('created_at', { ascending: false }).limit(100).then(({ data }) => setExportsLog(data || []))
  }, [])

  return (
    <section className="page-section">
      <div className="page-header"><div><h1>Logs e auditoria</h1><p>Ações importantes e exportações realizadas.</p></div></div>
      <div className="panel responsive-table">
        <h2>Auditoria</h2>
        <table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Tabela</th><th>Registro</th></tr></thead><tbody>{logs.map(l => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString('pt-BR')}</td><td>{l.profiles?.nome}</td><td>{l.acao}</td><td>{l.tabela_afetada}</td><td>{l.registro_id}</td></tr>)}</tbody></table>
      </div>
      <div className="panel responsive-table">
        <h2>Exportações</h2>
        <table><thead><tr><th>Data</th><th>Usuário</th><th>Formato</th><th>Tipo</th><th>Registros</th></tr></thead><tbody>{exportsLog.map(l => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString('pt-BR')}</td><td>{l.profiles?.nome}</td><td>{l.formato}</td><td>{l.tipo_exportacao}</td><td>{l.quantidade_registros}</td></tr>)}</tbody></table>
      </div>
    </section>
  )
}
