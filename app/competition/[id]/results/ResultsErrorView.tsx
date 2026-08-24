"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"

export default function ResultsErrorView({
    competitionId,
    variant = "error",
}: {
    competitionId: string
    variant?: "error" | "forbidden"
}) {
    const { t } = useTranslation()
    const isForbidden = variant === "forbidden"

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />
            <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="font-semibold text-slate-700">
                    {isForbidden ? t("commission.results.accessDenied") : t("commission.results.loadError")}
                </p>
                <p className="max-w-md text-sm text-slate-500">
                    {isForbidden
                        ? t("commission.results.accessDeniedDesc")
                        : t("commission.results.loadErrorDesc")}
                </p>
                <Link
                    href={`/competition/${competitionId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("commission.backToCompetition")}
                </Link>
            </main>
        </div>
    )
}
