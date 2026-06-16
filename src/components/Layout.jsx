import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Boxes, ClipboardList, Home, LogOut, Settings, Shield, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Boxes size={28} />
          <div>
            <strong>Almoxarifado TI</strong>
            <span>{profile?.role === 'admin' ? 'Administrador' : 'Supervisor'}</span>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end><Home size={18} /> Dashboard</NavLink>
          <NavLink to="/itens"><ClipboardList size={18} /> Itens</NavLink>
          {isAdmin && <NavLink to="/usuarios"><Users size={18} /> Usuários</NavLink>}
          {isAdmin && <NavLink to="/configuracoes"><Settings size={18} /> Cadastros</NavLink>}
          {isAdmin && <NavLink to="/logs"><Shield size={18} /> Auditoria</NavLink>}
        </nav>

        <button className="logout" onClick={handleLogout}><LogOut size={18} /> Sair</button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <strong>Olá, {profile?.nome || 'usuário'}</strong>
            <span>{profile?.email}</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
