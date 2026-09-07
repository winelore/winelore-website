"use client"

import { StatusPage } from "@/components/StatusPage"
import { useTranslation } from "@/lib/i18n/context"

export default function CompetitionNotFound() {
    const { t } = useTranslation()

    return (
        <StatusPage
            activeTab="competitions"
            title={t("competition.notFoundTitle")}
            description={t("competition.notFoundDescription")}
            action={{ href: "/competitions", label: t("common.competitions") }}
        />
    )
}
