import { useEffect, useRef, useState } from "react"
import { findUserByUsername, type FoundUser } from "@winelore/core/auth"
import { getAxusConfig } from "../auth/config"

/** How long typing must pause before the name is looked up, as on the web. */
const SEARCH_DELAY_MS = 400

/**
 * An AXUS ID user found by username as it is typed — the web's add-producer
 * and add-expert search, through the same `findUserByUsername` in core. A
 * leading "@" is ignored, and an answer to an older query is dropped.
 */
export function useUserSearch(username: string, messages: { notFound: string; failed: string }) {
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [found, setFound] = useState<FoundUser | null>(null)
    const latest = useRef("")

    useEffect(() => {
        const query = username.trim().replace(/^@/, "")
        latest.current = query
        setFound(null)
        setError(null)
        if (!query) {
            setSearching(false)
            return
        }
        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                const user = await findUserByUsername(getAxusConfig(), query)
                if (latest.current !== query) return
                if (user) setFound(user)
                else setError(messages.notFound)
            } catch (failure) {
                if (latest.current !== query) return
                setError(failure instanceof Error && failure.message ? failure.message : messages.failed)
            } finally {
                if (latest.current === query) setSearching(false)
            }
        }, SEARCH_DELAY_MS)
        return () => clearTimeout(timer)
    }, [username, messages.notFound, messages.failed])

    return { searching, error, found }
}
