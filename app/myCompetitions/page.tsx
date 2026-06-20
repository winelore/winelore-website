export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export default async function MyCompetitionsPage() {

    // const cookieStore = cookies()
    // const currentAuidStr = cookieStore.get("auid")?.value
    // const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : 0
    const currentAuid = 1;

    let myCompetitions: any[] = [];

    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
            filter: { holders: [[currentAuid]] }
        });
        myCompetitions = response.competitions?.items || [];
    } catch (error) {
        console.error("Failed to fetch competitions:", error);
    }

    return <MyCompetitionsClientView initialData={{ competitions: myCompetitions }} />
}