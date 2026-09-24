import { useEffect, useMemo, useState } from "react"
import { resolveAvatarUrl } from "@winelore/core/auth"
import { getAxusConfig } from "../auth/config"

/**
 * Photo URLs outlive the screen that asked, but only for a while: unlike a
 * name, a photo can change mid-session from another device.
 */
const cache = new Map<string, { url: string | null; expiresAt: number }>()
const TTL_MS = 10 * 60 * 1000

function lookUp(auid: string): Promise<string | null> {
    const cached = cache.get(auid)
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.url)
    // resolveAvatarUrl never rejects; it degrades to null.
    const pending = resolveAvatarUrl(getAxusConfig(), auid).then((url) => {
        cache.set(auid, { url, expiresAt: Date.now() + TTL_MS })
        return url
    })
    return pending
}

/**
 * AXUS ID profile photo URLs — the native counterpart of the web's
 * `useAvatars`. Returns what has resolved so far, so callers render their
 * fallback first and photos as they arrive.
 */
export function useAvatarUrls(auids: string[]): Record<string, string | null> {
    const [urls, setUrls] = useState<Record<string, string | null>>({})
    const key = useMemo(() => Array.from(new Set(auids)).sort().join(","), [auids])

    useEffect(() => {
        if (!key) return
        let active = true
        const ids = key.split(",")
        Promise.all(ids.map(async (auid) => [auid, await lookUp(auid)] as const)).then((entries) => {
            if (active) setUrls((previous) => ({ ...previous, ...Object.fromEntries(entries) }))
        })
        return () => {
            active = false
        }
    }, [key])

    return urls
}
