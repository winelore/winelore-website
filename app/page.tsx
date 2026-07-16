import { sdk } from '@/lib/apiClient';
import WineLoreDashboard from './DashboardClientView';
import { getBeverageTypesAction } from '@/app/templates/actions';

export const dynamic = "force-dynamic"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ cursor?: string; page?: string }>
}) {
    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const currentPage = parseInt(resolvedParams.page || "1", 10);

    const LIMIT = 20;
    let rawCompetitions: any[] = [];
    let allBeverages: any[] | undefined = [];
    let totalCount = 0;
    let nextCursor: string | null = null;

    try {
        const args: any = { limit: LIMIT };
        if (cursor) {
            args.cursor = cursor;
        } else if (currentPage > 1) {
            args.offset = (currentPage - 1) * LIMIT;
        }
        const data = await sdk.GetDashboardCompetitions(args);
        rawCompetitions = data.competitions?.items || [];
        totalCount = data.competitionCount || 0;

        if (rawCompetitions.length > 0) {
            nextCursor = rawCompetitions[rawCompetitions.length - 1].id;
        }
    } catch (error) {
        console.error("Failed to load dashboard competitions:", error);
    }

    try {
        const bevData = await sdk.GetMyBeverages({ limit: 100 });
        const rawBeverages = bevData.beverages?.items || [];
        allBeverages = rawBeverages.map((bev: any) => {
            let beverageType = undefined;
            if (bev.attributes) {
                try {
                    const parsed = JSON.parse(bev.attributes);
                    if (parsed && parsed.color) {
                        beverageType = parsed.color; // E.g.: "RED", "WHITE"
                    }
                } catch (e) {}
            }
            return { ...bev, type: beverageType };
        });
    } catch (error) {
        console.error("Failed to load beverages:", error);
        allBeverages = undefined; // undefined indicates an error state to the client
    }
    const totalPages = Math.ceil(totalCount / LIMIT);

    // Map backend competitions to the format expected by DashboardClientView
    const mappedCompetitions = rawCompetitions.map((comp: any) => ({
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




    let beverageTypesDict: Record<string, string> = {};
    try {
        const typesList = await getBeverageTypesAction();
        beverageTypesDict = typesList.reduce((acc, t) => {
            acc[t.id] = t.name;
            return acc;
        }, {} as Record<string, string>);
    } catch (e) {
        console.error("Failed to load beverage types map:", e);
    }

    return (
        <WineLoreDashboard 
            initialCompetitions={mappedCompetitions}
            initialBeverages={allBeverages}
            beverageTypesMap={beverageTypesDict}
            nextCursor={nextCursor}
            currentPage={currentPage}
            totalPages={totalPages}
        />
    );
}
