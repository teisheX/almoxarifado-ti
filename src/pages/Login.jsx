import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Boxes, ShieldCheck, ScanLine, FileText } from 'lucide-react'
import loginHero from '../assets/images/login-seguro-ti.png'
import logo3rn from '../assets/images/grupo-3rn-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { login, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (profile) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await login(email, password)
    } catch (err) {
      setMessage('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    if (!email) return setMessage('Informe seu e-mail para recuperar a senha.')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setMessage(error ? 'Erro ao enviar recuperação.' : 'Verifique seu e-mail para recuperar a senha.')
  }

  return (
    <div className="login-page professional-login">
      <div className="login-showcase">
        <div className="showcase-copy">
          <span className="eyebrow">Sistema patrimonial corporativo</span>
          <h1>3RN Ativos</h1>
          <p>Sistema de Gestão Patrimonial do Grupo 3RN para controlar bens, patrimônios, setores, responsáveis e relatórios em uma experiência segura para web e mobile.</p>

          <div className="showcase-features">
            <span><Boxes size={18} /> Inventário completo</span>
            <span><ScanLine size={18} /> Rastreamento rápido</span>
            <span><FileText size={18} /> Exportação PDF/CSV</span>
          </div>
        </div>
        <img src={loginHero} alt="Ambiente profissional de gestão patrimonial com login seguro" />
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand-logo"><img src={logo3rn} alt="Grupo 3RN" /></div>
        <h2>3RN Ativos</h2>
        <p>Sistema de Gestão Patrimonial do Grupo 3RN.</p>

        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seuemail@empresa.com" />

        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Digite sua senha" />

        {message && <div className="alert">{message}</div>}

        <button className="btn primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        <button type="button" className="link-button" onClick={resetPassword}>Esqueci minha senha</button>
      </form>
    </div>
  )
}
