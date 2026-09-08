"use client"

import { useEffect, useState } from "react"
import { Layers, Trophy, User } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import { formatCompetitionTiming } from "@/lib/competitionTiming"
import { EntityCard, type EntityCardDensity, type EntityCardMeta } from "./EntityCard"
import { competitionStatusAppearance } from "./statusAppearance"

export interface CompetitionCardData {
    id: string
    name: string
    status: string
    description?: string | null
    plannedStartAt?: string | null
    plannedEndAt?: string | null
    startedAt?: string | null
    endedAt?: string | null
    series?: { name: string } | null
    /** Holder auids; every list flattens its own shape into this. */
    holder?: number[] | null
}

interface CompetitionCardProps {
    competition: CompetitionCardData
    /** Holder auid -> username, from useUsernames on the list page. */
    usernames?: Record<string, string>
    density?: EntityCardDensity
}

export function CompetitionCard({ competition, usernames, density = "comfortable" }: CompetitionCardProps) {
    // Timing is relative to now, so it can only be rendered after mount or the
    // server and client markup disagree. `tick` also re-runs the format on a
    // timer while a competition is running.
    const [tick, setTick] = useState<number | null>(null)
    const { t, formatStatus } = useTranslation()
    const { colorScheme, icon } = competitionStatusAppearance(competition.status)

    useEffect(() => {
        setTick(Date.now())
        if (competition.status !== "STARTED" && competition.status !== "IN_PROGRESS") return
        const intervalId = setInterval(() => setTick(Date.now()), 60000)
        return () => clearInterval(intervalId)
    }, [competition.status])

    const timing = tick === null ? "" : formatCompetitionTiming(competition, t)

    const holders = competition.holder ?? []
    const meta: EntityCardMeta[] = []
    // The series is a long, human-readable name, so it reads better as a meta
    // line (which may wrap) than as the truncated kicker.
    meta.push({ icon: Layers, value: competition.series?.name || t("common.independent") })
    if (holders.length > 0) {
        meta.push({
            icon: User,
            value: t("dashboard.holderId", { ids: holders.map((id) => usernames?.[id] || String(id)).join(", ") }),
        })
    }

    return (
        <EntityCard
            href={`/competition/${competition.id}`}
            icon={Trophy}
            title={competition.name}
            description={competition.description ? <TranslatedText text={competition.description} /> : undefined}
            meta={meta}
            status={{
                label: formatStatus(competition.status),
                colorScheme,
                icon,
                trailing: timing || undefined,
            }}
            density={density}
        />
    )
}
