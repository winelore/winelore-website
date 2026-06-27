export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { ensureAuthenticatedPage } from "@/lib/auth/session"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export default async function MyCompetitionsPage() {
    const currentAuidStr = await ensureAuthenticatedPage("/myCompetitions")
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