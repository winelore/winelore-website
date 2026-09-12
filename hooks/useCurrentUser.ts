"use client"

import { useEffect, useSyncExternalStore } from "react"
import Cookies from "js-cookie"
import { getUsernamesAction } from "@/app/userActions"

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

function readCurrentUser(): string | null {
    const auid = Cookies.get("auid")
    if (!auid) return null
    const username = Cookies.get("username")
    return Cookies.get("displayName") || (username ? `@${username}` : auid)
}

let displayNameRequestedFor: string | null = null

/**
 * The signed-in user's display label, read from the auth cookies.
 *
 * `undefined` only during server render / hydration (cookies unknown yet);
 * after that every mount reads the cookie synchronously, so the header no
 * longer blanks out and re-fills its avatar on every page navigation.
 * `null` means signed out.
 */
export function useCurrentUser(): string | null | undefined {
    const user = useSyncExternalStore(subscribe, readCurrentUser, () => undefined)

    useEffect(() => {
        const auid = Cookies.get("auid")
        if (!auid || Cookies.get("displayName") || displayNameRequestedFor === auid) return
        displayNameRequestedFor = auid

        getUsernamesAction([auid])
            .then((res) => {
                if (res[auid]) {
                    Cookies.set("displayName", res[auid], { path: "/", secure: false, sameSite: "lax" })
                    listeners.forEach((listener) => listener())
                }
            })
            .catch((err) => {
                console.error("Failed to fetch display name in header:", err)
            })
    }, [])

    return user
}
