export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getMyCompetitionSeriesPageAction } from "../competitionSeries/actions"

import MyCompetitionSeriesClientView from "./MyCompetitionSeriesClientView"

const PAGE_SIZE = 24

export default async function MyCompetitionsSeriesPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }

    const { items, hasMore } = await getMyCompetitionSeriesPageAction(0, PAGE_SIZE)

    return (
        <MyCompetitionSeriesClientView
            initialData={{ series: items }}
            initialHasMore={hasMore}
            pageSize={PAGE_SIZE}
        />
    )
}