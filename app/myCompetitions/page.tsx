export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export default async function MyCompetitionsPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

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