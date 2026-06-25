"use client"

import { useTranslation } from "@/lib/i18n/context"

export default function CommissionNotFound() {
    const { t } = useTranslation()

    return (
        <div className="flex h-screen items-center justify-center bg-background text-white">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{t("commission.notFoundTitle")}</h2>
                <p className="text-muted-foreground">{t("commission.notFoundDescription")}</p>
            </div>
        </div>
    )
}
