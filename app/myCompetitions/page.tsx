export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_MY_COMPETITIONS } from "./queries"
import MyCompetitionsClientView from "./MyCompetitionsClientView"

export default async function MyCompetitionsPage({searchParams, }: {
    searchParams: Promise<{ cursor?: string; h?: string }>
}) {
    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const historyStr = resolvedParams.h || "";
    const historyArray = historyStr ? historyStr.split(',') : [];

    const LIMIT = 16;

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let rawCompetitions: any[] = [];
    let totalCount = 0;

    try {
        const response = await fetchGraphQL(GET_MY_COMPETITIONS, {
            limit: LIMIT + 1,
            cursor: cursor || undefined,
            filter: { holders: [[currentAuid]] }
        });
        rawCompetitions = response.competitions?.items || [];
        //totalCount = response.myCompetitionsCount || 0;
    } catch (error) {
        console.error("Failed to fetch competitions:", error);
    }

    const hasNextPage = rawCompetitions.length > LIMIT;
    const competitionsToDisplay = rawCompetitions.slice(0, LIMIT);

    const nextCursor = hasNextPage ? competitionsToDisplay[competitionsToDisplay.length - 1].id : null;
    const currentCursorRep = cursor || "root";
    const nextHistory = historyStr ? `${historyStr},${currentCursorRep}` : currentCursorRep;

    let prevCursor: string | null = null;
    let prevHistory = "";

    if (historyArray.length > 0) {
        const targetPrev = historyArray[historyArray.length - 1];
        prevCursor = targetPrev === "root" ? null : targetPrev;
        prevHistory = historyArray.slice(0, -1).join(',');
    }

    const currentPage = historyArray.length + 1;

    return (
        <MyCompetitionsClientView
            initialData={{ competitions: competitionsToDisplay }}
            nextCursor={nextCursor}
            nextHistory={nextHistory}
            prevCursor={prevCursor}
            prevHistory={prevHistory}
            hasPrev={historyArray.length > 0}
            hasNext={hasNextPage}
            currentPage={currentPage}
            totalCount={totalCount}
        />
    )
}