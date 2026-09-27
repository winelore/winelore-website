export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQLRaw } from "@/lib/apiClient"
import { GET_DASHBOARD_COMMISSIONS, selectCommissionsForUser } from "@winelore/core/dashboard"
import MyCommissionsClientView from "./MyCommissionsClientView"

export default async function MyCommissionsPage({searchParams, }: {
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

    // GET_COMMISSIONS has no member filter or count on the backend, so we page through
    // everything once and filter client-side. This scan cost is inherent until the API
    // grows a commissionCount/member filter — see the plan note on /myCommissions.
    let rawCommissions: any[] = [];
    let hasError = false;
    try {
        let allCommissions: any[] = [];
        let currentOffset = 0;
        let hasMore = true;
        while (hasMore) {
            const commData: any = await fetchGraphQLRaw(GET_DASHBOARD_COMMISSIONS, { limit: 100, offset: currentOffset });
            const items = commData.commissions?.items || [];
            allCommissions = allCommissions.concat(items);
            if (items.length < 100) {
                hasMore = false;
            } else {
                currentOffset += 100;
            }
        }
        // Shared with the dashboard and the mobile app; matches nested auid
        // arrays that a plain `includes` would miss. No status filter here —
        // this list is the judge's whole history.
        rawCommissions = selectCommissionsForUser(allCommissions, String(currentAuid));
    } catch (error) {
        console.error("Failed to fetch commissions:", error);
        hasError = true;
    }

    const totalCount = rawCommissions.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
    const startIndex = (currentPage - 1) * LIMIT;
    const commissionsToDisplay = rawCommissions.slice(startIndex, startIndex + LIMIT);

    return (
        <MyCommissionsClientView
            initialData={{ commissions: commissionsToDisplay }}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
