import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { AppRole, Membership } from './types'

/** Visitor = ej inloggad, eller inloggad utan aktivt medlemskap. */
export type Access = 'visitor' | AppRole

interface Auth {
  session: Session | null
  membership: Membership | null
  access: Access
  canEdit: boolean
  isAdmin: boolean
  /** Gäst eller medlem: får använda gästernas armory och wikin */
  canUseArmory: boolean
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  reloadMembership: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

// Supabase lägger ?code=… på redirect-adressen, så den måste vara sidans bas utan #/route.
// Routen man stod på sparas här och återställs efter inloggningen.
const RETURN_KEY = 'mnm:auth-return'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const userId = session?.user.id ?? null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    // Inga supabase-anrop direkt i callbacken (kan låsa auth-klienten); medlemskapet hämtas i effekten nedan.
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') restoreRoute()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const reloadMembership = useCallback(async () => {
    if (!userId) {
      setMembership(null)
      setLoading(false)
      return
    }
    const { data } = await supabase.from('memberships').select('*').eq('user_id', userId).maybeSingle()
    setMembership((data as Membership | null) ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reloadMembership()
  }, [reloadMembership])

  const signIn = useCallback(async () => {
    try {
      sessionStorage.setItem(RETURN_KEY, window.location.hash)
    } catch {
      /* privat läge: man hamnar på startsidan */
    }
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMembership(null)
    // Ladda om så att gruppinterna kapitel som redan hämtats försvinner från skärmen
    window.location.reload()
  }, [])

  const value = useMemo<Auth>(() => {
    const access: Access = membership?.status === 'active' ? membership.role : 'visitor'
    return {
      session,
      membership,
      access,
      canEdit: access === 'editor' || access === 'admin',
      isAdmin: access === 'admin',
      canUseArmory: access !== 'visitor',
      loading,
      signIn,
      signOut,
      reloadMembership,
    }
  }, [session, membership, loading, signIn, signOut, reloadMembership])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function restoreRoute() {
  try {
    const hash = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    if (hash && hash !== window.location.hash) window.location.hash = hash
  } catch {
    /* ingen sparad route */
  }
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth utanför AuthProvider')
  return ctx
}
