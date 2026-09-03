"use client"

import { StatusPage } from "@/components/StatusPage"
import { useTranslation } from "@/lib/i18n/context"

export default function CommissionNotFound() {
    const { t } = useTranslation()

    return (
        <StatusPage
            activeTab="none"
            title={t("commission.notFoundTitle")}
            description={t("commission.notFoundDescription")}
            action={{ href: "/myCommissions", label: t("common.myCommissions") }}
        />
    )
}
