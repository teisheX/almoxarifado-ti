import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Users() {
  const [users, setUsers] = useState([])
  const [localizacoes, setLocalizacoes] = useState([])

  async function load() {
    const [usersRes, localizacoesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, localizacoes(nome)')
        .order('created_at', { ascending: false }),
      supabase
        .from('localizacoes')
        .select('id,nome')
        .eq('ativo', true)
        .order('nome')
    ])

    setUsers(usersRes.data || [])
    setLocalizacoes(localizacoesRes.data || [])
  }

  useEffect(() => { load() }, [])

  async function updateUser(id, changes) {
    const payload = { ...changes }

    if (payload.role && payload.role !== 'leitor') {
      payload.localizacao_id = null
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Gestão de usuários</h1>
          <p>Controle perfis, status, localização do leitor e permissão de exportação.</p>
        </div>
      </div>

      <div className="panel responsive-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Localização do leitor</th>
              <th>Ativo</th>
              <th>Supervisor exporta</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="leitor">Leitor</option>
                  </select>
                </td>
                <td>
                  <select
                    value={u.localizacao_id || ''}
                    disabled={u.role !== 'leitor'}
                    onChange={e => updateUser(u.id, { localizacao_id: e.target.value || null })}
                  >
                    <option value="">Sem localização</option>
                    {localizacoes.map(local => (
                      <option key={local.id} value={local.id}>{local.nome}</option>
                    ))}
                  </select>
                  {u.role === 'leitor' && !u.localizacao_id && (
                    <small className="field-warning">Defina a localização para liberar a visualização dos itens.</small>
                  )}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.ativo}
                    onChange={e => updateUser(u.id, { ativo: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={u.supervisor_pode_exportar}
                    disabled={u.role !== 'supervisor'}
                    onChange={e => updateUser(u.id, { supervisor_pode_exportar: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hint-card">
        Crie o usuário em Supabase Auth primeiro. Depois ajuste o perfil nesta tela. O perfil Leitor visualiza somente itens da localização vinculada e não pode criar, editar, excluir, importar ou exportar.
      </div>
    </section>
  )
}
