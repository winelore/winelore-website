"use client"

import { Calendar, Globe2, Trophy } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { EntityCard, type EntityCardDensity } from "./EntityCard"
import { competitionSeriesStatusAppearance } from "./statusAppearance"

export interface CompetitionSeriesCardData {
    id: string
    name: string
    status: string
    countriesType: string
    createdAt?: string | null
}

interface CompetitionSeriesCardProps {
    series: CompetitionSeriesCardData
    density?: EntityCardDensity
}

export function CompetitionSeriesCard({ series, density = "comfortable" }: CompetitionSeriesCardProps) {
    const { t, formatStatus, locale } = useTranslation()
    const { colorScheme, icon } = competitionSeriesStatusAppearance(series.status)

    const formattedDate = series.createdAt
        ? new Intl.DateTimeFormat(getDateLocale(locale), {
              month: "short",
              day: "numeric",
              year: "numeric",
          }).format(new Date(series.createdAt))
        : ""

    return (
        <EntityCard
            href={`/competitionSeries/${series.id}`}
            icon={Trophy}
            kicker={series.countriesType ? t(`competitionSeriesCountriesType.${series.countriesType}`) : undefined}
            title={series.name}
            meta={formattedDate ? [{ icon: Calendar, label: t("myCompetitionSeries.createdOn"), value: formattedDate }] : []}
            status={{
                label: formatStatus(series.status),
                colorScheme,
                icon,
            }}
            density={density}
        />
    )
}
