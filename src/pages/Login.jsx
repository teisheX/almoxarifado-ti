import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Boxes, ShieldCheck, ScanLine, FileText } from 'lucide-react'
import loginHero from '../assets/images/login-seguro-ti.png'
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
          <span className="eyebrow">Sistema interno de TI</span>
          <h1>Gestão inteligente do seu almoxarifado</h1>
          <p>Controle patrimônio, código de barras, estoque, responsáveis e relatórios em uma experiência segura para web e mobile.</p>

          <div className="showcase-features">
            <span><Boxes size={18} /> Inventário completo</span>
            <span><ScanLine size={18} /> Rastreamento rápido</span>
            <span><FileText size={18} /> Exportação PDF/CSV</span>
          </div>
        </div>
        <img src={loginHero} alt="Ambiente profissional de almoxarifado de TI com login seguro" />
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon"><ShieldCheck size={42} /></div>
        <h2>Almoxarifado TI</h2>
        <p>Acesse sua conta para gerenciar itens, patrimônio e estoque.</p>

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
