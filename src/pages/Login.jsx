import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import logo3rn from '../assets/images/grupo-3rn-logo.png'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { login, profile } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (profile) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await login(email.trim(), password)
    } catch (err) {
      setMessage('E-mail ou senha inválidos. Confira os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    const emailLimpo = email.trim()
    if (!emailLimpo) {
      setMessage('Informe seu e-mail no campo acima para recuperar a senha.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo)
    setMessage(error ? 'Não foi possível enviar a recuperação agora.' : 'Enviamos as instruções de recuperação para o seu e-mail.')
  }

  return (
    <main className="login-premium-page">
      <section className="login-hero-panel login-hero-panel--logo" aria-label="Apresentação do sistema 3RN Ativos">
        <div className="login-hero-shape login-hero-shape-a" />
        <div className="login-hero-shape login-hero-shape-b" />
        <div className="login-hero-shape login-hero-shape-c" />

        <div className="login-hero-content">
          <div className="login-pill">
            <ShieldCheck size={16} />
            Plataforma patrimonial corporativa
          </div>

          <div className="login-hero-brand-mark">
            <div className="login-hero-logo-card">
              <img src={logo3rn} alt="Grupo 3RN" />
            </div>
            <div>
              <span className="login-hero-brand-caption">Grupo 3RN</span>
              <strong>3RN Ativos</strong>
            </div>
          </div>

          <h1>Gestão inteligente do seu patrimônio</h1>
          <p>
            Controle ativos, responsáveis, localizações, inventário e termos digitais com uma experiência
            moderna, segura e intuitiva para toda a operação do Grupo 3RN.
          </p>

          <div className="login-brand-highlight">
            <strong>Controle patrimonial centralizado</strong>
            <span>Ativos, setores, responsáveis, auditoria e rastreabilidade em um único painel.</span>
          </div>

          <div className="login-feature-grid">
            <div className="login-feature-card">
              <Boxes size={20} />
              <div>
                <strong>Inventário completo</strong>
                <span>Ativos, setores e responsáveis.</span>
              </div>
            </div>
            <div className="login-feature-card">
              <QrCode size={20} />
              <div>
                <strong>QR Code</strong>
                <span>Consulta rápida por localização.</span>
              </div>
            </div>
            <div className="login-feature-card">
              <ScanLine size={20} />
              <div>
                <strong>Rastreamento rápido</strong>
                <span>Controle por patrimônio e série.</span>
              </div>
            </div>
            <div className="login-feature-card">
              <FileText size={20} />
              <div>
                <strong>Termos digitais</strong>
                <span>Assinatura e gestão integrada.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel" aria-label="Acesso ao sistema">
        <form className="login-premium-card" onSubmit={handleSubmit}>
          <div className="login-logo-card">
            <img src={logo3rn} alt="Grupo 3RN" />
          </div>

          <div className="login-card-heading">
            <span className="login-status-dot"><Sparkles size={14} /> Ambiente seguro</span>
            <h2>Entrar no 3RN Ativos</h2>
            <p>Acesse o painel de gestão patrimonial com seu e-mail corporativo.</p>
          </div>

          <div className="login-field-group">
            <label htmlFor="email">E-mail</label>
            <div className="login-input-wrap">
              <Mail size={19} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seuemail@empresa.com"
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="password">Senha</label>
            <div className="login-input-wrap">
              <Lock size={19} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {message && <div className="login-alert">{message}</div>}

          <button className="login-submit-btn" disabled={loading}>
            <span>{loading ? 'Entrando...' : 'Entrar no sistema'}</span>
            <ArrowRight size={18} />
          </button>

          <button type="button" className="login-forgot-btn" onClick={resetPassword}>
            Esqueci minha senha
          </button>

          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span>Acesso protegido por autenticação Supabase e controle de permissões por perfil.</span>
          </div>
        </form>
      </section>
    </main>
  )
}
