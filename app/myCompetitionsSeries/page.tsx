
export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS_SERIES } from "./queries"

import MyCompetitionSeriesClientView from "./MyCompetitionSeriesClientView.tsx"

export default async function MyCompetitionsSeriesPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let myCompetitionSeries: any[] = [];
    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS_SERIES, {
            limit: 100,
        }) as any;

        // console.log(response)

        const allSeries = response.competitionSeriesList?.items || [];

        myCompetitionSeries = allSeries.filter((series: any) =>
            series.owners?.flat?.().includes(currentAuid)
        );

        myCompetitionSeries = JSON.parse(JSON.stringify(myCompetitionSeries));
        // console.log(myCompetitionsSeries)
    } catch (error) {
        console.error("Failed to fetch competition series:", error);
    }

    return <MyCompetitionSeriesClientView initialData={{ series: myCompetitionSeries }} />
}