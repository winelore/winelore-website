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
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab={activeTab} />

            <main className="flex-1 overflow-auto p-6 flex flex-col relative">
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
