import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import * as Haptics from "expo-haptics"
import type { AxusSession } from "@winelore/core/auth"
import { getStoredSession, signIn as runSignIn, signOut as runSignOut, SignInCancelledError, subscribeSession } from "./session"

type StoredSession = Awaited<ReturnType<typeof getStoredSession>>

interface AuthState {
    /** undefined while the Keychain is still being read on cold start. */
    session: StoredSession | undefined
    signIn: () => Promise<void>
    signOut: () => Promise<void>
    error: string | null
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<StoredSession | undefined>(undefined)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let changed = false
        const unsubscribe = subscribeSession((next) => {
            changed = true
            setSession(next)
        })
        getStoredSession()
            .then((next) => { if (!changed) setSession(next) })
            .catch(() => { if (!changed) setSession(null) })
        return unsubscribe
    }, [])

    const signIn = useCallback(async () => {
        setError(null)
        try {
            const next: AxusSession = await runSignIn()
            setSession(next)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            // A dismissed sheet is a normal outcome, not an error to surface.
            if (err instanceof SignInCancelledError) return
            setError(err instanceof Error ? err.message : "Sign-in failed")
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
    }, [])

    const signOut = useCallback(async () => {
        await runSignOut()
        setSession(null)
    }, [])

    const value = useMemo(
        () => ({ session, signIn, signOut, error }),
        [session, signIn, signOut, error],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used inside <AuthProvider>")
    return context
}
