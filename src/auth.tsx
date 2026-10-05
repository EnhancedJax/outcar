import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"

type AuthContextValue = {
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  isDialogOpen: boolean
  openDialog: () => void
  closeDialog: () => void
  signIn: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (password: string) => {
    if (!supabase) {
      return "Supabase is not configured."
    }

    const email = import.meta.env.VITE_EDITOR_EMAIL
    if (!email) {
      return "Missing VITE_EDITOR_EMAIL."
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Failed to sign out: ${error.message}`)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isLoading,
      isDialogOpen,
      openDialog: () => setIsDialogOpen(true),
      closeDialog: () => setIsDialogOpen(false),
      signIn,
      signOut,
    }),
    [isDialogOpen, isLoading, session, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
