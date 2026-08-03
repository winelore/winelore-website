import {GET_OUTCOME_POLICIES} from "@/app/myOutcomePolicies/queries";
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import {GET_MY_COMPETITIONS} from "@/app/myCompetitions/queries";

export default async function MyOutcomePoliciesPage() {
    console.log("MyOutcomePoliciesPage")
    const LIMIT = 16;

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }

    const currentAuid = parseInt(currentAuidStr, 10);
    // console.log(currentAuid);

    let rawCompetitions: any[] = [];
    let totalCount = 0;
    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
            limit: LIMIT + 1,
            // cursor: cursor || undefined,
            // filter: { holders: [[currentAuid]] },
            // holder: [currentAuid]
        });
        rawCompetitions = response.competitions?.items || [];
        totalCount = response.competitionCount || 0;
    } catch (error) {
        console.error("Failed to fetch competitions:", error);
    }
}