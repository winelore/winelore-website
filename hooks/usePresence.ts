"use client"

import { useEffect, useState } from "react"

/** Must match the exit animations on `.sheet-overlay[data-closing]` in globals.css. */
const EXIT_MS = 240

/**
 * Keeps a conditionally-rendered overlay mounted for a moment after `open`
 * turns false, so it can animate out instead of vanishing.
 *
 *   const { mounted, closing } = usePresence(isOpen)
 *   if (!mounted) return null
 *   <div className="sheet-overlay …" data-closing={closing || undefined}>
 */
export function usePresence(open: boolean) {
    const [lingering, setLingering] = useState(open)

    useEffect(() => {
        if (open) {
            setLingering(true)
            return
        }
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const timer = window.setTimeout(() => setLingering(false), reduceMotion ? 0 : EXIT_MS)
        return () => window.clearTimeout(timer)
    }, [open])

    return { mounted: open || lingering, closing: !open && lingering }
}
