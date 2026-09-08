export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getOutcomePoliciesAction } from "./actions"
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
        const result = await getOutcomePoliciesAction(currentAuid, LIMIT + 1, cursor || undefined);
        rawOutcomePolicies = result.policies;
        totalCount = result.totalCount;
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