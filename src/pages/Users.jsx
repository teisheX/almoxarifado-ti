import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }

  useEffect(() => { load() }, [])

  async function updateUser(id, changes) {
    const { error } = await supabase.from('profiles').update(changes).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="page-section">
      <div className="page-header"><div><h1>Gestão de usuários</h1><p>Controle perfis, status e permissão de exportação.</p></div></div>
      <div className="panel responsive-table">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Supervisor exporta</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}>
                    <option value="admin">Admin</option><option value="supervisor">Supervisor</option>
                  </select>
                </td>
                <td><input type="checkbox" checked={u.ativo} onChange={e => updateUser(u.id, { ativo: e.target.checked })} /></td>
                <td><input type="checkbox" checked={u.supervisor_pode_exportar} onChange={e => updateUser(u.id, { supervisor_pode_exportar: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hint-card">Crie o usuário em Supabase Auth primeiro. Depois ajuste o perfil nesta tela.</div>
    </section>
  )
}
