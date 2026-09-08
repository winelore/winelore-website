"use client"

import { useEffect, useRef, useState } from "react"

function findScroller(from: HTMLElement): HTMLElement | Window {
    let node: HTMLElement | null = from.parentElement
    while (node) {
        const overflowY = getComputedStyle(node).overflowY
        if (overflowY === "auto" || overflowY === "scroll") return node
        node = node.parentElement
    }
    return window
}

/**
 * True once the referenced element has scrolled up past `offsetPx` (the height
 * of the sticky header).
 *
 * Used to promote a page's primary action into the sticky header only when the
 * action's own card is no longer on screen — the button stays reachable from
 * anywhere without being shown twice at the top of the page.
 */
export function useScrolledPast<T extends HTMLElement>(offsetPx = 72) {
    const ref = useRef<T>(null)
    const [isPast, setIsPast] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const scroller = findScroller(el)

        // One rect read for one element per scroll event; cheap enough that
        // throttling would cost more in lag than it saves in work.
        const measure = () => setIsPast(el.getBoundingClientRect().bottom < offsetPx)

        measure()
        scroller.addEventListener("scroll", measure, { passive: true })
        window.addEventListener("resize", measure)

        return () => {
            scroller.removeEventListener("scroll", measure)
            window.removeEventListener("resize", measure)
        }
    }, [offsetPx])

    return [ref, isPast] as const
}
