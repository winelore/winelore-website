"use client"

import Link from "next/link"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { ArrowLeft } from "lucide-react"

export default function ResultsErrorView({
    commissionId,
    variant = "error",
}: {
    commissionId: string
    variant?: "error" | "forbidden"
}) {
    const { t } = useTranslation()
    const isForbidden = variant === "forbidden"

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <p className="text-slate-700 font-semibold">
                    {isForbidden ? t("commission.results.accessDenied") : t("commission.results.loadError")}
                </p>
                <p className="text-slate-500 text-sm max-w-md">
                    {isForbidden ? t("commission.results.accessDeniedDesc") : t("commission.results.loadErrorDesc")}
                </p>
                <Link
                    href={`/commission/${commissionId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t("commission.backToCommission")}
                </Link>
            </main>
        </div>
    )
}
