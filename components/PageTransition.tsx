"use client"

import { ViewTransition, useEffect } from "react"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

/**
 * Transition types a navigation can be tagged with (via `transitionTypes`
 * on <Link> or router.push). Untagged client navigations count as "forward".
 *
 * - NAV_BACK: going up the hierarchy (BackLink, the nav bar's ‹ Back).
 * - NAV_TAB:  switching tabs — a crossfade, not a slide, like iOS.
 */
export const NAV_BACK = "nav-back"
export const NAV_TAB = "nav-tab"

// The CSS for these classes lives in the "Page transitions" section of globals.css.
const ENTER = { [NAV_BACK]: "page-pop-in", [NAV_TAB]: "page-fade-in", default: "page-push-in" }
const EXIT = { [NAV_BACK]: "page-pop-out", [NAV_TAB]: "page-fade-out", default: "page-push-out" }

/**
 * Wraps every page in a React <ViewTransition> keyed by pathname, so each
 * route change animates the outgoing page out and the incoming one in:
 * an iOS push for forward navigations, a pop for back, a crossfade for tabs.
 * The nav bar, tab bar and desktop header are named separately in CSS and
 * stay anchored while the content moves.
 *
 * Same-path updates (pagination, refreshes, server actions) don't animate.
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    useEffect(() => {
        // Browser back/forward (and iOS's swipe-back, which already animates
        // its own snapshot) must not replay a slide: flag it for the CSS until
        // the next user interaction.
        const root = document.documentElement
        const onPopState = () => root.setAttribute("data-nav-pop", "")
        const onInteract = () => root.removeAttribute("data-nav-pop")
        window.addEventListener("popstate", onPopState)
        window.addEventListener("pointerdown", onInteract, true)
        window.addEventListener("keydown", onInteract, true)
        return () => {
            window.removeEventListener("popstate", onPopState)
            window.removeEventListener("pointerdown", onInteract, true)
            window.removeEventListener("keydown", onInteract, true)
        }
    }, [])

    return (
        <ViewTransition key={pathname} enter={ENTER} exit={EXIT} update="none" default="none">
            {children}
        </ViewTransition>
    )
}
