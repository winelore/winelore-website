"use client"

import { useTranslation } from "@/lib/i18n/context"

export default function CompetitionNotFound() {
    const { t } = useTranslation()

    return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{t("competition.notFoundTitle")}</h2>
                <p className="text-muted-foreground">{t("competition.notFoundDescription")}</p>
            </div>
        </div>
    )
}
