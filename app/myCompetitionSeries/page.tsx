export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_COMPETITION_SERIES_LIST } from "../competitionSeries/queries"
import MyCompetitionSeriesClientView from "./MyCompetitionSeriesClientView"

const PAGE_SIZE = 16

export default async function MyCompetitionsSeriesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const resolvedParams = await searchParams
    const parsedPage = parseInt(resolvedParams.page || "1", 10)
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : null

    let rawSeries: any[] = []
    let totalCount = 0
    let hasError = false

    try {
        const response = (await fetchGraphQL(GET_COMPETITION_SERIES_LIST as any, {
            limit: PAGE_SIZE,
            offset: (currentPage - 1) * PAGE_SIZE,
        })) as any
        rawSeries = response.competitionSeriesList?.items || []
        totalCount = response.competitionSeriesCount || rawSeries.length
    } catch (error) {
        console.error("Failed to fetch competition series:", error)
        hasError = true
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    const isOwner = currentAuid !== null

    return (
        <MyCompetitionSeriesClientView
            initialData={{ series: rawSeries }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
            isOwner={isOwner}
        />
    )
}