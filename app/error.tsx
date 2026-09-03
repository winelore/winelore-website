"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { StatusPage, RotateCw } from "@/components/StatusPage"
import { useTranslation } from "@/lib/i18n/context"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { t } = useTranslation()

    useEffect(() => {
        console.error("Unhandled route error:", error)
    }, [error])

    return (
        <StatusPage
            activeTab="none"
            icon={AlertTriangle}
            title={t("errors.serverTitle")}
            description={t("errors.serverDesc")}
            action={{ label: t("errors.retry"), onClick: () => reset(), icon: RotateCw }}
        />
    )
}
