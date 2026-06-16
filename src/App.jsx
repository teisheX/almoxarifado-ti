import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import ItemForm from './pages/ItemForm'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Logs from './pages/Logs'

function ProtectedRoute({ children, adminOnly = false }) {
  const { loading, profile } = useAuth()

  if (loading) return <div className="loading-page">Carregando...</div>
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.ativo) return <div className="loading-page">Usuário desativado. Contate o administrador.</div>
  if (adminOnly && profile.role !== 'admin') return <Navigate to="/" replace />

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="itens" element={<Items />} />
        <Route path="itens/novo" element={<ItemForm />} />
        <Route path="itens/:id/editar" element={<ProtectedRoute adminOnly><ItemForm /></ProtectedRoute>} />
        <Route path="usuarios" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
        <Route path="configuracoes" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
        <Route path="logs" element={<ProtectedRoute adminOnly><Logs /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
