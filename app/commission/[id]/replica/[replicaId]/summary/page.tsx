"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Cookies from "js-cookie"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { MyTastingSummary } from "../../../../MyTastingSummary"
import { getMyTastingSummaryAction, type MyTastingSummaryData } from "../../../../actions"

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
        <div className="flex min-h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Link
                        href={`/commission/${commissionId}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("commission.backToCommission")}
                    </Link>
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
