import { cookies } from "next/headers"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export const dynamic = "force-dynamic"

export default async function MyCompetitionsPage() {

    // const cookieStore = cookies()
    // const currentAuidStr = cookieStore.get("auid")?.value
    // const currentAuid = currentAuidStr ? parseInt(currentAuidStr, 10) : 0
    const currentAuid = 1; // Замоканий AUID для тестування

    let myCompetitions: any[] = [];

    try {
        const response = await fetchGraphQL(GET_COMPETITIONS, { limit: 500 });
        const allCompetitions = response.competitions?.items || [];

        if (currentAuid) {
            myCompetitions = allCompetitions.filter((comp: any) => {
                const flatHolders = comp.holders?.flat() || [];
                return flatHolders.includes(currentAuid);
            });
        }
    } catch (error) {
        console.error("Failed to fetch competitions:", error);
    }

    return <MyCompetitionsClientView initialData={{ competitions: myCompetitions }} />
}