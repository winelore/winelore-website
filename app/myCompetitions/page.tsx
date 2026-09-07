export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export default async function MyCompetitionsPage({searchParams, }: {
    searchParams: Promise<{ page?: string }>
}) {
    const resolvedParams = await searchParams;
    const parsedPage = parseInt(resolvedParams.page || "1", 10);
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const LIMIT = 16;

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let rawCompetitions: any[] = [];
    let totalCount = 0;
    let hasError = false;

    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
            limit: LIMIT,
            offset: (currentPage - 1) * LIMIT,
            filter: { holders: [[currentAuid]] },
            holder: [currentAuid]
        });
        rawCompetitions = response.competitions?.items || [];
        totalCount = response.competitionCount || 0;
    } catch (error) {
        console.error("Failed to fetch competitions:", error);
        hasError = true;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    return (
        <MyCompetitionsClientView
            initialData={{ competitions: rawCompetitions }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
