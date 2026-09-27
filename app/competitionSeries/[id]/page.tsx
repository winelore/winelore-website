export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { getCompetitionSeriesAction, getCompetitionsBySeriesAction } from "../actions"
import CompetitionSeriesClientView from "./CompetitionSeriesClientView"

export default async function CompetitionSeriesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : null

    const series = await getCompetitionSeriesAction(id)
    if (!series) {
        notFound()
    }

    const competitions = await getCompetitionsBySeriesAction(id)
    const isOwner = currentAuid !== null && (series.owners?.flat?.().includes(currentAuid) ?? false)

    return (
        <CompetitionSeriesClientView
            initialSeries={series}
            initialCompetitions={competitions}
            isOwner={isOwner}
        />
    )
}

