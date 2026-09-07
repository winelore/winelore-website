"use client"

import { StatusPage } from "@/components/StatusPage"
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
        <StatusPage
            activeTab="competitions"
            title={isForbidden ? t("commission.results.accessDenied") : t("commission.results.loadError")}
            description={isForbidden ? t("commission.results.accessDeniedDesc") : t("commission.results.loadErrorDesc")}
            action={{ href: `/competition/${competitionId}`, label: t("commission.backToCompetition") }}
        />
    )
}
