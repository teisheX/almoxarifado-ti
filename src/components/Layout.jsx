import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Boxes,
  FileSignature,
  Home,
  LogOut,
  Menu,
  Shield,
  Users,
  ClipboardList
} from 'lucide-react'
import logo3rn from '../assets/images/grupo-3rn-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../lib/version'

const pageMeta = {
  '/': ['Dashboard', 'Visão geral do controle patrimonial'],
  '/itens': ['Ativos', 'Consulta, filtros e gestão de ativos'],
  '/itens/novo': ['Novo ativo', 'Cadastro patrimonial com rastreabilidade'],
  '/termos': ['Termos', 'Assinatura digital e responsabilidade por equipamentos'],
  '/usuarios': ['Usuários', 'Perfis, permissões e acessos'],
  '/configuracoes': ['Cadastros', 'Categorias, marcas, localizações e QR Code'],
  '/logs': ['Auditorias', 'Histórico de ações e conformidade']
}

function getPageMeta(pathname) {
  if (pathname.includes('/itens/') && pathname.includes('/editar')) return ['Editar ativo', 'Atualização de dados patrimoniais']
  return pageMeta[pathname] || ['3RN Ativos', 'Sistema de Gestão Patrimonial do Grupo 3RN']
}

export default function Layout() {
  const { profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [title, subtitle] = useMemo(() => getPageMeta(location.pathname), [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : profile?.role === 'supervisor' ? 'Supervisor' : 'Leitor'
  const displayName = profile?.nome || profile?.email?.split('@')?.[0] || 'Usuário'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className={`app-shell premium-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-menu-open' : ''}`}>
      <aside className="sidebar premium-sidebar">
        <div className="brand brand-3rn premium-brand">
          <img src={logo3rn} alt="Grupo 3RN" className="brand-logo" />
          <div className="brand-text">
            <strong>3RN Ativos</strong>
            <small>Gestão Patrimonial do Grupo 3RN</small>
            <span>{roleLabel}</span>
          </div>
        </div>

        <nav className="nav premium-nav" onClick={() => setMobileOpen(false)}>
          <NavLink to="/" end><Home size={18} /> <span>Dashboard</span></NavLink>
          <NavLink to="/itens"><ClipboardList size={18} /> <span>Ativos</span></NavLink>
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && <NavLink to="/termos"><FileSignature size={18} /> <span>Termos</span></NavLink>}
          {isAdmin && <NavLink to="/configuracoes"><Boxes size={18} /> <span>Cadastros</span></NavLink>}
          {isAdmin && <NavLink to="/usuarios"><Users size={18} /> <span>Usuários</span></NavLink>}
          {isAdmin && <NavLink to="/logs"><Shield size={18} /> <span>Auditorias</span></NavLink>}
        </nav>

        <div className="sidebar-footer">
          <button className="collapse-btn" type="button" onClick={() => setCollapsed(value => !value)}>
            <Menu size={18} /> <span>{collapsed ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
          <button className="logout" onClick={handleLogout}><LogOut size={18} /> <span>Sair</span></button>
          <div className="system-version">
            <span>Sistema de Gestão Patrimonial</span>
            <strong>Grupo 3RN</strong>
            <small>Versão {APP_VERSION}</small>
          </div>
        </div>
      </aside>

      <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />

      <main className="main-content premium-main">
        <header className="topbar premium-topbar">
          <div className="topbar-title">
            <button className="mobile-menu-btn" type="button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <div>
              <strong>{title}</strong>
              <span>{subtitle}</span>
            </div>
          </div>
          <div className="topbar-user">
            <div>
              <strong>Olá, {displayName}</strong>
              <span>{profile?.email}</span>
            </div>
            <div className="avatar">{initial}</div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
