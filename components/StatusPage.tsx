"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, RotateCw } from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"

interface StatusPageAction {
    label: string
    href?: string
    onClick?: () => void
    icon?: LucideIcon
}

interface StatusPageProps {
    activeTab: AppTabId
    icon?: LucideIcon
    title: string
    description: string
    action: StatusPageAction
}

/**
 * The shared "something's wrong, here's the way out" screen — full-page
 * not-found, load-error, and generic-error states all render through this,
 * so they carry the header and stay visually consistent with each other.
 */
export function StatusPage({ activeTab, icon: Icon, title, description, action }: StatusPageProps) {
    const ActionIcon = action.icon ?? ArrowLeft

    const actionClassName = "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"

    return (
        <div className="flex min-h-app flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} />
            <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                {Icon && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Icon className="h-7 w-7" />
                    </div>
                )}
                <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
                <p className="max-w-md text-sm text-slate-500">{description}</p>
                {action.href ? (
                    <Link href={action.href} className={actionClassName}>
                        <ActionIcon className="h-4 w-4" />
                        {action.label}
                    </Link>
                ) : (
                    <button type="button" onClick={action.onClick} className={actionClassName}>
                        <ActionIcon className="h-4 w-4" />
                        {action.label}
                    </button>
                )}
            </main>
        </div>
    )
}

export { ArrowLeft, RotateCw }
