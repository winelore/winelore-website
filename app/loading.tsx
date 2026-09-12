"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { AppHeader, type AppTabId } from "@/components/AppHeader"
import { useMobileNavPending } from "@/lib/mobileNav"

// Which tab a route belongs to — mirrors the activeTab each page passes to AppHeader.
function tabForPath(pathname: string): AppTabId {
    if (pathname === "/") return "home"
    if (/^\/map(\/|$)/.test(pathname)) return "map"
    if (/^\/(beverages|beverage|myBeverages|batch|sample)(\/|$)/.test(pathname)) return "beverages"
    if (/^\/(competitions|competition|commission|myCompetitions)(\/|$)/.test(pathname)) return "competitions"
    return "none"
}

// Focused task screens render without the tab bar; so does their loading state.
function hidesTabBar(pathname: string): boolean {
    return /\/create$/.test(pathname) || /\/candidate\//.test(pathname) || pathname === "/outcome-policy/new"
}

let revealTimer: number | undefined

function Bone({ className = "" }: { className?: string }) {
    return <div className={`skeleton rounded-xl ${className}`} />
}

function CardBone() {
    return (
        <div className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-center gap-3">
                <Bone className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="flex flex-1 flex-col gap-2">
                    <Bone className="h-2.5 w-20" />
                    <Bone className="h-4 w-3/5" />
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Bone className="h-2.5 w-2/5" />
                <Bone className="h-2.5 w-1/3" />
            </div>
        </div>
    )
}

/**
 * Shown by Next.js while a route segment's server component is fetching data.
 * It keeps the app shell (header, nav bar, tab bar) in place and shows a
 * skeleton of a page, so navigating never blanks the whole screen — the
 * incoming page just fills in. Deliberately text-free: this can render
 * before the page knows anything about what it will show.
 */
export default function Loading() {
    const pathname = usePathname() ?? "/"
    useMobileNavPending()

    // When the real page replaces this skeleton, let its content ease in
    // (see [data-route-reveal] in globals.css) instead of popping in. Layout
    // effect cleanup, so the flag is set before the page's first paint.
    useLayoutEffect(() => {
        const root = document.documentElement
        // Also undoes Strict Mode's simulated unmount in dev.
        window.clearTimeout(revealTimer)
        root.removeAttribute("data-route-reveal")
        return () => {
            root.setAttribute("data-route-reveal", "")
            window.clearTimeout(revealTimer)
            revealTimer = window.setTimeout(() => root.removeAttribute("data-route-reveal"), 400)
        }
    }, [])

    return (
        <div className="app-screen bg-slate-50/50" aria-busy="true">
            <AppHeader activeTab={tabForPath(pathname)} showMobileTabBar={!hidesTabBar(pathname)} />
            <div className="app-main px-4 pt-1 pb-6 md:p-8">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
                    <Bone className="h-9 w-48 sm:w-64" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <CardBone key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
