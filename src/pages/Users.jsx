import { useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

const initialNewUser = {
  nome: '',
  email: '',
  password: '',
  role: 'leitor',
  localizacao_id: '',
  supervisor_pode_exportar: false
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [localizacoes, setLocalizacoes] = useState([])
  const [newUser, setNewUser] = useState(initialNewUser)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState('')

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

  function updateNewUser(field, value) {
    setNewUser(prev => ({ ...prev, [field]: value }))
  }

  async function createUser(e) {
    e.preventDefault()
    setMessage('')

    if (!newUser.nome.trim()) return setMessage('Informe o nome do usuário.')
    if (!newUser.email.trim()) return setMessage('Informe o e-mail do usuário.')
    if (!newUser.password || newUser.password.length < 6) return setMessage('A senha precisa ter pelo menos 6 caracteres.')
    if (newUser.role === 'leitor' && !newUser.localizacao_id) return setMessage('Para usuário leitor, selecione a localização que ele poderá visualizar.')

    setCreating(true)
    try {
      const payload = {
        nome: newUser.nome.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: newUser.password,
        role: newUser.role,
        localizacao_id: newUser.role === 'leitor' ? newUser.localizacao_id : null,
        supervisor_pode_exportar: newUser.role === 'supervisor' ? Boolean(newUser.supervisor_pode_exportar) : false
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: payload
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setMessage('Usuário criado com sucesso.')
      setNewUser(initialNewUser)
      await load()
    } catch (error) {
      setMessage(error.message || 'Não foi possível criar o usuário. Confira se a Edge Function create-user foi publicada no Supabase.')
    } finally {
      setCreating(false)
    }
  }

  async function updateUser(id, changes) {
    const payload = { ...changes }

    if (payload.role && payload.role !== 'leitor') {
      payload.localizacao_id = null
    }

    if (payload.role && payload.role !== 'supervisor') {
      payload.supervisor_pode_exportar = false
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function deleteUser(user) {
    setMessage('')

    const { data: sessionData } = await supabase.auth.getUser()
    if (sessionData?.user?.id === user.id) {
      setMessage('Você não pode excluir o próprio usuário logado.')
      return
    }

    const confirmed = window.confirm(`Deseja realmente excluir o usuário ${user.nome || user.email}? Essa ação remove o acesso dele ao sistema.`)
    if (!confirmed) return

    setDeletingId(user.id)
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.id }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setMessage('Usuário excluído com sucesso.')
      await load()
    } catch (error) {
      setMessage(error.message || 'Não foi possível excluir o usuário. Confira se a Edge Function delete-user foi publicada no Supabase.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <h1>Gestão de usuários</h1>
          <p>Crie usuários pelo painel do administrador e controle perfis, status, localização do leitor e permissão de exportação.</p>
        </div>
      </div>

      <form className="panel create-user-panel" onSubmit={createUser}>
        <div className="panel-title-row">
          <div>
            <h2>Criar novo usuário</h2>
            <p>O usuário será criado no Supabase Auth e vinculado automaticamente à tabela de perfis.</p>
          </div>
          <UserPlus size={26} />
        </div>

        <div className="form-grid user-create-grid">
          <label className="field">
            <span>Nome</span>
            <input
              value={newUser.nome}
              onChange={e => updateNewUser('nome', e.target.value)}
              placeholder="Ex.: João Silva"
            />
          </label>

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              value={newUser.email}
              onChange={e => updateNewUser('email', e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </label>

          <label className="field">
            <span>Senha temporária</span>
            <input
              type="password"
              value={newUser.password}
              onChange={e => updateNewUser('password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <label className="field">
            <span>Perfil</span>
            <select value={newUser.role} onChange={e => updateNewUser('role', e.target.value)}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="leitor">Leitor</option>
            </select>
          </label>

          <label className="field">
            <span>Localização do leitor</span>
            <select
              value={newUser.localizacao_id}
              disabled={newUser.role !== 'leitor'}
              onChange={e => updateNewUser('localizacao_id', e.target.value)}
            >
              <option value="">Selecione uma localização</option>
              {localizacoes.map(local => (
                <option key={local.id} value={local.id}>{local.nome}</option>
              ))}
            </select>
            <small>Obrigatório somente para o perfil leitor.</small>
          </label>

          <label className="field checkbox-field">
            <span>Supervisor pode exportar</span>
            <input
              type="checkbox"
              checked={newUser.supervisor_pode_exportar}
              disabled={newUser.role !== 'supervisor'}
              onChange={e => updateNewUser('supervisor_pode_exportar', e.target.checked)}
            />
          </label>
        </div>

        {message && <div className={message.includes('sucesso') ? 'success-text' : 'error-text'}>{message}</div>}

        <div className="form-actions full">
          <button className="btn primary" type="submit" disabled={creating}>
            <UserPlus size={18} /> {creating ? 'Criando usuário...' : 'Criar usuário'}
          </button>
        </div>
      </form>

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td data-label="Nome">{u.nome}</td>
                <td data-label="E-mail">{u.email}</td>
                <td data-label="Perfil">
                  <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="leitor">Leitor</option>
                  </select>
                </td>
                <td data-label="Localização">
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
                <td data-label="Ativo">
                  <input
                    type="checkbox"
                    checked={u.ativo}
                    onChange={e => updateUser(u.id, { ativo: e.target.checked })}
                  />
                </td>
                <td data-label="Supervisor exporta">
                  <input
                    type="checkbox"
                    checked={u.supervisor_pode_exportar}
                    disabled={u.role !== 'supervisor'}
                    onChange={e => updateUser(u.id, { supervisor_pode_exportar: e.target.checked })}
                  />
                </td>
                <td data-label="Ações">
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Excluir usuário"
                    disabled={deletingId === u.id}
                    onClick={() => deleteUser(u)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hint-card">
        Para criar usuário pelo painel, publique a Edge Function <strong>create-user</strong> no Supabase e publique as Edge Functions <strong>create-user</strong> e <strong>delete-user</strong>. O perfil Leitor visualiza somente itens da localização vinculada e não pode criar, editar, excluir, importar ou exportar.
      </div>
    </section>
  )
}
