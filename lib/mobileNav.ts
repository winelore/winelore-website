"use client"

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react"
import type { LucideIcon } from "lucide-react"

/**
 * Tiny store behind the mobile (iOS-style) nav bar in AppHeader.
 *
 * Pages don't render the nav bar themselves — AppHeader does — so the parts
 * that depend on the page (the "‹ Back" target and the compact title that
 * appears once the large title scrolls away) are registered here from deep
 * inside the page: BackLink registers the back target, pages attach
 * `useMobileNavTitle` to their large title and may add one trailing action
 * with `useMobileNavAction`. Desktop ignores all of this.
 */

export interface MobileNavBack {
    href: string
    label: string
}

/** A trailing nav bar button (icon only, like an SF Symbol bar button item). */
export interface MobileNavAction {
    label: string
    icon: LucideIcon
    /** Navigate somewhere… */
    href?: string
    /** …or run an in-page action (e.g. open a modal). */
    onClick?: () => void
}

interface MobileNavState {
    back: MobileNavBack | null
    action: MobileNavAction | null
    title: string | null
    /** True once the page's large title has scrolled up under the nav bar. */
    titleVisible: boolean
    /** A route is loading (loading.tsx is showing); the page hasn't registered yet. */
    pending: boolean
}

const INITIAL_STATE: MobileNavState = { back: null, action: null, title: null, titleVisible: false, pending: false }

let state = INITIAL_STATE
const listeners = new Set<() => void>()

function setState(partial: Partial<MobileNavState>) {
    const next = { ...state, ...partial }
    if (
        next.back === state.back &&
        next.action === state.action &&
        next.title === state.title &&
        next.titleVisible === state.titleVisible &&
        next.pending === state.pending
    ) return
    state = next
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

// Layout effect on the client so a registered back button / title is in the
// nav bar before the first paint of a client-side navigation.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

export function useMobileNavState(): MobileNavState {
    return useSyncExternalStore(subscribe, () => state, () => INITIAL_STATE)
}

export function useMobileNavBack(href: string, label: string) {
    useIsomorphicLayoutEffect(() => {
        const back: MobileNavBack = { href, label }
        setState({ back })
        return () => {
            if (state.back === back) setState({ back: null })
        }
    }, [href, label])
}

/**
 * Marks a route as loading for as long as the caller is mounted (used by
 * app/loading.tsx). The nav bar keeps showing what it showed last instead of
 * flashing back to the bare wordmark between two pages.
 */
export function useMobileNavPending() {
    useIsomorphicLayoutEffect(() => {
        setState({ pending: true })
        return () => setState({ pending: false })
    }, [])
}

/** Registers the nav bar's trailing button; pass `null` for none. */
export function useMobileNavAction(action: MobileNavAction | null) {
    // Keep the latest handler without re-registering on every render.
    const onClickRef = useRef(action?.onClick)
    onClickRef.current = action?.onClick

    const href = action?.href
    const label = action?.label
    const icon = action?.icon
    const hasOnClick = Boolean(action?.onClick)

    useIsomorphicLayoutEffect(() => {
        if (!label || !icon) return
        const registered: MobileNavAction = {
            label,
            icon,
            href,
            onClick: hasOnClick ? () => onClickRef.current?.() : undefined,
        }
        setState({ action: registered })
        return () => {
            if (state.action === registered) setState({ action: null })
        }
    }, [href, label, icon, hasOnClick])
}

/**
 * Registers `title` as the page's nav bar title and returns a ref for the
 * page's large title element. The compact title fades into the nav bar once
 * that element has scrolled up underneath it, like a UINavigationController
 * large title.
 */
export function useMobileNavTitle<T extends HTMLElement = HTMLHeadingElement>(title: string | null | undefined) {
    const ref = useRef<T>(null)

    useIsomorphicLayoutEffect(() => {
        if (!title) return
        const owner = { title }
        let current: typeof owner | null = owner
        setState({ title, titleVisible: false })

        const el = ref.current
        let observer: IntersectionObserver | null = null
        if (el && typeof IntersectionObserver !== "undefined") {
            const navbar = document.querySelector<HTMLElement>("[data-mobile-navbar]")
            const navbarHeight = Math.round(navbar?.getBoundingClientRect().height || 44)
            observer = new IntersectionObserver(
                ([entry]) => {
                    if (current !== owner) return
                    setState({ titleVisible: !entry.isIntersecting && entry.boundingClientRect.top < navbarHeight })
                },
                { rootMargin: `-${navbarHeight}px 0px 0px 0px`, threshold: 0 },
            )
            observer.observe(el)
        }

        return () => {
            observer?.disconnect()
            if (state.title === title) setState({ title: null, titleVisible: false })
            current = null
        }
    }, [title])

    return ref
}
