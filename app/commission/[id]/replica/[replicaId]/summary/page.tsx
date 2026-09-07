"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Cookies from "js-cookie"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { MyTastingSummary } from "../../../../MyTastingSummary"
import { getMyTastingSummaryAction, type MyTastingSummaryData } from "../../../../actions"
import { BackLink } from "@/components/BackLink"

export default function TastingSummaryPage({
    params,
}: {
    params: Promise<{ id: string; replicaId: string }>
}) {
    const { id: commissionId, replicaId } = use(params)
    const router = useRouter()
    const { t } = useTranslation()
    const [data, setData] = useState<MyTastingSummaryData | null>(null)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (!cookieAuid) {
            router.push("/auth/login")
            return
        }

        getMyTastingSummaryAction(replicaId)
            .then(setData)
            .catch(() =>
                setData({
                    entries: [],
                    propertyMap: {},
                    propertyCommentsEnabled: false,
                    voiceCommentsEnabled: false,
                }),
            )
    }, [replicaId, router])

    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-6">
                    <BackLink href={`/commission/${commissionId}`} label={t("commission.backToCommission")} />
                    <MyTastingSummary
                        data={data}
                        commissionId={commissionId}
                        showBackLink
                    />
                </div>
            </main>
        </div>
    )
}
