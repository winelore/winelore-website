"use client"

import { useEffect, useState } from "react"
import type { MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { CircleUser } from "lucide-react"
import { AvatarPlaceholder, PERSONAL_LINKS, isMenuLinkActive } from "@/components/wine-lore-main"
import { MobileProfileSheet } from "@/components/mobile/MobileProfileSheet"
import { useTranslation } from "@/lib/i18n/context"
import type { AppTabId } from "@/components/AppHeader"
import { NAV_TAB } from "@/components/PageTransition"

export interface MobileTab {
    id: AppTabId
    label: string
    icon: LucideIcon
    href: string
}

interface MobileTabBarProps {
    tabs: MobileTab[]
    activeTab: AppTabId
    /** null when signed out; undefined until the cookie has been read on mount. */
    username: string | null | undefined
}

const itemClass =
    "flex min-w-0 flex-col items-center justify-center gap-[3px] pt-1 select-none transition-opacity active:opacity-50"

function labelClass(active: boolean) {
    return `max-w-full truncate px-0.5 text-[10px] leading-none tracking-tight ${active ? "font-semibold text-indigo-600" : "font-medium text-slate-500"}`
}

// The tab bar is re-created with every page, so remember across instances which
// tab was active: only a tab that has just *become* active plays the pop.
let lastActiveTab: string | null = null

/**
 * iOS-style bottom tab bar for phones (hidden from md up). Mirrors the pill
 * tabs of the desktop header and adds a Profile tab that opens the profile
 * sheet. Tapping the tab you're already on scrolls back to the top.
 */
export function MobileTabBar({ tabs, activeTab, username }: MobileTabBarProps) {
    const { t } = useTranslation()
    const pathname = usePathname()
    const [sheetOpen, setSheetOpen] = useState(false)

    const profileActive = sheetOpen || PERSONAL_LINKS.some(({ href }) => isMenuLinkActive(pathname, href))
    const currentTab = profileActive ? "profile" : activeTab
    const [poppedTab] = useState(() => (lastActiveTab !== null && lastActiveTab !== currentTab ? currentTab : null))
    useEffect(() => {
        lastActiveTab = currentTab
    }, [currentTab])

    const handleTabClick = (event: MouseEvent<HTMLAnchorElement>, tab: MobileTab) => {
        if (pathname === tab.href) {
            event.preventDefault()
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    return (
        <>
            <nav
                data-mobile-tabbar
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/85 pb-safe backdrop-blur-xl backdrop-saturate-150 transition-transform duration-300 ease-out md:hidden"
            >
                <div className="mx-auto grid h-[var(--mobile-tabbar-height)] max-w-lg grid-cols-5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const active = activeTab === tab.id && !profileActive
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                transitionTypes={[NAV_TAB]}
                                aria-current={active ? "page" : undefined}
                                onClick={(event) => handleTabClick(event, tab)}
                                className={itemClass}
                            >
                                <Icon
                                    className={`h-6 w-6 ${active ? "text-indigo-600" : "text-slate-400"} ${active && poppedTab === tab.id ? "animate-tab-pop" : ""}`}
                                    strokeWidth={active ? 2.2 : 1.8}
                                />
                                <span className={labelClass(active)}>{tab.label}</span>
                            </Link>
                        )
                    })}

                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={sheetOpen}
                        className={itemClass}
                    >
                        {username ? (
                            <AvatarPlaceholder
                                className={`h-6 w-6 ring-offset-1 transition-shadow ${profileActive ? "ring-2 ring-indigo-600" : "ring-1 ring-slate-200"} ${poppedTab === "profile" ? "animate-tab-pop" : ""}`}
                            />
                        ) : (
                            <CircleUser
                                className={`h-6 w-6 ${profileActive ? "text-indigo-600" : "text-slate-400"}`}
                                strokeWidth={profileActive ? 2.2 : 1.8}
                            />
                        )}
                        <span className={labelClass(profileActive)}>
                            {username === null ? t("common.signIn") : t("common.profile")}
                        </span>
                    </button>
                </div>
            </nav>

            <MobileProfileSheet open={sheetOpen} onOpenChange={setSheetOpen} username={username ?? null} />
        </>
    )
}
