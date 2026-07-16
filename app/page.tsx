import { sdk } from '@/lib/apiClient';
import WineLoreDashboard from './DashboardClientView';

export const dynamic = "force-dynamic"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ cursor?: string; h?: string }>
}) {
    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const historyStr = resolvedParams.h || "";
    const historyArray = historyStr ? historyStr.split(',') : [];
    const LIMIT = 20;
    let rawCompetitions: any[] = [];
    let allBeverages: any[] = [];
    try {
        const data = await sdk.GetDashboardCompetitions({
            limit: LIMIT + 1,
            cursor: cursor || undefined
        });
        rawCompetitions = data.competitions?.items || [];
    } catch (error) {
        console.error("Failed to load dashboard competitions:", error);
    }

    try {
        const bevData = await sdk.GetMyBeverages({ limit: 100 });
        const rawBeverages = bevData.beverages?.items || [];

        const { getGeographicInfo } = await import("@/lib/geocoding");
        allBeverages = await Promise.all(
            rawBeverages.map(async (bev: any) => {
                const origin = bev.origin;
                let originParts: string[] = [];
                if (origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
                    const info = await getGeographicInfo(origin.latitude, origin.longitude);
                    if (info) {
                        originParts = [info.country, info.district].filter(Boolean) as string[];
                    }
                }
                
                let colorVal = "WINE";
                if (bev.attributes) {
                    try {
                        const parsed = JSON.parse(bev.attributes);
                        if (parsed && parsed.color) {
                            colorVal = parsed.color;
                        }
                    } catch (e) {}
                }

                return { ...bev, type: colorVal, originParts };
            })
        );
    } catch (error) {
        console.error("Failed to load beverages:", error);
    }
    const hasNextPage = rawCompetitions.length > LIMIT;
    const competitionsToDisplay = rawCompetitions.slice(0, LIMIT);
    // Map backend competitions to the format expected by DashboardClientView
    const mappedCompetitions = competitionsToDisplay.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        status: comp.status,
        description: comp.description || "", // Fallback as backend doesn't have description
        holder: comp.holders ? comp.holders.flat() : [1],
        plannedStartAt: comp.plannedDates?.start || null,
        plannedEndAt: comp.plannedDates?.end || null,
        startedAt: comp.startedAt || null,
        endedAt: comp.endedAt || null,
        series: {
            id: comp.series?.id,
            name: comp.series?.name,
            status: comp.series?.status
        }
    }));


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
        <WineLoreDashboard
            initialCompetitions={mappedCompetitions}
            initialBeverages={allBeverages}
            nextCursor={nextCursor}
            nextHistory={nextHistory}
            prevCursor={prevCursor}
            prevHistory={prevHistory}
            hasPrev={historyArray.length > 0}
            hasNext={hasNextPage}
            currentPage={currentPage}
        />
    );
}
