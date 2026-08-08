export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { getCompetitionSeriesAction } from "../actions"
import CompetitionSeriesClientView from "./CompetitionSeriesClientView"

export default async function CompetitionSeriesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10)

    const series = await getCompetitionSeriesAction(id)
    if (!series) {
        notFound()
    }

    const isOwner = series.owners?.flat?.().includes(currentAuid) ?? false

    return <CompetitionSeriesClientView initialSeries={series} isOwner={isOwner} />
}
