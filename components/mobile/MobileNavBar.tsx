"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useMobileNavState } from "@/lib/mobileNav"
import type { MobileNavBack, MobileNavAction } from "@/lib/mobileNav"
import { useTranslation } from "@/lib/i18n/context"
import { NAV_BACK } from "@/components/PageTransition"

// What the nav bar last showed for a settled page. While a route is loading
// (and between pages) the bar keeps showing this instead of blanking out.
let lastSettled: { back: MobileNavBack | null; action: MobileNavAction | null; title: string | null } = {
    back: null,
    action: null,
    title: null,
}

const ACTION_CLASS =
    "flex h-11 w-11 items-center justify-center rounded-full text-indigo-600 transition-opacity active:opacity-40"

/**
 * iOS-style navigation bar for phones (hidden from md up).
 *
 * - Root screens show the WineLore wordmark; detail screens show a
 *   "‹ Back" button, registered by the page's BackLink.
 * - The page's title (registered with useMobileNavTitle) fades in, centred,
 *   once the page's own large title has scrolled underneath the bar.
 * - An optional trailing icon button (useMobileNavAction).
 * - Transparent while the page is scrolled to the top, translucent material
 *   with a hairline once content scrolls under it (iOS scroll-edge look).
 */
export function MobileNavBar() {
    const { t } = useTranslation()
    const live = useMobileNavState()
    if (!live.pending) lastSettled = { back: live.back, action: live.action, title: live.title }
    const { back, action, title } = live.pending ? lastSettled : live
    const titleVisible = live.pending ? false : live.titleVisible
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 2)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const showTitle = Boolean(title) && titleVisible

    return (
        <header
            data-mobile-navbar
            className={`sticky top-0 z-40 shrink-0 border-b pt-safe transition-[background-color,border-color] duration-200 md:hidden ${
                scrolled || showTitle
                    ? "border-slate-200/70 bg-white/80 backdrop-blur-xl backdrop-saturate-150"
                    : "border-transparent bg-transparent"
            }`}
        >
            {/* Three balanced columns only while a centred title is shown; otherwise the leading item may use the full width. */}
            <div
                className={`grid h-11 items-center gap-1 px-2 ${
                    showTitle ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_0_auto]"
                }`}
            >
                <div className="flex min-w-0 items-center">
                    {back ? (
                        <Link
                            href={back.href}
                            transitionTypes={[NAV_BACK]}
                            aria-label={back.label}
                            className="flex min-w-0 items-center rounded-lg py-1.5 pr-2 text-[17px] leading-none text-indigo-600 transition-opacity active:opacity-40"
                        >
                            <ChevronLeft className="-ml-0.5 h-7 w-7 shrink-0" strokeWidth={2.4} />
                            {/* Like UIKit: the full label while there's room, plain "Back" once a title shares the bar. */}
                            <span className="-ml-0.5 truncate">{showTitle ? t("common.back") : back.label}</span>
                        </Link>
                    ) : (
                        <Link
                            href="/"
                            aria-hidden={showTitle}
                            tabIndex={showTitle ? -1 : undefined}
                            className={`truncate px-2 text-xl font-bold tracking-tight text-slate-800 transition-opacity duration-200 ${
                                showTitle ? "pointer-events-none opacity-0" : "opacity-100"
                            }`}
                        >
                            WineLore
                        </Link>
                    )}
                </div>

                {showTitle ? (
                    <div className="max-w-[56vw] animate-fade-in truncate text-center text-[17px] font-semibold text-slate-900">
                        {title}
                    </div>
                ) : (
                    <div />
                )}

                <div className="flex min-w-0 items-center justify-end">
                    {action?.href ? (
                        <Link href={action.href} aria-label={action.label} title={action.label} className={ACTION_CLASS}>
                            <action.icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
                        </Link>
                    ) : action?.onClick ? (
                        <button type="button" onClick={action.onClick} aria-label={action.label} title={action.label} className={ACTION_CLASS}>
                            <action.icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
                        </button>
                    ) : null}
                </div>
            </div>
        </header>
    )
}
