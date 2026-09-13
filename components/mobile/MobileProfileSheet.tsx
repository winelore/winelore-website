"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { BadgeCheck, ChevronRight, ExternalLink, LogIn, LogOut } from "lucide-react"
import { usePathname } from "next/navigation"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import {
    AXUS_ACCOUNT_URL,
    AvatarPlaceholder,
    AxusLogo,
    PERSONAL_LINKS,
    isMenuLinkActive,
} from "@/components/wine-lore-main"
import { useTranslation } from "@/lib/i18n/context"
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/types"

interface MobileProfileSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    username: string | null
}

/** An inset-grouped list section, as in iOS Settings. */
function Group({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-100 divide-y divide-slate-100">
            {children}
        </div>
    )
}

function Row({
    href,
    icon,
    label,
    trailing,
    active = false,
    tone = "default",
    onNavigate,
}: {
    href: string
    icon: ReactNode
    label: string
    trailing?: ReactNode
    active?: boolean
    tone?: "default" | "destructive"
    /** Set for in-app routes: navigates client-side (animated) and runs this, e.g. to close the sheet. */
    onNavigate?: () => void
}) {
    const className = `flex min-h-12 items-center gap-3 px-4 py-2.5 text-[16px] transition-colors active:bg-slate-100 ${
        tone === "destructive" ? "text-rose-600" : active ? "font-semibold text-indigo-600" : "text-slate-800"
    }`
    const content = (
        <>
            {icon}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {trailing}
        </>
    )

    return onNavigate ? (
        <Link href={href} onClick={onNavigate} className={className}>
            {content}
        </Link>
    ) : (
        <a href={href} className={className}>
            {content}
        </a>
    )
}

function IconTile({ children, tone = "indigo" }: { children: ReactNode; tone?: "indigo" | "rose" | "white" }) {
    const toneClass = {
        indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
        rose: "bg-rose-50 text-rose-600 ring-rose-100",
        white: "bg-white ring-slate-200",
    }[tone]
    return (
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ring-1 ${toneClass}`}>
            {children}
        </span>
    )
}

/**
 * The phone counterpart of the header's ProfileMenu popover: opened from the
 * Profile tab in the bottom tab bar, presented as a swipe-to-dismiss sheet.
 * Also hosts the language switcher, which has no room in the mobile nav bar.
 */
export function MobileProfileSheet({ open, onOpenChange, username }: MobileProfileSheetProps) {
    const { t, locale, setLocale } = useTranslation()
    const pathname = usePathname()

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[88dvh] rounded-t-[28px] border-0 bg-slate-50 md:hidden">
                <DrawerTitle className="sr-only">{t("common.profile")}</DrawerTitle>
                <DrawerDescription className="sr-only">{t("common.axusIdProfile")}</DrawerDescription>

                <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 pt-4 pb-safe-4">
                    {username ? (
                        <a
                            href={AXUS_ACCOUNT_URL}
                            className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-100 transition-colors active:bg-slate-100"
                        >
                            <AvatarPlaceholder className="h-14 w-14" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate text-lg font-bold text-slate-900">{username}</span>
                                    <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />
                                </div>
                                <span className="text-sm text-slate-500">{t("common.axusIdProfile")}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </a>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-5 py-6 text-center shadow-xs ring-1 ring-slate-100">
                            <AvatarPlaceholder className="h-16 w-16" />
                            <p className="text-sm text-slate-500">{t("common.signInPrompt")}</p>
                            <a
                                href="/auth/login"
                                className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[16px] font-semibold text-white shadow-sm transition-colors active:bg-indigo-700"
                            >
                                <LogIn className="h-5 w-5" />
                                {t("common.signIn")}
                            </a>
                        </div>
                    )}

                    {username && (
                        <Group>
                            {PERSONAL_LINKS.map(({ href, labelKey, icon: Icon }) => {
                                const active = isMenuLinkActive(pathname, href)
                                return (
                                    <Row
                                        key={href}
                                        href={href}
                                        onNavigate={() => onOpenChange(false)}
                                        active={active}
                                        label={t(labelKey)}
                                        icon={
                                            <IconTile>
                                                <Icon className="h-[18px] w-[18px]" />
                                            </IconTile>
                                        }
                                        trailing={<ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}
                                    />
                                )
                            })}
                        </Group>
                    )}

                    <div className="flex flex-col gap-2">
                        <span className="px-4 text-[13px] font-medium uppercase tracking-wide text-slate-500">
                            {t("common.language")}
                        </span>
                        {/* iOS segmented control */}
                        <div role="radiogroup" aria-label={t("common.changeLanguage")} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
                            {LOCALES.map((item) => {
                                const selected = item === locale
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setLocale(item)}
                                        className={`h-9 truncate rounded-[9px] px-2 text-[14px] transition-all ${
                                            selected ? "bg-white font-semibold text-slate-900 shadow-sm" : "font-medium text-slate-600"
                                        }`}
                                    >
                                        {LOCALE_LABELS[item]}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {username && (
                        <Group>
                            <Row
                                href={AXUS_ACCOUNT_URL}
                                label={t("common.axusIdProfile")}
                                icon={
                                    <IconTile tone="white">
                                        <AxusLogo className="h-5 w-auto max-w-none object-contain" />
                                    </IconTile>
                                }
                                trailing={<ExternalLink className="h-[18px] w-[18px] shrink-0 text-slate-300" />}
                            />
                            <Row
                                href="/auth/logout"
                                tone="destructive"
                                label={t("common.logOut")}
                                icon={
                                    <IconTile tone="rose">
                                        <LogOut className="h-[18px] w-[18px]" />
                                    </IconTile>
                                }
                            />
                        </Group>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
