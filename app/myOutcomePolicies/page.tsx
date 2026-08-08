export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_OUTCOME_POLICIES, GET_OUTCOME_POLICY_COUNT } from "./queries"
import MyOutcomePoliciesClientView from "./MyOutcomePoliciesView"

export default async function MyOutcomePoliciesPage({searchParams, }: {
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

    let rawOutcomePolicies: any[] = [];
    let totalCount = 0;

    try {
        const [policiesResponse, countResponse] = await Promise.all([
            fetchGraphQL(GET_OUTCOME_POLICIES, {
                limit: LIMIT + 1,
                cursor: cursor || undefined,
                filter: { owners: [[currentAuid]] },
            }),
            fetchGraphQL(GET_OUTCOME_POLICY_COUNT, {
                owner: [currentAuid],
            }),
        ]);
        rawOutcomePolicies = policiesResponse.outcomePolicies?.items || [];
        totalCount = countResponse.outcomePolicyCount ?? 0;
    } catch (error) {
        console.error("Failed to fetch outcome policies:", error);
    }

    const hasNextPage = rawOutcomePolicies.length > LIMIT;
    const outcomePoliciesToDisplay = rawOutcomePolicies.slice(0, LIMIT);

    const nextCursor = hasNextPage ? outcomePoliciesToDisplay[outcomePoliciesToDisplay.length - 1].id : null;
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
        <MyOutcomePoliciesClientView
            initialData={{ outcomePolicies: outcomePoliciesToDisplay }}
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