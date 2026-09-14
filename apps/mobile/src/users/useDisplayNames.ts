import { useEffect, useMemo, useState } from "react"
import { resolveDisplayName } from "@winelore/core/auth"
import { getAxusConfig } from "../auth/config"

/**
 * Lookups outlive the screen that asked: a name does not change within a
 * session, and the home screen, lists and lobby all show the same people.
 */
const cache = new Map<string, Promise<string>>()

function lookUp(auid: string): Promise<string> {
    let pending = cache.get(auid)
    if (!pending) {
        // resolveDisplayName never rejects; it degrades to `@auid`.
        pending = resolveDisplayName(getAxusConfig(), auid, auid)
        cache.set(auid, pending)
    }
    return pending
}

/**
 * Display names for AXUS ids — the native counterpart of the web's
 * `useUsernames`. Resolution is the same shared function the sign-in flow uses;
 * the web runs its equivalent in a server action.
 *
 * Returns what has resolved so far, so callers render ids first and names as
 * they arrive, which is what the web does too.
 */
export function useDisplayNames(auids: string[]): Record<string, string> {
    const [names, setNames] = useState<Record<string, string>>({})
    const key = useMemo(() => Array.from(new Set(auids)).sort().join(","), [auids])

    useEffect(() => {
        if (!key) return
        let active = true
        const ids = key.split(",")
        Promise.all(ids.map(async (auid) => [auid, await lookUp(auid)] as const)).then((entries) => {
            if (active) setNames((previous) => ({ ...previous, ...Object.fromEntries(entries) }))
        })
        return () => {
            active = false
        }
    }, [key])

    return names
}
