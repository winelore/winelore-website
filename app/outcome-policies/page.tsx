import { getOutcomePoliciesAction } from "@/app/myOutcomePolicies/actions"
import OutcomePoliciesClientView from "./OutcomePoliciesClientView"

export const dynamic = "force-dynamic"

export default async function OutcomePoliciesPage({
    searchParams,
}: {
    searchParams: Promise<{ cursor?: string; h?: string }>
}) {
    const resolvedParams = await searchParams
    const cursor = resolvedParams.cursor
    const historyStr = resolvedParams.h || ""
    const historyArray = historyStr ? historyStr.split(",") : []

    const LIMIT = 16
    let rawOutcomePolicies: any[] = []
    let totalCount = 0
    let hasError = false

    try {
        const result = await getOutcomePoliciesAction(undefined, LIMIT + 1, cursor || undefined)
        rawOutcomePolicies = result.policies || []
        totalCount = result.totalCount || 0
    } catch (error) {
        console.error("Failed to fetch outcome policies:", error)
        hasError = true
    }

    const hasNextPage = rawOutcomePolicies.length > LIMIT
    const outcomePoliciesToDisplay = rawOutcomePolicies.slice(0, LIMIT)

    const nextCursor = hasNextPage && outcomePoliciesToDisplay.length > 0
        ? outcomePoliciesToDisplay[outcomePoliciesToDisplay.length - 1].id
        : null
    const currentCursorRep = cursor || "root"
    const nextHistory = historyStr ? `${historyStr},${currentCursorRep}` : currentCursorRep

    let prevCursor: string | null = null
    let prevHistory = ""

    if (historyArray.length > 0) {
        const targetPrev = historyArray[historyArray.length - 1]
        prevCursor = targetPrev === "root" ? null : targetPrev
        prevHistory = historyArray.slice(0, -1).join(",")
    }

    const currentPage = historyArray.length + 1
    const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / LIMIT)) : undefined

    return (
        <OutcomePoliciesClientView
            initialPolicies={outcomePoliciesToDisplay}
            nextCursor={nextCursor}
            nextHistory={nextHistory}
            prevCursor={prevCursor}
            prevHistory={prevHistory}
            hasPrev={historyArray.length > 0}
            hasNext={hasNextPage}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
