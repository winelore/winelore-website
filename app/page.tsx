import { sdk } from '@/lib/apiClient';
import WineLoreDashboard from './DashboardClientView';
import { getBeverageTypesAction } from '@/app/templates/actions';
import { cookies } from 'next/headers';
import LandingClientView from '@/app/LandingClientView';

export const dynamic = "force-dynamic"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ cursor?: string; page?: string }>
}) {
    const cookieStore = await cookies();
    const auid = cookieStore.get("auid")?.value;

    if (!auid) {
        return <LandingClientView />;
    }

    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const parsedPage = parseInt(resolvedParams.page || "1", 10);
    const currentPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const LIMIT = 20;
    let rawCompetitions: any[] = [];
    let allBeverages: any[] | undefined = [];
    let nextCursor: string | null = null;

    let totalCount = 0;
    let totalBeverageCount = 0;

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
        totalBeverageCount = bevData.beverageCount || 0;
        const rawBeverages = bevData.beverages?.items || [];
        allBeverages = rawBeverages.map((bev: any) => {
            let beverageType = undefined;
            if (bev.attributes) {
                try {
                    const parsed = JSON.parse(bev.attributes);
                    if (parsed && parsed.color) {
                        beverageType = parsed.color; // E.g.: "RED", "WHITE"
                    }
                } catch (e) {
                    const match = bev.attributes.match(/color=([^,\}]+)/);
                    if (match) {
                        beverageType = match[1].trim().replace(/^["']|["']$/g, "");
                    }
                }
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
            acc[t.id] = t.code; // Use code (e.g. "WINE") so frontend can translate it
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
            totalCompetitionsCount={totalCount}
            totalBeveragesCount={totalBeverageCount}
        />
    );
}
