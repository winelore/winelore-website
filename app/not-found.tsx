"use client"

import { FileQuestion } from "lucide-react"
import { StatusPage } from "@/components/StatusPage"
import { useTranslation } from "@/lib/i18n/context"

export default function NotFound() {
    const { t } = useTranslation()

    return (
        <StatusPage
            activeTab="none"
            icon={FileQuestion}
            title={t("errors.notFoundTitle")}
            description={t("errors.notFoundDesc")}
            action={{ href: "/", label: t("common.backHome") }}
        />
    )
}
