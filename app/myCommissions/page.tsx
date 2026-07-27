export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { fetchGraphQL } from "@/lib/apiClient"
import { GET_COMMISSIONS } from "@/app/queries"
import MyCommissionsClientView from "./MyCommissionsClientView"

export default async function MyCommissionsPage({searchParams, }: {
    searchParams: Promise<{ offset?: string; h?: string }>
}) {
    const resolvedParams = await searchParams;
    const offsetStr = resolvedParams.offset;
    const historyStr = resolvedParams.h || "";
    const historyArray = historyStr ? historyStr.split(',') : [];

    const LIMIT = 16;
    let offset = parseInt(offsetStr || "0", 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    offset = Math.floor(offset / LIMIT) * LIMIT;

    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    let myCommissions: any[] = [];
    let hasNextPage = false;

    // Loop through commissions to find LIMIT + 1 commissions that belong to the user
    try {
        let currentOffset = offset;
        let hasMore = true;
        
        while (hasMore && myCommissions.length <= LIMIT) {
            const commData = await fetchGraphQL(GET_COMMISSIONS, { limit: 100, offset: currentOffset });
            const items = commData.commissions?.items || [];
            
            const userItems = items.filter((comm: any) => {
                return comm.replicas?.some((r: any) => 
                    r.members?.some((m: any) => m.auid?.includes(currentAuid))
                );
            });
            
            for (const item of userItems) {
                if (myCommissions.length <= LIMIT) {
                    myCommissions.push(item);
                }
            }

            if (items.length < 100) {
                hasMore = false;
            } else {
                currentOffset += 100;
            }
        }
        
        if (myCommissions.length > LIMIT) {
            hasNextPage = true;
            // Note: to properly paginate this way, the next offset should ideally be the `currentOffset` + the index of the LIMIT'th element in the overall list, but since we are filtering, it's easier to just pass the nextOffset.
            // But wait, if we fetch 100, filter 2, we can't just pass `offset + 100` as next offset because we might have skipped some. We'll simplify and say if hasNextPage, we can't easily compute the next offset unless we track the exact absolute index.
            // Actually, a simpler way for `myCommissions` is just fetch all user commissions (since there are usually not that many) and slice them for the page!
        }
    } catch (error) {
        console.error("Failed to fetch commissions:", error);
    }
    
    // Simpler pagination: fetch all, then slice
    let rawCommissions: any[] = [];
    try {
        let currentOffset = 0;
        let hasMore = true;
        while (hasMore) {
            const commData = await fetchGraphQL(GET_COMMISSIONS, { limit: 100, offset: currentOffset });
            const items = commData.commissions?.items || [];
            const userItems = items.filter((comm: any) => {
                return comm.replicas?.some((r: any) => 
                    r.members?.some((m: any) => m.auid?.includes(currentAuid))
                );
            });
            rawCommissions = rawCommissions.concat(userItems);
            if (items.length < 100) {
                hasMore = false;
            } else {
                currentOffset += 100;
            }
        }
    } catch (error) {}

    const startIndex = offset;
    hasNextPage = rawCommissions.length > startIndex + LIMIT;
    const commissionsToDisplay = rawCommissions.slice(startIndex, startIndex + LIMIT);
    const totalPages = Math.ceil(rawCommissions.length / LIMIT);

    const nextOffset = hasNextPage ? String(startIndex + LIMIT) : null;
    const currentOffsetRep = offsetStr || "0";
    const nextHistory = historyStr ? `${historyStr},${currentOffsetRep}` : currentOffsetRep;

    let prevOffset: string | null = null;
    let prevHistory = "";

    if (historyArray.length > 0) {
        const targetPrev = historyArray[historyArray.length - 1];
        prevOffset = targetPrev === "0" ? null : targetPrev;
        prevHistory = historyArray.slice(0, -1).join(',');
    }

    const currentPage = (offset / LIMIT) + 1;

    return (
        <MyCommissionsClientView
            initialData={{ commissions: commissionsToDisplay }}
            nextOffset={nextOffset}
            nextHistory={nextHistory}
            prevOffset={prevOffset}
            prevHistory={prevHistory}
            hasPrev={offset > 0}
            hasNext={hasNextPage}
            currentPage={currentPage}
            totalPages={totalPages}
        />
    )
}
