"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { AppHeader, type AppTabId } from "@/components/AppHeader"

interface ListPageShellProps {
    activeTab: AppTabId
    isLoading?: boolean
    children: ReactNode
}

export function ListPageShell({ activeTab, isLoading = false, children }: ListPageShellProps) {
    return (
        <div className="app-screen bg-slate-50/50">
            <AppHeader activeTab={activeTab} />

            <main className="app-main px-4 pt-1 pb-6 md:p-6 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-3xl">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}
                {children}
            </main>
        </div>
    )
}
