"use client"

import { useEffect, useState } from "react"
import { Activity, Trophy } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
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

        const duration = (diffMs: number) => {
            const diff = Math.max(0, diffMs)
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            if (days > 0) return t("time.duration", { days, hours })
            if (hours > 0) return t("time.durationHoursMinutes", { hours, minutes })
            return t("time.durationMinutes", { minutes })
        }

        const updateTime = () => {
            if (commission.status === "STARTED" && commission.startedAt) {
                const diff = Math.max(0, Date.now() - new Date(commission.startedAt).getTime())
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setTimeStr(diff < 1000 * 60 * 60 ? `${duration(diff)} ${seconds}s` : duration(diff))
            } else if (commission.status === "COMPLETED" && commission.startedAt && commission.endedAt) {
                const diff = new Date(commission.endedAt).getTime() - new Date(commission.startedAt).getTime()
                setTimeStr(t("time.lasted", { time: duration(diff) }))
            } else {
                setTimeStr("")
            }
        }

        updateTime()
        if (commission.status === "STARTED") {
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
