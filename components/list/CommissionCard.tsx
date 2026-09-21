"use client"

import { useEffect, useState } from "react"
import { Activity, Trophy } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { commissionTimingTicks, formatCommissionTiming } from "@winelore/core/dashboard"
import { EntityCard, type EntityCardDensity, type EntityCardMeta } from "./EntityCard"
import { commissionStatusAppearance } from "./statusAppearance"

export interface CommissionCardData {
    id: string
    name: string
    status: string
    startedAt?: string | null
    endedAt?: string | null
    competition?: { name: string } | null
}

interface CommissionCardProps {
    commission: CommissionCardData
    density?: EntityCardDensity
}

export function CommissionCard({ commission, density = "comfortable" }: CommissionCardProps) {
    const [timeStr, setTimeStr] = useState<string>("")
    const { t, formatStatus } = useTranslation()
    const { colorScheme, icon } = commissionStatusAppearance(commission.status)

    useEffect(() => {
        let intervalId: NodeJS.Timeout
        const updateTime = () =>
            setTimeStr(
                formatCommissionTiming(
                    { status: commission.status, startedAt: commission.startedAt, endedAt: commission.endedAt },
                    t,
                ),
            )

        updateTime()
        if (commissionTimingTicks(commission.status)) {
            intervalId = setInterval(updateTime, 1000)
        }
        return () => clearInterval(intervalId)
    }, [commission.status, commission.startedAt, commission.endedAt, t])

    const meta: EntityCardMeta[] = []
    if (commission.competition?.name) {
        meta.push({ icon: Trophy, value: commission.competition.name })
    }

    return (
        <EntityCard
            href={`/commission/${commission.id}`}
            icon={Activity}
            title={commission.name}
            meta={meta}
            status={{
                label: formatStatus(commission.status),
                colorScheme,
                icon,
                trailing: timeStr || undefined,
            }}
            density={density}
        />
    )
}
