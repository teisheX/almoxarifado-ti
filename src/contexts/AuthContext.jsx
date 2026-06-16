import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      setProfile(null)
      return null
    }

    setProfile(data)
    return data
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user?.id) await loadProfile(data.session.user.id)
      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user?.id) await loadProfile(data.user.id)
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isSupervisor: profile?.role === 'supervisor',
    login,
    logout,
    refreshProfile: () => session?.user?.id ? loadProfile(session.user.id) : null
  }), [session, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
