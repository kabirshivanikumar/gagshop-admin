import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(id) {
    try {
      // Try fetching profile — retry up to 3 times in case of RLS timing issues
      let data = null
      for (let i = 0; i < 3; i++) {
        const res = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()
        if (res.data) { data = res.data; break }
        await new Promise(r => setTimeout(r, 500))
      }
      setProfile(data)
    } catch (e) {
      console.warn('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    // After sign in, force-refresh the profile
    if (result.data?.user) {
      await fetchProfile(result.data.user.id)
    }
    return result
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
